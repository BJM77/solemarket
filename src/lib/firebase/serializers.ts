
/**
 * Converts Firestore document data to plain objects safe for Client Components
 */
export function serializeFirestoreDoc<T extends Record<string, any>>(
    data: T
): T {
    const serialized: any = {};

    for (const [key, value] of Object.entries(data)) {
        if (value && typeof value === 'object' && typeof value.toDate === 'function') {
            // Handle Firestore Timestamp (both client and admin SDK have toDate())
            serialized[key] = value.toDate().toISOString();
        } else if (value && typeof value === 'object' && '_seconds' in value) {
            // Handle already-converted Timestamp objects (from server-side serialization sometimes)
            serialized[key] = new Date(
                value._seconds * 1000 + (value._nanoseconds || 0) / 1000000
            ).toISOString();
        } else if (Array.isArray(value)) {
            // Recursively handle arrays
            serialized[key] = value.map(item => 
                typeof item === 'object' ? serializeFirestoreDoc(item) : item
            );
        } else if (value && typeof value === 'object') {
            // Recursively handle nested objects
            // Check constructor to avoid traversing special objects like Date (though Date is handled by Next.js, standard objects are safer)
            if (value.constructor === Object) {
                 serialized[key] = serializeFirestoreDoc(value);
            } else {
                 serialized[key] = value;
            }
        } else {
            // Primitive values are fine
            serialized[key] = value;
        }
    }

    return serialized as T;
}
