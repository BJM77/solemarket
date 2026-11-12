/** Thresholds that trigger the Super Seller ABN prompt. Keep these in one place. */
export const SUPER_SELLER_SALES_COUNT_7D = 20;
export const SUPER_SELLER_SALES_AMOUNT_30D_AUD = 2000;
export const SUPER_SELLER_ABN_GRACE_DAYS = 7;
export const SUPER_SELLER_ABN_GRACE_MS = SUPER_SELLER_ABN_GRACE_DAYS * 24 * 60 * 60 * 1000;

/** Australian GST registration turnover threshold (factual figure only, not advice). */
export const GST_REGISTRATION_THRESHOLD_AUD = 75_000;

export const PAUSE_NEW_LISTINGS_MESSAGE =
  'New listings are paused until you add an ABN. Your existing listings stay live.';
