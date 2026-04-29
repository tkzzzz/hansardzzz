export interface TtsOptions {
  rate: number;
  pitch: number;
  voice: SpeechSynthesisVoice | null;
}

export interface TtsController {
  pause: () => void;
  resume: () => void;
  stop: () => void;
  isPlaying: () => boolean;
}

export function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      resolve(voices);
    } else {
      window.speechSynthesis.addEventListener(
        'voiceschanged',
        () => resolve(window.speechSynthesis.getVoices()),
        { once: true },
      );
    }
  });
}

export function speakSequence(
  texts: string[],
  options: TtsOptions,
  onProgress: (index: number) => void,
  onDone: () => void,
): TtsController {
  let stopped = false;
  let paused = false;

  // Chrome silently stops TTS when tab is backgrounded; resume() on interval works around it.
  const resumeInterval = window.setInterval(() => {
    if (!paused && !stopped) window.speechSynthesis.resume();
  }, 10_000);

  function speakAt(index: number): void {
    if (stopped || index >= texts.length) {
      window.clearInterval(resumeInterval);
      if (!stopped) onDone();
      return;
    }
    onProgress(index);

    const utterance = new SpeechSynthesisUtterance(texts[index]);
    utterance.rate = options.rate;
    utterance.pitch = options.pitch;
    if (options.voice) utterance.voice = options.voice;
    utterance.onend = () => speakAt(index + 1);
    utterance.onerror = () => speakAt(index + 1);
    window.speechSynthesis.speak(utterance);
  }

  window.speechSynthesis.cancel();
  speakAt(0);

  return {
    pause() {
      paused = true;
      window.speechSynthesis.pause();
    },
    resume() {
      paused = false;
      window.speechSynthesis.resume();
    },
    stop() {
      stopped = true;
      window.clearInterval(resumeInterval);
      window.speechSynthesis.cancel();
      onProgress(-1);
    },
    isPlaying() {
      return !stopped && !paused;
    },
  };
}

export function stripParentheticals(text: string): string {
  return text.replace(/\s*\(.*?\)/g, '').trim();
}

export function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}
