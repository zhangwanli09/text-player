'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { splitText } from '@/lib/tts/split'
import type { PlayerSettings } from '@/lib/store'
import { saveHistory, updateProgress, type HistoryItem } from '@/lib/storage'
import {
  setupMediaSession,
  clearMediaSession,
  updatePlaybackState,
} from '@/lib/media-session'

export type PlayState = 'idle' | 'loading' | 'playing' | 'paused'

const URL_REGEX = /^https?:\/\//i

export function usePlayback(
  settings: PlayerSettings,
  onHistoryUpdate?: () => void,
) {
  const [playState, setPlayState] = useState<PlayState>('idle')
  const [currentChunk, setCurrentChunk] = useState(0)
  const [totalChunks, setTotalChunks] = useState(0)
  const [error, setError] = useState('')

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const chunksRef = useRef<string[]>([])
  const currentChunkRef = useRef(0)
  const abortRef = useRef<AbortController | null>(null)
  const preloadedRef = useRef<Map<number, Blob>>(new Map())
  const historyIdRef = useRef<string | null>(null)
  const pauseResumeRef = useRef<(() => void) | null>(null)
  const stopRef = useRef<(() => void) | null>(null)
  const playStateRef = useRef<PlayState>('idle')

  useEffect(() => {
    playStateRef.current = playState
  }, [playState])

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

  const playChunk = useCallback(
    async (chunkIndex: number, signal: AbortSignal) => {
      if (signal.aborted || chunkIndex >= chunksRef.current.length) {
        if (!signal.aborted) setPlayState('idle')
        return
      }

      setCurrentChunk(chunkIndex + 1)
      currentChunkRef.current = chunkIndex

      if (historyIdRef.current) {
        updateProgress(historyIdRef.current, chunkIndex + 1).catch(() => {})
      }

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

  useEffect(() => {
    pauseResumeRef.current = handlePauseResume
    stopRef.current = handleStop
  }, [handlePauseResume, handleStop])

  const handlePlay = useCallback(
    async (input: string, setInput: (v: string) => void) => {
      const raw = input.trim()
      if (!raw) return
      setError('')
      stopPlayback()

      if (URL_REGEX.test(raw)) {
        setPlayState('loading')
        try {
          const res = await fetch('/api/extract', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: raw }),
          })
          const contentType = res.headers.get('content-type') || ''
          if (!contentType.includes('application/json')) {
            throw new Error('提取失败：服务器返回了非预期的响应')
          }
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
    },
    [stopPlayback, startPlayback],
  )

  const handleClipboardPlay = useCallback(
    (url: string, setInput: (v: string) => void) => {
      setInput(url)
      setError('')
      stopPlayback()
      setPlayState('loading')
      fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
        .then((res) => {
          const contentType = res.headers.get('content-type') || ''
          if (!contentType.includes('application/json')) {
            throw new Error('提取失败：服务器返回了非预期的响应')
          }
          return res.json().then((data) => ({ ok: res.ok, data }))
        })
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
    },
    [stopPlayback, startPlayback],
  )

  const loadFromHistory = useCallback(
    (item: HistoryItem) => {
      stopPlayback()
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

  return {
    playState,
    currentChunk,
    totalChunks,
    error,
    setError,
    stopPlayback,
    startPlayback,
    handlePlay,
    handleClipboardPlay,
    handlePauseResume,
    handleStop,
    loadFromHistory,
  }
}
