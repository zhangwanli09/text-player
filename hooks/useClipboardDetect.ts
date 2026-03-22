'use client'

import { useState, useEffect, useRef } from 'react'

const URL_REGEX = /^https?:\/\//i

export interface ClipboardHint {
  url: string
  dismissed: boolean
}

/**
 * 页面获得焦点时读取剪贴板内容，
 * 若包含 URL 且不同于上次提示，则返回提示信息
 */
export function useClipboardDetect(isIdle: boolean) {
  const [clipboardHint, setClipboardHint] = useState<ClipboardHint | null>(null)
  const lastClipboardUrlRef = useRef<string>('')
  const isIdleRef = useRef(isIdle)

  useEffect(() => {
    isIdleRef.current = isIdle
  }, [isIdle])

  useEffect(() => {
    const detectClipboard = async () => {
      if (!isIdleRef.current) return
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

    detectClipboard()
    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('focus', detectClipboard)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('focus', detectClipboard)
    }
  }, [])

  const dismiss = () => setClipboardHint(null)

  return { clipboardHint, setClipboardHint, dismissClipboardHint: dismiss }
}
