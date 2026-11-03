/**
 * How a listing should appear to search engines, based on its status.
 * Live listings are indexable and InStock. Sold listings keep their page (useful
 * for price history and inbound links) but are SoldOut and noindex. Anything else
 * (draft, removed, etc.) is noindex and Discontinued.
 */
export type ListingSeoState = {
  indexable: boolean;
  availability: 'https://schema.org/InStock' | 'https://schema.org/SoldOut' | 'https://schema.org/Discontinued';
};

export function listingSeoState(status: unknown): ListingSeoState {
  const s = typeof status === 'string' ? status.toLowerCase() : '';
  if (s === 'available' || s === 'on_hold' || s === '') {
    return { indexable: true, availability: 'https://schema.org/InStock' };
  }
  if (s === 'sold') return { indexable: false, availability: 'https://schema.org/SoldOut' };
  return { indexable: false, availability: 'https://schema.org/Discontinued' };
}
