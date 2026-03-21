import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';

export interface ExtractResult {
  title: string;
  content: string;
}

export async function extractFromURL(url: string): Promise<ExtractResult> {
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch URL: ${res.status}`);
  }

  const html = await res.text();
  const dom = new JSDOM(html, { url });
  const reader = new Readability(dom.window.document);
  const article = reader.parse();

  if (!article || !article.textContent) {
    throw new Error('无法从该链接提取正文内容');
  }

  return {
    title: article.title || '未知标题',
    content: article.textContent.trim(),
  };
}
