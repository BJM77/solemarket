/**
 * Persist AutoCard front/back JPEG blobs across a forced reload (stale deploy recovery).
 */

const DB_NAME = 'benched_autocard';
const STORE = 'captures';
const KEY = 'pending';
const DB_VERSION = 1;

export type AutocardPendingShots = {
  front?: Blob;
  back?: Blob;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB open failed'));
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
  });
}

export async function saveAutocardCaptures(shots: AutocardPendingShots): Promise<void> {
  if (typeof window === 'undefined') return;
  if (!shots.front && !shots.back) return;
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('IndexedDB write failed'));
      tx.objectStore(STORE).put(
        {
          front: shots.front ?? null,
          back: shots.back ?? null,
          savedAt: Date.now(),
        },
        KEY,
      );
    });
    db.close();
  } catch (e) {
    console.warn('[AutoCard] Failed to persist captures before reload:', e);
  }
}

export async function loadAutocardCaptures(): Promise<AutocardPendingShots | null> {
  if (typeof window === 'undefined') return null;
  try {
    const db = await openDb();
    const row = await new Promise<{ front?: Blob | null; back?: Blob | null; savedAt?: number } | undefined>(
      (resolve, reject) => {
        const tx = db.transaction(STORE, 'readonly');
        const req = tx.objectStore(STORE).get(KEY);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      },
    );
    db.close();
    if (!row) return null;
    // Discard captures older than 30 minutes (abandoned sessions).
    if (row.savedAt && Date.now() - row.savedAt > 30 * 60 * 1000) {
      await clearAutocardCaptures();
      return null;
    }
    const out: AutocardPendingShots = {};
    if (row.front instanceof Blob) out.front = row.front;
    if (row.back instanceof Blob) out.back = row.back;
    return out.front || out.back ? out : null;
  } catch (e) {
    console.warn('[AutoCard] Failed to load persisted captures:', e);
    return null;
  }
}

export async function clearAutocardCaptures(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('IndexedDB delete failed'));
      tx.objectStore(STORE).delete(KEY);
    });
    db.close();
  } catch (e) {
    console.warn('[AutoCard] Failed to clear persisted captures:', e);
  }
}
