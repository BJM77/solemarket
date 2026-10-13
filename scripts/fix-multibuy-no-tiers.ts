/**
 * One-off cleanup: listings that were auto-flagged `multibuyEnabled: true` (cheap "bronze"
 * cards) but have no `multibuyTiers` show on /multibuy with no actual discount.
 *
 * Dry run (default):  npx tsx scripts/fix-multibuy-no-tiers.ts
 * Apply:              npx tsx scripts/fix-multibuy-no-tiers.ts --apply
 *
 * With --apply, each affected listing gets the admin default multibuy template's tiers
 * (Admin > Multibuy). If there is no default template, multibuy is switched off instead.
 * Uses Application Default Credentials (gcloud auth application-default login).
 */
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const apply = process.argv.includes('--apply');
initializeApp({ credential: applicationDefault(), projectId: process.env.FIREBASE_PROJECT_ID || 'studio-3973035687-658c0' });
const db = getFirestore();

async function main() {
    const tmpl = await db.collection('multibuy_templates').where('isDefault', '==', true).limit(1).get();
    const tiers = tmpl.empty ? [] : (tmpl.docs[0].data().tiers || [])
        .map((t: any) => ({ minQuantity: Number(t.minQuantity), discountPercent: Math.min(90, Number(t.discountPercent)) }))
        .filter((t: any) => t.minQuantity >= 2 && t.discountPercent > 0);
    const snap = await db.collection('products').where('multibuyEnabled', '==', true).get();
    const broken = snap.docs.filter(d => !Array.isArray(d.data().multibuyTiers) || d.data().multibuyTiers.length === 0);
    console.log(`${snap.size} multibuy listings, ${broken.length} without tiers. Default template tiers: ${JSON.stringify(tiers)}`);
    if (!apply) { console.log('Dry run. Re-run with --apply to fix.'); return; }
    for (let i = 0; i < broken.length; i += 400) {
        const batch = db.batch();
        broken.slice(i, i + 400).forEach(d => batch.update(d.ref, tiers.length ? { multibuyTiers: tiers } : { multibuyEnabled: false }));
        await batch.commit();
    }
    console.log(`Updated ${broken.length} listings.`);
}
main().catch(e => { console.error(e); process.exit(1); });
