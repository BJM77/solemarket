export interface CoinsSitemapEntry {
  loc: string;
  lastmod?: Date | string | null;
  priority?: number;
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

export function buildCoinsSitemapXml(entries: CoinsSitemapEntry[]): string {
  const seen = new Set<string>();
  const rows = entries.filter((e) => (seen.has(e.loc) ? false : (seen.add(e.loc), true))).map((e) => {
    const lm = e.lastmod ? new Date(e.lastmod as any) : null;
    const lastmod = lm && !Number.isNaN(lm.getTime()) ? `<lastmod>${lm.toISOString()}</lastmod>` : '';
    const pr = typeof e.priority === 'number' ? `<priority>${e.priority.toFixed(1)}</priority>` : '';
    return `  <url><loc>${esc(e.loc)}</loc>${lastmod}${pr}</url>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rows.join('\n')}\n</urlset>\n`;
}
