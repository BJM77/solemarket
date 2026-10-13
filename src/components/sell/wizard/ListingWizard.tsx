'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Camera, Check, ChevronLeft, ChevronRight, Loader2, Sparkles, Trash2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/firebase';
import { getCurrentUserIdToken } from '@/lib/firebase/auth';
import { uploadImages } from '@/lib/firebase/storage';
import { createProductAction } from '@/app/actions/marketplace/products';
import { suggestListingDetails } from '@/ai/flows/suggest-listing-details';
import { cn } from '@/lib/utils/ui';
import {
  CONDITIONS, EMPTY_DRAFT, SHOT_LISTS, STEPS, WIZARD_CATEGORIES,
  draftToProduct, validateStep, type StepId, type WizardCategory, type WizardDraft,
} from '@/lib/listing-wizard/steps';

const DRAFT_KEY = 'benched:listing-wizard:v1';
const STEP_TITLES: Record<StepId, string> = {
  category: 'What are you selling?',
  photos: 'Add photos',
  details: 'Describe it',
  price: 'Set your price',
  review: 'Review & publish',
};

/**
 * Mobile-first, step-by-step listing flow:
 * category -> guided photos (required angles) -> details (optional AI fill) -> price -> review.
 * The draft (including already-uploaded photo URLs) autosaves to localStorage so a
 * dropped connection or app switch never loses work.
 */
export default function ListingWizard() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [draft, setDraft] = useState<WizardDraft>(EMPTY_DRAFT);
  const [stepIndex, setStepIndex] = useState(0);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [aiBusy, setAiBusy] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const step = STEPS[stepIndex];

  // Restore + autosave draft
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) setDraft({ ...EMPTY_DRAFT, ...JSON.parse(saved) });
    } catch { /* ignore */ }
  }, []);
  useEffect(() => {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch { /* quota */ }
  }, [draft]);
  useEffect(() => { headingRef.current?.focus(); setShowErrors(false); }, [stepIndex]);

  const errors = useMemo(() => validateStep(step, draft), [step, draft]);
  const update = (patch: Partial<WizardDraft>) => setDraft((d) => ({ ...d, ...patch }));

  if (!isUserLoading && !user) {
    router.replace('/sign-in?redirect=/sell/wizard');
    return null;
  }

  const onPhoto = async (shotId: string, file?: File | null) => {
    if (!file || !user) return;
    setUploading((u) => ({ ...u, [shotId]: true }));
    try {
      const [url] = await uploadImages([file], `products/${user.uid}`);
      setDraft((d) => ({ ...d, photos: { ...d.photos, [shotId]: url } }));
    } catch (e: any) {
      toast({ title: 'Upload failed', description: e?.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setUploading((u) => ({ ...u, [shotId]: false }));
    }
  };

  const runAi = async () => {
    const urls = Object.values(draft.photos).slice(0, 5);
    if (!urls.length) return;
    setAiBusy(true);
    try {
      const idToken = (await getCurrentUserIdToken()) || '';
      const s: any = await suggestListingDetails({ photoDataUris: urls, category: draft.category, idToken });
      update({
        title: draft.title || s?.title || '',
        brand: draft.brand || s?.brand || '',
        size: draft.size || s?.size || '',
        description: draft.description || s?.description || '',
        price: draft.price || (s?.price ? String(Math.round(s.price)) : ''),
      });
      toast({ title: 'Details suggested', description: 'Check everything before publishing.' });
    } catch (e: any) {
      toast({ title: 'AI suggestions unavailable', description: e?.message || 'Fill the details manually.', variant: 'destructive' });
    } finally {
      setAiBusy(false);
    }
  };

  const next = () => {
    if (errors.length) { setShowErrors(true); return; }
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  };
  const back = () => setStepIndex((i) => Math.max(i - 1, 0));

  const publish = async () => {
    const problems = validateStep('review', draft);
    if (problems.length) { setShowErrors(true); return; }
    setPublishing(true);
    try {
      const token = await getCurrentUserIdToken();
      if (!token) throw new Error('Please sign in again.');
      const result = await createProductAction(token, draftToProduct(draft) as any);
      if (!result.success) throw new Error((result as any).error || 'Could not publish');
      localStorage.removeItem(DRAFT_KEY);
      toast({ title: 'Listing submitted', description: 'It will appear once it passes review.' });
      router.push(`/product/${(result as any).productId}`);
    } catch (e: any) {
      toast({ title: 'Publish failed', description: e?.message, variant: 'destructive' });
    } finally {
      setPublishing(false);
    }
  };

  const shots = draft.category ? SHOT_LISTS[draft.category] : [];
  const anyUploading = Object.values(uploading).some(Boolean);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-32 pt-6 md:pb-12">
      <nav aria-label="Listing steps" className="mb-6">
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">Step {stepIndex + 1} of {STEPS.length}</p>
        <Progress value={((stepIndex + 1) / STEPS.length) * 100} aria-label="Listing progress" />
      </nav>

      <p className="mb-2 text-xs text-muted-foreground">
        Need grading, auctions or bulk tools? <Link href="/sell/create" className="underline">Use the full listing form</Link>.
      </p>
      <h1 ref={headingRef} tabIndex={-1} className="mb-6 text-2xl font-black tracking-tight outline-none md:text-3xl">{STEP_TITLES[step]}</h1>

      {step === 'category' && (
        <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Category">
          {WIZARD_CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={draft.category === c}
              onClick={() => update({ category: c as WizardCategory, condition: '' })}
              className={cn('min-h-24 rounded-2xl border-2 p-4 text-left font-bold transition-colors',
                draft.category === c ? 'border-primary bg-primary/10' : 'border-border hover:border-foreground/40')}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {step === 'photos' && (
        <>
          <p className="mb-4 text-sm text-muted-foreground">Required photos are marked. Clear photos of tags and flaws sell faster and reduce disputes.</p>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {shots.map((s) => {
              const url = draft.photos[s.id];
              return (
                <li key={s.id} className="flex flex-col">
                  <label className={cn('relative flex aspect-square cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed text-center',
                    url ? 'border-solid border-emerald-500' : 'border-border hover:border-foreground/40')}>
                    {url ? (
                      <Image src={url} alt={s.label} fill sizes="(max-width: 640px) 50vw, 200px" className="object-cover" />
                    ) : uploading[s.id] ? (
                      <Loader2 className="h-6 w-6 animate-spin" aria-label="Uploading" />
                    ) : (
                      <>
                        <Camera className="mb-2 h-6 w-6" aria-hidden />
                        <span className="px-2 text-xs text-muted-foreground">{s.hint}</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="sr-only"
                      aria-label={`${url ? 'Replace' : 'Add'} ${s.label} photo`}
                      onChange={(e) => onPhoto(s.id, e.target.files?.[0])}
                    />
                  </label>
                  <div className="mt-1 flex items-center justify-between gap-1">
                    <span className="text-xs font-bold">{s.label}{s.required && <span className="text-destructive"> *</span>}</span>
                    {url && (
                      <Button type="button" variant="ghost" size="icon" className="h-9 w-9" aria-label={`Remove ${s.label} photo`}
                        onClick={() => { const { [s.id]: _removed, ...rest } = draft.photos; update({ photos: rest }); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {step === 'details' && draft.category && (
        <div className="space-y-5">
          <Button type="button" variant="secondary" onClick={runAi} disabled={aiBusy || !Object.keys(draft.photos).length} className="w-full gap-2">
            {aiBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Fill details from my photos
          </Button>
          <div className="space-y-2">
            <Label htmlFor="wz-title">Title</Label>
            <Input id="wz-title" value={draft.title} maxLength={100} autoComplete="off" placeholder="e.g. Nike Kobe 6 Protro Grinch" onChange={(e) => update({ title: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="wz-brand">Brand</Label>
              <Input id="wz-brand" value={draft.brand} autoComplete="off" onChange={(e) => update({ brand: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wz-size">{draft.category === 'Sneakers' ? 'US size' : 'Size'}</Label>
              <Input id="wz-size" value={draft.size} inputMode={draft.category === 'Sneakers' ? 'decimal' : 'text'} autoComplete="off" onChange={(e) => update({ size: e.target.value })} />
            </div>
          </div>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Condition</legend>
            <div className="flex flex-wrap gap-2">
              {CONDITIONS[draft.category].map((c) => (
                <button key={c} type="button" aria-pressed={draft.condition === c} onClick={() => update({ condition: c })}
                  className={cn('min-h-11 rounded-full border px-4 text-sm font-semibold', draft.condition === c ? 'border-primary bg-primary text-primary-foreground' : 'border-border')}>
                  {c}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="space-y-2">
            <Label htmlFor="wz-desc">Description <span className="text-muted-foreground">(optional)</span></Label>
            <Textarea id="wz-desc" rows={5} maxLength={2000} value={draft.description} onChange={(e) => update({ description: e.target.value })}
              placeholder="Wear, flaws, what's included (box, extra laces, receipt)..." />
          </div>
        </div>
      )}

      {step === 'price' && (
        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="wz-price">Price (AUD)</Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden>$</span>
              <Input id="wz-price" className="pl-7 text-lg" inputMode="decimal" value={draft.price} onChange={(e) => update({ price: e.target.value.replace(/[^0-9.]/g, '') })} />
            </div>
          </div>
          <label className="flex min-h-11 items-center justify-between gap-4 rounded-xl border p-4">
            <span>
              <span className="block font-semibold">Accept offers</span>
              <span className="text-xs text-muted-foreground">Buyers can send you offers below your price.</span>
            </span>
            <Switch checked={draft.isNegotiable} onCheckedChange={(v) => update({ isNegotiable: v })} aria-label="Accept offers" />
          </label>
        </div>
      )}

      {step === 'review' && draft.category && (
        <div className="space-y-4">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {shots.filter((s) => draft.photos[s.id]).map((s) => (
              <div key={s.id} className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl">
                <Image src={draft.photos[s.id]} alt={s.label} fill sizes="96px" className="object-cover" />
              </div>
            ))}
          </div>
          <dl className="divide-y rounded-2xl border text-sm">
            {[['Category', draft.category], ['Title', draft.title], ['Brand', draft.brand || '-'], ['Size', draft.size || '-'],
              ['Condition', draft.condition], ['Price', draft.price ? `$${draft.price}` : '-'], ['Offers', draft.isNegotiable ? 'Accepted' : 'Off']]
              .map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 p-3"><dt className="text-muted-foreground">{k}</dt><dd className="text-right font-semibold">{v}</dd></div>
              ))}
          </dl>
        </div>
      )}

      {showErrors && errors.length > 0 && (
        <div role="alert" className="mt-6 rounded-xl border border-destructive/50 bg-destructive/10 p-4 text-sm">
          <p className="mb-1 flex items-center gap-2 font-bold"><AlertCircle className="h-4 w-4" aria-hidden /> Before you continue</p>
          <ul className="list-disc pl-5">{errors.map((e) => <li key={e}>{e}</li>)}</ul>
        </div>
      )}

      {/* Sticky action bar (thumb-reachable on mobile, above the bottom nav) */}
      <div className="fixed inset-x-0 bottom-[4.5rem] z-40 border-t bg-background/95 p-3 backdrop-blur md:static md:mt-8 md:border-0 md:bg-transparent md:p-0">
        <div className="mx-auto flex max-w-2xl gap-3">
          {stepIndex > 0 && (
            <Button type="button" variant="outline" className="h-12 flex-1" onClick={back}><ChevronLeft className="mr-1 h-4 w-4" /> Back</Button>
          )}
          {step !== 'review' ? (
            <Button type="button" className="h-12 flex-[2]" onClick={next} disabled={anyUploading}>
              Continue <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button type="button" className="h-12 flex-[2]" onClick={publish} disabled={publishing || anyUploading}>
              {publishing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />} Publish listing
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
