
'use client';

import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send } from 'lucide-react';
import { submitTakedownRequestAction } from '@/app/actions/marketplace/takedown';
import { TAKEDOWN_TYPES } from '@/lib/takedown/urls';

const TYPE_LABEL: Record<(typeof TAKEDOWN_TYPES)[number], string> = {
  counterfeit: 'Counterfeit or replica goods',
  trademark: 'Trademark',
  copyright: 'Copyright',
  other: 'Other',
};

export function TakedownForm() {
  const params = useSearchParams();
  const prefilled = useMemo(() => params.get('url') || params.get('listing') || '', [params]);
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [organisation, setOrganisation] = useState('');
  const [email, setEmail] = useState('');
  const [listingUrls, setListingUrls] = useState(prefilled);
  const [type, setType] = useState<(typeof TAKEDOWN_TYPES)[number] | ''>('');
  const [description, setDescription] = useState('');
  const [declaration, setDeclaration] = useState(false);
  const [website, setWebsite] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await submitTakedownRequestAction({
        name, organisation, email, listingUrls, type, description, declaration, website,
      });
      if (result.success) {
        setDone(true);
        toast({ title: 'Report received', description: 'Thanks. We will review this and reply by email if we need more information.' });
      } else {
        toast({ title: 'Could not send report', description: result.error, variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Could not send report', description: err?.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
        <p className="font-semibold text-foreground mb-2">Report received</p>
        <p>We will review this and follow up by email if we need more information. There is no automated email from us yet.</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-xl border bg-card p-6 shadow-sm" data-testid="takedown-form">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="td-name">Your name</Label>
          <Input id="td-name" required value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="td-org">Organisation (optional)</Label>
          <Input id="td-org" value={organisation} onChange={(e) => setOrganisation(e.target.value)} autoComplete="organization" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="td-email">Email</Label>
        <Input id="td-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="td-urls">Listing URL(s)</Label>
        <Textarea id="td-urls" required rows={3} value={listingUrls} onChange={(e) => setListingUrls(e.target.value)} placeholder="https://benched.au/product/..." />
        <p className="text-xs text-muted-foreground">One per line, or separated by commas.</p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="td-type">Type</Label>
        <select id="td-type" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={type} onChange={(e) => setType(e.target.value as any)}>
          <option value="">Select type</option>
          {TAKEDOWN_TYPES.map((v) => (
            <option key={v} value={v}>{TYPE_LABEL[v]}</option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="td-desc">Description</Label>
        <Textarea id="td-desc" required rows={5} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the rights you hold and why this listing infringes them." />
      </div>
      <div className="flex items-start gap-3">
        <Checkbox id="td-decl" checked={declaration} onCheckedChange={(v) => setDeclaration(v === true)} />
        <Label htmlFor="td-decl" className="text-sm font-normal leading-relaxed">
          I declare that I am the owner of the rights described, or I am authorised to act for the owner, and that this report is made in good faith and is accurate to the best of my knowledge.
        </Label>
      </div>
      <div aria-hidden="true" className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden">
        <label htmlFor="td-website">Website</label>
        <input id="td-website" name="website" type="text" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
      </div>
      <Button type="submit" className="w-full h-12" disabled={loading}>
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
        Submit report
      </Button>
    </form>
  );
}
