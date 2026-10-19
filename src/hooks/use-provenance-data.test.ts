import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/firebase/config', () => ({ db: {}, auth: { currentUser: null } }));

import { planProvenanceQueries, MIN_UNIQUE_VIEWS } from './use-provenance-data';

describe('planProvenanceQueries', () => {
  it('runs no Firestore counts for low-view listings (ledger is hidden anyway)', () => {
    expect(planProvenanceQueries({ uniqueViews: MIN_UNIQUE_VIEWS - 1, viewerUid: 'u1', sellerId: 'u1' }))
      .toEqual({ countWatchlist: false, countEnquiries: false });
  });
  it('never counts guest_enquiries for anonymous visitors or other users', () => {
    expect(planProvenanceQueries({ uniqueViews: 50, viewerUid: null, sellerId: 's1' }))
      .toEqual({ countWatchlist: true, countEnquiries: false });
    expect(planProvenanceQueries({ uniqueViews: 50, viewerUid: 'u2', sellerId: 's1' }))
      .toEqual({ countWatchlist: true, countEnquiries: false });
  });
  it('counts enquiries for the listing seller', () => {
    expect(planProvenanceQueries({ uniqueViews: 50, viewerUid: 's1', sellerId: 's1' }))
      .toEqual({ countWatchlist: true, countEnquiries: true });
  });
});
