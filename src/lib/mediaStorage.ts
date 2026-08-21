/**
 * IndexedDB Media Storage Engine for PitchMate
 * Safely persists large voice notes (Audio Blobs) and user avatar images in IndexedDB,
 * freeing browser localStorage for state metadata without exceeding 5MB quota limits.
 */

const DB_NAME = 'pitchmate_media_store';
const DB_VERSION = 1;
const STORE_AUDIO = 'voice_notes';
const STORE_IMAGES = 'avatars';

class MediaStorageEngine {
  private dbPromise: Promise<IDBDatabase | null> | null = null;
  private memoryCache = new Map<string, string>();

  constructor() {
    if (typeof window !== 'undefined' && 'indexedDB' in window) {
      this.initDB();
    }
  }

  private initDB(): Promise<IDBDatabase | null> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve) => {
      try {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = (e) => {
          const db = (e.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(STORE_AUDIO)) {
            db.createObjectStore(STORE_AUDIO);
          }
          if (!db.objectStoreNames.contains(STORE_IMAGES)) {
            db.createObjectStore(STORE_IMAGES);
          }
        };

        req.onsuccess = () => {
          resolve(req.result);
        };

        req.onerror = () => {
          console.warn('PitchMate: IndexedDB init failed, fallback to memory cache');
          resolve(null);
        };
      } catch (err) {
        console.warn('PitchMate: IndexedDB error', err);
        resolve(null);
      }
    });

    return this.dbPromise;
  }

  /**
   * Saves a voice note recording (Blob / Base64) to IndexedDB
   */
  async saveVoiceNote(id: string, dataUrl: string): Promise<string> {
    this.memoryCache.set(`audio_${id}`, dataUrl);

    try {
      const db = await this.initDB();
      if (!db) return dataUrl;

      return new Promise((resolve) => {
        const tx = db.transaction(STORE_AUDIO, 'readwrite');
        const store = tx.objectStore(STORE_AUDIO);
        const req = store.put(dataUrl, id);

        req.onsuccess = () => resolve(dataUrl);
        req.onerror = () => resolve(dataUrl);
      });
    } catch {
      return dataUrl;
    }
  }

  /**
   * Retrieves a voice note by ID
   */
  async getVoiceNote(id: string): Promise<string | null> {
    if (this.memoryCache.has(`audio_${id}`)) {
      return this.memoryCache.get(`audio_${id}`)!;
    }

    try {
      const db = await this.initDB();
      if (!db) return null;

      return new Promise((resolve) => {
        const tx = db.transaction(STORE_AUDIO, 'readonly');
        const store = tx.objectStore(STORE_AUDIO);
        const req = store.get(id);

        req.onsuccess = () => {
          const res = req.result as string | undefined;
          if (res) {
            this.memoryCache.set(`audio_${id}`, res);
            resolve(res);
          } else {
            resolve(null);
          }
        };
        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }

  /**
   * Saves a profile picture / avatar to IndexedDB
   */
  async saveAvatar(id: string, dataUrl: string): Promise<string> {
    this.memoryCache.set(`img_${id}`, dataUrl);

    try {
      const db = await this.initDB();
      if (!db) return dataUrl;

      return new Promise((resolve) => {
        const tx = db.transaction(STORE_IMAGES, 'readwrite');
        const store = tx.objectStore(STORE_IMAGES);
        const req = store.put(dataUrl, id);

        req.onsuccess = () => resolve(dataUrl);
        req.onerror = () => resolve(dataUrl);
      });
    } catch {
      return dataUrl;
    }
  }

  /**
   * Clear old cache items if needed
   */
  async clearOldCache(): Promise<void> {
    this.memoryCache.clear();
  }
}

export const mediaStorage = new MediaStorageEngine();
