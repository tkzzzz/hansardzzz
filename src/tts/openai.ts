import type { TtsController } from './speech';
import type { OpenAiVoice, OpenAiModel } from '../settings';

const MAX_CHARS = 4000;

export interface OpenAiTtsOptions {
  apiKey: string;
  voice: OpenAiVoice;
  model: OpenAiModel;
  speed: number;
}

interface PreparedAudio {
  url: string;
  audio: HTMLAudioElement;
}

function chunkText(text: string): string[] {
  if (text.length <= MAX_CHARS) return [text];
  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > MAX_CHARS) {
    let splitAt = remaining.lastIndexOf('. ', MAX_CHARS);
    if (splitAt < MAX_CHARS / 2) splitAt = MAX_CHARS;
    chunks.push(remaining.slice(0, splitAt + 1).trim());
    remaining = remaining.slice(splitAt + 1).trim();
  }
  if (remaining) chunks.push(remaining);
  return chunks;
}

async function fetchAndPreload(text: string, opts: OpenAiTtsOptions): Promise<PreparedAudio> {
  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: opts.model,
      input: text,
      voice: opts.voice,
      speed: opts.speed,
    }),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText);
    throw new Error(`OpenAI TTS ${res.status}: ${err}`);
  }
  const url = URL.createObjectURL(await res.blob());
  const audio = new Audio(url);
  audio.preload = 'auto';
  audio.load();
  return { url, audio };
}

export function speakSequenceOpenAi(
  texts: string[],
  opts: OpenAiTtsOptions,
  onProgress: (index: number) => void,
  onError: (msg: string) => void,
  onDone: () => void,
): TtsController {
  let stopped = false;
  let paused = false;
  let currentAudio: HTMLAudioElement | null = null;
  let resumeResolve: (() => void) | null = null;
  const objectUrls: string[] = [];

  function waitWhilePaused(): Promise<void> {
    if (!paused) return Promise.resolve();
    return new Promise((resolve) => { resumeResolve = resolve; });
  }

  function revoke(url: string): void {
    const idx = objectUrls.indexOf(url);
    if (idx !== -1) { URL.revokeObjectURL(url); objectUrls.splice(idx, 1); }
  }

  function revokeAll(): void {
    for (const url of objectUrls) URL.revokeObjectURL(url);
    objectUrls.length = 0;
  }

  async function run(): Promise<void> {
    const items: { textIndex: number; chunk: string }[] = texts.flatMap((text, ti) =>
      chunkText(text).map((chunk) => ({ textIndex: ti, chunk })),
    );

    if (items.length === 0) { onDone(); return; }

    // Kick off fetch+preload for item 0 before the loop
    let prefetch: Promise<PreparedAudio | null> = fetchAndPreload(items[0].chunk, opts);

    for (let i = 0; i < items.length; i++) {
      if (stopped) { revokeAll(); return; }

      const { textIndex } = items[i];

      // Start fetching+preloading next item immediately — overlaps with current playback
      const nextItem = items[i + 1];
      const nextFetch: Promise<PreparedAudio | null> = nextItem
        ? fetchAndPreload(nextItem.chunk, opts)
        : Promise.resolve(null);

      let prepared: PreparedAudio | null;
      try {
        prepared = await prefetch;
      } catch (e) {
        onError(e instanceof Error ? e.message : String(e));
        stopped = true;
        revokeAll();
        return;
      }

      if (!prepared) { prefetch = nextFetch; continue; }
      objectUrls.push(prepared.url);

      if (stopped) { revokeAll(); return; }
      await waitWhilePaused();
      if (stopped) { revokeAll(); return; }

      // Signal progress (highlight + hide loading banner) right before playback,
      // once per contribution rather than per chunk
      if (i === 0 || items[i - 1].textIndex !== textIndex) {
        onProgress(textIndex);
      }

      // Audio is already loaded — play immediately
      currentAudio = prepared.audio;
      await new Promise<void>((resolve) => {
        prepared!.audio.onended = () => resolve();
        prepared!.audio.onerror = () => resolve();
        prepared!.audio.play().catch(() => resolve());
      });
      currentAudio = null;
      revoke(prepared.url);

      prefetch = nextFetch;
    }

    if (!stopped) { onProgress(-1); onDone(); }
    revokeAll();
  }

  run();

  return {
    pause() {
      paused = true;
      currentAudio?.pause();
    },
    resume() {
      paused = false;
      currentAudio?.play().catch(() => {});
      resumeResolve?.();
      resumeResolve = null;
    },
    stop() {
      stopped = true;
      currentAudio?.pause();
      resumeResolve?.();
      resumeResolve = null;
      revokeAll();
    },
    isPlaying() {
      return !stopped && !paused;
    },
  };
}
