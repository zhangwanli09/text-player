import { extractFromURL } from '@/lib/extractor';

export const maxDuration = 30;

export async function POST(request: Request) {
  const { url } = (await request.json()) as { url: string };

  if (!url) {
    return Response.json({ error: 'url is required' }, { status: 400 });
  }

  try {
    new URL(url);
  } catch {
    return Response.json({ error: '无效的 URL' }, { status: 400 });
  }

  try {
    const result = await extractFromURL(url);
    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : '提取失败';
    return Response.json({ error: message }, { status: 500 });
  }
}
