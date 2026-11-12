import { isValidAbn } from '@/lib/payments/local';

export { isValidAbn };

/** Strip spaces and punctuation; return the 11-digit ABN if the checksum is valid. */
export function normalizeAbn(raw: unknown): string | null {
  const digits = String(raw ?? '').replace(/\D/g, '');
  return isValidAbn(digits) ? digits : null;
}

/** Display form: 51 824 753 556 */
export function formatAbn(abn: string): string {
  const d = String(abn || '').replace(/\D/g, '');
  if (d.length !== 11) return String(abn || '');
  return `${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5, 8)} ${d.slice(8, 11)}`;
}
