'use client'

import type { PlayState } from '@/hooks/usePlayback'

interface PlaybackControlsProps {
  playState: PlayState
  inputEmpty: boolean
  currentChunk: number
  totalChunks: number
  onPlay: () => void
  onPauseResume: () => void
  onStop: () => void
}

export default function PlaybackControls({
  playState,
  inputEmpty,
  currentChunk,
  totalChunks,
  onPlay,
  onPauseResume,
  onStop,
}: PlaybackControlsProps) {
  const isActive = playState !== 'idle'

  return (
    <div className="mt-4 flex items-center gap-3">
      {!isActive ? (
        <button
          onClick={onPlay}
          disabled={inputEmpty}
          className="flex items-center gap-2 px-6 py-3 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-full font-medium hover:opacity-90 focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M4 2.5v11l9-5.5z" />
          </svg>
          播放
        </button>
      ) : (
        <>
          <button
            onClick={onPauseResume}
            disabled={playState === 'loading'}
            className="flex items-center gap-2 px-5 py-3 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-full font-medium hover:opacity-90 focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 transition-opacity disabled:opacity-60"
          >
            {playState === 'paused' ? (
              <>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M4 2.5v11l9-5.5z" />
                </svg>
                继续
              </>
            ) : playState === 'loading' ? (
              <>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  className="animate-spin"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <circle
                    cx="8"
                    cy="8"
                    r="6"
                    strokeDasharray="28"
                    strokeDashoffset="8"
                  />
                </svg>
                加载中…
              </>
            ) : (
              <>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <rect x="3" y="2" width="4" height="12" rx="1" />
                  <rect x="9" y="2" width="4" height="12" rx="1" />
                </svg>
                暂停
              </>
            )}
          </button>
          <button
            onClick={onStop}
            className="px-5 py-3 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 rounded-full font-medium transition-colors"
          >
            停止
          </button>
        </>
      )}

      {isActive && totalChunks > 1 && (
        <span className="ml-auto text-sm text-zinc-500">
          {currentChunk} / {totalChunks}
        </span>
      )}
    </div>
  )
}
