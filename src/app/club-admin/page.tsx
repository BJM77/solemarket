'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { getCurrentUserIdToken } from '@/lib/firebase/auth';
import { stadiumListMyClubs, stadiumUpdateSellers } from '@/app/actions/clubs';
import type { Club } from '@/lib/types/club';

/** Stadium admin dashboard. Clubs are created by the Benched site admin only. */
export default function ClubAdminPage() {
  const { toast } = useToast();
  const [clubs, setClubs] = useState<Club[] | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const load = async () => {
    const token = await getCurrentUserIdToken();
    if (!token) { setClubs([]); return; }
    try {
      const list = await stadiumListMyClubs(token);
      setClubs(list);
      setDrafts(Object.fromEntries(list.map((c) => [c.id, c.sellerIds.join('\n')])));
    } catch { setClubs([]); }
  };
  useEffect(() => { load(); }, []);

  const save = async (id: string) => {
    const token = await getCurrentUserIdToken();
    if (!token) return;
    const res = await stadiumUpdateSellers(token, id, (drafts[id] || '').split(/[\s,]+/));
    toast(res.success ? { title: 'Sellers updated' } : { title: 'Save failed', description: res.error, variant: 'destructive' });
    if (res.success) load();
  };

  return (
    <div className="container max-w-3xl py-8 space-y-6">
      <h1 className="text-2xl font-bold">Stadium admin</h1>
      {clubs === null && <p className="text-muted-foreground">Loading…</p>}
      {clubs?.length === 0 && <p className="text-muted-foreground">You aren&apos;t a stadium admin for any club. Club pages are set up by the Benched team. <Link className="text-primary underline" href="/clubs">Learn more</Link></p>}
      {clubs?.map((c) => (
        <Card key={c.id}>
          <CardHeader>
            <CardTitle>{c.name}</CardTitle>
            <CardDescription>Seller account IDs whose listings show on <Link className="text-primary underline" href={`/club/${c.slug}`}>/club/{c.slug}</Link> (one per line, max 30).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea rows={4} value={drafts[c.id] || ''} onChange={(e) => setDrafts({ ...drafts, [c.id]: e.target.value })} aria-label={`Seller IDs for ${c.name}`} />
            <Button onClick={() => save(c.id)}>Save sellers</Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
