
/**
 * Converts Firestore document data to plain objects safe for Client Components
 */
export function serializeFirestoreDoc<T extends Record<string, any>>(
    data: T
): T {
    if (!data || typeof data !== 'object') return data;

    const serialized: any = {};

    for (const [key, value] of Object.entries(data)) {
        if (value && typeof value === 'object' && typeof value.toDate === 'function') {
            // Handle Firestore Timestamp
            serialized[key] = value.toDate().toISOString();
        } else if (value && typeof value === 'object' && '_seconds' in value) {
            // Handle already-converted Timestamp objects
            serialized[key] = new Date(
                value._seconds * 1000 + (value._nanoseconds || 0) / 1000000
            ).toISOString();
        } else if (Array.isArray(value)) {
            // Recursively handle arrays
            serialized[key] = value.map(item =>
                (item && typeof item === 'object') ? serializeFirestoreDoc(item) : item
            );
        } else if (value && typeof value === 'object' && value.constructor === Object) {
            // Recursively handle nested plain objects
            serialized[key] = serializeFirestoreDoc(value);
        } else {
            // Primitive values or special objects (Date, etc.)
            serialized[key] = value;
        }
    }

    return serialized as T;
}
