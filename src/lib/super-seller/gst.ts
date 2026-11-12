/** GST included in an Australian GST-inclusive price is one eleventh of the price. */

export function roundMoney(n: number): number {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

export interface GstInclusiveBreakdown {
  incGst: number;
  gst: number;
  exGst: number;
}

/** Split a GST-inclusive amount into GST (price / 11) and the GST-exclusive amount. */
export function gstInclusiveBreakdown(amountIncGst: number): GstInclusiveBreakdown {
  const incGst = roundMoney(Number(amountIncGst) || 0);
  const gst = roundMoney(incGst / 11);
  const exGst = roundMoney(incGst - gst);
  return { incGst, gst, exGst };
}
