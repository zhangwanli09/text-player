import { synthesizeEdgeTTS } from '@/lib/tts/edge';
import { synthesizeOpenAITTS } from '@/lib/tts/openai';
import type { TTSEngineType } from '@/lib/tts/types';

export const maxDuration = 60;

export async function POST(request: Request) {
  const { text, voice, speed = 1, engine = 'edge' } = (await request.json()) as {
    text: string;
    voice: string;
    speed?: number;
    engine?: TTSEngineType;
  };

  if (!text) {
    return Response.json({ error: 'text is required' }, { status: 400 });
  }

  try {
    let audio: Uint8Array;

    if (engine === 'openai') {
      audio = await synthesizeOpenAITTS(text, voice || 'marin', speed);
    } else {
      audio = await synthesizeEdgeTTS(text, voice || 'zh-CN-XiaoxiaoNeural', speed);
    }

    return new Response(audio.buffer as ArrayBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': String(audio.byteLength),
      },
    });
  } catch (err) {
    console.error('TTS error:', err);
    return Response.json(
      { error: 'TTS synthesis failed' },
      { status: 500 }
    );
  }
}
