import { firestoreDb } from '../src/lib/firebase/admin';

/**
 * Catalog Readiness Checker
 * 
 * Run with: npx ts-node scripts/check-catalog-readiness.ts
 */

async function checkReadiness() {
    console.log('🔍 Checking Benched.au Product Catalog for Facebook Sync...\n');

    try {
        const productsRef = firestoreDb.collection('products');
        const snapshot = await productsRef.where('status', '==', 'available').get();

        if (snapshot.empty) {
            console.log('❌ ERROR: No products found with status "available".');
            console.log('Facebook requires at least 1 (and usually 5 for ads) available products.');
            return;
        }

        let readyCount = 0;
        let issues = {
            missingTitle: 0,
            missingImages: 0,
            missingPrice: 0
        };

        snapshot.docs.forEach(doc => {
            const data = doc.data();
            let isReady = true;

            if (!data.title) {
                issues.missingTitle++;
                isReady = false;
            }
            if (!data.imageUrls || data.imageUrls.length === 0) {
                issues.missingImages++;
                isReady = false;
            }
            if (data.price === undefined || data.price === null) {
                issues.missingPrice++;
                isReady = false;
            }

            if (isReady) readyCount++;
        });

        console.log(`📊 Total Available Products: ${snapshot.size}`);
        console.log(`✅ Ready for Facebook:      ${readyCount}`);
        
        if (readyCount < snapshot.size) {
            console.log('\n⚠️ ISSUES FOUND:');
            if (issues.missingTitle > 0)  console.log(`   - Missing Title:  ${issues.missingTitle}`);
            if (issues.missingImages > 0) console.log(`   - Missing Images: ${issues.missingImages}`);
            if (issues.missingPrice > 0)  console.log(`   - Missing Price:  ${issues.missingPrice}`);
            console.log('\nFix these items or change their status to "draft" to clear feed errors.');
        }

        if (readyCount < 5) {
            console.log('\n📢 ADVICE: Facebook Advantage+ ads usually require at least 5 ready products.');
            console.log('   Use the seeding tool or add more listings to reach the threshold.');
        }

    } catch (error: any) {
        console.error('❌ Diagnostic failed:', error.message);
    }
}

checkReadiness();
