'use client';

import { getCurrentUserIdToken } from '@/lib/firebase/auth';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { detectCard, laplacianVariance, toGray, type Background } from '@/lib/autocard/detect';
import { CaptureGate, type GateState } from '@/lib/autocard/gate';
import { CARD_ASPECT, type Quad } from '@/lib/autocard/geometry';
import { OUTPUT_H, OUTPUT_W, scaleQuad, warpQuad } from '@/lib/autocard/warp';
import { uploadImages } from '@/lib/firebase/storage';
import { saveDraftListing } from '@/app/actions/seller/sell';

type Side = 'front' | 'back';
const ANALYSIS_W = 320;
const FRAME_INTERVAL_MS = 80;

/** Centre crop at card aspect, used by the manual shutter when no card is detected. */
function centreQuad(w: number, h: number): Quad {
  let ch = h * 0.8, cw = ch * CARD_ASPECT;
  if (cw > w * 0.8) { cw = w * 0.8; ch = cw / CARD_ASPECT; }
  const x0 = (w - cw) / 2, y0 = (h - ch) / 2;
  return [{ x: x0, y: y0 }, { x: x0 + cw, y: y0 }, { x: x0 + cw, y: y0 + ch }, { x: x0, y: y0 + ch }];
}

export default function AutoCardCapture() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const analysisRef = useRef<HTMLCanvasElement | null>(null);
  const gateRef = useRef(new CaptureGate());
  const lastQuadRef = useRef<Quad | null>(null);
  const busyRef = useRef(false);
  const [side, setSide] = useState<Side>('front');
  const [shots, setShots] = useState<Partial<Record<Side, { blob: Blob; url: string }>>>({});
  const [quad, setQuad] = useState<Quad | null>(null);
  const [dims, setDims] = useState({ w: ANALYSIS_W, h: 427 });
  const [gate, setGate] = useState<GateState | null>(null);
  const [bg, setBg] = useState<Background>('auto');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { user } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const done = !!shots.front && !!shots.back;

  // Camera lifecycle
  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera not supported in this browser');
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        if (cancelled) return stream.getTracks().forEach((t) => t.stop());
        const v = videoRef.current!;
        v.srcObject = stream;
        await v.play().catch(() => {});
      } catch (e: any) {
        setCameraError(e?.message || 'Could not open the camera');
      }
    })();
    return () => { cancelled = true; stream?.getTracks().forEach((t) => t.stop()); };
  }, []);

  const capture = useCallback(async (q: Quad | null, aw: number, ah: number) => {
    const v = videoRef.current;
    if (!v || !v.videoWidth || busyRef.current) return;
    busyRef.current = true;
    try {
      const vw = v.videoWidth, vh = v.videoHeight;
      const full = document.createElement('canvas');
      full.width = vw; full.height = vh;
      const fctx = full.getContext('2d', { willReadFrequently: true })!;
      fctx.drawImage(v, 0, 0, vw, vh);
      const src = fctx.getImageData(0, 0, vw, vh);
      const fq = q ? scaleQuad(q, vw / aw, vh / ah) : centreQuad(vw, vh);
      const out = warpQuad(src.data, vw, vh, fq, OUTPUT_W, OUTPUT_H);
      const oc = document.createElement('canvas');
      oc.width = OUTPUT_W; oc.height = OUTPUT_H;
      oc.getContext('2d')!.putImageData(new ImageData(out as any, OUTPUT_W, OUTPUT_H), 0, 0);
      const blob: Blob = await new Promise((res, rej) => oc.toBlob((b) => (b ? res(b) : rej(new Error('encode failed'))), 'image/jpeg', 0.92));
      setShots((s) => {
        if (s[side]) URL.revokeObjectURL(s[side]!.url);
        return { ...s, [side]: { blob, url: URL.createObjectURL(blob) } };
      });
      setSide((cur) => (cur === 'front' ? 'back' : cur));
      gateRef.current.reset();
    } finally {
      // short cool-down so flipping the card doesn't trigger an instant second shot
      setTimeout(() => { busyRef.current = false; }, 900);
    }
  }, [side]);

  // Analysis loop
  useEffect(() => {
    if (done) return;
    let raf = 0, last = 0;
    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);
      const v = videoRef.current;
      if (!v || !v.videoWidth || t - last < FRAME_INTERVAL_MS || busyRef.current) return;
      last = t;
      const aw = ANALYSIS_W, ah = Math.round((ANALYSIS_W * v.videoHeight) / v.videoWidth);
      const c = (analysisRef.current ??= document.createElement('canvas'));
      if (c.width !== aw || c.height !== ah) { c.width = aw; c.height = ah; setDims({ w: aw, h: ah }); }
      const ctx = c.getContext('2d', { willReadFrequently: true })!;
      ctx.drawImage(v, 0, 0, aw, ah);
      const g = toGray(ctx.getImageData(0, 0, aw, ah).data, aw, ah);
      const d = detectCard(g, aw, ah, bg);
      let sharp = 0;
      if (d.quad) {
        const xs = d.quad.map((p) => p.x), ys = d.quad.map((p) => p.y);
        sharp = laplacianVariance(g, aw, ah, { x0: Math.min(...xs) | 0, y0: Math.min(...ys) | 0, x1: Math.max(...xs) | 0, y1: Math.max(...ys) | 0 });
      }
      const st = gateRef.current.update(d, sharp, t);
      lastQuadRef.current = d.quad;
      setQuad(d.quad);
      setGate(st);
      if (st.ok) void capture(d.quad, aw, ah);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [bg, capture, done]);

  const retake = (s: Side) => {
    setShots((cur) => { if (cur[s]) URL.revokeObjectURL(cur[s]!.url); const n = { ...cur }; delete n[s]; return n; });
    setSide(s);
    gateRef.current.reset();
  };

  const manualShutter = () => void capture(lastQuadRef.current, dims.w, dims.h);

  const save = async () => {
    if (!shots.front || !shots.back) return;
    if (!user) { router.push('/sign-in?redirect=/autocard'); return; }
    setSaving(true);
    try {
      const files = [
        new File([shots.front.blob], 'autocard-front.jpg', { type: 'image/jpeg' }),
        new File([shots.back.blob], 'autocard-back.jpg', { type: 'image/jpeg' }),
      ];
      const imageUrls = await uploadImages(files, `products/${user.uid}`);
      const draftId = await saveDraftListing((await getCurrentUserIdToken()) ?? '', {
        title: 'Card (AutoCard draft)', price: 0, category: 'Collector Cards', condition: 'Used', quantity: 1,
        isReverseBidding: false, autoRepricingEnabled: false, isVault: false, imageUrls,
      } as any);
      toast({ title: 'Draft created', description: 'Add the details and publish.' });
      router.push(`/sell/create?edit=${draftId}`);
    } catch (e: any) {
      toast({ title: 'Could not save', description: e?.message || 'Upload failed', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const nextProduct = () => { (['front', 'back'] as Side[]).forEach((s) => shots[s] && URL.revokeObjectURL(shots[s]!.url)); setShots({}); setSide('front'); gateRef.current.reset(); };

  const ready = gate?.ok || (gate?.reason === 'unstable' && gate.progress > 0);
  const stroke = gate?.ok ? '#22c55e' : ready ? '#facc15' : '#ef4444';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-sm" role="group" aria-label="Background">
        <span className="font-medium">Background:</span>
        {(['auto', 'white', 'black'] as Background[]).map((b) => (
          <Button key={b} size="sm" variant={bg === b ? 'default' : 'outline'} onClick={() => setBg(b)} aria-pressed={bg === b}>{b[0].toUpperCase() + b.slice(1)}</Button>
        ))}
      </div>

      {!done && (
        <div className="relative w-full overflow-hidden rounded-xl bg-black" style={{ aspectRatio: `${dims.w} / ${dims.h}` }}>
          <video ref={videoRef} playsInline muted className="absolute inset-0 h-full w-full object-cover" data-testid="autocard-video" />
          <svg className="absolute inset-0 h-full w-full pointer-events-none" viewBox={`0 0 ${dims.w} ${dims.h}`} preserveAspectRatio="none" aria-hidden>
            {quad && <polygon data-testid="autocard-outline" points={quad.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke={stroke} strokeWidth={3} />}
            {quad && <circle cx={(quad[0].x + quad[1].x) / 2} cy={(quad[0].y + quad[1].y) / 2} r={4} fill={stroke} />}
          </svg>
          <div className="absolute top-2 left-2 rounded-full bg-black/70 px-3 py-1 text-xs font-bold text-white">
            {side === 'front' ? '1 / 2 Front' : '2 / 2 Back'}
          </div>
          <div className="absolute bottom-3 inset-x-3 rounded-lg bg-black/70 px-3 py-2 text-center text-white" aria-live="polite" data-testid="autocard-guidance">
            {cameraError ? `Camera unavailable: ${cameraError}` : gate?.message ?? 'Starting camera…'}
            {gate && !gate.ok && gate.progress > 0 && (
              <div className="mt-1 h-1 w-full rounded bg-white/30"><div className="h-1 rounded bg-green-400" style={{ width: `${gate.progress * 100}%` }} /></div>
            )}
          </div>
        </div>
      )}

      {!done && (
        <Button onClick={manualShutter} variant="secondary" className="w-full h-12" disabled={!!cameraError}>
          Take photo manually ({side})
        </Button>
      )}

      <div className="grid grid-cols-2 gap-3">
        {(['front', 'back'] as Side[]).map((s) => (
          <div key={s} className="space-y-2">
            <div className="text-sm font-medium capitalize">{s}</div>
            <div className="aspect-[5/7] rounded-lg border bg-muted overflow-hidden">
              {shots[s] ? <img src={shots[s]!.url} alt={`Captured ${s} of card`} className="h-full w-full object-cover" data-testid={`autocard-${s}`} /> : null}
            </div>
            {shots[s] && <Button size="sm" variant="outline" className="w-full" onClick={() => retake(s)}>Retake {s}</Button>}
          </div>
        ))}
      </div>

      {done && (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button className="flex-1 h-12" onClick={save} disabled={saving}>{saving ? 'Uploading…' : 'Create listing draft'}</Button>
          <Button className="flex-1 h-12" variant="outline" onClick={nextProduct} disabled={saving}>Discard & start over</Button>
        </div>
      )}
    </div>
  );
}
