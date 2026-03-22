'use client'

import { useState, useCallback, useEffect } from 'react'
import type { Voice } from '@/lib/tts/types'
import type { TTSEngineType } from '@/lib/tts/types'

/** 根据引擎类型从服务端获取可用语音列表 */
export function useVoices(engine: TTSEngineType) {
  const [voices, setVoices] = useState<Voice[]>([])
  const [loadingVoices, setLoadingVoices] = useState(false)

  const fetchVoices = useCallback(async (eng: TTSEngineType) => {
    if (eng === 'browser') {
      setVoices([])
      return
    }
    setLoadingVoices(true)
    try {
      const res = await fetch(`/api/tts/voices?engine=${eng}`)
      const data = await res.json()
      setVoices(data)
    } catch {
      setVoices([])
    } finally {
      setLoadingVoices(false)
    }
  }, [])

  useEffect(() => {
    fetchVoices(engine)
  }, [engine, fetchVoices])

  return { voices, loadingVoices }
}
