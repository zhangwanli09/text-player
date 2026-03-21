import OpenAI from 'openai';
import type { Voice } from './types';

const OPENAI_VOICES = [
  { id: 'marin', name: 'Marin 温暖', gender: '女声' },
  { id: 'cedar', name: 'Cedar 沉稳', gender: '男声' },
  { id: 'alloy', name: 'Alloy 中性', gender: '中性' },
  { id: 'coral', name: 'Coral 柔和', gender: '女声' },
  { id: 'echo', name: 'Echo 低沉', gender: '男声' },
  { id: 'nova', name: 'Nova 活力', gender: '女声' },
  { id: 'sage', name: 'Sage 知性', gender: '女声' },
  { id: 'ash', name: 'Ash 清朗', gender: '男声' },
  { id: 'shimmer', name: 'Shimmer 明亮', gender: '女声' },
  { id: 'ballad', name: 'Ballad 叙事', gender: '男声' },
  { id: 'onyx', name: 'Onyx 浑厚', gender: '男声' },
  { id: 'fable', name: 'Fable 故事', gender: '男声' },
  { id: 'verse', name: 'Verse 优雅', gender: '女声' },
];

export async function synthesizeOpenAITTS(
  text: string,
  voice: string,
  speed: number
): Promise<Uint8Array> {
  const client = new OpenAI();

  const response = await client.audio.speech.create({
    model: 'gpt-4o-mini-tts',
    input: text,
    voice: voice as 'alloy',
    instructions: '用温暖自然的语气朗读，语速平稳',
    response_format: 'mp3',
    speed: Math.max(0.25, Math.min(4.0, speed)),
  } as Parameters<typeof client.audio.speech.create>[0]);

  const arrayBuffer = await response.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

export function getOpenAIVoices(): Voice[] {
  return OPENAI_VOICES.map((v) => ({
    id: v.id,
    name: v.name,
    lang: 'multi',
    gender: v.gender,
  }));
}
