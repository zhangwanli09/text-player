import { UniversalCommunicate, UniversalVoicesManager } from 'edge-tts-universal';
import type { Voice } from './types';

function speedToRate(speed: number): string {
  const percent = Math.round((speed - 1) * 100);
  return percent >= 0 ? `+${percent}%` : `${percent}%`;
}

export async function synthesizeEdgeTTS(
  text: string,
  voice: string,
  speed: number
): Promise<Uint8Array> {
  const communicate = new UniversalCommunicate(text, {
    voice,
    rate: speedToRate(speed),
  });

  const audioChunks: Uint8Array[] = [];
  for await (const chunk of communicate.stream()) {
    if (chunk.type === 'audio' && chunk.data) {
      audioChunks.push(chunk.data);
    }
  }

  const totalLength = audioChunks.reduce((sum, c) => sum + c.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of audioChunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

const VOICE_NAMES: Record<string, string> = {
  'zh-CN-XiaoxiaoNeural': '晓晓',
  'zh-CN-YunxiNeural': '云希',
  'zh-CN-YunjianNeural': '云健',
  'zh-CN-XiaoyiNeural': '晓伊',
  'zh-CN-YunfengNeural': '云枫',
  'zh-CN-XiaochenNeural': '晓辰',
  'zh-CN-XiaohanNeural': '晓涵',
  'zh-CN-XiaomengNeural': '晓梦',
  'zh-CN-XiaomoNeural': '晓墨',
  'zh-CN-XiaoqiuNeural': '晓秋',
  'zh-CN-XiaoruiNeural': '晓瑞',
  'zh-CN-XiaoshuangNeural': '晓双',
  'zh-CN-XiaoxuanNeural': '晓萱',
  'zh-CN-XiaoyanNeural': '晓颜',
  'zh-CN-XiaozhenNeural': '晓甄',
  'zh-CN-YunhaoNeural': '云皓',
  'zh-CN-YunzeNeural': '云泽',
  'zh-CN-YunyeNeural': '云野',
  'zh-CN-YunyangNeural': '云扬',
  'zh-TW-HsiaoChenNeural': '曉臻',
  'zh-TW-HsiaoYuNeural': '曉雨',
  'zh-TW-YunJheNeural': '雲哲',
  'zh-HK-HiuGaaiNeural': '曉佳',
  'zh-HK-HiuMaanNeural': '曉曼',
  'zh-HK-WanLungNeural': '雲龍',
};

const GENDER_MAP: Record<string, string> = {
  Female: '女声',
  Male: '男声',
};

const LOCALE_MAP: Record<string, string> = {
  'zh-CN': '普通话',
  'zh-TW': '台湾',
  'zh-HK': '粤语',
};

let cachedVoices: Voice[] | null = null;

export async function getEdgeVoices(): Promise<Voice[]> {
  if (cachedVoices) return cachedVoices;

  const manager = await UniversalVoicesManager.create();
  const zhVoices = manager.find({ Language: 'zh' });

  cachedVoices = zhVoices.map((v) => ({
    id: v.ShortName,
    name: VOICE_NAMES[v.ShortName] || v.ShortName.replace(/Neural$/, '').split('-').pop() || v.ShortName,
    lang: LOCALE_MAP[v.Locale] || v.Locale,
    gender: GENDER_MAP[v.Gender] || v.Gender,
  }));
  return cachedVoices;
}
