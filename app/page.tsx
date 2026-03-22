'use client'

import { useState, useCallback } from 'react'
import Player from '@/components/Player'
import History from '@/components/History'
import type { HistoryItem } from '@/lib/storage'

/**
 * 首页组件
 * 协调 Player（播放器）和 History（历史记录）两个子组件之间的通信：
 * - historyRefreshKey: 递增触发历史列表刷新
 * - pendingHistoryItem: 用户从历史中选中的条目，传递给 Player 进行恢复播放
 */
export default function Home() {
  // 用于触发 History 组件重新加载数据的 key
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0)
  // 用户点击历史记录后待加载到播放器的条目
  const [pendingHistoryItem, setPendingHistoryItem] =
    useState<HistoryItem | null>(null)

  // 当播放器保存/更新历史时，递增 key 通知 History 刷新
  const handleHistoryUpdate = useCallback(() => {
    setHistoryRefreshKey((k) => k + 1)
  }, [])

  // 用户从历史列表中选中一条记录
  const handleHistorySelect = useCallback((item: HistoryItem) => {
    setPendingHistoryItem(item)
  }, [])

  // 历史条目已被 Player 消费，清空待处理项
  const handleHistoryItemConsumed = useCallback(() => {
    setPendingHistoryItem(null)
  }, [])

  return (
    <div className="flex flex-col flex-1 items-center min-h-dvh py-12">
      <Player
        onHistoryUpdate={handleHistoryUpdate}
        pendingHistoryItem={pendingHistoryItem}
        onHistoryItemConsumed={handleHistoryItemConsumed}
      />
      <History onSelect={handleHistorySelect} refreshKey={historyRefreshKey} />
    </div>
  )
}
