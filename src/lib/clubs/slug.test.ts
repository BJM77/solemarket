import { describe, it, expect } from 'vitest';
import { slugifyClub } from './slug';

describe('slugifyClub', () => {
  it('makes url-safe slugs', () => {
    expect(slugifyClub('Perth Wildcats  Stadium!')).toBe('perth-wildcats-stadium');
    expect(slugifyClub('  --Café Club-- ')).toBe('cafe-club');
  });
});
