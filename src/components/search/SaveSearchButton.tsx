'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BellPlus, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/firebase';
import { getIdTokenLazy as getCurrentUserIdToken } from '@/lib/firebase/lazy';
import { saveSearch } from '@/app/actions/saved-search/saved-search';

/** "Save search & alert me" - stores the current filters and notifies on new matching listings. */
export default function SaveSearchButton({ params }: { params: Record<string, any> }) {
  const { user } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [state, setState] = useState<'idle' | 'saving' | 'saved'>('idle');

  const onClick = async () => {
    if (!user) {
      const here = typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/browse';
      router.push(`/sign-in?redirect=${encodeURIComponent(here)}`);
      return;
    }
    setState('saving');
    const token = await getCurrentUserIdToken();
    const result = token ? await saveSearch(token, params) : { success: false, error: 'Please sign in again.' };
    if (result.success) {
      setState('saved');
      toast({ title: 'Search saved', description: "We'll notify you when new listings match. Manage alerts in Profile > Saved searches." });
    } else {
      setState('idle');
      toast({ title: 'Could not save search', description: result.error, variant: 'destructive' });
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      onClick={onClick}
      disabled={state !== 'idle'}
      className="h-9 sm:h-10 min-h-11 sm:min-h-10 text-xs sm:text-sm gap-1.5"
      aria-label={state === 'saved' ? 'Search saved' : 'Save this search and get alerts'}
    >
      {state === 'saving' ? <Loader2 className="h-4 w-4 animate-spin" /> : state === 'saved' ? <Check className="h-4 w-4" /> : <BellPlus className="h-4 w-4" />}
      <span>{state === 'saved' ? 'Saved' : 'Save search'}</span>
    </Button>
  );
}
