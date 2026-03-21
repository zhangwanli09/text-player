import type { TTSEngineType } from './tts/types';

export interface PlayerSettings {
  engine: TTSEngineType;
  voice: string;
  speed: number;
}

const SETTINGS_KEY = 'textplayer_settings';

const DEFAULT_SETTINGS: PlayerSettings = {
  engine: 'edge',
  voice: 'zh-CN-XiaoxiaoNeural',
  speed: 1,
};

export function loadSettings(): PlayerSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_SETTINGS;
}

export function saveSettings(settings: PlayerSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
