/**
 * 文本分段模块
 * 将长文本按段落和句子智能分割为适合 TTS 合成的小段
 * 每段不超过 MAX_CHUNK_SIZE 字符，优先在段落边界分割，其次按句子分割
 */

// TTS 单次合成的最大字符数限制
const MAX_CHUNK_SIZE = 2000

/**
 * 将长文本分割为多个分段
 * 分割策略（按优先级）：
 * 1. 按双换行符分割段落，尽可能将多个段落合并到一个分段中
 * 2. 若单段落超限，按句子标点（。！？.!?）进一步拆分
 * 3. 若单句子仍超限，强制截断
 */
export function splitText(text: string): string[] {
  const trimmed = text.trim()
  if (!trimmed) return []
  // 短文本无需分割
  if (trimmed.length <= MAX_CHUNK_SIZE) return [trimmed]

  const chunks: string[] = []
  // 按双换行符分割为段落
  const paragraphs = trimmed.split(/\n\s*\n/)

  let current = ''
  for (const para of paragraphs) {
    const cleaned = para.trim()
    if (!cleaned) continue

    // 尝试将当前段落追加到现有分段中
    if (current.length + cleaned.length + 1 <= MAX_CHUNK_SIZE) {
      current = current ? current + '\n\n' + cleaned : cleaned
    } else {
      if (current) chunks.push(current)
      if (cleaned.length <= MAX_CHUNK_SIZE) {
        current = cleaned
      } else {
        // 段落过长，按句子标点进一步拆分
        const sentences = cleaned.split(/(?<=[。！？.!?\n])/).filter(Boolean)
        current = ''
        for (const sentence of sentences) {
          if (current.length + sentence.length <= MAX_CHUNK_SIZE) {
            current += sentence
          } else {
            if (current) chunks.push(current)
            // 单句超限则强制截断
            current =
              sentence.length <= MAX_CHUNK_SIZE
                ? sentence
                : sentence.slice(0, MAX_CHUNK_SIZE)
          }
        }
      }
    }
  }
  if (current) chunks.push(current)

  return chunks
}
