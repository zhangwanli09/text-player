/**
 * 播放历史列表组件
 * 展示所有历史记录，支持点击恢复播放和删除
 * 显示播放进度条、来源类型和相对时间
 */
'use client'

import { useState, useEffect, useCallback } from 'react'
import { getHistory, deleteHistory, type HistoryItem } from '@/lib/storage'

interface HistoryProps {
  onSelect: (item: HistoryItem) => void // 用户选中某条历史时的回调
  refreshKey: number // 变化时触发重新加载
}

export default function History({ onSelect, refreshKey }: HistoryProps) {
  const [items, setItems] = useState<HistoryItem[]>([])

  /** 从 IndexedDB 加载历史列表 */
  const load = useCallback(async () => {
    const list = await getHistory()
    setItems(list)
  }, [])

  // 初始加载 + refreshKey 变化时重新加载
  useEffect(() => {
    let cancelled = false
    getHistory().then((list) => {
      if (!cancelled) setItems(list)
    })
    return () => {
      cancelled = true
    }
  }, [refreshKey])

  /** 删除单条历史记录，阻止事件冒泡以避免触发 onSelect */
  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    await deleteHistory(id)
    load()
  }

  if (items.length === 0) return null

  return (
    <div className="w-full max-w-2xl mx-auto px-4 mt-8">
      <h2 className="text-sm font-medium text-zinc-500 mb-3">历史记录</h2>
      <div className="space-y-2">
        {items.map((item) => {
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
                  className="p-1 text-zinc-400 hover:text-red-500 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-zinc-400 rounded transition-opacity shrink-0"
                  aria-label="删除"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 14 14"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    aria-hidden="true"
                  >
                    <path d="M3 3l8 8M11 3l-8 8" />
                  </svg>
                </button>
              </div>
              {!done && item.totalChunks > 1 && (
                <div className="mt-2 h-1 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-zinc-500 rounded-full transition-[width]"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// 模块级别日期格式化器，避免重复创建
const dateFormatter = new Intl.DateTimeFormat('zh-CN', {
  month: 'long',
  day: 'numeric',
})

/** 将时间戳格式化为相对时间（刚刚/分钟前/小时前）或日期（月日） */
function formatTime(ts: number): string {
  const now = Date.now()
  const diff = now - ts

  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`

  return dateFormatter.format(ts)
}
