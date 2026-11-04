import { describe, it, expect } from 'vitest';
import { planAlerts, alertKey } from './alerts';

const p = (id: string, extra: any = {}) => ({ id, title: `Prizm Wembanyama ${id}`, category: 'Collector Cards', price: 15, status: 'available', sellerId: 'seller', ...extra });
const s = (id: string, extra: any = {}) => ({ id, userId: 'buyer', name: id, criteria: { q: 'prizm', category: 'Collector Cards', priceRange: [0, 20] as [number, number] }, alertsEnabled: true, ...extra });

describe('planAlerts', () => {
  it('matches keyword, category and price', () => {
    const r = planAlerts([p('a'), p('b', { price: 50 }), p('c', { category: 'Sneakers' }), p('d', { title: 'Topps Chrome' })], [s('s1')]);
    expect(r).toHaveLength(1);
    expect(r[0].productIds).toEqual(['a']);
  });
  it('skips drafts and unavailable listings', () => {
    expect(planAlerts([p('a', { isDraft: true }), p('b', { status: 'sold' })], [s('s1')])).toEqual([]);
  });
  it('never alerts sellers about their own listings', () => {
    expect(planAlerts([p('a', { sellerId: 'buyer' })], [s('s1')])).toEqual([]);
  });
  it('dedupes per search and listing', () => {
    const r = planAlerts([p('a'), p('b')], [s('s1')], { alreadySent: new Set([alertKey('s1', 'a')]) });
    expect(r[0].productIds).toEqual(['b']);
    expect(planAlerts([p('a')], [s('s1')], { alreadySent: new Set([alertKey('s1', 'a')]) })).toEqual([]);
  });
  it('respects paused searches and user opt-out', () => {
    expect(planAlerts([p('a')], [s('s1', { alertsEnabled: false })])).toEqual([]);
    expect(planAlerts([p('a')], [s('s1')], { optedOutUsers: new Set(['buyer']) })).toEqual([]);
  });
  it('caps searches per user per run', () => {
    const searches = Array.from({ length: 8 }, (_, i) => s(`s${i}`));
    expect(planAlerts([p('a')], searches)).toHaveLength(5);
  });
});
