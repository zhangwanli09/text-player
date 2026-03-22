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
    <div className="mb-3 flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl text-sm">
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="shrink-0 text-blue-500"
        aria-hidden="true"
      >
        <rect x="4" y="1" width="8" height="3" rx="1" />
        <rect x="2" y="3" width="12" height="12" rx="2" />
      </svg>
      <span className="flex-1 truncate text-blue-700 dark:text-blue-300">
        检测到链接：{url}
      </span>
      <button
        onClick={onPlay}
        className="shrink-0 px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
      >
        播放
      </button>
      <button
        onClick={onDismiss}
        className="shrink-0 p-1 text-blue-400 hover:text-blue-600 dark:hover:text-blue-200 transition-colors"
        aria-label="关闭"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden="true"
        >
          <path d="M3 3l8 8M11 3l-8 8" />
        </svg>
      </button>
    </div>
  )
}
