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
import { refineCorners } from '@/lib/autocard/refine';
import { analyseLighting, normaliseColour } from '@/lib/autocard/lighting';
import { locateCard } from '@/lib/autocard/pipeline';
import { borderBandOk, cardSignature, isClipped, shapeCheck, signatureDistance, SAME_FACE_DISTANCE, type CardSignature } from '@/lib/autocard/validate';
import { polygonArea } from '@/lib/autocard/geometry';
import { uploadImages } from '@/lib/firebase/storage';
import { saveDraftListing } from '@/app/actions/seller/sell';
import { identifyCardForEbay } from '@/ai/flows/identify-card-autocard';
import { ebaySoldUrl } from '@/lib/autocard/ebay';
import { buildDraftFields } from '@/lib/autocard/draft';
import { handleStaleDeploy, isStaleServerActionError } from '@/lib/stale-deploy';
import { saveAutocardCaptures, loadAutocardCaptures, clearAutocardCaptures } from '@/lib/autocard/capture-persist';
import type { IdentifyCardResult } from '@/ai/flows/identify-card-autocard';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

type Side = 'front' | 'back';
const ANALYSIS_W = 320;
const FRAME_INTERVAL_MS = 100; // ~10 fps detection
const SHARPNESS_W = 640;        // common scale for comparing burst frames
const MAX_FULL_SIDE = 3200;     // cap full-res processing on huge photos
const BURST_FRAMES = 3;

type Frame = { canvas: HTMLCanvasElement; w: number; h: number; isPhoto: boolean };

function drawToCanvas(src: CanvasImageSource, sw: number, sh: number, maxSide = MAX_FULL_SIDE): Frame {
  const k = Math.min(1, maxSide / Math.max(sw, sh));
  const w = Math.round(sw * k), h = Math.round(sh * k);
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  canvas.getContext('2d', { willReadFrequently: true })!.drawImage(src, 0, 0, w, h);
  return { canvas, w, h, isPhoto: false };
}

/** Sharpness (variance of Laplacian) over the card, measured at a common 640px scale. */
function frameSharpness(f: Frame, bg: Background): { sharp: number; quad: Quad | null; sw: number; sh: number } {
  const sw = SHARPNESS_W, sh = Math.round((SHARPNESS_W * f.h) / f.w);
  const c = document.createElement('canvas'); c.width = sw; c.height = sh;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(f.canvas, 0, 0, sw, sh);
  const g = toGray(ctx.getImageData(0, 0, sw, sh).data, sw, sh);
  const d = detectCard(g, sw, sh, bg);
  const q = d.quad;
  const rect = q ? { x0: Math.min(...q.map((p) => p.x)) | 0, y0: Math.min(...q.map((p) => p.y)) | 0, x1: Math.max(...q.map((p) => p.x)) | 0, y1: Math.max(...q.map((p) => p.y)) | 0 } : undefined;
  return { sharp: laplacianVariance(g, sw, sh, rect), quad: q, sw, sh };
}

/** Downscaled JPEG data URI for AI identification (keeps the upload small). */
async function blobToSmallDataUri(blob: Blob, maxW = 800): Promise<string> {
  const bmp = await createImageBitmap(blob);
  const k = Math.min(1, maxW / bmp.width);
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close?.();
  return c.toDataURL('image/jpeg', 0.85);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

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
  const frontSigRef = useRef<CardSignature | null>(null);
  const lastQuadRef = useRef<Quad | null>(null);
  const busyRef = useRef(false);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [processing, setProcessing] = useState(false);
  const identityRef = useRef<{ key: string; res: Promise<IdentifyCardResult> } | null>(null);
  const [ebay, setEbay] = useState<{ open: boolean; busy: boolean; query: string; error?: string; identified?: string }>({ open: false, busy: false, query: '' });
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
        const track = stream.getVideoTracks()[0] ?? null;
        trackRef.current = track;
        const caps: any = track?.getCapabilities?.() ?? {};
        setTorchSupported(!!caps.torch);
        await v.play().catch(() => {});
      } catch (e: any) {
        setCameraError(e?.message || 'Could not open the camera');
      }
    })();
    return () => { cancelled = true; trackRef.current = null; stream?.getTracks().forEach((t) => t.stop()); };
  }, []);

  // Restore front/back captures after a stale-deploy reload so the user need not rescan.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const pending = await loadAutocardCaptures();
      if (!pending || cancelled) return;
      await clearAutocardCaptures();
      if (cancelled) return;
      const next: Partial<Record<Side, { blob: Blob; url: string }>> = {};
      if (pending.front) next.front = { blob: pending.front, url: URL.createObjectURL(pending.front) };
      if (pending.back) next.back = { blob: pending.back, url: URL.createObjectURL(pending.back) };
      if (!next.front && !next.back) return;
      setShots(next);
      setSide(next.front && next.back ? 'back' : next.front ? 'back' : 'front');
      toast({ title: 'Photos restored', description: 'Kept your scans after the site update.' });
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- restore once on mount
  }, []);

  const toggleTorch = useCallback(async () => {
    const t = trackRef.current;
    if (!t) return;
    const next = !torchOn;
    try {
      await t.applyConstraints({ advanced: [{ torch: next } as any] });
      setTorchOn(next);
    } catch {
      setTorchSupported(false);
    }
  }, [torchOn]);

  /** Burst of video frames (+ a full-res still when ImageCapture is available). */
  const grabFrames = useCallback(async (): Promise<Frame[]> => {
    const v = videoRef.current!;
    const frames: Frame[] = [];
    const IC = (globalThis as any).ImageCapture;
    const photoP: Promise<Frame | null> = (async () => {
      const t = trackRef.current;
      if (!IC || !t || torchOn) return null; // takePhoto can kill the torch on some Android phones
      try {
        const blob: Blob = await Promise.race([new IC(t).takePhoto(), sleep(2500).then(() => { throw new Error('timeout'); })]);
        const bmp = await createImageBitmap(blob);
        const f = drawToCanvas(bmp, bmp.width, bmp.height);
        bmp.close?.();
        return { ...f, isPhoto: true };
      } catch { return null; }
    })();
    for (let i = 0; i < BURST_FRAMES; i++) {
      frames.push(drawToCanvas(v, v.videoWidth, v.videoHeight));
      if (i < BURST_FRAMES - 1) await sleep(70);
    }
    const photo = await photoP;
    if (photo) frames.push(photo);
    return frames;
  }, [torchOn]);

  const capture = useCallback(async (q: Quad | null, aw: number, ah: number, manual = false) => {
    const v = videoRef.current;
    if (!v || !v.videoWidth || busyRef.current) return;
    busyRef.current = true;
    setProcessing(true);
    try {
      const frames = await grabFrames();
      // Keep the sharpest frame that still shows the card.
      let best: { f: Frame; sharp: number; quad: Quad | null; sw: number; sh: number } | null = null;
      for (const f of frames) {
        const m = frameSharpness(f, bg);
        const score = m.quad ? m.sharp : m.sharp * 0.01;
        if (!best || score > (best.quad ? best.sharp : best.sharp * 0.01)) best = { f, ...m };
      }
      const f = best!.f;
      const src = f.canvas.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, f.w, f.h);
      const gray = toGray(src.data, f.w, f.h);
      const hint = best!.quad ? scaleQuad(best!.quad, f.w / best!.sw, f.h / best!.sh) : !f.isPhoto && q ? scaleQuad(q, f.w / aw, f.h / ah) : null;
      // Re-detect + fit edge lines at full resolution, then verify the rectified card.
      const loc = hint || q ? locateCard(gray, f.w, f.h, bg, hint) : null;
      // Auto capture never falls back to a blind centre crop (that produced zoomed, cut-off
      // shots). If the full-res card fails the shape/context checks, keep searching.
      const reject = (msg: string) => { gateRef.current.reset(); setGate({ ok: false, reason: 'shape', message: msg, progress: 0 }); };
      let fq: Quad;
      if (loc) fq = loc.quad;
      else if (manual) fq = hint ?? centreQuad(f.w, f.h);
      else { reject('Move back so the whole card is visible'); return; }
      if (!manual) {
        if (isClipped(fq, f.w, f.h)) { reject('Move back so the whole card is visible'); return; }
        if (shapeCheck(fq)) { reject('Hold the phone flat and square above the card'); return; }
      }
      const out = warpQuad(src.data, f.w, f.h, fq, OUTPUT_W, OUTPUT_H);
      // Post-warp sanity at low res: uniform border on all sides, and the back must differ from the front.
      const SW = 252, SH = 352;
      const small = toGray(warpQuad(src.data, f.w, f.h, fq, SW, SH), SW, SH);
      if (!manual && !borderBandOk(small, SW, SH)) { reject('Move back so the whole card border is visible'); return; }
      const sig = cardSignature(small, SW, SH);
      if (side === 'back' && frontSigRef.current && signatureDistance(sig, frontSigRef.current) < SAME_FACE_DISTANCE) {
        reject('Flip the card over'); toast({ title: 'Flip the card over', description: 'That looks like the front again. Turn the card over to scan the back.' }); return;
      }
      if (side === 'front') frontSigRef.current = sig;
      normaliseColour(out);
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
    } catch (e: any) {
      toast({ title: 'Capture failed', description: e?.message || 'Try again', variant: 'destructive' });
    } finally {
      setProcessing(false);
      // short cool-down so flipping the card doesn't trigger an instant second shot
      setTimeout(() => { busyRef.current = false; }, 900);
    }
  }, [side, bg, grabFrames, toast]);

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
      if (d.quad) {
        // Line-fit corners even at preview scale so the tilt gate and outline are accurate.
        const r = refineCorners(g, aw, ah, d.quad, { samples: 24 });
        // Ignore refinements that collapse onto an inner rectangle.
        if (r.ok && polygonArea(r.quad) >= polygonArea(d.quad) * 0.9) d.quad = r.quad;
      }
      const light = d.quad ? analyseLighting(g, aw, ah, d.quad) : undefined;
      let sharp = 0;
      if (d.quad) {
        const xs = d.quad.map((p) => p.x), ys = d.quad.map((p) => p.y);
        sharp = laplacianVariance(g, aw, ah, { x0: Math.min(...xs) | 0, y0: Math.min(...ys) | 0, x1: Math.max(...xs) | 0, y1: Math.max(...ys) | 0 });
      }
      const st = gateRef.current.update(d, sharp, t, light);
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

  const manualShutter = () => void capture(lastQuadRef.current, dims.w, dims.h, true);

  const persistShotsForReload = useCallback(async () => {
    await saveAutocardCaptures({ front: shots.front?.blob, back: shots.back?.blob });
  }, [shots]);

  const save = async () => {
    if (!shots.front || !shots.back) return;
    if (!user) { router.push('/sign-in?redirect=/autocard'); return; }
    setSaving(true);
    try {
      const files = [
        new File([shots.front.blob], 'autocard-front.jpg', { type: 'image/jpeg' }),
        new File([shots.back.blob], 'autocard-back.jpg', { type: 'image/jpeg' }),
      ];
      // Identify (or reuse the eBay-button result) while the images upload.
      const [imageUrls, idRes] = await Promise.all([uploadImages(files, `products/${user.uid}`), identify()]);
      if (!idRes.ok && isStaleServerActionError(new Error(idRes.error || ''))) {
        if (handleStaleDeploy(new Error(idRes.error || ''), { beforeReload: persistShotsForReload })) return;
      }
      const fields = buildDraftFields(idRes.ok ? idRes.identity : null);
      const draftId = await saveDraftListing((await getCurrentUserIdToken()) ?? '', {
        ...fields, quantity: 1,
        isReverseBidding: false, autoRepricingEnabled: false, isVault: false, imageUrls,
      } as any);
      toast(idRes.ok
        ? { title: 'Draft created', description: 'Card details filled in. Check them, add a price and publish.' }
        : { title: 'Draft created', description: "Couldn't identify the card automatically. Add the details and a price, then publish." });
      router.push(`/sell/create?edit=${draftId}`);
    } catch (e: any) {
      if (handleStaleDeploy(e, { beforeReload: persistShotsForReload })) return;
      toast({ title: 'Could not save', description: e?.message || 'Upload failed', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  /** Identify once per front/back pair; the eBay button and draft save share the result. */
  const identify = (): Promise<IdentifyCardResult> => {
    const key = `${shots.front?.url}|${shots.back?.url}`;
    if (identityRef.current?.key === key) return identityRef.current.res;
    const res = (async (): Promise<IdentifyCardResult> => {
      const [front, back] = await Promise.all([blobToSmallDataUri(shots.front!.blob), blobToSmallDataUri(shots.back!.blob)]);
      return identifyCardForEbay((await getCurrentUserIdToken()) ?? '', front, back);
    })().catch((e: any): IdentifyCardResult => ({ ok: false, error: e?.message || 'Identification failed' }));
    identityRef.current = { key, res };
    // Failed attempts are not cached, so a retry can succeed.
    void res.then((r) => { if (!r.ok && identityRef.current?.key === key) identityRef.current = null; });
    return res;
  };

  /** Optional: identify the card with AI and open eBay AU sold listings. Never scrapes eBay. */
  const checkEbaySold = async () => {
    if (!shots.front || !shots.back || ebay.busy) return;
    if (!user) { router.push('/sign-in?redirect=/autocard'); return; }
    // Open the window synchronously on tap so popup blockers allow it; navigate it later.
    const win = window.open('about:blank', '_blank');
    try { if (win) { win.opener = null; win.document.title = 'Identifying card…'; win.document.body.innerHTML = '<p style="font-family:sans-serif;padding:24px">Identifying your card… eBay sold listings will open here.</p>'; } } catch { /* cross-origin guard */ }
    setEbay({ open: true, busy: true, query: '' });
    try {
      const res = await identify();
      if (!res.ok) {
        win?.close();
        if (handleStaleDeploy(new Error(res.error || ''), { beforeReload: persistShotsForReload })) return;
        setEbay({ open: true, busy: false, query: '', error: res.error });
        return;
      }
      if (win && !win.closed) win.location.href = ebaySoldUrl(res.query);
      setEbay({ open: true, busy: false, query: res.query, identified: res.query });
    } catch (e: any) {
      win?.close();
      if (handleStaleDeploy(e, { beforeReload: persistShotsForReload })) return;
      setEbay({ open: true, busy: false, query: '', error: e?.message || 'Identification failed. You can type a search instead.' });
    }
  };

  const nextProduct = () => { (['front', 'back'] as Side[]).forEach((s) => shots[s] && URL.revokeObjectURL(shots[s]!.url)); setShots({}); setSide('front'); frontSigRef.current = null; gateRef.current.reset(); };

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
        <div className="flex gap-2">
          <Button onClick={manualShutter} variant="secondary" className="flex-1 h-12" disabled={!!cameraError || processing}>
            {processing ? 'Processing…' : `Take photo manually (${side})`}
          </Button>
          {torchSupported && (
            <Button onClick={toggleTorch} variant={torchOn ? 'default' : gate?.ok === false && gate.reason === 'low_light' ? 'default' : 'outline'} className="h-12" aria-pressed={torchOn} data-testid="autocard-torch">
              {torchOn ? 'Torch off' : 'Torch on'}
            </Button>
          )}
        </div>
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
          <Button className="flex-1 h-12" onClick={save} disabled={saving}>{saving ? 'Identifying & uploading…' : 'Create listing draft'}</Button>
          <Button className="flex-1 h-12" variant="outline" onClick={checkEbaySold} disabled={saving || ebay.busy} data-testid="autocard-ebay">
            {ebay.busy ? 'Identifying…' : 'Check eBay sold'}
          </Button>
          <Button className="flex-1 h-12" variant="outline" onClick={nextProduct} disabled={saving}>Discard & start over</Button>
        </div>
      )}

      <Dialog open={ebay.open} onOpenChange={(o) => setEbay((e) => ({ ...e, open: o }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>eBay sold prices</DialogTitle>
            <DialogDescription>
              {ebay.busy ? 'Identifying the card from your photos…' : ebay.error ? ebay.error : 'Edit the search if anything looks wrong, then open eBay.'}
            </DialogDescription>
          </DialogHeader>
          <Input value={ebay.query} onChange={(e) => setEbay((s) => ({ ...s, query: e.target.value }))} placeholder="e.g. 2019 Panini Prizm Zion Williamson #248" disabled={ebay.busy} aria-label="eBay search" data-testid="autocard-ebay-query" />
          <DialogFooter>
            <Button asChild={!!ebay.query.trim() && !ebay.busy} disabled={!ebay.query.trim() || ebay.busy}>
              {ebay.query.trim() && !ebay.busy ? <a href={ebaySoldUrl(ebay.query)} target="_blank" rel="noopener noreferrer">Open eBay sold</a> : <span>Open eBay sold</span>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
