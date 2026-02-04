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
