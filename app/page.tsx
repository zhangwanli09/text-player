'use client'

import { useState, useCallback, useRef } from 'react'
import Player from '@/components/Player'
import type { PlayerHandle } from '@/components/Player'
import History from '@/components/History'
import type { HistoryItem } from '@/lib/storage'

/**
 * 首页组件
 * 协调 Player（播放器）和 History（历史记录）两个子组件之间的通信：
 * - historyRefreshKey: 递增触发历史列表刷新
 * - playerRef: 通过命令式方法将历史条目传递给 Player 恢复播放
 */
export default function Home() {
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0)
  const playerRef = useRef<PlayerHandle>(null)

  const handleHistoryUpdate = useCallback(() => {
    setHistoryRefreshKey((k) => k + 1)
  }, [])

  const handleHistorySelect = useCallback((item: HistoryItem) => {
    playerRef.current?.loadHistoryItem(item)
  }, [])

  return (
    <div className="flex flex-col flex-1 items-center min-h-dvh py-12">
      <Player ref={playerRef} onHistoryUpdate={handleHistoryUpdate} />
      <History onSelect={handleHistorySelect} refreshKey={historyRefreshKey} />
    </div>
  )
}
