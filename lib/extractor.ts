/**
 * 网页正文提取模块
 * 使用 Mozilla Readability 算法从任意网页 URL 中提取正文文本
 */
import { Readability } from '@mozilla/readability'
import { JSDOM } from 'jsdom'

export interface ExtractResult {
  title: string // 文章标题
  content: string // 纯文本正文内容
}

/**
 * 清理 HTML 中不需要的内容以减小体积、加速解析
 * 微信公众号等页面 HTML 可达数 MB，大量为 script/style/内联样式
 */
function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<svg[\s\S]*?<\/svg>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
    .replace(/\s+style="[^"]*"/gi, '')
    .replace(/\s+style='[^']*'/gi, '')
}

/**
 * 从 URL 抓取网页并提取正文
 * 1. 使用浏览器 UA 请求网页 HTML
 * 2. 清理无用标签（script/style 等）以减小体积
 * 3. 通过 JSDOM 解析 HTML 为 DOM
 * 4. 通过 Readability 提取正文（去除导航、广告等干扰元素）
 */
export async function extractFromURL(url: string): Promise<ExtractResult> {
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(8000),
  })

  if (!res.ok) {
    throw new Error(`Failed to fetch URL: ${res.status}`)
  }

  const rawHtml = await res.text()

  if (!rawHtml || rawHtml.length < 100) {
    throw new Error('页面内容为空或过短，无法提取')
  }

  const html = stripHtml(rawHtml)

  const dom = new JSDOM(html, { url })
  const reader = new Readability(dom.window.document)
  const article = reader.parse()

  if (!article || !article.textContent) {
    throw new Error('无法从该链接提取正文内容')
  }

  return {
    title: article.title || '未知标题',
    content: article.textContent.trim(),
  }
}
