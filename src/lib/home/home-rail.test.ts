import { describe, it, expect } from 'vitest';
import {
  HOME_RAIL_COUNT,
  HOME_RAIL_LAST_TILE_CLASS,
  HOME_RAIL_MOBILE_COUNT,
  homeRailItemClassName,
} from './home-rail';

describe('homeRailItemClassName', () => {
  it('hides only the 15th tile on home rails, below md', () => {
    expect(HOME_RAIL_COUNT).toBe(15);
    expect(HOME_RAIL_MOBILE_COUNT).toBe(14);
    expect(homeRailItemClassName(14, 'homeRail')).toBe(HOME_RAIL_LAST_TILE_CLASS);
    expect(homeRailItemClassName(14, 'justListed')).toBe(HOME_RAIL_LAST_TILE_CLASS);
    expect(HOME_RAIL_LAST_TILE_CLASS).toBe('hidden md:block');
  });

  it('leaves every other home-rail tile visible at all breakpoints', () => {
    for (const index of [0, 1, 13]) {
      expect(homeRailItemClassName(index, 'homeRail')).toBeUndefined();
    }
  });

  it('does not hide the 15th tile on the default product grid', () => {
    expect(homeRailItemClassName(14, 'default')).toBeUndefined();
    expect(homeRailItemClassName(14)).toBeUndefined();
  });
});
