import { describe, it, expect } from 'vitest';
import { sortPhotos, pairPhotos, swapPair, unpair, joinWithNext, movePair, removePair } from './pairing';

const p = (id: string, t = 0, name = id) => ({ id, name, lastModified: t });

describe('pairing', () => {
  it('sorts by time then natural filename', () => {
    const s = sortPhotos([p('c', 2), p('IMG_10', 1), p('IMG_9', 1)]);
    expect(s.map((x) => x.id)).toEqual(['IMG_9', 'IMG_10', 'c']);
    expect(sortPhotos([p('b', 1), p('a', 2)], 'name').map((x) => x.id)).toEqual(['a', 'b']);
  });
  it('pairs consecutively, odd last is front-only', () => {
    const pairs = pairPhotos([p('1'), p('2'), p('3'), p('4'), p('5')]);
    expect(pairs.map((x) => [x.front.id, x.back?.id ?? null])).toEqual([['1', '2'], ['3', '4'], ['5', null]]);
  });
  it('swaps, unpairs, joins, moves, removes', () => {
    let pairs = pairPhotos([p('1'), p('2'), p('3'), p('4')]);
    pairs = swapPair(pairs, 0);
    expect([pairs[0].front.id, pairs[0].back?.id]).toEqual(['2', '1']);
    pairs = unpair(pairs, 1);
    expect(pairs.length).toBe(3);
    expect(pairs[2]).toMatchObject({ front: { id: '4' }, back: null });
    pairs = joinWithNext(pairs, 1);
    expect([pairs[1].front.id, pairs[1].back?.id]).toEqual(['3', '4']);
    expect(joinWithNext(pairs, 0)).toBe(pairs); // both paired: no-op
    pairs = movePair(pairs, 1, -1);
    expect(pairs[0].front.id).toBe('3');
    expect(movePair(pairs, 0, -1)).toBe(pairs);
    expect(removePair(pairs, 0).length).toBe(1);
  });
});
