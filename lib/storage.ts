import { openDB, type IDBPDatabase } from 'idb';
import type { TTSEngineType } from './tts/types';

export interface HistoryItem {
  id: string;
  title: string;
  source: 'text' | 'url';
  url?: string;
  text: string;
  currentChunk: number;
  totalChunks: number;
  engine: TTSEngineType;
  voice: string;
  speed: number;
  createdAt: number;
  updatedAt: number;
}

const DB_NAME = 'textplayer';
const STORE_NAME = 'history';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('updatedAt', 'updatedAt');
        }
      },
    });
  }
  return dbPromise;
}

export async function saveHistory(item: HistoryItem): Promise<void> {
  const db = await getDB();
  await db.put(STORE_NAME, item);
}

export async function updateProgress(
  id: string,
  currentChunk: number
): Promise<void> {
  const db = await getDB();
  const item = await db.get(STORE_NAME, id);
  if (item) {
    item.currentChunk = currentChunk;
    item.updatedAt = Date.now();
    await db.put(STORE_NAME, item);
  }
}

export async function getHistory(): Promise<HistoryItem[]> {
  const db = await getDB();
  const items = await db.getAllFromIndex(STORE_NAME, 'updatedAt');
  return items.reverse(); // newest first
}

export async function deleteHistory(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE_NAME, id);
}

export async function clearHistory(): Promise<void> {
  const db = await getDB();
  await db.clear(STORE_NAME);
}
