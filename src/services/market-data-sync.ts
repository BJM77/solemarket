import { firestoreDb } from '@/lib/firebase/admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { optimizeSearchQuery, ebayService } from '@/services/ebay';
import { scrapeEbayListings } from '@/lib/ebay-scraper';
import { parseWithGemini } from '@/lib/gemini-parser';

export async function syncMarketDataForProduct(productId: string) {
  const productRef = firestoreDb.collection('products').doc(productId);
  const snap = await productRef.get();
  
  if (!snap.exists) {
    return { ok: false, reason: 'not_found' };
  }

  const product = snap.data();
  if (!product) {
    return { ok: false, reason: 'invalid_data' };
  }

  const now = Timestamp.now();

  try {
    // 1. Fetch comps (scraper first, Browse API fallback)
    // Construct search string based on what's available
    const searchString = product.specs?.coinName 
      ? `${product.specs.coinName} ${product.specs.denomination || ''} ${product.specs.year || ''}`
      : product.title;
      
    const query = await optimizeSearchQuery(searchString);
    
    // Scraper First
    const scrapeResult = await scrapeEbayListings({ keyword: query, maxPages: 1 });
    let comps = scrapeResult.items;

    // Fallback to Browse API
    if (comps.length < 3) {
      const browseResults = await ebayService.searchSoldItems(query, 10);
      comps = browseResults.map(r => ({
        title: r.title,
        price: r.price.toString(),
        soldDate: r.soldDate,
        link: r.link,
        image: r.image || '',
        page: 1,
      }));
    }

    if (comps.length < 3) {
      return await recordFailure(productRef, 'insufficient_data', comps.length, now);
    }

    // 2. Gemini filtering + median calculation
    const parsed = await parseWithGemini({ items: comps, metadata: { keyword: query } });
    const validComps = parsed.filter(c => c.finalPrice > 0).slice(0, 5);
    
    if (validComps.length < 3) {
      return await recordFailure(productRef, 'gemini_filtered_all', validComps.length, now);
    }

    const prices = validComps.map(c => c.finalPrice).sort((a, b) => a - b);
    const median = prices[Math.floor(prices.length / 2)];

    // 3. Sanity bounds — reject absurd medians
    if (median <= 1 || median > 500_000) {
      return await recordFailure(productRef, 'implausible_median', median, now);
    }

    // 4. Success write
    await productRef.update({
      marketValue: median,
      'marketData.averageSoldPrice': Math.round(validComps.reduce((s, c) => s + c.finalPrice, 0) / validComps.length),
      'marketData.medianSoldPrice': median,
      'marketData.sampleSize': validComps.length,
      'marketData.comparables': validComps.slice(0, 3).map(c => ({
        title: c.title,
        price: c.finalPrice,
        link: c.itemUrl,
        date: c.soldDate || '',
      })),
      'marketData.lastCheckedAt': now,
      'marketData.lastSuccessAt': now,
      'marketData.lastAttemptAt': now,
      'marketData.consecutiveFailures': 0,
      'marketData.source': 'eBay AU',
      'marketData.lastError': FieldValue.delete(),
    });

    return { ok: true, median, sampleSize: validComps.length };

  } catch (err: any) {
    return await recordFailure(productRef, err.code ?? 'exception', err.message, now);
  }
}

async function recordFailure(productRef: FirebaseFirestore.DocumentReference, reason: string, detail: any, now: Timestamp) {
  const snap = await productRef.get();
  const current = snap.data()?.marketData?.consecutiveFailures ?? 0;
  await productRef.update({
    'marketData.lastAttemptAt': now,
    'marketData.consecutiveFailures': current + 1,
    'marketData.lastError': `${reason}: ${String(detail).slice(0, 200)}`,
  });
  return { ok: false, reason };
}
