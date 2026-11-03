'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BellPlus, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/firebase';
import { getIdTokenLazy as getCurrentUserIdToken } from '@/lib/firebase/lazy';
import { saveSearch } from '@/app/actions/saved-search/saved-search';

/** "Save search & alert me" - stores the current filters (or a custom keyword/max-price alert) and notifies on new matching listings. */
export default function SaveSearchButton({ params }: { params: Record<string, any> }) {
  const { user } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [state, setState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState<string>(params?.q || '');
  const [maxPrice, setMaxPrice] = useState<string>(
    Array.isArray(params?.priceRange) && params.priceRange[1] ? String(params.priceRange[1]) : ''
  );

  const openModal = () => {
    if (!user) {
      const here = typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/browse';
      router.push(`/sign-in?redirect=${encodeURIComponent(here)}`);
      return;
    }
    setQuery(params?.q || '');
    setMaxPrice(Array.isArray(params?.priceRange) && params.priceRange[1] ? String(params.priceRange[1]) : '');
    setOpen(true);
  };

  const handleSave = async () => {
    setState('saving');
    const token = await getCurrentUserIdToken();
    const mergedParams = {
      ...params,
      ...(query.trim() ? { q: query.trim() } : {}),
      ...(maxPrice && Number(maxPrice) > 0 ? { priceRange: [0, Number(maxPrice)] } : {}),
    };
    const customName = query.trim()
      ? `${query.trim()}${maxPrice && Number(maxPrice) > 0 ? ` under $${Number(maxPrice)}` : ''}`
      : undefined;

    const result = token ? await saveSearch(token, mergedParams, customName) : { success: false, error: 'Please sign in again.' };
    if (result.success) {
      setState('saved');
      setOpen(false);
      toast({
        title: 'Alert created!',
        description: "We'll alert you as soon as a matching listing goes live. Manage in Profile > Saved searches.",
      });
    } else {
      setState('idle');
      toast({ title: 'Could not save alert', description: result.error, variant: 'destructive' });
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={openModal}
        disabled={state === 'saving'}
        className="h-9 sm:h-10 min-h-11 sm:min-h-10 text-xs sm:text-sm gap-1.5 font-semibold border-primary/30 hover:border-primary"
        aria-label={state === 'saved' ? 'Search alert saved' : 'Create search alert'}
        data-testid="save-search-alert-button"
      >
        {state === 'saving' ? <Loader2 className="h-4 w-4 animate-spin" /> : state === 'saved' ? <Check className="h-4 w-4 text-emerald-600" /> : <BellPlus className="h-4 w-4 text-primary" />}
        <span>{state === 'saved' ? 'Alert Active' : 'Alert Me / Save Search'}</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold">Get Listing Alerts</DialogTitle>
            <DialogDescription>
              Tell us what you&apos;re hunting for (e.g. &ldquo;Charizard under $50&rdquo;) and we&apos;ll notify you when one is listed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="alert-query" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Card / Sneaker Keyword
              </Label>
              <Input
                id="alert-query"
                placeholder="e.g. Charizard, Jordan 1 Chicago, Prizm Silver"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="alert-max-price" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Max Price (AUD, optional)
              </Label>
              <Input
                id="alert-max-price"
                inputMode="decimal"
                placeholder="e.g. 50"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="button" onClick={handleSave} disabled={state === 'saving'} className="font-bold">
              {state === 'saving' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <BellPlus className="h-4 w-4 mr-2" />}
              Create Alert
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
