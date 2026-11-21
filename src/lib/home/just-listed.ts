import { HOME_RAIL_COUNT } from './home-rail';

/** How many Just Listed tiles fill 3 rows of 5 on the desktop homepage. */
export const JUST_LISTED_COUNT = HOME_RAIL_COUNT;

/**
 * Pick the Just Listed rail: the `count` newest listings (Popular Listings is
 * the rail that avoids duplicates, not this one). Fetches 15 so desktop can
 * show 3×5; the grid hides the 15th tile below `md` (2 columns × 7 rows).
 *
 * `newest` must already be in createdAt descending order, with coins/TCG excluded.
 */
export function pickJustListed<T extends { id: string }>(newest: T[], count = JUST_LISTED_COUNT): T[] {
  return newest.slice(0, count);
}
