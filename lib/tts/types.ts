/**
 * TTS（文本转语音）类型定义
 * 定义了语音、引擎配置等公共接口
 */

/** 语音选项 */
export interface Voice {
  id: string;      // 语音唯一标识
  name: string;    // 显示名称
  lang: string;    // 语言/方言标识
  gender?: string; // 性别描述（男声/女声/中性）
}

/** TTS 合成参数 */
export interface TTSOptions {
  text: string;          // 待合成的文本
  voice: string;         // 语音 ID
  speed: number;         // 语速倍率，1.0 = 正常
  engine: TTSEngineType; // TTS 引擎类型
}

/** 支持的 TTS 引擎类型枚举 */
export type TTSEngineType = 'edge' | 'openai' | 'browser';

/** TTS 引擎配置 */
export interface TTSEngineConfig {
  type: TTSEngineType;   // 引擎类型
  label: string;         // UI 显示标签
  defaultVoice: string;  // 该引擎的默认语音
}

/** 可用的 TTS 引擎列表 */
export const TTS_ENGINES: TTSEngineConfig[] = [
  { type: 'edge', label: 'Edge TTS (免费)', defaultVoice: 'zh-CN-XiaoxiaoNeural' },
  { type: 'openai', label: 'OpenAI TTS', defaultVoice: 'marin' },
  { type: 'browser', label: '浏览器原生 (免费)', defaultVoice: '' },
];
