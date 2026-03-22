'use client'

interface ClipboardHintProps {
  url: string
  onPlay: () => void
  onDismiss: () => void
}

export default function ClipboardHint({
  url,
  onPlay,
  onDismiss,
}: ClipboardHintProps) {
  return (
    <div className="mb-4 flex items-center gap-3 text-sm">
      <span className="truncate flex-1 text-stone-400">
        检测到链接：
        <span className="text-stone-600 dark:text-stone-300">{url}</span>
      </span>
      <button
        onClick={onPlay}
        className="shrink-0 text-stone-600 dark:text-stone-300 hover:underline underline-offset-4 transition-colors"
      >
        播放
      </button>
      <button
        onClick={onDismiss}
        className="shrink-0 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
        aria-label="关闭"
      >
        &times;
      </button>
    </div>
  )
}
