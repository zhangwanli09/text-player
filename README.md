# TextPlayer - 文本播放器

粘贴文本或 URL，用自然的声音朗读。适合通勤、做家务时「听文章」。

## 功能

- **多引擎 TTS** — Edge TTS（免费）、OpenAI TTS、浏览器原生语音
- **URL 正文提取** — 粘贴链接自动抓取网页正文
- **智能分段** — 长文本自动分割，逐段合成播放
- **预加载** — 后台预加载下一段，减少等待
- **断点续播** — 进度保存到本地，可从历史记录恢复
- **锁屏控制** — 支持锁屏 / 通知栏播放控制
- **PWA** — 可添加到手机桌面

## 技术栈

- Next.js / React / TypeScript / Tailwind CSS
- IndexedDB、edge-tts-universal、OpenAI SDK、@mozilla/readability

## 快速开始

```bash
npm install && npm run dev
```

打开 [http://localhost:3000](http://localhost:3000) 即可使用。

## 环境变量

`OPENAI_API_KEY` — OpenAI TTS 引擎所需（可选）
