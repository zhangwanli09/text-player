'use client'

import { useState, useEffect } from 'react'
import { getHistory, deleteHistory, type HistoryItem } from '@/lib/storage'

interface HistoryProps {
  onSelect: (item: HistoryItem) => void
  refreshKey: number
}

const COLLAPSED_COUNT = 3

export default function History({ onSelect, refreshKey }: HistoryProps) {
  const [items, setItems] = useState<HistoryItem[]>([])
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    let cancelled = false
    getHistory().then((list) => {
      if (!cancelled) setItems(list)
    })
    return () => {
      cancelled = true
    }
  }, [refreshKey])

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    await deleteHistory(id)
    setItems((prev) => prev.filter((item) => item.id !== id))
  }

  if (items.length === 0) return null

  return (
    <div className="w-full max-w-xl mt-12">
      <div className="border-t border-stone-200 dark:border-stone-800 pt-6">
        <h2 className="text-xs text-stone-400 mb-4">历史记录</h2>
        <div>
          {(expanded ? items : items.slice(0, COLLAPSED_COUNT)).map((item) => {
            const progress =
              item.totalChunks > 0
                ? Math.round((item.currentChunk / item.totalChunks) * 100)
                : 0
            const done = item.currentChunk >= item.totalChunks

            return (
              <div
                key={item.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelect(item)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onSelect(item)
                  }
                }}
                className="flex items-center justify-between py-3 group cursor-pointer border-b border-stone-100 dark:border-stone-800/50 last:border-b-0"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm truncate">{item.title}</div>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-stone-400">
                    <span>{item.source === 'url' ? '链接' : '文本'}</span>
                    <span>&middot;</span>
                    <span>{done ? '已完成' : `${progress}%`}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-stone-400">
                    {formatTime(item.updatedAt)}
                  </span>
                  <button
                    onClick={(e) => handleDelete(e, item.id)}
                    className="text-stone-300 hover:text-red-400 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 transition-opacity"
                    aria-label="删除"
                  >
                    &times;
                  </button>
                </div>
              </div>
            )
          })}
        </div>
        {items.length > COLLAPSED_COUNT && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="mt-3 text-xs text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
          >
            {expanded ? '收起' : `展开更多（共 ${items.length} 条）`}
          </button>
        )}
      </div>
    </div>
  )
}

const dateFormatter = new Intl.DateTimeFormat('zh-CN', {
  month: 'long',
  day: 'numeric',
})

function formatTime(ts: number): string {
  const now = Date.now()
  const diff = now - ts

  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`

  return dateFormatter.format(ts)
}
