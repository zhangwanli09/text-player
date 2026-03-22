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
    <div className="w-full max-w-xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-xs font-medium tracking-[0.2em] uppercase text-stone-400">
          TextPlayer
        </h1>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="text-xs text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
          aria-label="设置"
        >
          {showSettings ? '完成' : '设置'}
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

      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="粘贴文本或 URL…"
        aria-label="输入文本或 URL"
        rows={8}
        className="w-full py-4 text-base leading-relaxed bg-transparent border-b border-stone-200 dark:border-stone-800 resize-none focus:outline-none placeholder:text-stone-300 dark:placeholder:text-stone-700"
      />

      {error && <p className="mt-3 text-sm text-red-500/80">{error}</p>}

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
