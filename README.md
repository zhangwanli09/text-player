# TextPlayer - 文本播放器

粘贴文本或 URL，用自然的声音朗读。适合通勤、做家务时「听文章」。

## 功能

- **多引擎 TTS** — 支持 Edge TTS（免费）、OpenAI TTS、浏览器原生语音
- **URL 正文提取** — 粘贴链接自动抓取网页正文（基于 Mozilla Readability）
- **智能分段** — 长文本按段落/句子自动分割，逐段合成播放
- **预加载** — 播放当前段时自动预加载下一段，减少等待
- **断点续播** — 播放进度保存到 IndexedDB，下次可从历史记录恢复
- **锁屏控制** — 通过 Media Session API 在锁屏/通知栏显示播放控制
- **PWA 支持** — 可添加到手机桌面，独立窗口运行
- **深色模式** — 自动跟随系统主题

## 技术栈

- Next.js 16 / React 19 / TypeScript
- Tailwind CSS 4
- IndexedDB（idb）— 历史记录持久化
- edge-tts-universal — 微软 Edge TTS
- OpenAI SDK — OpenAI TTS
- @mozilla/readability + jsdom — 网页正文提取

## 快速开始

```bash
pnpm install
pnpm dev
```

打开 [http://localhost:3000](http://localhost:3000) 即可使用。

## 环境变量

| 变量 | 说明 | 必填 |
|------|------|------|
| `OPENAI_API_KEY` | OpenAI API 密钥（仅使用 OpenAI TTS 引擎时需要） | 否 |