'use client'

import { TTS_ENGINES, type TTSEngineType } from '@/lib/tts/types'
import type { Voice } from '@/lib/tts/types'
import type { PlayerSettings } from '@/lib/store'

interface SettingsPanelProps {
  settings: PlayerSettings
  voices: Voice[]
  loadingVoices: boolean
  onEngineChange: (engine: TTSEngineType) => void
  onSettingChange: <K extends keyof PlayerSettings>(
    key: K,
    value: PlayerSettings[K],
  ) => void
}

const SPEEDS = [0.75, 1, 1.25, 1.5, 2]

export default function SettingsPanel({
  settings,
  voices,
  loadingVoices,
  onEngineChange,
  onSettingChange,
}: SettingsPanelProps) {
  return (
    <div className="mb-6 space-y-4 text-sm">
      <div className="flex items-baseline gap-4">
        <span className="text-stone-400 shrink-0">引擎</span>
        <div className="flex gap-3 flex-wrap">
          {TTS_ENGINES.map((e) => (
            <button
              key={e.type}
              onClick={() => onEngineChange(e.type)}
              className={`transition-colors ${
                settings.engine === e.type
                  ? 'underline underline-offset-4 decoration-stone-400'
                  : 'text-stone-400 hover:text-stone-600 dark:hover:text-stone-300'
              }`}
            >
              {e.label}
            </button>
          ))}
        </div>
      </div>

      {settings.engine !== 'browser' && (
        <div className="flex items-baseline gap-4">
          <span className="text-stone-400 shrink-0">语音</span>
          <select
            value={settings.voice}
            onChange={(e) => onSettingChange('voice', e.target.value)}
            disabled={loadingVoices}
            className="flex-1 bg-transparent text-sm py-1 border-b border-stone-200 dark:border-stone-800 focus:outline-none disabled:opacity-40 cursor-pointer"
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

      <div className="flex items-baseline gap-4">
        <span className="text-stone-400 shrink-0">语速</span>
        <div className="flex gap-3">
          {SPEEDS.map((s) => (
            <button
              key={s}
              onClick={() => onSettingChange('speed', s)}
              className={`transition-colors ${
                settings.speed === s
                  ? 'underline underline-offset-4 decoration-stone-400'
                  : 'text-stone-400 hover:text-stone-600 dark:hover:text-stone-300'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
