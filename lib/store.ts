import type { TTSEngineType } from './tts/types'

/**
 * 播放器设置接口
 * 存储用户选择的 TTS 引擎、语音和语速
 */
export interface PlayerSettings {
  engine: TTSEngineType // TTS 引擎类型
  voice: string // 语音 ID
  speed: number // 播放速度倍率
}

// localStorage 存储键名
const SETTINGS_KEY = 'textplayer_settings:v1'

// 默认设置：Edge TTS + 晓晓语音 + 正常语速
const DEFAULT_SETTINGS: PlayerSettings = {
  engine: 'edge',
  voice: 'zh-CN-XiaoxiaoNeural',
  speed: 1,
}

/**
 * 从 localStorage 加载用户设置
 * SSR 环境下返回默认值，解析失败时也回退到默认值
 */
export function loadSettings(): PlayerSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch {}
  return DEFAULT_SETTINGS
}

/** 将用户设置持久化到 localStorage */
export function saveSettings(settings: PlayerSettings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch {}
}
