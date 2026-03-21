'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getHistory,
  deleteHistory,
  type HistoryItem,
} from '@/lib/storage';

interface HistoryProps {
  onSelect: (item: HistoryItem) => void;
  refreshKey: number;
}

export default function History({ onSelect, refreshKey }: HistoryProps) {
  const [items, setItems] = useState<HistoryItem[]>([]);

  const load = useCallback(async () => {
    const list = await getHistory();
    setItems(list);
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await deleteHistory(id);
    load();
  };

  if (items.length === 0) return null;

  return (
    <div className="w-full max-w-2xl mx-auto px-4 mt-8">
      <h2 className="text-sm font-medium text-zinc-500 mb-3">历史记录</h2>
      <div className="space-y-2">
        {items.map((item) => {
          const progress =
            item.totalChunks > 0
              ? Math.round((item.currentChunk / item.totalChunks) * 100)
              : 0;
          const done = item.currentChunk >= item.totalChunks;

          return (
            <div
              key={item.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelect(item)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(item); } }}
              className="w-full text-left p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors group cursor-pointer"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                    {item.title}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-zinc-500">
                    <span>{item.source === 'url' ? '链接' : '文本'}</span>
                    <span>·</span>
                    <span>{done ? '已完成' : `${progress}%`}</span>
                    <span>·</span>
                    <span>{formatTime(item.updatedAt)}</span>
                  </div>
                </div>
                <button
                  onClick={(e) => handleDelete(e, item.id)}
                  className="p-1 text-zinc-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  title="删除"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M3 3l8 8M11 3l-8 8" />
                  </svg>
                </button>
              </div>
              {!done && item.totalChunks > 1 && (
                <div className="mt-2 h-1 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-zinc-500 rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatTime(ts: number): string {
  const now = Date.now();
  const diff = now - ts;

  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;

  const date = new Date(ts);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}月${day}日`;
}
