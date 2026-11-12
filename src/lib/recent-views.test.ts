import { describe, it, expect, beforeEach } from 'vitest';
import {
  addRecentView, removeRecentView, parseRecentViews, isOptimizableThumb, recordRecentView, readRecentViews,
  forgetRecentView, RECENT_VIEWS_KEY,
} from './recent-views';

const thumb = 'https://firebasestorage.googleapis.com/v0/b/x/o/a.jpg?alt=media';
const v = (id: string) => ({ id, title: `Item ${id}`, url: `/shoes/item-${id}/${id}`, thumb });

describe('recent views helpers', () => {
  it('adds newest first, dedupes and caps at 5', () => {
    let list = [] as ReturnType<typeof addRecentView>;
    for (const id of ['1', '2', '3', '4', '5', '6']) list = addRecentView(list, v(id));
    expect(list.map((r) => r.id)).toEqual(['6', '5', '4', '3', '2']);
    list = addRecentView(list, v('3'));
    expect(list.map((r) => r.id)).toEqual(['3', '6', '5', '4', '2']);
  });
  it('rejects invalid entries and drops thumbs next/image cannot load', () => {
    expect(addRecentView([], { id: '', title: 'x', url: '/a' })).toEqual([]);
    expect(addRecentView([], { id: '1', title: 'x', url: 'https://evil.example/a' })).toEqual([]);
    expect(addRecentView([], { id: '1', title: 'x', url: '/a', thumb: 'https://evil.example/a.jpg' })[0].thumb).toBeUndefined();
    expect(isOptimizableThumb(thumb)).toBe(true);
    expect(isOptimizableThumb('http://firebasestorage.googleapis.com/a')).toBe(false);
    expect(isOptimizableThumb('not a url')).toBe(false);
  });
  it('removes by id', () => {
    expect(removeRecentView([{ ...v('1'), at: 1 }, { ...v('2'), at: 2 }], '1').map((r) => r.id)).toEqual(['2']);
  });
  it('parses stored data defensively', () => {
    expect(parseRecentViews(null)).toEqual([]);
    expect(parseRecentViews('{bad')).toEqual([]);
    expect(parseRecentViews('{"a":1}')).toEqual([]);
    const raw = JSON.stringify([{ ...v('1'), at: 1 }, { ...v('1'), at: 0 }, { id: 2 }, { ...v('3'), at: 3, thumb: 'https://x.test/a.jpg' }]);
    const parsed = parseRecentViews(raw);
    expect(parsed.map((r) => r.id)).toEqual(['1', '3']);
    expect(parsed[1].thumb).toBeUndefined();
  });
});

describe('recent views store', () => {
  beforeEach(() => localStorage.clear());
  it('records, reads and forgets via localStorage', () => {
    let events = 0;
    const on = () => { events++; };
    window.addEventListener('benched:recent-views', on);
    recordRecentView(v('1'));
    recordRecentView(v('2'));
    expect(readRecentViews().map((r) => r.id)).toEqual(['2', '1']);
    forgetRecentView('1');
    expect(readRecentViews().map((r) => r.id)).toEqual(['2']);
    expect(JSON.parse(localStorage.getItem(RECENT_VIEWS_KEY)!)).toHaveLength(1);
    expect(events).toBe(3);
    window.removeEventListener('benched:recent-views', on);
  });
});
