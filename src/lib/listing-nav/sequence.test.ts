import { describe, it, expect } from 'vitest';
import { createSequence, directSequence, extendSequence, neighboursIn, remainderParams, type PageFetcher, type SequenceSource } from './sequence';

const e = (id: string) => ({ id, url: `/cards/x/${id}` });

/**
 * Fake catalogue: newest-first "available main-site" listings with a category.
 * Pages of `size` raw docs; a filter may drop docs from a page (like getProducts' in-memory filters).
 */
function fakeFetcher(catalogue: { id: string; category: string; tag?: string }[], size = 3) {
  const calls: { params: Record<string, any>; cursor?: string }[] = [];
  const fetcher: PageFetcher = async (src: SequenceSource, cursor) => {
    calls.push({ params: src.params, cursor });
    const start = cursor ? catalogue.findIndex((d) => d.id === cursor) + 1 : 0;
    const raw = catalogue.slice(start, start + size);
    const matches = raw.filter((d) => (!src.params.category || d.category === src.params.category) && (!src.params.tag || d.tag === src.params.tag));
    const hasMore = start + size < catalogue.length;
    return { entries: matches.map((d) => e(d.id)), nextCursor: hasMore ? raw[raw.length - 1].id : undefined };
  };
  return { fetcher, calls };
}

async function walk(state: ReturnType<typeof createSequence>, fetcher: PageFetcher, fromId: string) {
  const order = [fromId];
  let s = state;
  let id = fromId;
  for (let guard = 0; guard < 100; guard++) {
    let n = neighboursIn(s, id)!;
    if (!n.next && !n.done) { s = await extendSequence(s, fetcher); n = neighboursIn(s, id)!; }
    if (n.done) return { order, state: s };
    id = n.next!.id;
    order.push(id);
  }
  throw new Error('did not end');
}

const catalogue = [
  { id: 's1', category: 'Sneakers', tag: 'jordan' },
  { id: 'c1', category: 'Cards', tag: 'psa10' },
  { id: 'c2', category: 'Cards' },
  { id: 's2', category: 'Sneakers' },
  { id: 'c3', category: 'Cards', tag: 'psa10' },
  { id: 'c4', category: 'Cards' },
  { id: 'c5', category: 'Cards' },
  { id: 'c6', category: 'Cards', tag: 'psa10' },
  { id: 's3', category: 'Sneakers', tag: 'jordan' },
  { id: 'c7', category: 'Cards', tag: 'psa10' },
];

describe('listing sequence', () => {
  it('steps through the filtered grid, the rest of its query, the category, then everything, with no repeats', async () => {
    const { fetcher } = fakeFetcher(catalogue);
    // Grid loaded the first raw page (s1,c1,c2) for Cards+psa10 and showed only c1.
    const state = createSequence({ trail: [e('c1')], filter: { category: 'Cards', tag: 'psa10', sort: 'createdAt-desc', view: 'grid' }, cursor: 'c2' });
    const { order } = await walk(state, fetcher, 'c1');
    expect(order).toEqual(['c1', 'c3', 'c6', 'c7', 'c2', 'c4', 'c5', 's1', 's2', 's3']);
    expect(new Set(order).size).toBe(order.length);
    expect(order).toHaveLength(catalogue.length);
  });

  it('keeps paging past pages the in-memory filters emptied', async () => {
    const { fetcher, calls } = fakeFetcher(catalogue, 2);
    const state = createSequence({ trail: [e('s1')], filter: { category: 'Sneakers', tag: 'jordan' } });
    const s = await extendSequence({ ...state, trail: [e('s1')], cursor: 'c1' }, fetcher);
    // Raw pages (c2,s2) (c3,c4) (c5,c6) have no Jordans; it must keep going to (s3,c7).
    expect(s.trail.map((x) => x.id)).toEqual(['s1', 's3']);
    expect(calls.length).toBe(4);
  });

  it('starts the filtered phase from the top when the grid had not loaded yet, skipping tiles already in the trail', async () => {
    const { fetcher } = fakeFetcher(catalogue);
    const state = createSequence({ trail: [e('c1'), e('c3')], filter: { category: 'Cards', tag: 'psa10' } });
    const { order } = await walk(state, fetcher, 'c3');
    expect(order.slice(0, 3)).toEqual(['c3', 'c6', 'c7']);
    expect(order).not.toContain('c1'); // already behind us (reachable with Previous)
  });

  it('skips the filtered query when the grid already showed every match', async () => {
    const { fetcher, calls } = fakeFetcher(catalogue);
    const state = createSequence({ trail: [e('c1'), e('c3'), e('c6'), e('c7')], filter: { category: 'Cards', tag: 'psa10' }, cursor: null });
    const s = await extendSequence(state, fetcher);
    expect(calls[0].params).toEqual({ sort: 'createdAt-desc', category: 'Cards' });
    expect(s.trail[4].id).toBe('c2');
  });

  it('opened directly: default newest-first feed, current listing never repeated, then a friendly end', async () => {
    const { fetcher, calls } = fakeFetcher(catalogue);
    const state = directSequence(e('c4'));
    expect(state.sources).toHaveLength(1);
    const { order, state: end } = await walk(state, fetcher, 'c4');
    expect(order[0]).toBe('c4');
    expect(order.filter((x) => x === 'c4')).toHaveLength(1);
    expect(order).toHaveLength(catalogue.length);
    expect(neighboursIn(end, order[order.length - 1])).toMatchObject({ next: null, done: true });
    expect(calls.every((c) => !('category' in c.params))).toBe(true);
  });

  it('Previous walks back through what was seen', async () => {
    const { fetcher } = fakeFetcher(catalogue);
    const { state } = await walk(createSequence({ trail: [e('c1'), e('c2')], filter: { category: 'Cards' } }), fetcher, 'c2');
    expect(neighboursIn(state, 'c2')!.prev!.id).toBe('c1');
    expect(neighboursIn(state, 'c1')!.prev).toBeNull();
    expect(neighboursIn(state, 'nope')).toBeNull();
  });

  it('plain lists (home rails) continue into the default feed', async () => {
    const { fetcher } = fakeFetcher(catalogue);
    const { order } = await walk(createSequence({ trail: [e('c5'), e('s2')] }), fetcher, 'c5');
    expect(order.slice(0, 3)).toEqual(['c5', 's2', 's1']);
    expect(new Set(order).size).toBe(catalogue.length);
  });

  it('ends instead of looping when a cursor does not advance', async () => {
    const stuck: PageFetcher = async () => ({ entries: [e('a')], nextCursor: 'same' });
    const s = await extendSequence({ ...directSequence(e('a')), cursor: 'same' }, stuck);
    expect(neighboursIn(s, 'a')).toMatchObject({ next: null, done: true });
  });

  it('keeps Pokémon and coin grids inside their section; main grids use the main feed', () => {
    expect(remainderParams({ category: 'Collector Cards', subCategory: 'Pokémon' })).toEqual({ sort: 'createdAt-desc', category: 'Collector Cards', subCategory: 'Pokémon' });
    expect(remainderParams({ category: 'Coins' })).toEqual({ sort: 'createdAt-desc', category: 'Coins' });
    expect(remainderParams({ category: 'Sneakers', q: 'jordan' })).toEqual({ sort: 'createdAt-desc' });
    // The main feed relies on getProducts to hide Pokémon/coins (no includePokemon/includeCoins).
    expect(createSequence({ trail: [] }).sources[0].params).toEqual({ sort: 'createdAt-desc' });
  });

  it('drops duplicate tiles from the starting list', () => {
    const s = createSequence({ trail: [e('a'), e('b'), e('a')] });
    expect(s.trail.map((x) => x.id)).toEqual(['a', 'b']);
  });
});
