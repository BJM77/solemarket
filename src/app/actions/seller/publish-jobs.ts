'use server';

import { requireUidFromToken } from '@/lib/firebase/session-user';
import { firestoreDb as db } from '@/lib/firebase/admin';
import { createPublishJob, kickPublishJob, toView, PUBLISH_JOBS, type PublishJobView } from '@/lib/jobs/publish-job';

/** Start a background publish job. Safe to close the tab afterwards. */
export async function startBulkPublishJobAction(draftIds: string[], idToken: string): Promise<{ jobId: string }> {
    if (!Array.isArray(draftIds) || !draftIds.length) throw new Error('Select drafts to publish.');
    const uid = await requireUidFromToken(idToken);
    const { jobId, runToken } = await createPublishJob(uid, draftIds);
    await kickPublishJob(jobId, runToken);
    return { jobId };
}

/** Progress for the owner. Also re-kicks a job whose worker stalled. */
export async function getBulkPublishJobAction(jobId: string, idToken: string): Promise<PublishJobView | null> {
    const uid = await requireUidFromToken(idToken);
    if (typeof jobId !== 'string' || !jobId) return null;
    const snap = await db.collection(PUBLISH_JOBS).doc(jobId).get();
    if (!snap.exists) return null;
    const d = snap.data();
    if (d.ownerUid !== uid) return null;
    if ((d.status === 'queued' || d.status === 'running') && (d.leaseUntil || 0) < Date.now()) {
        await kickPublishJob(jobId, d.runToken);
    }
    return toView(jobId, d);
}
