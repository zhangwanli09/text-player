'use client';

import { useState, useCallback } from 'react';
import Player from '@/components/Player';
import History from '@/components/History';
import type { HistoryItem } from '@/lib/storage';

export default function Home() {
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const [pendingHistoryItem, setPendingHistoryItem] = useState<HistoryItem | null>(null);

  const handleHistoryUpdate = useCallback(() => {
    setHistoryRefreshKey((k) => k + 1);
  }, []);

  const handleHistorySelect = useCallback((item: HistoryItem) => {
    setPendingHistoryItem(item);
  }, []);

  return (
    <div className="flex flex-col flex-1 items-center min-h-dvh py-12">
      <Player
        onHistoryUpdate={handleHistoryUpdate}
        pendingHistoryItem={pendingHistoryItem}
        onHistoryItemConsumed={() => setPendingHistoryItem(null)}
      />
      <History onSelect={handleHistorySelect} refreshKey={historyRefreshKey} />
    </div>
  );
}
