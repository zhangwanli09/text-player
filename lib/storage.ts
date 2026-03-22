/**
 * 播放历史持久化模块
 * 使用 IndexedDB (idb 库) 存储播放记录，支持断点续播
 */
import { openDB, type IDBPDatabase } from 'idb';
import type { TTSEngineType } from './tts/types';

/** 历史记录条目结构 */
export interface HistoryItem {
  id: string;            // 唯一标识 (UUID)
  title: string;         // 显示标题（文本前 30 字符或网页标题）
  source: 'text' | 'url'; // 来源类型：手动输入文本 或 URL 提取
  url?: string;          // 原始 URL（仅 source='url' 时存在）
  text: string;          // 完整文本内容
  currentChunk: number;  // 当前播放进度（已播放的分段数）
  totalChunks: number;   // 总分段数
  engine: TTSEngineType; // 使用的 TTS 引擎
  voice: string;         // 使用的语音 ID
  speed: number;         // 播放速度
  createdAt: number;     // 创建时间戳
  updatedAt: number;     // 最后更新时间戳
}

const DB_NAME = 'textplayer';
const STORE_NAME = 'history';
const DB_VERSION = 1;

// 单例 DB 连接 Promise，避免重复打开
let dbPromise: Promise<IDBPDatabase> | null = null;

/** 获取或创建 IndexedDB 连接（含数据库升级逻辑） */
function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          // 按更新时间索引，用于排序查询
          store.createIndex('updatedAt', 'updatedAt');
        }
      },
    });
  }
  return dbPromise;
}

/** 保存或覆盖一条历史记录 */
export async function saveHistory(item: HistoryItem): Promise<void> {
  const db = await getDB();
  await db.put(STORE_NAME, item);
}

/** 更新播放进度（当前分段索引），同时刷新 updatedAt 时间 */
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

/** 获取全部历史记录，按更新时间倒序（最新在前） */
export async function getHistory(): Promise<HistoryItem[]> {
  const db = await getDB();
  const items = await db.getAllFromIndex(STORE_NAME, 'updatedAt');
  return items.reverse();
}

/** 删除指定历史记录 */
export async function deleteHistory(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE_NAME, id);
}

/** 清空所有历史记录 */
export async function clearHistory(): Promise<void> {
  const db = await getDB();
  await db.clear(STORE_NAME);
}
