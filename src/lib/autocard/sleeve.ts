/**
 * AutoCard sleeve / holder mode. A manual toggle (persisted in localStorage) because most
 * cards are photographed in a soft penny sleeve or a hard toploader / graded slab.
 *
 *  - none: bare card, strict outer-edge detection (default).
 *  - soft: penny sleeve. The sleeve edge sits just outside the card, so the outer edge is
 *          allowed to be a little looser, overall glare tolerance is slightly higher (the
 *          plastic always has a faint sheen), but glare along the card EDGES is checked
 *          more strictly because sleeve reflections hide corner and edge wear.
 *  - hard: toploader, card saver or graded slab. The detector finds the outer plastic
 *          outline, then searches inward for the card's own boundary (see detect.ts).
 *          Output is always the card only (63:88), never the slab label.
 */
export type Sleeve = 'none' | 'soft' | 'hard';

export const SLEEVES: { id: Sleeve; label: string }[] = [
  { id: 'none', label: 'No sleeve' },
  { id: 'soft', label: 'Soft sleeve' },
  { id: 'hard', label: 'Hard sleeve / slab' },
];

export const SLEEVE_STORAGE_KEY = 'autocard.sleeve';

export function parseSleeve(v: unknown): Sleeve {
  return v === 'soft' || v === 'hard' ? v : 'none';
}

export function loadSleeve(storage: Pick<Storage, 'getItem'> | null | undefined): Sleeve {
  try { return parseSleeve(storage?.getItem(SLEEVE_STORAGE_KEY)); } catch { return 'none'; }
}

export function saveSleeve(storage: Pick<Storage, 'setItem'> | null | undefined, s: Sleeve): void {
  try { storage?.setItem(SLEEVE_STORAGE_KEY, s); } catch { /* private mode / quota */ }
}

/**
 * Glare limits (share of card pixels in the largest CLUSTERED clipped-highlight blob,
 * see lighting.ts). Soft sleeves get slightly more tolerance overall; hard plastic too.
 */
export const GLARE_THRESHOLD: Record<Sleeve, number> = { none: 0.006, soft: 0.008, hard: 0.008 };
/** Clustered glare inside the card's edge band (share of edge-band pixels). Strict in soft mode. */
export const EDGE_GLARE_THRESHOLD: Record<Sleeve, number> = { none: Infinity, soft: 0.01, hard: Infinity };

/** Edge-refinement search radius as a fraction of edge length. Hard mode stays tight so the
 *  line fit cannot jump outward from the card edge to the plastic edge. */
export const REFINE_RADIUS_FRAC: Record<Sleeve, number> = { none: 0.04, soft: 0.04, hard: 0.03 };
