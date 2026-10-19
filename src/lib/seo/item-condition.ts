/**
 * Map a listing's free-text condition to a schema.org itemCondition.
 * Only genuinely new items count as New: "Used - Like New", "Near Mint", "Excellent", graded
 * or raw cards are all second-hand, so they're Used. Unknown/empty returns undefined (omit).
 */
export function schemaItemCondition(condition?: string | null): string | undefined {
  const c = (condition || '').trim().toLowerCase();
  if (!c) return undefined;
  if (/refurb/.test(c)) return 'https://schema.org/RefurbishedCondition';
  if (/used|pre-?owned|like new|worn|damaged|poor|fair|good|excellent|mint|played|graded|raw/.test(c)) return 'https://schema.org/UsedCondition';
  if (/^(brand )?new\b|deadstock|\bbnib\b|\bds\b|sealed|new with|new \(/.test(c)) return 'https://schema.org/NewCondition';
  return 'https://schema.org/UsedCondition';
}
