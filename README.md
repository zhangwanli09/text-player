# TextPlayer

Paste text or a URL and listen to it read aloud in a natural voice. Great for commutes and chores.

## Features

- Multiple TTS engines: Edge TTS, OpenAI TTS, native browser
- Paste a URL to auto-extract article content
- Smart chunking for long text with background preloading
- Resume playback, lock-screen controls, PWA

## Quick Start

```bash
npm install && npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Optional env var: `OPENAI_API_KEY` (required for the OpenAI TTS engine).
