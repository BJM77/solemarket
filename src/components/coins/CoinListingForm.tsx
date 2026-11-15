'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { useUser } from '@/firebase';
import { getCurrentUserIdToken } from '@/lib/firebase/auth';
import { uploadImages } from '@/lib/firebase/storage';
import { processListingImage } from '@/lib/utils/image';
import { getDraftListing, saveDraftListing, publishListing } from '@/app/actions/seller/sell';
import { handleStaleDeploy } from '@/lib/stale-deploy';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { getProductUrl } from '@/lib/utils/url';
import { COIN_SUBCATEGORIES, BULLION_SUBCATEGORIES, coinListingClassification, isBullionListing } from '@/lib/coin-listings';
import { buildCoinListingData, COIN_METALS, COIN_CONDITIONS, COIN_GRADERS, type CoinFormValues } from '@/lib/coins/listing-form';

const MAX_PHOTOS = 6;

const EMPTY: CoinFormValues = {
  kind: 'coin',
  subCategory: 'Australian Coins',
  title: '',
  year: '',
  denomination: '',
  country: 'Australia',
  mint: '',
  metal: '',
  weight: '',
  purity: '',
  condition: 'Circulated',
  gradingCompany: 'Raw',
  grade: '',
  certNumber: '',
  price: '',
  quantity: '1',
  description: '',
  allowLocalPickup: true,
};

const selectClass = 'h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500';

/** Benched Coins sell form: one page, coin/bullion fields, publishes to the coins storefront only. */
export function CoinListingForm() {
  const router = useRouter();
  const params = useSearchParams();
  const editId = params.get('edit');
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();

  const [values, setValues] = useState<CoinFormValues>(EMPTY);
  const [existingUrls, setExistingUrls] = useState<string[]>([]);
  const [files, setFiles] = useState<{ file: File | Blob; preview: string }[]>([]);
  const [busy, setBusy] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = <K extends keyof CoinFormValues>(key: K, v: CoinFormValues[K]) => setValues((prev) => ({ ...prev, [key]: v }));

  // Editing an existing coin listing.
  useEffect(() => {
    if (!editId || !user) return;
    let cancelled = false;
    (async () => {
      try {
        setBusy('Loading listing…');
        const data = await getDraftListing(editId, (await getCurrentUserIdToken()) ?? '');
        if (cancelled || !data) return;
        const cls = coinListingClassification({ subCategory: data.subCategory, title: data.title, metal: data.metal });
        setValues({
          ...EMPTY,
          kind: isBullionListing(data) ? 'bullion' : 'coin',
          subCategory: cls.subCategory,
          title: data.title || '',
          year: data.year ? String(data.year) : '',
          denomination: data.denomination || data.model || '',
          country: data.country || 'Australia',
          mint: data.mint || data.brand || '',
          metal: data.metal || '',
          weight: data.weight || '',
          purity: data.purity || '',
          condition: COIN_CONDITIONS.includes(data.condition) ? data.condition : EMPTY.condition,
          gradingCompany: data.gradingCompany || 'Raw',
          grade: data.grade || '',
          certNumber: data.certNumber || '',
          price: data.price ? String(data.price) : '',
          quantity: data.quantity ? String(data.quantity) : '1',
          description: data.description || '',
          allowLocalPickup: data.allowLocalPickup !== false,
        });
        setExistingUrls(Array.isArray(data.imageUrls) ? data.imageUrls.filter(Boolean) : []);
      } catch (e: any) {
        toast({ title: "Couldn't load that listing", description: e?.message, variant: 'destructive' });
      } finally {
        if (!cancelled) setBusy('');
      }
    })();
    return () => { cancelled = true; };
  }, [editId, user, toast]);

  const subOptions = useMemo(
    () => (values.kind === 'bullion' ? BULLION_SUBCATEGORIES : COIN_SUBCATEGORIES.filter((s) => !BULLION_SUBCATEGORIES.includes(s))),
    [values.kind],
  );
  useEffect(() => {
    if (!subOptions.includes(values.subCategory)) set('subCategory', subOptions[0]);
  }, [subOptions, values.subCategory]);

  const photoCount = existingUrls.length + files.length;

  const addFiles = async (list: FileList | null) => {
    if (!list?.length) return;
    const room = MAX_PHOTOS - photoCount;
    const picked = Array.from(list).filter((f) => f.type.startsWith('image/')).slice(0, Math.max(0, room));
    const out: { file: File | Blob; preview: string }[] = [];
    for (const f of picked) {
      try {
        const r = await processListingImage(f);
        out.push({ file: r.file, preview: r.previewUrl });
      } catch {
        toast({ title: "Couldn't read that photo", description: 'Try a JPEG or PNG (HEIC photos from some iPhones need converting first).', variant: 'destructive' });
      }
    }
    setFiles((prev) => [...prev, ...out]);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data, errors: errs } = buildCoinListingData(values);
    if (photoCount === 0) errs.photos = 'Add at least one photo.';
    setErrors(errs);
    if (Object.keys(errs).length || !data) {
      toast({ title: 'Please check the highlighted fields', variant: 'destructive' });
      return;
    }
    if (!user) {
      toast({ title: 'Please sign in to list', variant: 'destructive' });
      return;
    }
    try {
      setBusy('Uploading photos…');
      const uploaded = files.length ? await uploadImages(files.map((f) => f.file), `products/${user.uid}`) : [];
      const imageUrls = [...existingUrls, ...uploaded];
      if (!imageUrls.length) throw new Error('Upload failed. Please re-select your photos.');
      setBusy('Publishing…');
      const token = (await getCurrentUserIdToken()) ?? '';
      const id = await saveDraftListing(token, { ...data, imageUrls } as any, editId || undefined);
      await publishListing(id, token);
      toast({ title: 'Listed!', description: `"${data.title}" is live on Benched Coins.` });
      router.refresh();
      router.push(getProductUrl({ id, title: data.title, category: 'Coins' }));
    } catch (err: any) {
      if (handleStaleDeploy(err)) return;
      toast({ title: "Couldn't publish your listing", description: err?.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setBusy('');
    }
  };

  if (isUserLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-amber-600" /></div>;
  }
  if (!user) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <p className="mb-4 text-lg font-semibold">Sign in to list a coin or bullion.</p>
        <Link href="/sign-in?redirect=/coins/sell" className="inline-flex rounded-full bg-amber-500 px-5 py-3 text-sm font-bold text-slate-950">Sign in</Link>
      </div>
    );
  }

  const err = (k: string) => (errors[k] ? <p className="mt-1 text-xs font-medium text-destructive">{errors[k]}</p> : null);
  const isBullion = values.kind === 'bullion';

  return (
    <form onSubmit={submit} className="mx-auto max-w-3xl space-y-8" noValidate data-testid="coin-listing-form">
      <div>
        <h1 className="text-3xl font-black tracking-tight">{editId ? 'Edit your listing' : 'List a coin or bullion'}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Your listing appears on Benched Coins only. Buyers pay you directly by PayID or cash on pickup.</p>
      </div>

      <section className="space-y-3">
        <Label>What are you selling?</Label>
        <div className="grid grid-cols-2 gap-3">
          {(['coin', 'bullion'] as const).map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={values.kind === k}
              onClick={() => set('kind', k)}
              className={`rounded-2xl border p-4 text-left text-sm font-bold ${values.kind === k ? 'border-amber-500 ring-2 ring-amber-500/30' : 'border-border'}`}
            >
              {k === 'coin' ? 'Coin, set or banknote' : 'Bullion (bar, round or bullion coin)'}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <Label>Photos ({photoCount}/{MAX_PHOTOS})</Label>
        <p className="text-xs text-muted-foreground">Show both sides, plus the slab label or certificate if it has one.</p>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {existingUrls.map((url) => (
            <div key={url} className="relative aspect-square overflow-hidden rounded-xl border">
              <img src={url} alt="" className="h-full w-full object-cover" />
              <button type="button" aria-label="Remove photo" onClick={() => setExistingUrls((p) => p.filter((u) => u !== url))} className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white"><X className="h-3 w-3" /></button>
            </div>
          ))}
          {files.map((f, i) => (
            <div key={f.preview} className="relative aspect-square overflow-hidden rounded-xl border">
              <img src={f.preview} alt="" className="h-full w-full object-cover" />
              <button type="button" aria-label="Remove photo" onClick={() => setFiles((p) => p.filter((_, j) => j !== i))} className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white"><X className="h-3 w-3" /></button>
            </div>
          ))}
          {photoCount < MAX_PHOTOS && (
            <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed text-xs text-muted-foreground hover:border-amber-500">
              <ImagePlus className="h-5 w-5" />
              Add
              <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
            </label>
          )}
        </div>
        {err('photos')}
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="coin-title">Title</Label>
          <Input id="coin-title" value={values.title} maxLength={140} onChange={(e) => set('title', e.target.value)} placeholder={isBullion ? 'e.g. 1 oz Perth Mint Kangaroo Gold Coin 2024' : 'e.g. 1930 Australian Penny'} />
          {err('title')}
        </div>
        <div>
          <Label htmlFor="coin-sub">Category</Label>
          <select id="coin-sub" className={selectClass} value={values.subCategory} onChange={(e) => set('subCategory', e.target.value as CoinFormValues['subCategory'])}>
            {subOptions.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="coin-metal">Metal</Label>
          <select id="coin-metal" className={selectClass} value={values.metal} onChange={(e) => set('metal', e.target.value)}>
            <option value="">{isBullion ? 'Choose a metal' : 'Not sure / not listed'}</option>
            {COIN_METALS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          {err('metal')}
        </div>
        <div>
          <Label htmlFor="coin-weight">Weight {isBullion ? '' : '(optional)'}</Label>
          <Input id="coin-weight" value={values.weight} onChange={(e) => set('weight', e.target.value)} placeholder="e.g. 1 oz or 31.1 g" />
          {err('weight')}
        </div>
        <div>
          <Label htmlFor="coin-purity">Purity / fineness {isBullion ? '' : '(optional)'}</Label>
          <Input id="coin-purity" value={values.purity} onChange={(e) => set('purity', e.target.value)} placeholder="e.g. .9999 or 99.99%" />
        </div>
        <div>
          <Label htmlFor="coin-year">Year (optional)</Label>
          <Input id="coin-year" inputMode="numeric" value={values.year} onChange={(e) => set('year', e.target.value)} placeholder="e.g. 1930" />
          {err('year')}
        </div>
        <div>
          <Label htmlFor="coin-denom">Denomination (optional)</Label>
          <Input id="coin-denom" value={values.denomination} onChange={(e) => set('denomination', e.target.value)} placeholder="e.g. $2, 1 penny, 1 oz" />
        </div>
        <div>
          <Label htmlFor="coin-mint">Mint / refiner (optional)</Label>
          <Input id="coin-mint" value={values.mint} onChange={(e) => set('mint', e.target.value)} placeholder="e.g. Perth Mint, Royal Australian Mint" />
        </div>
        <div>
          <Label htmlFor="coin-country">Country (optional)</Label>
          <Input id="coin-country" value={values.country} onChange={(e) => set('country', e.target.value)} placeholder="e.g. Australia" />
        </div>
        <div>
          <Label htmlFor="coin-condition">Condition</Label>
          <select id="coin-condition" className={selectClass} value={values.condition} onChange={(e) => set('condition', e.target.value)}>
            {COIN_CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="coin-grader">Grading</Label>
          <select id="coin-grader" className={selectClass} value={values.gradingCompany} onChange={(e) => set('gradingCompany', e.target.value)}>
            {COIN_GRADERS.map((g) => <option key={g} value={g}>{g === 'Raw' ? 'Not graded (raw)' : g}</option>)}
          </select>
        </div>
        {values.gradingCompany !== 'Raw' && (
          <>
            <div>
              <Label htmlFor="coin-grade">Grade</Label>
              <Input id="coin-grade" value={values.grade} onChange={(e) => set('grade', e.target.value)} placeholder="e.g. MS65, PF69 UCAM" />
              {err('grade')}
            </div>
            <div>
              <Label htmlFor="coin-cert">Cert number (optional)</Label>
              <Input id="coin-cert" value={values.certNumber} onChange={(e) => set('certNumber', e.target.value)} />
            </div>
          </>
        )}
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="coin-price">Price (AUD)</Label>
          <Input id="coin-price" inputMode="decimal" value={values.price} onChange={(e) => set('price', e.target.value)} placeholder="e.g. 120" />
          {err('price')}
        </div>
        <div>
          <Label htmlFor="coin-qty">Quantity</Label>
          <Input id="coin-qty" inputMode="numeric" value={values.quantity} onChange={(e) => set('quantity', e.target.value)} />
          {err('quantity')}
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="coin-desc">Description</Label>
          <Textarea id="coin-desc" rows={5} value={values.description} onChange={(e) => set('description', e.target.value)} placeholder="Anything a buyer should know: marks, toning, packaging, certificate, how you'll post it." />
        </div>
        <div className="flex items-center gap-3 sm:col-span-2">
          <Switch id="coin-pickup" checked={values.allowLocalPickup} onCheckedChange={(v) => set('allowLocalPickup', v)} />
          <Label htmlFor="coin-pickup">Offer local pickup (cash on pickup)</Label>
        </div>
        <p className="text-xs text-muted-foreground sm:col-span-2">Buyers pay you directly by PayID, or cash on pickup if you offer it.</p>
      </section>

      <Button type="submit" size="lg" disabled={!!busy} className="w-full bg-amber-500 text-slate-950 hover:bg-amber-400">
        {busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{busy}</> : editId ? 'Save and publish' : 'Publish listing'}
      </Button>
    </form>
  );
}
