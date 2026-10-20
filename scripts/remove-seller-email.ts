/**
 * One-off cleanup: delete the public `sellerEmail` field from every product doc.
 * Seller emails are now looked up server-side from users/{sellerId} (src/lib/server/seller-email.ts).
 *
 * Dry run (default):  npx tsx scripts/remove-seller-email.ts
 * Apply:              npx tsx scripts/remove-seller-email.ts --apply
 *
 * Uses Application Default Credentials (gcloud auth application-default login).
 */
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore, FieldValue, FieldPath } from 'firebase-admin/firestore';

const apply = process.argv.includes('--apply');
initializeApp({ credential: applicationDefault(), projectId: process.env.FIREBASE_PROJECT_ID || 'studio-3973035687-658c0' });
const db = getFirestore();

async function main() {
    let scanned = 0, withField = 0, updated = 0;
    let last: FirebaseFirestore.QueryDocumentSnapshot | undefined;
    for (;;) {
        let q = db.collection('products').orderBy(FieldPath.documentId()).select('sellerEmail').limit(500);
        if (last) q = q.startAfter(last);
        const snap = await q.get();
        if (snap.empty) break;
        scanned += snap.size;
        const hits = snap.docs.filter(d => d.get('sellerEmail') !== undefined);
        withField += hits.length;
        if (apply && hits.length) {
            const batch = db.batch();
            hits.forEach(d => batch.update(d.ref, { sellerEmail: FieldValue.delete() }));
            await batch.commit();
            updated += hits.length;
        }
        last = snap.docs[snap.docs.length - 1];
    }
    console.log(`Scanned ${scanned} products; ${withField} have sellerEmail.`);
    if (apply) console.log(`Removed sellerEmail from ${updated} products.`);
    else console.log('Dry run, nothing changed. Re-run with --apply to remove the field.');
}

main().catch((e) => { console.error(e); process.exit(1); });
