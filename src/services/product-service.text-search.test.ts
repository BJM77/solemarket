import { beforeEach, describe, expect, it, vi } from 'vitest';

const textSearchListings = vi.hoisted(() => vi.fn());
const getDocs = vi.hoisted(() => vi.fn());

vi.mock('@/lib/firebase/config', () => ({ db: {} }));
vi.mock('@/app/actions/search/text-search', () => ({ textSearchListings }));
vi.mock('firebase/firestore', () => {
  const c = (..._a: unknown[]) => ({ type: 'where' });
  return {
    collection: c, query: c, where: c, or: c, and: c, orderBy: c, limit: c, startAfter: c, doc: c,
    getDocs, getDoc: vi.fn(), Timestamp: {},
  };
});

import { getProducts } from './product-service';

const listing = (id: string, extra: Record<string, unknown> = {}) => ({
  id, title: `Jordan ${id}`, price: 100, status: 'available', category: 'Collector Cards', createdAt: { seconds: 100 }, ...extra,
});

beforeEach(() => {
  textSearchListings.mockReset();
  getDocs.mockReset();
});

describe('getProducts text search on the shared index', () => {
  it('reads only one page from the index when the filters are index-only (/cards?q=Jordan)', async () => {
    textSearchListings.mockResolvedValue({ products: [listing('a')], total: 3, hasMore: true, lastVisibleId: 'a' });
    const r = await getProducts({ q: 'Jordan', category: 'Collector Cards' } as any);
    expect(getDocs).not.toHaveBeenCalled();
    expect(textSearchListings).toHaveBeenCalledWith(expect.objectContaining({ q: 'Jordan', kind: 'cards', mode: 'page', sort: 'createdAt-desc' }));
    expect(r).toMatchObject({ totalCount: 3, hasMore: true, lastVisibleId: 'a' });
  });

  it('re-checks category, sub-category and brand on hydrated listings so sneakers never show on /cards', async () => {
    textSearchListings.mockResolvedValue({
      products: [
        listing('card', { subCategory: 'Jordan' }),
        listing('shoe', { category: 'Sneakers', subCategory: 'Jordan' }),
        listing('other-sub', { subCategory: 'Kobe' }),
      ],
      total: 3,
      hasMore: false,
    });
    const r = await getProducts({ q: 'Jordan', category: 'Collector Cards', subCategory: 'Jordan' } as any);
    expect(textSearchListings).toHaveBeenCalledWith(expect.objectContaining({ mode: 'all', kind: 'cards' }));
    expect(r.products.map((p) => p.id)).toEqual(['card']);
    expect(r.totalCount).toBe(1);
  });

  it('ends the list on an unknown cursor instead of restarting at the first page', async () => {
    textSearchListings.mockResolvedValue({ products: [listing('a'), listing('b')], total: 2, hasMore: false });
    const r = await getProducts({ q: 'Jordan', sort: 'views-desc', lastId: 'gone' } as any);
    expect(r.products).toEqual([]);
    expect(r.hasMore).toBe(false);
  });

  it('ranks checked-in listings after live ones when sorting in memory', async () => {
    textSearchListings.mockResolvedValue({
      products: [listing('sold', { status: 'sold', views: 99 }), listing('live', { views: 1 })],
      total: 2,
      hasMore: false,
    });
    const r = await getProducts({ q: 'Jordan', sort: 'views-desc' } as any);
    expect(r.products.map((p) => p.id)).toEqual(['live', 'sold']);
  });

  it('applies a price range in memory for text search', async () => {
    textSearchListings.mockResolvedValue({
      products: [listing('cheap', { price: 20, subCategory: 'X' }), listing('dear', { price: 500, subCategory: 'X' })],
      total: 2,
      hasMore: false,
    });
    const r = await getProducts({ q: 'Jordan', subCategory: 'X', priceRange: '100,1000' } as any);
    expect(r.products.map((p) => p.id)).toEqual(['dear']);
  });
});
