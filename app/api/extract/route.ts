import { extractFromURL } from '@/lib/extractor'

// 允许最长 30 秒抓取网页内容
export const maxDuration = 30

/**
 * URL 正文提取 API
 * POST /api/extract
 * 接收 URL，抓取网页并使用 Readability 提取正文内容
 * 返回 { title, content }
 */
export async function POST(request: Request) {
  const { url } = (await request.json()) as { url: string }

  if (!url) {
    return Response.json({ error: 'url is required' }, { status: 400 })
  }

  // 验证 URL 格式是否合法
  try {
    new URL(url)
  } catch {
    return Response.json({ error: '无效的 URL' }, { status: 400 })
  }

  try {
    const result = await extractFromURL(url)
    return Response.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : '提取失败'
    return Response.json({ error: message }, { status: 500 })
  }
}
