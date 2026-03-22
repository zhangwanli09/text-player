/**
 * 播放器核心组件
 * 负责文本输入、TTS 合成、音频播放、分段管理、暂停/继续/停止控制、
 * URL 提取、设置面板、历史记录交互和锁屏 Media Session 集成
 */
'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { splitText } from '@/lib/tts/split'
import { loadSettings, saveSettings, type PlayerSettings } from '@/lib/store'
import { TTS_ENGINES, type TTSEngineType } from '@/lib/tts/types'
import type { Voice } from '@/lib/tts/types'
import { saveHistory, updateProgress, type HistoryItem } from '@/lib/storage'
import {
  setupMediaSession,
  clearMediaSession,
  updatePlaybackState,
} from '@/lib/media-session'

/** 播放状态：空闲 | 加载中 | 播放中 | 已暂停 */
type PlayState = 'idle' | 'loading' | 'playing' | 'paused'

// 可选的播放速度档位
const SPEEDS = [0.75, 1, 1.25, 1.5, 2]

// URL 匹配正则，提升到模块级别避免重复创建
const URL_REGEX = /^https?:\/\//i

/** 剪贴板检测到的 URL 信息 */
interface ClipboardHint {
  url: string
  dismissed: boolean
}

interface PlayerProps {
  onHistoryUpdate?: () => void // 历史记录变更时的回调
  pendingHistoryItem?: HistoryItem | null // 待恢复播放的历史条目
  onHistoryItemConsumed?: () => void // 历史条目已被消费的回调
}

export default function Player({
  onHistoryUpdate,
  pendingHistoryItem,
  onHistoryItemConsumed,
}: PlayerProps) {
  // ===== 状态 =====
  const [input, setInput] = useState('') // 用户输入的文本或 URL
  const [playState, setPlayState] = useState<PlayState>('idle') // 当前播放状态
  const [currentChunk, setCurrentChunk] = useState(0) // 当前播放的分段序号（从 1 开始显示）
  const [totalChunks, setTotalChunks] = useState(0) // 总分段数
  const [settings, setSettings] = useState<PlayerSettings>(loadSettings) // 用户设置（引擎/语音/语速）
  const [showSettings, setShowSettings] = useState(false) // 设置面板是否展开
  const [error, setError] = useState('') // 错误信息
  const [voices, setVoices] = useState<Voice[]>([]) // 当前引擎的可用语音列表
  const [loadingVoices, setLoadingVoices] = useState(false) // 语音列表加载中
  const [clipboardHint, setClipboardHint] = useState<ClipboardHint | null>(null) // 剪贴板检测到的 URL

  // ===== Refs（不触发重渲染的可变引用） =====
  const audioRef = useRef<HTMLAudioElement | null>(null) // 当前 Audio 元素
  const chunksRef = useRef<string[]>([]) // 分段后的文本数组
  const currentChunkRef = useRef(0) // 当前分段索引（ref 版本）
  const abortRef = useRef<AbortController | null>(null) // 用于取消播放的 AbortController
  const preloadedRef = useRef<Map<number, Blob>>(new Map()) // 预加载的音频缓存（分段索引 → Blob）
  const historyIdRef = useRef<string | null>(null) // 当前播放对应的历史记录 ID
  const pauseResumeRef = useRef<(() => void) | null>(null) // 暂停/继续回调（供 Media Session 使用）
  const stopRef = useRef<(() => void) | null>(null) // 停止回调（供 Media Session 使用）
  const playStateRef = useRef<PlayState>('idle') // 播放状态的 ref 版本（回调中读取最新值）
  const lastClipboardUrlRef = useRef<string>('') // 上次检测到的剪贴板 URL（避免重复提示）

  /**
   * 剪贴板自动检测：页面获得焦点时读取剪贴板内容，
   * 若包含 URL 且不同于当前输入和上次提示，则显示提示条
   */
  useEffect(() => {
    const detectClipboard = async () => {
      // 播放中不打扰
      if (playStateRef.current !== 'idle') return
      try {
        const text = await navigator.clipboard.readText()
        const trimmed = text?.trim()
        if (
          trimmed &&
          URL_REGEX.test(trimmed) &&
          trimmed !== lastClipboardUrlRef.current
        ) {
          lastClipboardUrlRef.current = trimmed
          setClipboardHint({ url: trimmed, dismissed: false })
        }
      } catch {
        // 权限不足或不支持，静默忽略
      }
    }

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        detectClipboard()
      }
    }

    // 初次加载和页面切回时检测
    detectClipboard()
    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('focus', detectClipboard)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('focus', detectClipboard)
    }
  }, [])

  /** 根据引擎类型从服务端获取可用语音列表 */
  const fetchVoices = useCallback(async (engine: TTSEngineType) => {
    if (engine === 'browser') {
      setVoices([])
      return
    }
    setLoadingVoices(true)
    try {
      const res = await fetch(`/api/tts/voices?engine=${engine}`)
      const data = await res.json()
      setVoices(data)
    } catch {
      setVoices([])
    } finally {
      setLoadingVoices(false)
    }
  }, [])

  // 引擎切换时重新加载对应的语音列表
  useEffect(() => {
    fetchVoices(settings.engine)
  }, [settings.engine, fetchVoices])

  /** 停止播放：取消请求、停止音频、清理缓存和 Media Session */
  const stopPlayback = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
      audioRef.current = null
    }
    preloadedRef.current.clear()
    historyIdRef.current = null
    clearMediaSession()
    setPlayState('idle')
    setCurrentChunk(0)
    setTotalChunks(0)
    onHistoryUpdate?.()
  }, [onHistoryUpdate])

  /**
   * 合成单个文本分段的音频
   * 浏览器引擎直接使用 Web Speech API，其他引擎通过服务端 API 合成
   */
  const synthesizeChunk = useCallback(
    async (text: string, signal: AbortSignal): Promise<Blob> => {
      if (settings.engine === 'browser') {
        return new Promise((resolve, reject) => {
          const utterance = new SpeechSynthesisUtterance(text)
          utterance.lang = 'zh-CN'
          utterance.rate = settings.speed
          utterance.onend = () => resolve(new Blob())
          utterance.onerror = (e) => reject(e)
          signal.addEventListener('abort', () => {
            speechSynthesis.cancel()
            reject(new DOMException('Aborted', 'AbortError'))
          })
          speechSynthesis.speak(utterance)
        })
      }

      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voice: settings.voice,
          speed: settings.speed,
          engine: settings.engine,
        }),
        signal,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(err.error || `TTS failed: ${res.status}`)
      }

      return res.blob()
    },
    [settings],
  )

  /** 预加载下一个分段的音频，减少播放间隔等待时间 */
  const preloadNext = useCallback(
    (chunkIndex: number, signal: AbortSignal) => {
      const nextIndex = chunkIndex + 1
      if (
        nextIndex < chunksRef.current.length &&
        !preloadedRef.current.has(nextIndex)
      ) {
        synthesizeChunk(chunksRef.current[nextIndex], signal)
          .then((blob) => {
            if (!signal.aborted && blob.size > 0) {
              preloadedRef.current.set(nextIndex, blob)
            }
          })
          .catch(() => {})
      }
    },
    [synthesizeChunk],
  )

  /**
   * 播放指定分段
   * 递归调用自身以连续播放所有分段，同时触发下一段预加载
   */
  const playChunk = useCallback(
    async (chunkIndex: number, signal: AbortSignal) => {
      if (signal.aborted || chunkIndex >= chunksRef.current.length) {
        if (!signal.aborted) setPlayState('idle')
        return
      }

      setCurrentChunk(chunkIndex + 1)
      currentChunkRef.current = chunkIndex

      // Update history progress
      if (historyIdRef.current) {
        updateProgress(historyIdRef.current, chunkIndex + 1).catch(() => {})
      }

      // For browser TTS, handle differently
      if (settings.engine === 'browser') {
        try {
          setPlayState('playing')
          await synthesizeChunk(chunksRef.current[chunkIndex], signal)
          if (!signal.aborted) {
            playChunk(chunkIndex + 1, signal)
          }
        } catch (e) {
          if (e instanceof DOMException && e.name === 'AbortError') return
          setError(String(e))
          setPlayState('idle')
        }
        return
      }

      try {
        setPlayState('loading')

        let blob = preloadedRef.current.get(chunkIndex)
        if (!blob) {
          blob = await synthesizeChunk(chunksRef.current[chunkIndex], signal)
        }
        preloadedRef.current.delete(chunkIndex)

        if (signal.aborted) return

        // Start preloading next chunk
        preloadNext(chunkIndex, signal)

        const url = URL.createObjectURL(blob)
        const audio = new Audio(url)
        audioRef.current = audio

        audio.onended = () => {
          URL.revokeObjectURL(url)
          if (!signal.aborted) {
            playChunk(chunkIndex + 1, signal)
          }
        }

        audio.onerror = () => {
          URL.revokeObjectURL(url)
          if (!signal.aborted) {
            setError('音频播放失败')
            setPlayState('idle')
          }
        }

        setPlayState('playing')
        await audio.play()
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return
        setError(String(e))
        setPlayState('idle')
      }
    },
    [settings.engine, synthesizeChunk, preloadNext],
  )

  /** 判断输入是否为 URL */
  const isURL = (text: string) => URL_REGEX.test(text)

  /**
   * 开始播放文本
   * 将文本分段、保存历史记录、设置 Media Session、启动分段播放
   */
  const startPlayback = useCallback(
    (
      text: string,
      options?: {
        startChunk?: number
        historyId?: string
        title?: string
        source?: 'text' | 'url'
        url?: string
      },
    ) => {
      const chunks = splitText(text)
      chunksRef.current = chunks
      setTotalChunks(chunks.length)

      const startChunk = options?.startChunk || 0
      const id = options?.historyId || crypto.randomUUID()
      historyIdRef.current = id

      // Save to history
      const item: HistoryItem = {
        id,
        title: options?.title || text.slice(0, 30).replace(/\n/g, ' '),
        source: options?.source || 'text',
        url: options?.url,
        text,
        currentChunk: startChunk,
        totalChunks: chunks.length,
        engine: settings.engine,
        voice: settings.voice,
        speed: settings.speed,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
      saveHistory(item)
        .then(() => onHistoryUpdate?.())
        .catch(() => {})

      // Setup media session for lock screen controls
      const displayTitle =
        options?.title || text.slice(0, 30).replace(/\n/g, ' ')
      setupMediaSession({
        title: displayTitle,
        onPlay: () => pauseResumeRef.current?.(),
        onPause: () => pauseResumeRef.current?.(),
        onStop: () => stopRef.current?.(),
      })

      const abort = new AbortController()
      abortRef.current = abort

      playChunk(startChunk, abort.signal)
    },
    [playChunk, settings, onHistoryUpdate],
  )

  /** 处理播放按钮点击：如果是 URL 则先提取正文，否则直接播放 */
  const handlePlay = useCallback(async () => {
    const raw = input.trim()
    if (!raw) return
    setError('')
    stopPlayback()

    if (isURL(raw)) {
      setPlayState('loading')
      try {
        const res = await fetch('/api/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: raw }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || '提取失败')
        setInput(data.content)
        startPlayback(data.content, {
          title: data.title,
          source: 'url',
          url: raw,
        })
      } catch (e) {
        setError(e instanceof Error ? e.message : '提取失败')
        setPlayState('idle')
      }
    } else {
      startPlayback(raw)
    }
  }, [input, stopPlayback, startPlayback])

  /** 从历史记录恢复播放：恢复设置并从上次进度继续 */
  const loadFromHistory = useCallback(
    (item: HistoryItem) => {
      setInput(item.text)
      setError('')
      stopPlayback()
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
      startPlayback(item.text, {
        startChunk:
          item.currentChunk < item.totalChunks ? item.currentChunk : 0,
        historyId: item.id,
        title: item.title,
        source: item.source,
        url: item.url,
      })
    },
    [stopPlayback, startPlayback],
  )

  // 当收到来自 History 组件选中的历史条目时，加载并播放
  useEffect(() => {
    if (pendingHistoryItem) {
      loadFromHistory(pendingHistoryItem)
      onHistoryItemConsumed?.()
    }
  }, [pendingHistoryItem, loadFromHistory, onHistoryItemConsumed])

  // 同步 playState 到 ref，供不依赖 React 重渲染的回调读取
  useEffect(() => {
    playStateRef.current = playState
  }, [playState])

  /** 切换暂停/继续状态，同时更新 Media Session 播放状态 */
  const handlePauseResume = useCallback(() => {
    const state = playStateRef.current
    if (state === 'playing') {
      if (audioRef.current) {
        audioRef.current.pause()
      } else {
        speechSynthesis.pause()
      }
      setPlayState('paused')
      updatePlaybackState('paused')
    } else if (state === 'paused') {
      if (audioRef.current) {
        audioRef.current.play()
      } else {
        speechSynthesis.resume()
      }
      setPlayState('playing')
      updatePlaybackState('playing')
    }
  }, [])

  const handleStop = useCallback(() => {
    stopPlayback()
  }, [stopPlayback])

  // 同步回调函数到 ref，确保 Media Session 回调始终调用最新版本
  useEffect(() => {
    pauseResumeRef.current = handlePauseResume
    stopRef.current = handleStop
  }, [handlePauseResume, handleStop])

  /** 使用剪贴板检测到的 URL：填入输入框并开始播放 */
  const handleClipboardPlay = useCallback(() => {
    if (!clipboardHint?.url) return
    setInput(clipboardHint.url)
    setClipboardHint(null)
    // 延迟触发播放，确保 input 已更新
    const url = clipboardHint.url
    setError('')
    stopPlayback()
    setPlayState('loading')
    fetch('/api/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    })
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) throw new Error(data.error || '提取失败')
        setInput(data.content)
        startPlayback(data.content, {
          title: data.title,
          source: 'url',
          url,
        })
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : '提取失败')
        setPlayState('idle')
      })
  }, [clipboardHint, stopPlayback, startPlayback])

  /** 关闭剪贴板提示 */
  const dismissClipboardHint = useCallback(() => {
    setClipboardHint(null)
  }, [])

  /** 更新单个设置项并持久化 */
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

  /** 切换 TTS 引擎，同时重置为该引擎的默认语音并持久化 */
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

  const isActive = playState !== 'idle'

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

      {/* Settings Panel */}
      {showSettings && (
        <div className="mb-4 p-4 bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-3">
          <div>
            <label className="block text-sm text-zinc-500 mb-1">语音引擎</label>
            <div className="flex gap-2 flex-wrap">
              {TTS_ENGINES.map((e) => (
                <button
                  key={e.type}
                  onClick={() => handleEngineChange(e.type)}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    settings.engine === e.type
                      ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                      : 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-700'
                  }`}
                >
                  {e.label}
                </button>
              ))}
            </div>
          </div>

          {settings.engine !== 'browser' && (
            <div>
              <label className="block text-sm text-zinc-500 mb-1">语音</label>
              <select
                value={settings.voice}
                onChange={(e) => updateSetting('voice', e.target.value)}
                disabled={loadingVoices}
                className="w-full px-3 py-1.5 text-sm rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 disabled:opacity-50"
              >
                {loadingVoices ? (
                  <option>加载中…</option>
                ) : voices.length === 0 ? (
                  <option value={settings.voice}>{settings.voice}</option>
                ) : (
                  voices.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                      {v.gender ? ` (${v.gender})` : ''}
                      {v.lang && v.lang !== 'multi' ? ` - ${v.lang}` : ''}
                    </option>
                  ))
                )}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm text-zinc-500 mb-1">
              语速 {settings.speed}x
            </label>
            <div className="flex gap-2">
              {SPEEDS.map((s) => (
                <button
                  key={s}
                  onClick={() => updateSetting('speed', s)}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    settings.speed === s
                      ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                      : 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-700'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Clipboard Hint */}
      {clipboardHint && !clipboardHint.dismissed && (
        <div className="mb-3 flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl text-sm">
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="shrink-0 text-blue-500"
            aria-hidden="true"
          >
            <rect x="4" y="1" width="8" height="3" rx="1" />
            <rect x="2" y="3" width="12" height="12" rx="2" />
          </svg>
          <span className="flex-1 truncate text-blue-700 dark:text-blue-300">
            检测到链接：{clipboardHint.url}
          </span>
          <button
            onClick={handleClipboardPlay}
            className="shrink-0 px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            播放
          </button>
          <button
            onClick={dismissClipboardHint}
            className="shrink-0 p-1 text-blue-400 hover:text-blue-600 dark:hover:text-blue-200 transition-colors"
            aria-label="关闭"
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

      {/* Controls */}
      <div className="mt-4 flex items-center gap-3">
        {!isActive ? (
          <button
            onClick={handlePlay}
            disabled={!input.trim()}
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
              onClick={handlePauseResume}
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
              onClick={handleStop}
              className="px-5 py-3 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 rounded-full font-medium transition-colors"
            >
              停止
            </button>
          </>
        )}

        {/* Progress */}
        {isActive && totalChunks > 1 && (
          <span className="ml-auto text-sm text-zinc-500">
            {currentChunk} / {totalChunks}
          </span>
        )}
      </div>
    </div>
  )
}
