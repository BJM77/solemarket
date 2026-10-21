/** Shutter feedback for AutoCard: click sound (Web Audio), haptics and a remembered mute. */
export const MUTE_STORAGE_KEY = 'autocard.muted';
export const VIBRATE_PATTERN = [40, 60, 40];
export const FLASH_MS = 180;

export function loadMuted(storage: Pick<Storage, 'getItem'> | null | undefined): boolean {
  try { return storage?.getItem(MUTE_STORAGE_KEY) === '1'; } catch { return false; }
}
export function saveMuted(storage: Pick<Storage, 'setItem'> | null | undefined, muted: boolean): void {
  try { storage?.setItem(MUTE_STORAGE_KEY, muted ? '1' : '0'); } catch { /* private mode */ }
}

/** Vibrate where supported (Android Chrome). iOS Safari has no navigator.vibrate: silent no-op. */
export function vibrate(nav: { vibrate?: (p: number[]) => boolean } | undefined = typeof navigator !== 'undefined' ? (navigator as any) : undefined): boolean {
  try { return typeof nav?.vibrate === 'function' ? !!nav.vibrate(VIBRATE_PATTERN) : false; } catch { return false; }
}

/** Short synthesized shutter click. `unlock()` must be called from a user gesture (iOS). */
export class ShutterSound {
  private ctx: AudioContext | null = null;
  unlock() {
    try {
      const AC = (globalThis as any).AudioContext || (globalThis as any).webkitAudioContext;
      if (!AC) return;
      this.ctx ??= new AC();
      const ctx = this.ctx!;
      if (ctx.state === 'suspended') void ctx.resume();
      // Play one silent sample inside the gesture so iOS fully unlocks output.
      const b = ctx.createBuffer(1, 1, 22050); const s = ctx.createBufferSource(); s.buffer = b; s.connect(ctx.destination); s.start(0);
    } catch { /* no audio */ }
  }
  play() {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;
    try {
      const len = Math.floor(ctx.sampleRate * 0.06);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) { const t = i / len; d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 4) * (i < len * 0.4 || i > len * 0.5 ? 1 : 0.2); }
      const src = ctx.createBufferSource(); src.buffer = buf;
      const gain = ctx.createGain(); gain.gain.value = 0.35;
      const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1200;
      src.connect(hp).connect(gain).connect(ctx.destination); src.start();
    } catch { /* ignore */ }
  }
  dispose() { try { void this.ctx?.close(); } catch { /* ignore */ } this.ctx = null; }
}

/** Best-effort tap to focus. Returns true only if the browser accepted a constraint. */
export async function tapToFocus(track: MediaStreamTrack | null | undefined, x: number, y: number): Promise<boolean> {
  try {
    const caps: any = track?.getCapabilities?.();
    if (!track || !caps) return false;
    const modes: string[] = Array.isArray(caps.focusMode) ? caps.focusMode : [];
    const poi = 'pointsOfInterest' in caps;
    if (!poi && !modes.length) return false;
    const c: any = {};
    if (poi) c.pointsOfInterest = [{ x: Math.min(1, Math.max(0, x)), y: Math.min(1, Math.max(0, y)) }];
    if (modes.includes('single-shot')) c.focusMode = 'single-shot';
    else if (modes.includes('continuous')) c.focusMode = 'continuous';
    await track.applyConstraints({ advanced: [c] });
    return true;
  } catch { return false; }
}
