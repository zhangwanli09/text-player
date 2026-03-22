import { type NextRequest } from 'next/server'
import { getEdgeVoices } from '@/lib/tts/edge'
import { getOpenAIVoices } from '@/lib/tts/openai'
import type { TTSEngineType } from '@/lib/tts/types'

/**
 * 获取可用语音列表 API
 * GET /api/tts/voices?engine=edge|openai
 * 根据引擎类型返回对应的语音选项
 */
export async function GET(request: NextRequest) {
  const engine = (request.nextUrl.searchParams.get('engine') ||
    'edge') as TTSEngineType

  try {
    if (engine === 'openai') {
      return Response.json(getOpenAIVoices())
    }

    if (engine === 'edge') {
      const voices = await getEdgeVoices()
      return Response.json(voices)
    }

    // 浏览器原生引擎不需要服务端语音列表
    return Response.json([])
  } catch (err) {
    console.error('Failed to get voices:', err)
    return Response.json([], { status: 500 })
  }
}
