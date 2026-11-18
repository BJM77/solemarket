import { describe, it, expect } from 'vitest';
import { routeCoinsHost, routeMainHost, coinsPublicUrl, mainOriginFor, stripCoinsBase, withCoinsBase, isCoinsHost } from './storefront-routing';

const coinsUrl = (p: string) => new URL(`https://coins.benched.au${p}`);
const route = (p: string, search = '') => routeCoinsHost(p, search, coinsUrl(p + search), 'coins.benched.au');
const searchParamsOf = (s: string) => new URLSearchParams(s);

describe('coins host routing (coins.benched.au)', () => {
  it('serves the coins homepage and pages from /coins internally', () => {
    expect(route('/')).toEqual({ type: 'rewrite', pathname: '/coins' });
    expect(route('/browse', '?q=penny')).toEqual({ type: 'rewrite', pathname: '/coins/browse' });
    expect(route('/1930-australian-penny')).toEqual({ type: 'rewrite', pathname: '/coins/1930-australian-penny' });
    expect(route('/2023-australian-2/jfg1MNbwSkdLTzGvFMMv')).toEqual({ type: 'rewrite', pathname: '/coins/2023-australian-2/jfg1MNbwSkdLTzGvFMMv' });
    expect(route('/sell')).toEqual({ type: 'rewrite', pathname: '/coins/sell' });
    expect(route('/sitemap.xml')).toEqual({ type: 'rewrite', pathname: '/coins/sitemap.xml' });
    expect(route('/robots.txt')).toEqual({ type: 'rewrite', pathname: '/coins/robots.txt' });
  });
  it('keeps /coins/... links working as-is so links never leave the coins site', () => {
    expect(route('/coins')).toEqual({ type: 'next' });
    expect(route('/coins/browse')).toEqual({ type: 'next' });
    expect(route('/coins/x/abc123')).toEqual({ type: 'next' });
  });
  it('leaves shared app pages alone', () => {
    for (const p of ['/sign-in', '/checkout', '/messages', '/profile/settings', '/api/search/lite', '/_next/static/x.js', '/product/abc', '/terms', '/favicon.svg']) {
      expect(route(p)).toEqual({ type: 'next' });
    }
  });
  it('sends basketball sections back to benched.au', () => {
    expect(route('/cards/lebron-rookie/abc')).toEqual({ type: 'redirect', url: 'https://benched.au/cards/lebron-rookie/abc' });
    expect(route('/shoes', '?size=10')).toEqual({ type: 'redirect', url: 'https://benched.au/shoes?size=10' });
    expect(route('/pokemon')).toEqual({ type: 'redirect', url: 'https://benched.au/pokemon' });
    expect(route('/sell/listings')).toEqual({ type: 'redirect', url: 'https://benched.au/sell/listings' });
  });
  it('works on coins.localhost for local testing', () => {
    const u = new URL('http://coins.localhost:9017/cards');
    expect(routeCoinsHost('/cards', '', u, 'coins.localhost:9017')).toEqual({ type: 'redirect', url: 'http://localhost:9017/cards' });
    expect(isCoinsHost('coins.localhost:9017')).toBe(true);
    expect(isCoinsHost('benched.au')).toBe(false);
    expect(mainOriginFor(new URL('https://coins.benched.au/'), 'coins.benched.au')).toBe('https://benched.au');
  });
});

describe('main host routing (benched.au)', () => {
  const sp = (s: string) => new URLSearchParams(s);
  it('serves /coins on benched.au while the subdomain is not launched', () => {
    expect(routeMainHost('/coins', searchParamsOf(''), false)).toEqual({ type: 'next' });
    expect(routeMainHost('/coins/x/abc', searchParamsOf(''), false)).toEqual({ type: 'next' });
  });
  it('moves /coins to coins.benched.au once launched', () => {
    expect(routeMainHost('/coins', searchParamsOf(''), true)).toEqual({ type: 'redirect', url: 'https://coins.benched.au' });
    expect(routeMainHost('/coins/browse', searchParamsOf('q=gold'), true)).toEqual({ type: 'redirect', url: 'https://coins.benched.au/browse?q=gold' });
  });
  it('sends coin searches on the basketball site to the coins storefront', () => {
    expect(routeMainHost('/browse', searchParamsOf('category=Coins'), false)).toEqual({ type: 'redirect', url: '/coins/browse' });
    expect(routeMainHost('/browse', searchParamsOf('category=Coins&q=penny&subCategory=Australian+Coins'), false)).toEqual({ type: 'redirect', url: '/coins/browse?q=penny&subCategory=Australian+Coins' });
    expect(routeMainHost('/browse', searchParamsOf('category=Bullion'), false)).toEqual({ type: 'redirect', url: '/coins/browse?coinType=bullion' });
    expect(routeMainHost('/browse', searchParamsOf('category=Coins'), true)).toEqual({ type: 'redirect', url: 'https://coins.benched.au/browse' });
  });
  it('leaves basketball pages alone', () => {
    expect(routeMainHost('/browse', searchParamsOf('category=Sneakers'), false)).toEqual({ type: 'next' });
    expect(routeMainHost('/cards', searchParamsOf(''), false)).toEqual({ type: 'next' });
    expect(routeMainHost('/coincam', searchParamsOf(''), false)).toEqual({ type: 'next' });
    expect(routeMainHost('/', searchParamsOf(''), true)).toEqual({ type: 'next' });
  });
});

describe('coins URLs', () => {
  it('builds canonical URLs on benched.au/coins until launched, then coins.benched.au', () => {
    expect(coinsPublicUrl('/', false)).toBe('https://benched.au/coins');
    expect(coinsPublicUrl('/browse', false)).toBe('https://benched.au/coins/browse');
    expect(coinsPublicUrl('/coins/x/1', false)).toBe('https://benched.au/coins/x/1');
    expect(coinsPublicUrl('/', true)).toBe('https://coins.benched.au');
    expect(coinsPublicUrl('/coins/x/1', true)).toBe('https://coins.benched.au/x/1');
  });
  it('adds and strips the base path', () => {
    expect(stripCoinsBase('/coins')).toBe('/');
    expect(stripCoinsBase('/coins/browse')).toBe('/browse');
    expect(stripCoinsBase('/coinsx')).toBe('/coinsx');
    expect(withCoinsBase('/')).toBe('/coins');
    expect(withCoinsBase('/browse')).toBe('/coins/browse');
    expect(withCoinsBase('/coins/browse')).toBe('/coins/browse');
  });
});

describe('TCG filters on the basketball site redirect to /pokemon', () => {
  it('sends old Pokémon and Yu-Gi-Oh browse URLs to /pokemon', () => {
    expect(routeMainHost('/browse', searchParamsOf('subCategory=Pokemon'), false)).toEqual({ type: 'redirect', url: '/pokemon?subCategory=Pokemon', temporary: true });
    expect(routeMainHost('/browse', searchParamsOf('subCategory=Pok%C3%A9mon'), false)).toEqual({ type: 'redirect', url: '/pokemon?subCategory=Pok%C3%A9mon', temporary: true });
    expect(routeMainHost('/cards', searchParamsOf('category=Collector+Cards&subCategory=Yu-Gi-Oh!'), false)).toEqual({ type: 'redirect', url: '/pokemon?subCategory=Yu-Gi-Oh%21', temporary: true });
    // A bare "Magic" stays on the basketball site (Orlando Magic, Magic Johnson).
    expect(routeMainHost('/search', searchParamsOf('subCategory=Magic&q=lightning'), false)).toEqual({ type: 'next' });
    expect(routeMainHost('/search', searchParamsOf('subCategory=Magic: The Gathering&q=lightning'), false)).toEqual({ type: 'redirect', url: '/pokemon?q=lightning&subCategory=Magic%3A+The+Gathering', temporary: true });
    expect(routeMainHost('/search', searchParamsOf('subCategory=MTG'), false)).toEqual({ type: 'redirect', url: '/pokemon?subCategory=MTG', temporary: true });
  });

  it('does not redirect basketball card filters or the /pokemon page itself', () => {
    expect(routeMainHost('/browse', searchParamsOf('category=Collector+Cards&subCategory=Basketball+Cards'), false)).toEqual({ type: 'next' });
    expect(routeMainHost('/cards', searchParamsOf('subCategory=Rookies'), false)).toEqual({ type: 'next' });
    expect(routeMainHost('/pokemon', searchParamsOf('subCategory=Pokemon'), false)).toEqual({ type: 'next' });
    expect(routeMainHost('/browse', searchParamsOf('q=Jordan'), false)).toEqual({ type: 'next' });
  });
});
