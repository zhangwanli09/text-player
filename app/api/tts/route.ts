import { synthesizeEdgeTTS } from '@/lib/tts/edge'
import { synthesizeOpenAITTS } from '@/lib/tts/openai'
import type { TTSEngineType } from '@/lib/tts/types'

// 允许最长 60 秒的合成时间（Vercel Serverless 超时配置）
export const maxDuration = 60

const MAX_TEXT_LENGTH = 5000
const VALID_ENGINES: TTSEngineType[] = ['edge', 'openai']

/**
 * TTS 语音合成 API
 * POST /api/tts
 * 接收文本、语音、语速和引擎参数，返回 MP3 音频二进制数据
 */
export async function POST(request: Request) {
  const {
    text,
    voice,
    speed = 1,
    engine = 'edge',
  } = (await request.json()) as {
    text: string
    voice: string
    speed?: number
    engine?: TTSEngineType
  }

  if (!text) {
    return Response.json({ error: 'text is required' }, { status: 400 })
  }

  if (text.length > MAX_TEXT_LENGTH) {
    return Response.json(
      { error: `text exceeds max length of ${MAX_TEXT_LENGTH}` },
      { status: 400 },
    )
  }

  if (!VALID_ENGINES.includes(engine)) {
    return Response.json({ error: 'invalid engine' }, { status: 400 })
  }

  try {
    let audio: Uint8Array

    // 根据引擎类型调用对应的 TTS 服务
    if (engine === 'openai') {
      audio = await synthesizeOpenAITTS(text, voice || 'marin', speed)
    } else {
      audio = await synthesizeEdgeTTS(
        text,
        voice || 'zh-CN-XiaoxiaoNeural',
        speed,
      )
    }

    // 以音频流形式返回合成结果
    return new Response(audio.buffer as ArrayBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': String(audio.byteLength),
      },
    })
  } catch (err) {
    console.error('TTS error:', err)
    return Response.json({ error: 'TTS synthesis failed' }, { status: 500 })
  }
}
