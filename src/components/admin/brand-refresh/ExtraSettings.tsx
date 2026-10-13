'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { FONT_OPTIONS, type CategoryKey, type FontOption, type SiteConfig } from '@/lib/types/site-config';

type Props = { value: SiteConfig; onChange: (next: SiteConfig) => void };
const cardCls = 'bg-zinc-900 border-white/10 text-white';
const inputCls = 'bg-black border-white/20 text-white';

export function FooterFontsSettings({ value, onChange }: Props) {
  const f = value.footer;
  const setFooter = (patch: Partial<SiteConfig['footer']>) => onChange({ ...value, footer: { ...f, ...patch } });
  const setColumn = (i: number, patch: Partial<SiteConfig['footer']['columns'][number]>) =>
    setFooter({ columns: f.columns.map((c, j) => (j === i ? { ...c, ...patch } : c)) });

  return (
    <div className="space-y-6">
      <Card className={cardCls}>
        <CardHeader>
          <CardTitle>Fonts</CardTitle>
          <CardDescription>Applied site-wide on the server, so pages load in the chosen font.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {(['body', 'heading'] as const).map((role) => (
            <div key={role} className="space-y-2">
              <Label htmlFor={`font-${role}`} className="capitalize">{role} font</Label>
              <select
                id={`font-${role}`}
                className={`w-full rounded-md border px-3 py-2 ${inputCls}`}
                value={value.fonts[role]}
                onChange={(e) => onChange({ ...value, fonts: { ...value.fonts, [role]: e.target.value as FontOption } })}
              >
                {FONT_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className={cardCls}>
        <CardHeader>
          <CardTitle>Footer</CardTitle>
          <CardDescription>Tagline, link columns, copyright line and newsletter block.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="footer-tagline">Tagline</Label>
            <Input id="footer-tagline" className={inputCls} value={f.tagline} onChange={(e) => setFooter({ tagline: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="footer-copy">Copyright text (after the year; blank = legal name)</Label>
            <Input id="footer-copy" className={inputCls} value={f.copyright} onChange={(e) => setFooter({ copyright: e.target.value })} />
          </div>
          <div className="flex items-center gap-3">
            <Switch id="footer-news" checked={f.showNewsletter} onCheckedChange={(v) => setFooter({ showNewsletter: v })} />
            <Label htmlFor="footer-news">Show newsletter signup</Label>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {f.columns.map((col, i) => (
              <div key={col.id} className="space-y-2 rounded-xl border border-white/10 p-4">
                <div className="flex gap-2">
                  <Input aria-label="Column title" className={inputCls} value={col.title} onChange={(e) => setColumn(i, { title: e.target.value })} />
                  <Button variant="ghost" size="icon" aria-label="Remove column" onClick={() => setFooter({ columns: f.columns.filter((_, j) => j !== i) })}><Trash2 className="h-4 w-4" /></Button>
                </div>
                {col.links.map((l, k) => (
                  <div key={k} className="flex gap-2">
                    <Input aria-label="Link label" className={inputCls} value={l.label} onChange={(e) => setColumn(i, { links: col.links.map((x, y) => (y === k ? { ...x, label: e.target.value } : x)) })} />
                    <Input aria-label="Link URL" className={inputCls} value={l.href} onChange={(e) => setColumn(i, { links: col.links.map((x, y) => (y === k ? { ...x, href: e.target.value } : x)) })} />
                    <Button variant="ghost" size="icon" aria-label="Remove link" onClick={() => setColumn(i, { links: col.links.filter((_, y) => y !== k) })}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" className="border-white/20" onClick={() => setColumn(i, { links: [...col.links, { label: 'New link', href: '/' }] })}><Plus className="mr-1 h-4 w-4" /> Link</Button>
              </div>
            ))}
          </div>
          <Button variant="outline" className="border-white/20" onClick={() => setFooter({ columns: [...f.columns, { id: `f${Date.now()}`, title: 'New column', links: [] }] })}><Plus className="mr-1 h-4 w-4" /> Column</Button>
        </CardContent>
      </Card>
    </div>
  );
}

const CATEGORY_LABELS: Record<CategoryKey, string> = { shoes: 'Sneakers (/shoes)', cards: 'Cards (/cards)', coins: 'Coins (/coins)' };

export function SeoContentSettings({ value, onChange }: Props) {
  const a = value.announcement;
  const setA = (patch: Partial<SiteConfig['announcement']>) => onChange({ ...value, announcement: { ...a, ...patch } });
  const setSeo = (patch: Partial<SiteConfig['seo']>) => onChange({ ...value, seo: { ...value.seo, ...patch } });
  const setCat = (k: CategoryKey, patch: Partial<SiteConfig['categoryHeaders'][CategoryKey]>) =>
    onChange({ ...value, categoryHeaders: { ...value.categoryHeaders, [k]: { ...value.categoryHeaders[k], ...patch } } });

  return (
    <div className="space-y-6">
      <Card className={cardCls}>
        <CardHeader>
          <CardTitle>Announcement banner</CardTitle>
          <CardDescription>A thin bar above the header on every page.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Switch id="ann-on" checked={a.enabled} onCheckedChange={(v) => setA({ enabled: v })} />
            <Label htmlFor="ann-on">Show banner</Label>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label htmlFor="ann-text">Text</Label><Input id="ann-text" className={inputCls} value={a.text} onChange={(e) => setA({ text: e.target.value })} /></div>
            <div className="space-y-2"><Label htmlFor="ann-href">Link (optional, /path or https://)</Label><Input id="ann-href" className={inputCls} value={a.href || ''} onChange={(e) => setA({ href: e.target.value })} /></div>
            <div className="space-y-2"><Label htmlFor="ann-bg">Background colour</Label><Input id="ann-bg" className={inputCls} value={a.bgColor} onChange={(e) => setA({ bgColor: e.target.value })} /></div>
            <div className="space-y-2"><Label htmlFor="ann-fg">Text colour</Label><Input id="ann-fg" className={inputCls} value={a.textColor} onChange={(e) => setA({ textColor: e.target.value })} /></div>
          </div>
        </CardContent>
      </Card>

      <Card className={cardCls}>
        <CardHeader>
          <CardTitle>Default SEO</CardTitle>
          <CardDescription>Used by pages that don't set their own title, description or share image (e.g. the home page).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2"><Label htmlFor="seo-title">Default title ({value.seo.defaultTitle.length}/60)</Label><Input id="seo-title" className={inputCls} value={value.seo.defaultTitle} onChange={(e) => setSeo({ defaultTitle: e.target.value })} /></div>
          <div className="space-y-2"><Label htmlFor="seo-desc">Default description ({value.seo.defaultDescription.length}/160)</Label><Textarea id="seo-desc" className={inputCls} value={value.seo.defaultDescription} onChange={(e) => setSeo({ defaultDescription: e.target.value })} /></div>
          <div className="space-y-2"><Label htmlFor="seo-og">Share (OG) image URL, 1200×630 (blank = built-in branded image)</Label><Input id="seo-og" className={inputCls} value={value.seo.ogImageUrl} onChange={(e) => setSeo({ ogImageUrl: e.target.value })} /></div>
        </CardContent>
      </Card>

      <Card className={cardCls}>
        <CardHeader>
          <CardTitle>Category headers</CardTitle>
          <CardDescription>Heading and intro text on the main category pages.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {(Object.keys(CATEGORY_LABELS) as CategoryKey[]).map((k) => (
            <div key={k} className="space-y-2">
              <div className="text-sm font-bold">{CATEGORY_LABELS[k]}</div>
              <Input aria-label={`${k} heading`} className={inputCls} value={value.categoryHeaders[k].title} onChange={(e) => setCat(k, { title: e.target.value })} />
              <Textarea aria-label={`${k} intro`} className={inputCls} value={value.categoryHeaders[k].intro} onChange={(e) => setCat(k, { intro: e.target.value })} />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
