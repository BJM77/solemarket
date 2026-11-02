'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useUser } from '@/firebase';
import AutoCardCapture from '@/components/autocard/AutoCardCapture';
import { TaskQueue, type TaskState } from '@/lib/bulk/queue';
import { createCardDraft } from '@/lib/bulk/process-card';
import DraftReviewGrid from './DraftReviewGrid';

type Result = Awaited<ReturnType<typeof createCardDraft>>;
let seq = 0;

/** Autofast: AutoCard scans front + back, then saves a draft in the background and resets for the next card. */
export default function AutofastClient() {
  const { user } = useUser();
  const router = useRouter();
  const [states, setStates] = useState<Record<string, TaskState<Result>>>({});
  const [reviewing, setReviewing] = useState(false);
  const jobs = useRef(new Map<string, { front: Blob; back: Blob }>());
  const queueRef = useRef<TaskQueue<Result> | null>(null);
  if (!queueRef.current) queueRef.current = new TaskQueue<Result>({ concurrency: 3, retries: 1, onUpdate: (s) => setStates((c) => ({ ...c, [s.id]: s })) });

  const run = useCallback((id: string) => {
    const j = jobs.current.get(id);
    if (j && user) queueRef.current!.add(id, () => createCardDraft(user.uid, j.front, j.back));
  }, [user]);

  const onPair = useCallback((front: Blob, back: Blob) => {
    if (!user) { router.push('/sign-in?redirect=/sell/autofast'); return; }
    const id = `a${++seq}`;
    jobs.current.set(id, { front, back });
    run(id);
  }, [user, router, run]);

  const list = Object.values(states);
  const c = useMemo(() => ({
    done: list.filter((s) => s.status === 'done').length,
    error: list.filter((s) => s.status === 'error').length,
    busy: list.filter((s) => s.status === 'queued' || s.status === 'running').length,
  }), [list]);
  const draftIds = list.map((s) => s.result?.draftId).filter((x): x is string => !!x);

  if (reviewing) return (
    <div className="space-y-3">
      <Button variant="outline" onClick={() => setReviewing(false)}>← Back to scanning</Button>
      <DraftReviewGrid ids={draftIds} />
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="sticky top-0 z-10 rounded-xl border border-border bg-white p-3 flex flex-wrap items-center gap-2" data-testid="autofast-status">
        <span className="text-sm font-semibold mr-auto">{c.done} saved{c.busy ? ` · ${c.busy} processing` : ''}{c.error ? ` · ${c.error} failed` : ''}</span>
        {c.error > 0 && <Button variant="outline" size="sm" onClick={() => list.filter((s) => s.status === 'error').forEach((s) => run(s.id))}>Retry failed</Button>}
        <Button size="sm" className="text-slate-900 font-semibold" onClick={() => setReviewing(true)}>Review drafts</Button>
      </div>
      <AutoCardCapture rapid onPair={onPair} />
    </div>
  );
}
