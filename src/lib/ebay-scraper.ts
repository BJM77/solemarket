import axios from 'axios';
import * as cheerio from 'cheerio';
import { HttpsProxyAgent } from 'https-proxy-agent';

interface ScrapeOptions {
    keyword: string;
    maxPages?: number;
    country?: 'au' | 'com' | 'co.uk';
    useProxies?: boolean;
}

export interface EbayItem {
    title: string;
    price: string;
    soldDate: string;
    link: string;
    image: string;
    page: number;
}

export async function scrapeEbayListings(options: ScrapeOptions) {
    const { keyword, maxPages = 1, country = 'au', useProxies = true } = options;

    const baseUrl = `https://www.ebay.${country}/sch/i.html`;
    const allItems: EbayItem[] = [];

    // Proxy rotation for Australia (if available in env)
    const proxies = [
        process.env.PROXY_1,
        process.env.PROXY_2,
        process.env.PROXY_3
    ].filter(Boolean);

    for (let page = 1; page <= maxPages; page++) {
        try {
            const params = new URLSearchParams({
                '_nkw': keyword,
                'LH_Sold': '1',
                'LH_Complete': '1',
                '_ipg': '100', // Items per page
                '_pgn': page.toString()
            });

            const url = `${baseUrl}?${params.toString()}`;

            const headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-AU,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'DNT': '1',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
            };

            let response;

            if (useProxies && proxies.length > 0) {
                const proxy = proxies[page % proxies.length];
                const agent = new HttpsProxyAgent(proxy!);

                response = await axios.get(url, {
                    headers,
                    httpsAgent: agent,
                    timeout: 15000,
                    validateStatus: (status) => status === 200
                });
            } else {
                response = await axios.get(url, {
                    headers,
                    timeout: 15000
                });
            }

            const $ = cheerio.load(response.data);

            // Extract items from the page
            $('.s-item').each((index, element) => {
                const item = $(element);

                // Skip the first "ghost" item or hidden promotional items
                const titleText = item.find('.s-item__title').text().trim();
                if (titleText.includes('Shop on eBay') || !titleText) return;

                const price = item.find('.s-item__price').text().trim();
                const soldDate = item.find('.s-item__title--tagblock .POSITIVE, .s-item__title--tagblock .s-item__caption').text().trim();
                const link = item.find('.s-item__link').attr('href');
                const image = item.find('.s-item__image-img').attr('src');

                if (titleText && price) {
                    allItems.push({
                        title: titleText,
                        price,
                        soldDate: soldDate || 'Sold date unknown',
                        link: link || '#',
                        image: image || '',
                        page
                    });
                }
            });

            // Simple rate limiting
            if (maxPages > 1) {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }

        } catch (error: any) {
            console.error(`Error scraping page ${page}:`, error.message);
            if (page === 1 && !useProxies) throw error; // Fail fast on first page if no proxies
            continue;
        }
    }

    return {
        items: allItems,
        metadata: {
            keyword,
            totalFound: allItems.length,
            country,
            timestamp: new Date().toISOString()
        }
    };
}
