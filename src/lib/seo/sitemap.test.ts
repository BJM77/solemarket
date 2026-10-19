import { describe, it, expect } from 'vitest';
import { sitemapChunkIndex, toSitemapDate } from './sitemap';

describe('sitemapChunkIndex', () => {
  it('handles the string id Next passes at runtime', () => {
    expect(sitemapChunkIndex('0')).toBe(0);
    expect(sitemapChunkIndex('3')).toBe(3);
    expect(sitemapChunkIndex('2.xml')).toBe(2);
  });
  it('handles numbers and junk', () => {
    expect(sitemapChunkIndex(1)).toBe(1);
    expect(sitemapChunkIndex(undefined)).toBe(0);
    expect(sitemapChunkIndex('abc')).toBe(0);
    expect(sitemapChunkIndex(-4)).toBe(0);
  });
});

describe('toSitemapDate', () => {
  it('reads serialised Firestore timestamps', () => {
    expect(toSitemapDate({ seconds: 1760000000, nanoseconds: 0 })?.toISOString()).toBe(new Date(1760000000 * 1000).toISOString());
  });
  it('prefers the first usable candidate', () => {
    const d = new Date('2026-10-01T00:00:00Z');
    expect(toSitemapDate(undefined, null, d)).toEqual(d);
    expect(toSitemapDate({ toDate: () => d })).toEqual(d);
    expect(toSitemapDate('2026-10-02T00:00:00Z')?.toISOString()).toBe('2026-10-02T00:00:00.000Z');
  });
  it('returns undefined when nothing is usable', () => {
    expect(toSitemapDate(undefined, 'not a date', {})).toBeUndefined();
  });
});
