/**
 * Detects attempts to take a conversation / transaction off-platform
 * (phone numbers, emails, PayID/bank details, external payment or chat apps, links).
 * Used to warn the sender, flag the message for moderation, and keep buyer protection intact.
 *
 * Deliberately conservative: it flags, it never blocks on its own.
 */
export type OffPlatformReason =
  | 'phone'
  | 'email'
  | 'bank_details'
  | 'payid'
  | 'external_payment'
  | 'external_chat'
  | 'external_link'
  | 'social_handle';

export interface OffPlatformResult {
  flagged: boolean;
  reasons: OffPlatformReason[];
  /** Text with detected contact details masked, safe to show to the other party if you choose to. */
  masked: string;
}

// Normalise common obfuscations: "zero four one two", "dot", "at", spaced digits.
const WORD_DIGITS: Record<string, string> = {
  zero: '0', oh: '0', one: '1', two: '2', three: '3', four: '4', five: '5', six: '6', seven: '7', eight: '8', nine: '9',
};

export function normalise(text: string): string {
  let t = text.toLowerCase();
  t = t.replace(/\b(zero|oh|one|two|three|four|five|six|seven|eight|nine)\b/g, (w) => WORD_DIGITS[w]);
  t = t.replace(/\s*\[?\(?\s*(at)\s*\)?\]?\s*/g, (m) => (/\s/.test(m) || /[\[(]/.test(m) ? '@' : m));
  t = t.replace(/\s*\[?\(?\s*dot\s*\)?\]?\s*/g, '.');
  return t;
}

const PATTERNS: Array<[OffPlatformReason, RegExp]> = [
  // AU mobiles/landlines incl. +61, spaced or dashed; also any 9+ digit run.
  ['phone', /(\+?61[\s-]?|0)[2-478](?:[\s-]?\d){8}\b/],
  ['phone', /(?:\d[\s.-]?){9,}\d/],
  ['email', /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/],
  ['bank_details', /\bbsb\b|\b\d{3}[\s-]?\d{3}\b.*\b(acc|account)\b|\baccount\s*(no|number|#)/],
  ['payid', /\bpay\s?id\b|\bosko\b/],
  ['external_payment', /\b(paypal|pay\s?pal|venmo|zelle|cash\s?app|bank\s?transfer|direct\s?deposit|western\s?union|crypto|bitcoin|usdt|beem|f&f|friends\s?(and|&)\s?family|gift\s?card)\b/],
  ['external_chat', /\b(whats\s?app|telegram|signal|wechat|kik|snapchat|snap\s?chat|text me|call me|sms me|dm me|message me on)\b/],
  ['external_link', /\b(https?:\/\/|www\.)\S+|\b[a-z0-9-]+\.(com|net|org|io|co|au|me|ly)(\/\S*)?\b/],
  ['social_handle', /(^|\s)@[a-z0-9_.]{3,}\b|\b(insta|instagram|ig|facebook|fb|marketplace)\b/],
];

const ALLOWED_DOMAINS = /benched\.au/;

export function detectOffPlatform(text: string): OffPlatformResult {
  const reasons = new Set<OffPlatformReason>();
  if (!text) return { flagged: false, reasons: [], masked: text };
  const n = normalise(text);
  for (const [reason, re] of PATTERNS) {
    const m = n.match(re);
    if (!m) continue;
    if (reason === 'external_link' && ALLOWED_DOMAINS.test(m[0])) continue;
    // emails also match the handle/link patterns; keep the most specific label only
    if ((reason === 'external_link' || reason === 'social_handle') && reasons.has('email')) continue;
    reasons.add(reason);
  }
  const masked = text
    .replace(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi, '[email hidden]')
    .replace(/(?:\+?\d[\s.-]?){9,}\d/g, '[number hidden]');
  return { flagged: reasons.size > 0, reasons: [...reasons], masked };
}

export const OFF_PLATFORM_WARNING =
  'For your protection, keep payments and contact on Benched. Deals taken off-platform are not covered by Benched buyer protection, and sharing contact or payment details may get your account restricted.';
