'use client'

import { useState, useCallback, useImperativeHandle, forwardRef } from 'react'
import { loadSettings, saveSettings, type PlayerSettings } from '@/lib/store'
import { TTS_ENGINES, type TTSEngineType } from '@/lib/tts/types'
import type { HistoryItem } from '@/lib/storage'
import { useClipboardDetect } from '@/hooks/useClipboardDetect'
import { useVoices } from '@/hooks/useVoices'
import { usePlayback } from '@/hooks/usePlayback'
import SettingsPanel from '@/components/player/SettingsPanel'
import ClipboardHint from '@/components/player/ClipboardHint'
import PlaybackControls from '@/components/player/PlaybackControls'

export interface PlayerHandle {
  loadHistoryItem: (item: HistoryItem) => void
}

interface PlayerProps {
  onHistoryUpdate?: () => void
}

const Player = forwardRef<PlayerHandle, PlayerProps>(function Player(
  { onHistoryUpdate },
  ref,
) {
  const [input, setInput] = useState('')
  const [settings, setSettings] = useState<PlayerSettings>(loadSettings)
  const [showSettings, setShowSettings] = useState(false)

  const { voices, loadingVoices } = useVoices(settings.engine)
  const {
    playState,
    currentChunk,
    totalChunks,
    error,
    setError,
    handlePlay,
    handleClipboardPlay,
    handlePauseResume,
    handleStop,
    loadFromHistory,
  } = usePlayback(settings, onHistoryUpdate)
  const { clipboardHint, setClipboardHint, dismissClipboardHint } =
    useClipboardDetect(playState === 'idle')

  // 暴露给父组件的命令式方法：从历史记录恢复播放
  useImperativeHandle(
    ref,
    () => ({
      loadHistoryItem(item: HistoryItem) {
        setInput(item.text)
        setError('')
        setSettings((prev) => {
          const next = {
            ...prev,
            engine: item.engine,
            voice: item.voice,
            speed: item.speed,
          }
          saveSettings(next)
          return next
        })
        loadFromHistory(item)
      },
    }),
    [loadFromHistory, setError],
  )

  const updateSetting = <K extends keyof PlayerSettings>(
    key: K,
    value: PlayerSettings[K],
  ) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value }
      saveSettings(next)
      return next
    })
  }

  const handleEngineChange = (engine: TTSEngineType) => {
    const config = TTS_ENGINES.find((e) => e.type === engine)
    setSettings((prev) => {
      const next = {
        ...prev,
        engine,
        voice: config?.defaultVoice || prev.voice,
      }
      saveSettings(next)
      return next
    })
  }

  const onPlay = useCallback(() => {
    handlePlay(input, setInput)
  }, [input, handlePlay])

  const onClipboardPlay = useCallback(() => {
    if (!clipboardHint?.url) return
    const url = clipboardHint.url
    setClipboardHint(null)
    handleClipboardPlay(url, setInput)
  }, [clipboardHint, setClipboardHint, handleClipboardPlay])

  return (
    <div className="w-full max-w-2xl mx-auto px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          TextPlayer
        </h1>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 focus-visible:ring-2 focus-visible:ring-zinc-400 rounded-lg transition-colors"
          aria-label="设置"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <path d="M10 13a3 3 0 100-6 3 3 0 000 6z" />
            <path d="M16.5 10a6.5 6.5 0 01-.3 2l1.8 1.4-2 3.4-2.1-.7a6.5 6.5 0 01-1.7 1L12 19H8l-.2-1.9a6.5 6.5 0 01-1.7-1l-2.1.7-2-3.4L3.8 12a6.5 6.5 0 010-4L2 6.6l2-3.4 2.1.7a6.5 6.5 0 011.7-1L8 1h4l.2 1.9a6.5 6.5 0 011.7 1l2.1-.7 2 3.4L16.2 8a6.5 6.5 0 01.3 2z" />
          </svg>
        </button>
      </div>

      {showSettings && (
        <SettingsPanel
          settings={settings}
          voices={voices}
          loadingVoices={loadingVoices}
          onEngineChange={handleEngineChange}
          onSettingChange={updateSetting}
        />
      )}

      {clipboardHint && !clipboardHint.dismissed && (
        <ClipboardHint
          url={clipboardHint.url}
          onPlay={onClipboardPlay}
          onDismiss={dismissClipboardHint}
        />
      )}

      {/* Input */}
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="粘贴文本或 URL，然后点击播放…"
        aria-label="输入文本或 URL"
        rows={6}
        className="w-full p-4 text-base rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 resize-none focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:focus-visible:ring-zinc-600 placeholder:text-zinc-400"
      />

      {/* Error */}
      {error && (
        <div className="mt-2 p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-lg">
          {error}
        </div>
      )}

      <PlaybackControls
        playState={playState}
        inputEmpty={!input.trim()}
        currentChunk={currentChunk}
        totalChunks={totalChunks}
        onPlay={onPlay}
        onPauseResume={handlePauseResume}
        onStop={handleStop}
      />
    </div>
  )
})

export default Player
