export interface Voice {
  id: string;
  name: string;
  lang: string;
  gender?: string;
}

export interface TTSOptions {
  text: string;
  voice: string;
  speed: number; // 1.0 = normal
  engine: TTSEngineType;
}

export type TTSEngineType = 'edge' | 'openai' | 'browser';

export interface TTSEngineConfig {
  type: TTSEngineType;
  label: string;
  defaultVoice: string;
}

export const TTS_ENGINES: TTSEngineConfig[] = [
  { type: 'edge', label: 'Edge TTS (免费)', defaultVoice: 'zh-CN-XiaoxiaoNeural' },
  { type: 'openai', label: 'OpenAI TTS', defaultVoice: 'marin' },
  { type: 'browser', label: '浏览器原生 (免费)', defaultVoice: '' },
];
