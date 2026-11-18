import { describe, it, expect } from 'vitest';
import { composeCategoryTitle } from './browse-heading';

describe('composeCategoryTitle', () => {
  it('does not double Cards when the sub-category already ends with Cards', () => {
    expect(composeCategoryTitle('Basketball Cards', 'Cards')).toBe('Basketball Cards');
    expect(composeCategoryTitle('Basketball Cards', 'Collector Cards')).toBe('Basketball Cards');
    expect(composeCategoryTitle('Sports Cards', 'Cards')).toBe('Sports Cards');
  });

  it('appends the qualifier when it is not already in the name', () => {
    expect(composeCategoryTitle('Rookies', 'Cards')).toBe('Rookies Cards');
    expect(composeCategoryTitle('Jordan', 'Sneakers')).toBe('Jordan Sneakers');
    expect(composeCategoryTitle('Top 100', 'Cards')).toBe('Top 100 Cards');
  });

  it('handles missing parts', () => {
    expect(composeCategoryTitle(undefined, 'Cards')).toBe('Cards');
    expect(composeCategoryTitle('Rookies', undefined)).toBe('Rookies');
    expect(composeCategoryTitle('', '')).toBe('');
  });
});
