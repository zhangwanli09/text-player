'use client'

import { memo } from 'react'
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

export default memo(function PlaybackControls({
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
    <div className="mt-8 flex items-center justify-center gap-4">
      {!isActive ? (
        <button
          onClick={onPlay}
          disabled={inputEmpty}
          className="w-12 h-12 rounded-full border border-stone-300 dark:border-stone-700 flex items-center justify-center hover:border-stone-500 dark:hover:border-stone-400 transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
          aria-label="播放"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 16 16"
            fill="currentColor"
            aria-hidden="true"
            className="ml-0.5"
          >
            <path d="M5 2v12l9-6z" />
          </svg>
        </button>
      ) : (
        <>
          <button
            onClick={onPauseResume}
            disabled={playState === 'loading'}
            className="w-12 h-12 rounded-full border border-stone-300 dark:border-stone-700 flex items-center justify-center hover:border-stone-500 dark:hover:border-stone-400 transition-colors disabled:opacity-40"
            aria-label={
              playState === 'paused'
                ? '继续'
                : playState === 'loading'
                  ? '加载中'
                  : '暂停'
            }
          >
            {playState === 'paused' ? (
              <svg
                width="18"
                height="18"
                viewBox="0 0 16 16"
                fill="currentColor"
                aria-hidden="true"
                className="ml-0.5"
              >
                <path d="M5 2v12l9-6z" />
              </svg>
            ) : playState === 'loading' ? (
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                className="animate-spin"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
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
            ) : (
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
            )}
          </button>

          <button
            onClick={onStop}
            className="text-sm text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
          >
            停止
          </button>

          {totalChunks > 1 && (
            <span className="text-xs text-stone-400">
              {currentChunk}/{totalChunks}
            </span>
          )}
        </>
      )}
    </div>
  )
})
