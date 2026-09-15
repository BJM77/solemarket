import { safeDate } from './serialization';
import { formatDistanceToNow } from "date-fns";

export function formatPrice(price: any): string {
  const num = typeof price === 'number' ? price : Number(price);
  return isNaN(num) ? '0.00' : num.toFixed(2);
}

export function formatRelativeTime(value: any): string {
  if (!value) return '';
  const date = safeDate(value);
  if (!date) return '';
  return formatDistanceToNow(date, { addSuffix: true });
}
