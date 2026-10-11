'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, BellOff, Loader2, Search, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useUser } from '@/firebase';
import { getCurrentUserIdToken } from '@/lib/firebase/auth';
import { listSavedSearches, deleteSavedSearch, setSavedSearchAlerts, type SavedSearch } from '@/app/actions/saved-search/saved-search';
import { criteriaToQueryString, describeCriteria } from '@/lib/saved-search/match';

export default function SavedSearchesPage() {
  const { user, isUserLoading } = useUser();
  const [items, setItems] = useState<SavedSearch[] | null>(null);

  const load = useCallback(async () => {
    const token = await getCurrentUserIdToken();
    if (!token) return setItems([]);
    setItems(await listSavedSearches(token));
  }, []);

  useEffect(() => { if (user) load().catch(() => setItems([])); }, [user, load]);

  const toggle = async (s: SavedSearch, enabled: boolean) => {
    setItems((cur) => cur?.map((x) => (x.id === s.id ? { ...x, alertsEnabled: enabled } : x)) ?? null);
    const token = await getCurrentUserIdToken();
    if (token) await setSavedSearchAlerts(token, s.id, enabled);
  };
  const remove = async (s: SavedSearch) => {
    setItems((cur) => cur?.filter((x) => x.id !== s.id) ?? null);
    const token = await getCurrentUserIdToken();
    if (token) await deleteSavedSearch(token, s.id);
  };

  if (isUserLoading || (user && items === null)) {
    return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" aria-label="Loading" /></div>;
  }
  if (!user) {
    return <p className="py-16 text-center text-muted-foreground"><Link className="underline" href="/sign-in?redirect=/profile/saved-searches">Sign in</Link> to see your saved searches.</p>;
  }

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-black tracking-tight">Saved searches</h1>
        <p className="text-sm text-muted-foreground">Get notified when new listings match. Save a search from any browse or search results page.</p>
      </header>
      {items!.length === 0 ? (
        <div className="rounded-2xl border p-8 text-center">
          <Search className="mx-auto mb-3 h-8 w-8 text-muted-foreground" aria-hidden />
          <p className="mb-4">No saved searches yet.</p>
          <Button asChild><Link href="/browse">Browse listings</Link></Button>
        </div>
      ) : (
        <ul className="divide-y rounded-2xl border">
          {items!.map((s) => {
            const qs = criteriaToQueryString(s.criteria);
            return (
              <li key={s.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <Link href={`/browse${qs ? `?${qs}` : ''}`} className="font-bold hover:underline">{s.name}</Link>
                  <p className="truncate text-xs text-muted-foreground">{describeCriteria(s.criteria)}</p>
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex min-h-11 items-center gap-2 text-sm">
                    {s.alertsEnabled ? <Bell className="h-4 w-4" aria-hidden /> : <BellOff className="h-4 w-4" aria-hidden />}
                    <span>Alerts</span>
                    <Switch checked={s.alertsEnabled} onCheckedChange={(v) => toggle(s, v)} aria-label={`Alerts for ${s.name}`} />
                  </label>
                  <Button variant="ghost" size="icon" className="h-11 w-11" onClick={() => remove(s)} aria-label={`Delete saved search ${s.name}`}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
