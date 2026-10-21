/// <reference lib="webworker" />
import { analyseFrame } from './frame-analysis';
import type { WorkerRequest, WorkerResponse } from './detect-client';

let canvas: OffscreenCanvas | null = null;

self.onmessage = (ev: MessageEvent<WorkerRequest>) => {
  const m = ev.data;
  try {
    let rgba: Uint8ClampedArray;
    if (m.bitmap) {
      if (!canvas || canvas.width !== m.w || canvas.height !== m.h) canvas = new OffscreenCanvas(m.w, m.h);
      const ctx = canvas.getContext('2d', { willReadFrequently: true }) as OffscreenCanvasRenderingContext2D;
      ctx.drawImage(m.bitmap, 0, 0, m.w, m.h);
      m.bitmap.close();
      rgba = ctx.getImageData(0, 0, m.w, m.h).data;
    } else {
      rgba = new Uint8ClampedArray(m.buffer!);
    }
    const res: WorkerResponse = { id: m.id, ok: true, result: analyseFrame(rgba, m.w, m.h, m.bg, m.sleeve) };
    (self as unknown as Worker).postMessage(res);
  } catch (e: any) {
    (self as unknown as Worker).postMessage({ id: m.id, ok: false, error: String(e?.message ?? e) } satisfies WorkerResponse);
  }
};
