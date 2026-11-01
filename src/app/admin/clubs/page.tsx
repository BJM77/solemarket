'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { getCurrentUserIdToken } from '@/lib/firebase/auth';
import { adminListClubs, adminSaveClub, adminDeleteClub } from '@/app/actions/clubs';
import type { Club } from '@/lib/types/club';

type Form = { name: string; slug: string; active: boolean; logoUrl: string; tagline: string; location: string; sellerIds: string; adminEmails: string; sortOrder: string };
const empty: Form = { name: '', slug: '', active: true, logoUrl: '', tagline: '', location: '', sellerIds: '', adminEmails: '', sortOrder: '0' };

export default function AdminClubsPage() {
  const { toast } = useToast();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(empty);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const token = await getCurrentUserIdToken();
    if (!token) return;
    try { setClubs(await adminListClubs(token)); } catch (e: any) { toast({ title: 'Could not load clubs', description: e?.message, variant: 'destructive' }); }
  };
  useEffect(() => { load(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const edit = (c: Club) => {
    setEditingId(c.id);
    setForm({ name: c.name, slug: c.slug, active: c.active, logoUrl: c.logoUrl || '', tagline: c.tagline || '', location: c.location || '', sellerIds: c.sellerIds.join('\n'), adminEmails: (c.adminEmails || []).join('\n'), sortOrder: String(c.sortOrder ?? 0) });
  };

  const save = async () => {
    setBusy(true);
    const token = await getCurrentUserIdToken();
    if (!token) { setBusy(false); return; }
    const res = await adminSaveClub(token, editingId, {
      ...form,
      sellerIds: form.sellerIds.split(/[\s,]+/),
      adminEmails: form.adminEmails.split(/[\s,]+/),
      sortOrder: Number(form.sortOrder) || 0,
    });
    setBusy(false);
    if (!res.success) { toast({ title: 'Save failed', description: res.error, variant: 'destructive' }); return; }
    toast({ title: 'Club saved' });
    if (res.setupLinks?.length) {
      alert('New stadium admin account(s) created. Send each person their set-password link:\n\n' + res.setupLinks.map((l) => `${l.email}\n${l.link}`).join('\n\n'));
    }
    setEditingId(null); setForm(empty); load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this club page? Listings are not affected.')) return;
    const token = await getCurrentUserIdToken();
    if (!token) return;
    const res = await adminDeleteClub(token, id);
    if (!res.success) toast({ title: 'Delete failed', description: res.error, variant: 'destructive' });
    load();
  };

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">Clubs &amp; Stadiums</h1>
        <p className="text-muted-foreground">Free club pages at /club/[slug]. Each page shows only listings from the seller accounts you link.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{editingId ? 'Edit club' : 'Add club'}</CardTitle>
          <CardDescription>Seller IDs are the user IDs of the club&apos;s seller accounts (from Admin → Users), one per line, max 30.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div><Label htmlFor="c-name">Name</Label><Input id="c-name" value={form.name} onChange={set('name')} /></div>
          <div><Label htmlFor="c-slug">Slug (optional)</Label><Input id="c-slug" value={form.slug} onChange={set('slug')} placeholder="auto from name" /></div>
          <div><Label htmlFor="c-loc">Location</Label><Input id="c-loc" value={form.location} onChange={set('location')} /></div>
          <div><Label htmlFor="c-logo">Logo URL (https)</Label><Input id="c-logo" value={form.logoUrl} onChange={set('logoUrl')} /></div>
          <div className="sm:col-span-2"><Label htmlFor="c-tag">Tagline</Label><Input id="c-tag" value={form.tagline} onChange={set('tagline')} /></div>
          <div className="sm:col-span-2"><Label htmlFor="c-sellers">Seller IDs</Label><Textarea id="c-sellers" rows={3} value={form.sellerIds} onChange={set('sellerIds')} /></div>
          <div className="sm:col-span-2"><Label htmlFor="c-admins">Stadium admin emails</Label><Textarea id="c-admins" rows={2} value={form.adminEmails} onChange={set('adminEmails')} placeholder="one per line — existing accounts are linked, new ones are created" /><p className="text-xs text-muted-foreground mt-1">Stadium admins can manage this club&apos;s seller list at /club-admin. They can&apos;t create clubs.</p></div>
          <div><Label htmlFor="c-sort">Sort order</Label><Input id="c-sort" type="number" value={form.sortOrder} onChange={set('sortOrder')} /></div>
          <label className="flex items-center gap-2 mt-6 text-sm">
            <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
            Active (shown on home page)
          </label>
          <div className="sm:col-span-2 flex gap-2">
            <Button onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save club'}</Button>
            {editingId && <Button variant="outline" onClick={() => { setEditingId(null); setForm(empty); }}>Cancel</Button>}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Clubs ({clubs.length})</CardTitle></CardHeader>
        <CardContent className="divide-y">
          {clubs.length === 0 && <p className="text-muted-foreground text-sm">No clubs yet.</p>}
          {clubs.map((c) => (
            <div key={c.id} className="flex items-center justify-between py-3 gap-2">
              <div>
                <p className="font-medium">{c.name} {!c.active && <span className="text-xs text-muted-foreground">(hidden)</span>}</p>
                <a href={`/club/${c.slug}`} target="_blank" rel="noreferrer" className="text-xs text-primary">/club/{c.slug}</a>
                <span className="text-xs text-muted-foreground"> · {c.sellerIds.length} seller(s)</span>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => edit(c)}>Edit</Button>
                <Button size="sm" variant="ghost" onClick={() => remove(c.id)}>Delete</Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
