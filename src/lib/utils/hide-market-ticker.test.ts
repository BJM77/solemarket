import { describe, it, expect } from 'vitest';
import { HIDDEN_TICKER_PREFIXES, shouldHideMarketTicker } from './hide-market-ticker';

describe('shouldHideMarketTicker', () => {
  it('exposes a single prefix list covering admin, listing tools, and checkout', () => {
    expect(HIDDEN_TICKER_PREFIXES).toEqual([
      '/admin',
      '/sell/create',
      '/sell/wizard',
      '/sell/autofast',
      '/sell/fast-bulk',
      '/sell/proload',
      '/sell/bulk',
      '/sell/bulk-csv-lister',
      '/sell/drafts-review',
      '/sell/review',
      '/profile/listings/bulk',
      '/autocard',
      '/shoecam',
      '/procam',
      '/samcam',
      '/coincam',
      '/cart',
      '/checkout',
      '/order',
    ]);
  });

  it('hides the ticker on all /admin pages', () => {
    expect(shouldHideMarketTicker('/admin')).toBe(true);
    expect(shouldHideMarketTicker('/admin/orders')).toBe(true);
    expect(shouldHideMarketTicker('/admin/products/approvals')).toBe(true);
  });

  it('hides the ticker on add/edit listing, drafts, bulk, and scanner pages', () => {
    expect(shouldHideMarketTicker('/sell/create')).toBe(true);
    expect(shouldHideMarketTicker('/sell/create?edit=abc')).toBe(true);
    expect(shouldHideMarketTicker('/sell/wizard')).toBe(true);
    expect(shouldHideMarketTicker('/sell/autofast')).toBe(true);
    expect(shouldHideMarketTicker('/sell/fast-bulk')).toBe(true);
    expect(shouldHideMarketTicker('/sell/proload')).toBe(true);
    expect(shouldHideMarketTicker('/sell/bulk')).toBe(true);
    expect(shouldHideMarketTicker('/sell/bulk-csv-lister')).toBe(true);
    expect(shouldHideMarketTicker('/sell/drafts-review')).toBe(true);
    expect(shouldHideMarketTicker('/sell/review')).toBe(true);
    expect(shouldHideMarketTicker('/profile/listings/bulk')).toBe(true);
    expect(shouldHideMarketTicker('/autocard')).toBe(true);
    expect(shouldHideMarketTicker('/shoecam/capture')).toBe(true);
    expect(shouldHideMarketTicker('/procam/review/1')).toBe(true);
    expect(shouldHideMarketTicker('/samcam/list')).toBe(true);
    expect(shouldHideMarketTicker('/coincam/capture')).toBe(true);
  });

  it('hides the ticker on cart, checkout, and /order token pages', () => {
    expect(shouldHideMarketTicker('/cart')).toBe(true);
    expect(shouldHideMarketTicker('/checkout')).toBe(true);
    expect(shouldHideMarketTicker('/checkout/confirmation')).toBe(true);
    expect(shouldHideMarketTicker('/order')).toBe(true);
    expect(shouldHideMarketTicker('/order/abc123')).toBe(true);
    expect(shouldHideMarketTicker('/order/abc123/')).toBe(true);
  });

  it('does not hide the ticker on browse, sell landing, or seller dashboards', () => {
    expect(shouldHideMarketTicker('/')).toBe(false);
    expect(shouldHideMarketTicker('/browse')).toBe(false);
    expect(shouldHideMarketTicker('/product/xyz')).toBe(false);
    expect(shouldHideMarketTicker('/sell')).toBe(false);
    expect(shouldHideMarketTicker('/sell/dashboard')).toBe(false);
    expect(shouldHideMarketTicker('/sell/reviews')).toBe(false);
    expect(shouldHideMarketTicker('/sell/analytics')).toBe(false);
    expect(shouldHideMarketTicker('/profile/listings')).toBe(false);
    expect(shouldHideMarketTicker('/profile/orders')).toBe(false);
    expect(shouldHideMarketTicker('/seller/dashboard')).toBe(false);
  });

  it('returns false for empty pathnames', () => {
    expect(shouldHideMarketTicker(undefined)).toBe(false);
    expect(shouldHideMarketTicker(null)).toBe(false);
    expect(shouldHideMarketTicker('')).toBe(false);
  });
});
