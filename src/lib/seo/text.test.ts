import { describe, it, expect } from 'vitest';
import { metaDescription } from './text';

describe('metaDescription', () => {
  it('keeps short text', () => expect(metaDescription('Nice shoes.')).toBe('Nice shoes.'));
  it('ends at a sentence boundary when possible', () => {
    const t = 'Worn twice and stored in box with all original accessories included in the sale. ' + 'Shows moderate wear and natural peeling on the midsole. '.repeat(3);
    const d = metaDescription(t);
    expect(d.length).toBeLessThanOrEqual(160);
    expect(d.endsWith('.')).toBe(true);
  });
  it('never cuts mid-word', () => {
    const d = metaDescription('word '.repeat(60) + 'supercalifragilistic');
    expect(d.length).toBeLessThanOrEqual(160);
    expect(d.endsWith('word…')).toBe(true);
  });
});
