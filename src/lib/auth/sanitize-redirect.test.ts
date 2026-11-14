import { describe, expect, it } from 'vitest';
import { sanitizeRedirect, withRedirectParam } from './sanitize-redirect';

describe('sanitizeRedirect', () => {
  it('allows same-site relative paths, including query and hash', () => {
    expect(sanitizeRedirect('/')).toBe('/');
    expect(sanitizeRedirect('/browse')).toBe('/browse');
    expect(sanitizeRedirect('/browse?sort=price&q=aj1')).toBe('/browse?sort=price&q=aj1');
    expect(sanitizeRedirect('/product/abc#photos')).toBe('/product/abc#photos');
    expect(sanitizeRedirect('  /cards  ')).toBe('/cards');
  });

  it('falls back for missing or empty values', () => {
    expect(sanitizeRedirect(null)).toBe('/');
    expect(sanitizeRedirect(undefined)).toBe('/');
    expect(sanitizeRedirect('')).toBe('/');
    expect(sanitizeRedirect('   ')).toBe('/');
    expect(sanitizeRedirect('not-a-path', '/home')).toBe('/home');
  });

  it('rejects off-site, protocol-relative, and scheme-based targets', () => {
    expect(sanitizeRedirect('https://evil.com')).toBe('/');
    expect(sanitizeRedirect('http://evil.com/phish')).toBe('/');
    expect(sanitizeRedirect('//evil.com')).toBe('/');
    expect(sanitizeRedirect('///evil.com')).toBe('/');
    expect(sanitizeRedirect('javascript:alert(1)')).toBe('/');
    expect(sanitizeRedirect('/\\evil.com')).toBe('/');
    expect(sanitizeRedirect('/%5C%5Cevil.com')).toBe('/');
    expect(sanitizeRedirect('/%2F%2Fevil.com')).toBe('/');
  });

  it('does not bounce back to the auth pages', () => {
    expect(sanitizeRedirect('/sign-in')).toBe('/');
    expect(sanitizeRedirect('/sign-up')).toBe('/');
    expect(sanitizeRedirect('/sign-in?redirect=/browse')).toBe('/');
    expect(sanitizeRedirect('/sign-up?accountType=seller')).toBe('/');
  });
});

describe('withRedirectParam', () => {
  it('appends a sanitized redirect query param', () => {
    expect(withRedirectParam('/sign-in', '/browse?q=1')).toBe(
      '/sign-in?redirect=%2Fbrowse%3Fq%3D1',
    );
    expect(withRedirectParam('/sign-up', '/product/abc')).toBe(
      '/sign-up?redirect=%2Fproduct%2Fabc',
    );
  });

  it('omits the param when the redirect is not usable', () => {
    expect(withRedirectParam('/sign-in', 'https://evil.com')).toBe('/sign-in');
    expect(withRedirectParam('/sign-in', '/sign-in')).toBe('/sign-in');
    expect(withRedirectParam('/sign-up', null)).toBe('/sign-up');
  });
});
