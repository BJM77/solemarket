import 'server-only';
import { firestoreDb as db, admin } from '@/lib/firebase/admin';
import { planAlerts, alertKey, type AlertProduct, type AlertSearch } from '@/lib/saved-search/alerts';
import { criteriaToQueryString } from '@/lib/saved-search/match';
import { tryRateLimit } from '@/lib/rate-limiter';
import { getProductUrl } from '@/lib/utils/url';

const FieldValue = admin.firestore.FieldValue;
const STATE = () => db.collection('system_state').doc('saved_search_alerts');
const LEDGER = 'saved_search_alerts';
const LEASE_MS = 4 * 60_000;
const OVERLAP_MS = 60_000;
const SCAN_LIMIT = 300;
/** Max saved-search alert notifications per user per day. */
export const DAILY_ALERTS_PER_USER = 20;

const siteUrl = () => (process.env.NEXT_PUBLIC_SITE_URL || 'https://benched.au').replace(/\/$/, '');
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const toMs = (v: any): number | null => (v?.toMillis ? v.toMillis() : v instanceof Date ? v.getTime() : typeof v === 'number' ? v : null);

/**
 * Checks listings that went live since the last run against every saved search with alerts on,
 * writes one in-app notification per matching search (plus a digest email when SendGrid is
 * configured), and records each (search, listing) pair so nobody is alerted twice.
 * Safe to call often: a Firestore lease stops overlapping runs and `minIntervalMs` throttles.
 */
export async function runSavedSearchAlerts(opts: { minIntervalMs?: number } = {}) {
    const minIntervalMs = opts.minIntervalMs ?? 30_000;
    const now = Date.now();
    const state = await db.runTransaction(async (tx: any) => {
        const snap = await tx.get(STATE());
        const d = snap.exists ? snap.data() : {};
        if ((d.leaseUntil || 0) > now) return null;
        if (toMs(d.lastRunAt) && now - toMs(d.lastRunAt)! < minIntervalMs) return null;
        tx.set(STATE(), { leaseUntil: now + LEASE_MS }, { merge: true });
        return d;
    });
    if (!state) return { skipped: true as const };

    try {
        // First run: start from now so existing listings don't flood buyers.
        const cursorMs = toMs(state.cursor) ?? now;
        const since = new Date(cursorMs - OVERLAP_MS);
        const [byUpdated, byCreated] = await Promise.all([
            db.collection('products').where('updatedAt', '>', since).orderBy('updatedAt').limit(SCAN_LIMIT).get(),
            db.collection('products').where('createdAt', '>', since).orderBy('createdAt').limit(SCAN_LIMIT).get(),
        ]);
        let nextCursor = now;
        for (const [snap, field] of [[byUpdated, 'updatedAt'], [byCreated, 'createdAt']] as const) {
            if (snap.size >= SCAN_LIMIT) {
                const last = toMs(snap.docs[snap.docs.length - 1].get(field));
                if (last) nextCursor = Math.min(nextCursor, last + OVERLAP_MS);
            }
        }

        const seen = new Map<string, any>();
        for (const d of [...byUpdated.docs, ...byCreated.docs]) {
            const data = d.data();
            if (data.savedSearchCheckedAt || seen.has(d.id)) continue;
            seen.set(d.id, { id: d.id, ...data });
        }
        // Only listings that went live in this window (new or just published), not edits to old ones.
        const wentLive = (p: any) => Math.max(toMs(p.createdAt) ?? 0, toMs(p.publishedAt) ?? 0) >= since.getTime();
        const products: (AlertProduct & any)[] = [...seen.values()].filter((p) => p.status === 'available' && p.isDraft !== true && wentLive(p));

        let notifications = 0, emails = 0;
        if (products.length) {
            const searchesSnap = await db.collectionGroup('saved_searches').where('alertsEnabled', '==', true).get();
            const searches: AlertSearch[] = searchesSnap.docs.map((d: any) => ({ id: d.id, ...d.data(), userId: d.data().userId || d.ref.parent.parent?.id }));
            let planned = planAlerts(products, searches);

            // Dedupe against the ledger (one alert per listing per search, ever).
            const pairs = planned.flatMap((a) => a.productIds.map((pid) => alertKey(a.searchId, pid)));
            const sent = new Set<string>();
            for (let i = 0; i < pairs.length; i += 300) {
                const refs = pairs.slice(i, i + 300).map((k) => db.collection(LEDGER).doc(k));
                const docs = refs.length ? await db.getAll(...refs) : [];
                docs.forEach((d: any) => d.exists && sent.add(d.id));
            }
            const userIds = [...new Set(planned.map((a) => a.userId))];
            const users = new Map<string, any>();
            for (let i = 0; i < userIds.length; i += 300) {
                const docs = await db.getAll(...userIds.slice(i, i + 300).map((u) => db.collection('users').doc(u)));
                docs.forEach((d: any) => users.set(d.id, d.exists ? d.data() : {}));
            }
            const optedOut = new Set(userIds.filter((u) => users.get(u)?.savedSearchAlertsOptOut === true));
            planned = planAlerts(products, searches, { alreadySent: sent, optedOutUsers: optedOut });

            const byId = new Map(products.map((p) => [p.id, p]));
            const emailDigest = new Map<string, { name: string; items: any[] }[]>();
            for (const a of planned) {
                const rl = await tryRateLimit(a.userId, 'saved-search-alert', DAILY_ALERTS_PER_USER, 86_400);
                if (rl && !rl.success) continue;
                const top = a.productIds.slice(0, 5).map((id) => byId.get(id)!);
                const batch = db.batch();
                const expireAt = admin.firestore.Timestamp.fromMillis(now + 90 * 86_400_000);
                for (const pid of a.productIds) batch.set(db.collection(LEDGER).doc(alertKey(a.searchId, pid)), { searchId: a.searchId, productId: pid, userId: a.userId, createdAt: FieldValue.serverTimestamp(), expireAt });
                const qs = criteriaToQueryString(a.criteria);
                const n = a.productIds.length;
                const first = top[0];
                batch.set(db.collection('notifications').doc(), {
                    recipientId: a.userId,
                    type: 'wishlist_alert',
                    kind: 'saved_search_match',
                    title: n === 1 ? `New match for "${a.searchName}": ${String(first.title).slice(0, 60)}` : `${n} new matches for "${a.searchName}"`,
                    message: top.map((p) => `${p.title} - $${Number(p.price || 0).toFixed(2)}`).join('\n'),
                    link: n === 1 ? getProductUrl(first) : `/browse${qs ? `?${qs}` : ''}`,
                    productIds: a.productIds.slice(0, 20),
                    savedSearchId: a.searchId,
                    read: false,
                    createdAt: FieldValue.serverTimestamp(),
                });
                const searchRef = db.collection('users').doc(a.userId).collection('saved_searches').doc(a.searchId);
                batch.set(searchRef, { lastNotifiedAt: FieldValue.serverTimestamp() }, { merge: true });
                await batch.commit();
                notifications++;
                const list = emailDigest.get(a.userId) || [];
                list.push({ name: a.searchName, items: top });
                emailDigest.set(a.userId, list);
            }

            if (process.env.SENDGRID_API_KEY) {
                const { sendEmail } = await import('@/services/email');
                for (const [uid, groups] of emailDigest) {
                    const u = users.get(uid) || {};
                    if (!u.email || u.savedSearchEmailOptOut === true) continue;
                    const r = await sendEmail({
                        to: u.email,
                        from: 'Benched <alerts@benched.au>',
                        subject: groups.length === 1 && groups[0].items.length === 1
                            ? `Just listed: ${String(groups[0].items[0].title).slice(0, 70)}`
                            : 'New listings match your saved searches',
                        html: digestHtml(groups),
                    }).catch(() => ({ success: false }));
                    if ((r as any)?.success) emails++;
                }
            }

            // Mark every scanned live listing as checked so later edits don't re-alert.
            const ids = products.map((p) => p.id);
            for (let i = 0; i < ids.length; i += 400) {
                const b = db.batch();
                ids.slice(i, i + 400).forEach((id) => b.update(db.collection('products').doc(id), { savedSearchCheckedAt: FieldValue.serverTimestamp() }));
                await b.commit();
            }
        }

        await STATE().set({ cursor: admin.firestore.Timestamp.fromMillis(nextCursor), lastRunAt: admin.firestore.Timestamp.fromMillis(now), leaseUntil: 0, lastStats: { products: products.length, notifications, emails } }, { merge: true });
        return { skipped: false as const, products: products.length, notifications, emails };
    } catch (e) {
        await STATE().set({ leaseUntil: 0 }, { merge: true }).catch(() => {});
        throw e;
    }
}

function digestHtml(groups: { name: string; items: any[] }[]) {
    const base = siteUrl();
    const rows = groups.map((g) => `
        <h2 style="font-size:16px;color:#111;margin:20px 0 8px">Matches for "${esc(g.name)}"</h2>
        ${g.items.map((p) => `<p style="margin:6px 0"><a href="${base}${getProductUrl(p)}" style="color:#c2410c;font-weight:bold;text-decoration:none">${esc(p.title)}</a> <span style="color:#111">- $${Number(p.price || 0).toFixed(2)}</span></p>`).join('')}`).join('');
    return `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#111">
        <h1 style="font-size:22px;margin:0 0 6px">New listings on Benched</h1>
        <p style="color:#333;margin:0">Cards matching your saved searches were just listed.</p>
        ${rows}
        <p style="color:#555;font-size:12px;margin-top:28px">Manage or pause these alerts at <a href="${base}/profile/saved-searches" style="color:#c2410c">${base.replace(/^https?:\/\//, '')}/profile/saved-searches</a>.</p>
    </div>`;
}

/** Fire the alerts worker without waiting for it to finish (never throws). */
export async function kickSavedSearchAlerts(origin?: string) {
    const base = origin || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:9007';
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 1500);
    try {
        await fetch(`${base}/api/jobs/saved-search-alerts`, { method: 'POST', signal: ctrl.signal });
    } catch {
        // Abort after handoff is expected.
    } finally {
        clearTimeout(t);
    }
}
