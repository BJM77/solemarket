import { Timestamp } from 'firebase/firestore';

/**
 * Safely converts a Firestore Timestamp, Date, string, or serialized Timestamp to a JavaScript Date object.
 * Returns new Date() if the input is invalid or null.
 */
export function safeDate(input: any): Date {
    if (!input) return new Date();

    // If it's already a Date
    if (input instanceof Date) {
        return isNaN(input.getTime()) ? new Date() : input;
    }

    // If it's a Firestore Timestamp (has toDate method)
    if (typeof input.toDate === 'function') {
        try {
            return input.toDate();
        } catch (e) {
            return new Date();
        }
    }

    // If it's a serialized Timestamp (has seconds/nanoseconds but lost methods)
    if (typeof input.seconds === 'number') {
        if (isNaN(input.seconds)) return new Date();
        return new Date(input.seconds * 1000);
    }

    // If it's a string or number (timestamp)
    const parsed = new Date(input);
    if (!isNaN(parsed.getTime())) {
        return parsed;
    }

    return new Date();
}