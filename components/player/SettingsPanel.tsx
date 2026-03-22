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
    <div className="mb-4 p-4 bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-3">
      <div>
        <label className="block text-sm text-zinc-500 mb-1">语音引擎</label>
        <div className="flex gap-2 flex-wrap">
          {TTS_ENGINES.map((e) => (
            <button
              key={e.type}
              onClick={() => onEngineChange(e.type)}
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
            onChange={(e) => onSettingChange('voice', e.target.value)}
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
              onClick={() => onSettingChange('speed', s)}
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
  )
}
