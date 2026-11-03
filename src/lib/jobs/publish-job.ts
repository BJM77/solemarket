import 'server-only';
import { randomBytes } from 'crypto';
import { firestoreDb as db } from '@/lib/firebase/admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { publishListingAs } from '@/lib/listings/publish-core';

/**
 * Background bulk publish.
 *
 * A job doc in `publish_jobs` holds the owner, draft ids and progress. Work is
 * done by POST /api/jobs/publish in time-boxed slices; each slice claims a
 * lease, publishes drafts one by one with the normal per-listing checks, saves
 * progress after every draft, then kicks the next slice with a fresh request.
 * Nothing depends on the browser tab, and a stalled job (lease expired) is
 * resumed by the next kick (e.g. the review page polling, or a retry).
 * The per-job random runToken authorises the worker route, so no new secret.
 */

export const PUBLISH_JOBS = 'publish_jobs';
export const MAX_JOB_DRAFTS = 1000;
const SLICE_BUDGET_MS = 45_000;
const LEASE_MS = 90_000;

export type PublishJobStatus = 'queued' | 'running' | 'done' | 'failed';

export interface PublishJobView {
    id: string;
    status: PublishJobStatus;
    total: number;
    processed: number;
    published: string[];
    errors: Record<string, string>;
}

export function toView(id: string, d: any): PublishJobView {
    return {
        id,
        status: d.status,
        total: (d.draftIds || []).length,
        processed: d.cursor || 0,
        published: d.published || [],
        errors: d.errors || {},
    };
}

export async function createPublishJob(ownerUid: string, draftIds: string[]): Promise<{ jobId: string; runToken: string }> {
    const ids = [...new Set(draftIds.filter((x) => typeof x === 'string' && x))].slice(0, MAX_JOB_DRAFTS);
    if (!ids.length) throw new Error('No drafts to publish.');
    const runToken = randomBytes(24).toString('hex');
    const ref = db.collection(PUBLISH_JOBS).doc();
    await ref.set({
        ownerUid,
        draftIds: ids,
        cursor: 0,
        published: [],
        errors: {},
        status: 'queued',
        runToken,
        leaseUntil: 0,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        // TTL: clean up job docs after 30 days
        expireAt: Timestamp.fromMillis(Date.now() + 30 * 86_400_000),
    });
    return { jobId: ref.id, runToken };
}

/** Claim the lease. Returns the job data if this caller may work on it now. */
async function claim(jobId: string, runToken: string, now: number) {
    const ref = db.collection(PUBLISH_JOBS).doc(jobId);
    return db.runTransaction(async (tx: any) => {
        const snap = await tx.get(ref);
        if (!snap.exists) return null;
        const d = snap.data();
        if (d.runToken !== runToken) return null;
        if (d.status === 'done' || d.status === 'failed') return null;
        if ((d.leaseUntil || 0) > now) return null;
        tx.update(ref, { status: 'running', leaseUntil: now + LEASE_MS, updatedAt: FieldValue.serverTimestamp() });
        return d;
    });
}

/**
 * Process one slice. Returns true if more work remains.
 * `publish` is injectable for tests.
 */
export async function runPublishSlice(
    jobId: string,
    runToken: string,
    publish: (draftId: string, uid: string) => Promise<void> = publishListingAs,
    budgetMs = SLICE_BUDGET_MS,
): Promise<boolean> {
    const start = Date.now();
    const d = await claim(jobId, runToken, start);
    if (!d) return false;
    const ref = db.collection(PUBLISH_JOBS).doc(jobId);
    const ids: string[] = d.draftIds || [];
    let cursor: number = d.cursor || 0;
    while (cursor < ids.length && Date.now() - start < budgetMs) {
        const id = ids[cursor];
        const update: Record<string, any> = { cursor: cursor + 1, updatedAt: FieldValue.serverTimestamp(), leaseUntil: Date.now() + LEASE_MS };
        try {
            await publish(id, d.ownerUid);
            update.published = FieldValue.arrayUnion(id);
        } catch (e: any) {
            update[`errors.${id}`] = String(e?.message || 'Publish failed').slice(0, 300);
        }
        await ref.update(update);
        cursor++;
    }
    const more = cursor < ids.length;
    await ref.update({ status: more ? 'queued' : 'done', leaseUntil: 0, updatedAt: FieldValue.serverTimestamp() });
    return more;
}

/** Fire the worker route for the next slice without waiting for it to finish. */
export async function kickPublishJob(jobId: string, runToken: string, origin?: string) {
    const base = origin || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:9007';
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 3000);
    try {
        await fetch(`${base}/api/jobs/publish`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ jobId, runToken }),
            signal: ctrl.signal,
        });
    } catch {
        // Abort after handoff is expected; the worker keeps running server-side.
    } finally {
        clearTimeout(t);
    }
}
