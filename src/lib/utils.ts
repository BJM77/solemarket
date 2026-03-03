import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { isCardCategory } from "./constants/marketplace"
import { formatDistanceToNow } from "date-fns"


export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(price: any): string {
  const num = typeof price === 'number' ? price : Number(price);
  return isNaN(num) ? '0.00' : num.toFixed(2);
}

export function serializeFirestoreData(data: any): any {
  // Build Trigger: ISO string standardization for Firestore Timestamps
  if (data === null || data === undefined) {
    return data;
  }

  // Handle Arrays
  if (Array.isArray(data)) {
    return data.map(item => serializeFirestoreData(item));
  }

  // Handle Firestore Timestamps (Admin SDK or Client SDK)
  if (data && typeof data.toDate === 'function') {
    return data.toDate().toISOString();
  }

  // Handle objects that look like serialized Timestamps { seconds, nanoseconds } or { _seconds, _nanoseconds }
  if (data && typeof data === 'object') {
    const s = data.seconds ?? data._seconds;
    const ns = data.nanoseconds ?? data._nanoseconds;
    if (typeof s === 'number' && typeof ns === 'number') {
      return new Date(s * 1000 + ns / 1000000).toISOString();
    }
  }

  // Handle Date objects
  if (data instanceof Date) {
    return data.toISOString();
  }

  // Handle standard Objects (recursively)
  if (typeof data === 'object' && data.constructor === Object) {
    const serialized: any = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        serialized[key] = serializeFirestoreData(data[key]);
      }
    }
    return serialized;
  }

  return data;
}

export function safeDate(value: any): Date | undefined {
  if (value === null || value === undefined) return undefined;

  // Handle standard Date objects
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? undefined : value;
  }

  // Handle Firestore Timestamps (with toDate method)
  if (typeof value === 'object' && typeof value.toDate === 'function') {
    try {
      return value.toDate();
    } catch {
      return undefined;
    }
  }

  // Handle serialized Firestore Timestamps { seconds, nanoseconds } or { _seconds, _nanoseconds }
  if (typeof value === 'object') {
    const s = value.seconds ?? value._seconds;
    if (typeof s === 'number') {
      const millis = s * 1000;
      return isNaN(millis) ? undefined : new Date(millis);
    }

    // Handle { value: Date | string | number } pattern
    if (value.value) {
      return safeDate(value.value);
    }
  }

  // Handle numbers (milliseconds)
  if (typeof value === 'number') {
    return isNaN(value) ? undefined : new Date(value);
  }

  // Handle ISO strings or date strings
  if (typeof value === 'string') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? undefined : d;
  }
  return undefined;
}

export function formatRelativeTime(value: any): string {
  if (!value) return '';
  const date = safeDate(value);
  if (!date) return '';
  return formatDistanceToNow(date, { addSuffix: true });
}


export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w-]+/g, '') // Remove all non-word chars
    .replace(/--+/g, '-'); // Replace multiple - with single -
}

export function getProductUrl(product: { id: string; title: string; category?: string }): string {
  const section = isCardCategory(product.category) ? 'cards' : 'shoes';
  const slug = slugify(product.title);
  return `/${section}/${slug}/${product.id}`;
}
