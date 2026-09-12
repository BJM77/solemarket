'use client';

/**
 * Premium IndexedDB Persistence Service
 * Enables full binary File/Blob caching for draft recovery.
 */

const DB_NAME = 'benched_listing_drafts';
const STORE_NAME = 'images_cache';
const DB_VERSION = 1;

function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('IndexedDB is only available in the browser'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

/**
 * Saves a list of File objects to the IndexedDB store for a specific draft ID.
 */
export async function saveListingImagesCache(draftId: string, files: File[]): Promise<void> {
  if (typeof window === 'undefined' || !draftId) return;

  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      // Store raw files array directly. IndexedDB fully supports storing File and Blob objects.
      const request = store.put(files, draftId);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('[IndexedDB] Failed to save images cache:', error);
  }
}

/**
 * Retrieves the cached File objects for a given draft ID.
 */
export async function getListingImagesCache(draftId: string): Promise<File[]> {
  if (typeof window === 'undefined' || !draftId) return [];

  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(draftId);

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('[IndexedDB] Failed to get images cache:', error);
    return [];
  }
}

/**
 * Clears the cached files for a specific draft ID.
 */
export async function clearListingImagesCache(draftId: string): Promise<void> {
  if (typeof window === 'undefined' || !draftId) return;

  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(draftId);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('[IndexedDB] Failed to clear images cache:', error);
  }
}
