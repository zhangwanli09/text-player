import { type NextRequest } from 'next/server';
import { getEdgeVoices } from '@/lib/tts/edge';
import { getOpenAIVoices } from '@/lib/tts/openai';
import type { TTSEngineType } from '@/lib/tts/types';

export async function GET(request: NextRequest) {
  const engine = (request.nextUrl.searchParams.get('engine') || 'edge') as TTSEngineType;

  try {
    if (engine === 'openai') {
      return Response.json(getOpenAIVoices());
    }

    if (engine === 'edge') {
      const voices = await getEdgeVoices();
      return Response.json(voices);
    }

    return Response.json([]);
  } catch (err) {
    console.error('Failed to get voices:', err);
    return Response.json([], { status: 500 });
  }
}
