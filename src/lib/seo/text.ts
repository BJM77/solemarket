/**
 * Trim text for meta descriptions without cutting mid-word or mid-sentence where possible.
 * Prefers ending at a sentence boundary; otherwise ends on a word boundary with an ellipsis.
 */
export function metaDescription(text: string | undefined | null, max = 160): string {
  const clean = (text || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const slice = clean.slice(0, max);
  const sentenceEnd = Math.max(slice.lastIndexOf('. '), slice.lastIndexOf('! '), slice.lastIndexOf('? '));
  if (sentenceEnd >= max * 0.5) return slice.slice(0, sentenceEnd + 1);
  const word = slice.slice(0, max - 1).replace(/\s+\S*$/, '').replace(/[\s,;:–-]+$/, '');
  return `${word}…`;
}

/** Category landing page for breadcrumbs (indexable, not a disallowed ?query URL). */
export function sectionPathForCategory(section: string): string {
  return section === 'cards' ? '/cards' : section === 'coins' ? '/coins' : '/shoes';
}
