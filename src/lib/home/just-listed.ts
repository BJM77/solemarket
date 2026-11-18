/** How many Just Listed tiles fill 3 rows of 5 on the desktop homepage. */
export const JUST_LISTED_COUNT = 15;

/**
 * Pick the Just Listed rail: the `count` newest listings (Popular Listings is
 * the rail that avoids duplicates, not this one).
 *
 * `newest` must already be in createdAt descending order, with coins/TCG excluded.
 */
export function pickJustListed<T extends { id: string }>(newest: T[], count = JUST_LISTED_COUNT): T[] {
  return newest.slice(0, count);
}
