/**
 * Compose a browse-grid heading from a sub-category and a qualifier
 * ("Cards", "Sneakers", "Collector Cards") without doubling the last word.
 * e.g. "Basketball Cards" + "Cards" => "Basketball Cards", not "Basketball Cards Cards".
 */
export function composeCategoryTitle(subCategory?: string | null, qualifier?: string | null): string {
  const sub = (subCategory || '').trim();
  const qual = (qualifier || '').trim();
  if (!sub) return qual;
  if (!qual) return sub;
  const subNorm = sub.toLowerCase();
  const qualNorm = qual.toLowerCase();
  if (subNorm === qualNorm) return sub;
  if (subNorm.endsWith(` ${qualNorm}`) || subNorm.endsWith(qualNorm)) return sub;
  const qualLast = qualNorm.split(/\s+/).pop() || '';
  const subLast = subNorm.split(/\s+/).pop() || '';
  if (qualLast && subLast === qualLast) return sub;
  return `${sub} ${qual}`;
}
