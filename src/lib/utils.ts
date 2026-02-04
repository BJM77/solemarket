import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(price: any): string {
  const num = typeof price === 'number' ? price : Number(price);
  return isNaN(num) ? '0.00' : num.toFixed(2);
}

export function serializeFirestoreData(data: any): any {
  if (data === null || data === undefined) {
    return data;
  }

  // Handle Arrays
  if (Array.isArray(data)) {
    return data.map(item => serializeFirestoreData(item));
  }

  // Handle Firestore Timestamps (check for toMillis method or seconds/nanoseconds properties)
  if (data && typeof data.toMillis === 'function') {
    return {
      seconds: data.seconds,
      nanoseconds: data.nanoseconds,
    };
  }

  // Handle Date objects
  if (data instanceof Date) {
    return {
      seconds: Math.floor(data.getTime() / 1000),
      nanoseconds: (data.getTime() % 1000) * 1000000,
    };
  }

  // Handle Objects
  if (typeof data === 'object') {
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
  if (!value) return undefined;

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

  // Handle serialized Firestore Timestamps { seconds, nanoseconds }
  if (typeof value === 'object' && 'seconds' in value) {
    const millis = value.seconds * 1000;
    return isNaN(millis) ? undefined : new Date(millis);
  }

  // Handle numbers (milliseconds)
  if (typeof value === 'number') {
    return isNaN(value) ? undefined : new Date(value);
  }

  // Handle ISO strings
  if (typeof value === 'string') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? undefined : d;
  }

  return undefined;
}
