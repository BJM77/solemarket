import { describe, it, expect } from 'vitest';
import { listingSeoState } from '../listing-status';

describe('listingSeoState', () => {
  it('indexes live listings as InStock', () => {
    expect(listingSeoState('available')).toEqual({ indexable: true, availability: 'https://schema.org/InStock' });
    expect(listingSeoState('on_hold').availability).toBe('https://schema.org/InStock');
    expect(listingSeoState(undefined).indexable).toBe(true);
  });
  it('marks sold listings SoldOut and noindex', () => {
    expect(listingSeoState('sold')).toEqual({ indexable: false, availability: 'https://schema.org/SoldOut' });
  });
  it('hides drafts and removed listings', () => {
    expect(listingSeoState('draft')).toEqual({ indexable: false, availability: 'https://schema.org/Discontinued' });
    expect(listingSeoState('removed').indexable).toBe(false);
  });
});
