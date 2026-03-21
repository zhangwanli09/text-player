'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { splitText } from '@/lib/tts/split';
import { loadSettings, saveSettings, type PlayerSettings } from '@/lib/store';
import { TTS_ENGINES, type TTSEngineType } from '@/lib/tts/types';
import type { Voice } from '@/lib/tts/types';

type PlayState = 'idle' | 'loading' | 'playing' | 'paused';

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

export default function Player() {
  const [input, setInput] = useState('');
  const [playState, setPlayState] = useState<PlayState>('idle');
  const [currentChunk, setCurrentChunk] = useState(0);
  const [totalChunks, setTotalChunks] = useState(0);
  const [settings, setSettings] = useState<PlayerSettings>(loadSettings);
  const [showSettings, setShowSettings] = useState(false);
  const [error, setError] = useState('');
  const [voices, setVoices] = useState<Voice[]>([]);
  const [loadingVoices, setLoadingVoices] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chunksRef = useRef<string[]>([]);
  const currentChunkRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const preloadedRef = useRef<Map<number, Blob>>(new Map());

  const fetchVoices = useCallback(async (engine: TTSEngineType) => {
    if (engine === 'browser') {
      setVoices([]);
      return;
    }
    setLoadingVoices(true);
    try {
      const res = await fetch(`/api/tts/voices?engine=${engine}`);
      const data = await res.json();
      setVoices(data);
    } catch {
      setVoices([]);
    } finally {
      setLoadingVoices(false);
    }
  }, []);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    fetchVoices(settings.engine);
  }, [settings.engine, fetchVoices]);

  const stopPlayback = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    preloadedRef.current.clear();
    setPlayState('idle');
    setCurrentChunk(0);
    setTotalChunks(0);
  }, []);

  const synthesizeChunk = useCallback(
    async (text: string, signal: AbortSignal): Promise<Blob> => {
      if (settings.engine === 'browser') {
        return new Promise((resolve, reject) => {
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = 'zh-CN';
          utterance.rate = settings.speed;
          utterance.onend = () => resolve(new Blob());
          utterance.onerror = (e) => reject(e);
          signal.addEventListener('abort', () => {
            speechSynthesis.cancel();
            reject(new DOMException('Aborted', 'AbortError'));
          });
          speechSynthesis.speak(utterance);
        });
      }

      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voice: settings.voice,
          speed: settings.speed,
          engine: settings.engine,
        }),
        signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(err.error || `TTS failed: ${res.status}`);
      }

      return res.blob();
    },
    [settings]
  );

  const preloadNext = useCallback(
    (chunkIndex: number, signal: AbortSignal) => {
      const nextIndex = chunkIndex + 1;
      if (nextIndex < chunksRef.current.length && !preloadedRef.current.has(nextIndex)) {
        synthesizeChunk(chunksRef.current[nextIndex], signal)
          .then((blob) => {
            if (!signal.aborted && blob.size > 0) {
              preloadedRef.current.set(nextIndex, blob);
            }
          })
          .catch(() => {});
      }
    },
    [synthesizeChunk]
  );

  const playChunk = useCallback(
    async (chunkIndex: number, signal: AbortSignal) => {
      if (signal.aborted || chunkIndex >= chunksRef.current.length) {
        if (!signal.aborted) setPlayState('idle');
        return;
      }

      setCurrentChunk(chunkIndex + 1);
      currentChunkRef.current = chunkIndex;

      // For browser TTS, handle differently
      if (settings.engine === 'browser') {
        try {
          setPlayState('playing');
          await synthesizeChunk(chunksRef.current[chunkIndex], signal);
          if (!signal.aborted) {
            playChunk(chunkIndex + 1, signal);
          }
        } catch (e) {
          if (e instanceof DOMException && e.name === 'AbortError') return;
          setError(String(e));
          setPlayState('idle');
        }
        return;
      }

      try {
        setPlayState('loading');

        let blob = preloadedRef.current.get(chunkIndex);
        if (!blob) {
          blob = await synthesizeChunk(chunksRef.current[chunkIndex], signal);
        }
        preloadedRef.current.delete(chunkIndex);

        if (signal.aborted) return;

        // Start preloading next chunk
        preloadNext(chunkIndex, signal);

        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;

        audio.onended = () => {
          URL.revokeObjectURL(url);
          if (!signal.aborted) {
            playChunk(chunkIndex + 1, signal);
          }
        };

        audio.onerror = () => {
          URL.revokeObjectURL(url);
          if (!signal.aborted) {
            setError('音频播放失败');
            setPlayState('idle');
          }
        };

        setPlayState('playing');
        await audio.play();
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return;
        setError(String(e));
        setPlayState('idle');
      }
    },
    [settings.engine, synthesizeChunk, preloadNext]
  );

  const handlePlay = useCallback(() => {
    const text = input.trim();
    if (!text) return;
    setError('');

    stopPlayback();

    const chunks = splitText(text);
    chunksRef.current = chunks;
    setTotalChunks(chunks.length);

    const abort = new AbortController();
    abortRef.current = abort;

    playChunk(0, abort.signal);
  }, [input, stopPlayback, playChunk]);

  const handlePauseResume = useCallback(() => {
    if (!audioRef.current) return;
    if (playState === 'playing') {
      audioRef.current.pause();
      setPlayState('paused');
    } else if (playState === 'paused') {
      audioRef.current.play();
      setPlayState('playing');
    }
  }, [playState]);

  const handleStop = useCallback(() => {
    stopPlayback();
  }, [stopPlayback]);

  const updateSetting = <K extends keyof PlayerSettings>(key: K, value: PlayerSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleEngineChange = (engine: TTSEngineType) => {
    const config = TTS_ENGINES.find((e) => e.type === engine);
    setSettings((prev) => ({
      ...prev,
      engine,
      voice: config?.defaultVoice || prev.voice,
    }));
  };

  const isActive = playState !== 'idle';

  return (
    <div className="w-full max-w-2xl mx-auto px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          TextPlayer
        </h1>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
          title="设置"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M10 13a3 3 0 100-6 3 3 0 000 6z" />
            <path d="M16.5 10a6.5 6.5 0 01-.3 2l1.8 1.4-2 3.4-2.1-.7a6.5 6.5 0 01-1.7 1L12 19H8l-.2-1.9a6.5 6.5 0 01-1.7-1l-2.1.7-2-3.4L3.8 12a6.5 6.5 0 010-4L2 6.6l2-3.4 2.1.7a6.5 6.5 0 011.7-1L8 1h4l.2 1.9a6.5 6.5 0 011.7 1l2.1-.7 2 3.4L16.2 8a6.5 6.5 0 01.3 2z" />
          </svg>
        </button>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="mb-4 p-4 bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-3">
          <div>
            <label className="block text-sm text-zinc-500 mb-1">语音引擎</label>
            <div className="flex gap-2 flex-wrap">
              {TTS_ENGINES.map((e) => (
                <button
                  key={e.type}
                  onClick={() => handleEngineChange(e.type)}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    settings.engine === e.type
                      ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                      : 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-700'
                  }`}
                >
                  {e.label}
                </button>
              ))}
            </div>
          </div>

          {settings.engine !== 'browser' && (
            <div>
              <label className="block text-sm text-zinc-500 mb-1">语音</label>
              <select
                value={settings.voice}
                onChange={(e) => updateSetting('voice', e.target.value)}
                disabled={loadingVoices}
                className="w-full px-3 py-1.5 text-sm rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 disabled:opacity-50"
              >
                {loadingVoices ? (
                  <option>加载中...</option>
                ) : voices.length === 0 ? (
                  <option value={settings.voice}>{settings.voice}</option>
                ) : (
                  voices.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}{v.gender ? ` (${v.gender})` : ''}{v.lang && v.lang !== 'multi' ? ` - ${v.lang}` : ''}
                    </option>
                  ))
                )}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm text-zinc-500 mb-1">
              语速 {settings.speed}x
            </label>
            <div className="flex gap-2">
              {SPEEDS.map((s) => (
                <button
                  key={s}
                  onClick={() => updateSetting('speed', s)}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    settings.speed === s
                      ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                      : 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-700'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Input */}
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="粘贴文本或 URL，然后点击播放..."
        rows={6}
        className="w-full p-4 text-base rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 resize-none focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-600 placeholder:text-zinc-400"
      />

      {/* Error */}
      {error && (
        <div className="mt-2 p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-lg">
          {error}
        </div>
      )}

      {/* Controls */}
      <div className="mt-4 flex items-center gap-3">
        {!isActive ? (
          <button
            onClick={handlePlay}
            disabled={!input.trim()}
            className="flex items-center gap-2 px-6 py-3 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-full font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M4 2.5v11l9-5.5z" />
            </svg>
            播放
          </button>
        ) : (
          <>
            <button
              onClick={handlePauseResume}
              disabled={playState === 'loading'}
              className="flex items-center gap-2 px-5 py-3 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-full font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {playState === 'paused' ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M4 2.5v11l9-5.5z" />
                  </svg>
                  继续
                </>
              ) : playState === 'loading' ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 16 16" className="animate-spin" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="8" cy="8" r="6" strokeDasharray="28" strokeDashoffset="8" />
                  </svg>
                  加载中
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <rect x="3" y="2" width="4" height="12" rx="1" />
                    <rect x="9" y="2" width="4" height="12" rx="1" />
                  </svg>
                  暂停
                </>
              )}
            </button>
            <button
              onClick={handleStop}
              className="px-5 py-3 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-full font-medium transition-colors"
            >
              停止
            </button>
          </>
        )}

        {/* Progress */}
        {isActive && totalChunks > 1 && (
          <span className="ml-auto text-sm text-zinc-500">
            {currentChunk} / {totalChunks}
          </span>
        )}
      </div>
    </div>
  );
}
