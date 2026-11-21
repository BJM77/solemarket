/** Tiles fetched for each homepage rail: 3 rows of 5 on desktop (`md` and up). */
export const HOME_RAIL_COUNT = 15;

/** Visible tiles below `md`: 2 columns × 7 rows. The 15th tile is hidden, not omitted from the fetch. */
export const HOME_RAIL_MOBILE_COUNT = 14;

/** Applied to the last home-rail tile so it only appears from the `md` breakpoint up. */
export const HOME_RAIL_LAST_TILE_CLASS = 'hidden md:block';

export function isHomeRailLayout(layout: string | undefined): boolean {
  return layout === 'homeRail' || layout === 'justListed';
}

/** Class for a home-rail grid item. The 15th tile is hidden below `md`. */
export function homeRailItemClassName(index: number, layout?: string): string | undefined {
  if (isHomeRailLayout(layout) && index === HOME_RAIL_MOBILE_COUNT) {
    return HOME_RAIL_LAST_TILE_CLASS;
  }
  return undefined;
}
