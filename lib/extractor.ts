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
 * 从 URL 抓取网页并提取正文
 * 1. 使用浏览器 UA 请求网页 HTML
 * 2. 通过 JSDOM 解析 HTML 为 DOM
 * 3. 通过 Readability 提取正文（去除导航、广告等干扰元素）
 */
export async function extractFromURL(url: string): Promise<ExtractResult> {
  // 模拟浏览器 UA 以避免被网站拒绝
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
  })

  if (!res.ok) {
    throw new Error(`Failed to fetch URL: ${res.status}`)
  }

  // 将 HTML 解析为 DOM，传入原始 URL 以正确解析相对路径
  const html = await res.text()
  const dom = new JSDOM(html, { url })

  // 使用 Readability 提取文章正文
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
