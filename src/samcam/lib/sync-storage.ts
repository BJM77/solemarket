import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'BenchedSyncDB';
const STORE_NAME = 'uploadQueue';

export interface PendingUpload {
  id: string;
  frontBlob: Blob;
  backBlob?: Blob;
  status: 'PENDING' | 'UPLOADING' | 'ERROR';
  error?: string;
  retries: number;
  createdAt: number;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

export const syncStorage = {
  async add(item: PendingUpload) {
    const db = await getDB();
    await db.put(STORE_NAME, item);
  },
  async getAll(): Promise<PendingUpload[]> {
    const db = await getDB();
    return db.getAll(STORE_NAME);
  },
  async update(item: PendingUpload) {
    const db = await getDB();
    await db.put(STORE_NAME, item);
  },
  async remove(id: string) {
    const db = await getDB();
    await db.delete(STORE_NAME, id);
  }
};
