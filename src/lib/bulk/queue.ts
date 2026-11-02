/** Small promise queue with limited concurrency and per-task retry, for bulk AI drafting. */

export type TaskStatus = 'queued' | 'running' | 'done' | 'error';
export interface TaskState<R> { id: string; status: TaskStatus; attempts: number; result?: R; error?: string }

export interface QueueOptions<R> {
  concurrency?: number;
  retries?: number;           // automatic retries after the first attempt
  retryDelayMs?: number;
  onUpdate?: (s: TaskState<R>) => void;
}

export class TaskQueue<R> {
  private pending: { id: string; run: () => Promise<R> }[] = [];
  private running = 0;
  private states = new Map<string, TaskState<R>>();
  private idleWaiters: (() => void)[] = [];
  readonly concurrency: number;
  readonly retries: number;
  readonly retryDelayMs: number;
  private onUpdate?: (s: TaskState<R>) => void;

  constructor(opts: QueueOptions<R> = {}) {
    this.concurrency = Math.max(1, opts.concurrency ?? 3);
    this.retries = Math.max(0, opts.retries ?? 1);
    this.retryDelayMs = opts.retryDelayMs ?? 1500;
    this.onUpdate = opts.onUpdate;
  }

  add(id: string, run: () => Promise<R>): void {
    this.set({ id, status: 'queued', attempts: this.states.get(id)?.attempts ?? 0 });
    this.pending.push({ id, run });
    this.pump();
  }

  get(id: string) { return this.states.get(id); }
  get activeCount() { return this.running; }
  get queuedCount() { return this.pending.length; }
  counts() {
    const c = { queued: 0, running: 0, done: 0, error: 0 };
    this.states.forEach((s) => { c[s.status]++; });
    return c;
  }

  /** Resolves when nothing is queued or running. */
  onIdle(): Promise<void> {
    if (!this.running && !this.pending.length) return Promise.resolve();
    return new Promise((r) => this.idleWaiters.push(r));
  }

  private set(s: TaskState<R>) { this.states.set(s.id, s); this.onUpdate?.(s); }

  private pump() {
    while (this.running < this.concurrency && this.pending.length) {
      const task = this.pending.shift()!;
      this.running++;
      void this.exec(task).finally(() => {
        this.running--;
        this.pump();
        if (!this.running && !this.pending.length) this.idleWaiters.splice(0).forEach((r) => r());
      });
    }
  }

  private async exec(task: { id: string; run: () => Promise<R> }) {
    let attempts = this.states.get(task.id)?.attempts ?? 0;
    for (let i = 0; i <= this.retries; i++) {
      attempts++;
      this.set({ id: task.id, status: 'running', attempts });
      try {
        const result = await task.run();
        this.set({ id: task.id, status: 'done', attempts, result });
        return;
      } catch (e: any) {
        if (i === this.retries) { this.set({ id: task.id, status: 'error', attempts, error: e?.message || String(e) }); return; }
        if (this.retryDelayMs) await new Promise((r) => setTimeout(r, this.retryDelayMs));
      }
    }
  }
}
