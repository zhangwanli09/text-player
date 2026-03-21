const MAX_CHUNK_SIZE = 2000;

export function splitText(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (trimmed.length <= MAX_CHUNK_SIZE) return [trimmed];

  const chunks: string[] = [];
  const paragraphs = trimmed.split(/\n\s*\n/);

  let current = '';
  for (const para of paragraphs) {
    const cleaned = para.trim();
    if (!cleaned) continue;

    if (current.length + cleaned.length + 1 <= MAX_CHUNK_SIZE) {
      current = current ? current + '\n\n' + cleaned : cleaned;
    } else {
      if (current) chunks.push(current);
      if (cleaned.length <= MAX_CHUNK_SIZE) {
        current = cleaned;
      } else {
        // Split long paragraph by sentences
        const sentences = cleaned.split(/(?<=[。！？.!?\n])/);
        current = '';
        for (const sentence of sentences) {
          if (current.length + sentence.length <= MAX_CHUNK_SIZE) {
            current += sentence;
          } else {
            if (current) chunks.push(current);
            current = sentence.length <= MAX_CHUNK_SIZE ? sentence : sentence.slice(0, MAX_CHUNK_SIZE);
          }
        }
      }
    }
  }
  if (current) chunks.push(current);

  return chunks;
}
