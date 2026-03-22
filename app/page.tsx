'use client'

import { useState, useCallback, useRef } from 'react'
import Player from '@/components/Player'
import type { PlayerHandle } from '@/components/Player'
import History from '@/components/History'
import type { HistoryItem } from '@/lib/storage'

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
    <div className="flex flex-col flex-1 items-center min-h-dvh py-16 px-6">
      <Player ref={playerRef} onHistoryUpdate={handleHistoryUpdate} />
      <History onSelect={handleHistorySelect} refreshKey={historyRefreshKey} />
    </div>
  )
}
