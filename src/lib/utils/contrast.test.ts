import { describe, it, expect } from 'vitest';
import { contrastRatio, accessibleTextColor } from './contrast';

describe('contrast', () => {
  it('computes WCAG ratios', () => {
    expect(contrastRatio('#000', '#fff')).toBeCloseTo(21, 0);
  });
  it('replaces low-contrast CMS text colours', () => {
    expect(accessibleTextColor('#f26c0d', '#ffffff')).toBe('#000000');
    expect(accessibleTextColor('#111111', '#ffffff')).toBe('#ffffff');
    expect(accessibleTextColor('not-a-colour', '#fff')).toBe('#fff');
  });
});
