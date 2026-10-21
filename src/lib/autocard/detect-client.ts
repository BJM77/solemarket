import type { Background } from './detect';
import { analyseFrame, type FrameAnalysis } from './frame-analysis';
import type { Sleeve } from './sleeve';

export interface WorkerRequest { id: number; w: number; h: number; bg: Background; sleeve: Sleeve; buffer?: ArrayBuffer; bitmap?: ImageBitmap }
export type WorkerResponse = { id: number; ok: true; result: FrameAnalysis } | { id: number; ok: false; error: string };

/**
 * Runs frame analysis in a Web Worker (ImageBitmap + OffscreenCanvas where supported,
 * otherwise a transferred ImageData buffer). Falls back to the main thread when Workers
 * are unavailable or the worker fails, so results are always the same function's output.
 */
export class DetectClient {
  private worker: Worker | null = null;
  private seq = 0;
  private pending = new Map<number, (r: FrameAnalysis | null) => void>();
  private useBitmap = false;
  constructor(factory?: () => Worker) {
    try {
      if (typeof Worker !== 'undefined' && factory) {
        this.worker = factory();
        this.useBitmap = typeof OffscreenCanvas !== 'undefined' && typeof createImageBitmap === 'function';
        this.worker.onmessage = (ev: MessageEvent<WorkerResponse>) => {
          const cb = this.pending.get(ev.data.id); this.pending.delete(ev.data.id);
          cb?.(ev.data.ok ? ev.data.result : null);
        };
        this.worker.onerror = () => this.fallback();
      }
    } catch { this.worker = null; }
  }

  get usingWorker() { return !!this.worker; }

  private fallback() {
    this.worker?.terminate(); this.worker = null;
    this.pending.forEach((cb) => cb(null)); this.pending.clear();
  }

  /** Analyse one video frame. `ctx` is the main-thread analysis canvas (used for the buffer path and fallback). */
  async analyse(video: CanvasImageSource, ctx: CanvasRenderingContext2D, w: number, h: number, bg: Background, sleeve: Sleeve): Promise<FrameAnalysis> {
    if (this.worker) {
      const id = ++this.seq;
      try {
        let msg: WorkerRequest, transfer: Transferable[];
        if (this.useBitmap) {
          const bitmap = await createImageBitmap(video as ImageBitmapSource);
          msg = { id, w, h, bg, sleeve, bitmap }; transfer = [bitmap];
        } else {
          ctx.drawImage(video, 0, 0, w, h);
          const buffer = ctx.getImageData(0, 0, w, h).data.buffer as ArrayBuffer;
          msg = { id, w, h, bg, sleeve, buffer }; transfer = [buffer];
        }
        const res = await new Promise<FrameAnalysis | null>((resolve) => { this.pending.set(id, resolve); this.worker!.postMessage(msg, transfer); });
        if (res) return res;
        if (this.useBitmap) { this.useBitmap = false; } // e.g. OffscreenCanvas 2D missing: retry with buffers next frame
      } catch { this.useBitmap = false; }
    }
    ctx.drawImage(video, 0, 0, w, h);
    return analyseFrame(ctx.getImageData(0, 0, w, h).data, w, h, bg, sleeve);
  }

  dispose() { this.fallback(); }
}
