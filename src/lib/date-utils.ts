import { Timestamp } from 'firebase/firestore';

/**
 * Safely converts a Firestore Timestamp, Date, string, or serialized Timestamp to a JavaScript Date object.
 * Returns new Date() if the input is invalid or null.
 */
export function safeDate(input: any): Date {
    if (!input) return new Date();

    // If it's already a Date
    if (input instanceof Date) return input;

    // If it's a Firestore Timestamp (has toDate method)
    if (typeof input.toDate === 'function') {
        return input.toDate();
    }

    // If it's a serialized Timestamp (has seconds/nanoseconds but lost methods)
    if (typeof input.seconds === 'number') {
        return new Date(input.seconds * 1000);
    }

    // If it's a string or number (timestamp)
    const parsed = new Date(input);
    if (!isNaN(parsed.getTime())) {
        return parsed;
    }

    return new Date();
}
