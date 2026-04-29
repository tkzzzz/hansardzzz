export type OpenAiVoice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
export type OpenAiModel = 'tts-1' | 'tts-1-hd';

export const OPENAI_VOICES: { id: OpenAiVoice; label: string; description: string }[] = [
  { id: 'onyx',    label: 'Onyx',    description: 'Deep, authoritative — ideal for parliamentary debate' },
  { id: 'echo',    label: 'Echo',    description: 'Balanced, clear — good all-rounder' },
  { id: 'fable',   label: 'Fable',   description: 'Expressive, British-leaning tone' },
  { id: 'alloy',   label: 'Alloy',   description: 'Neutral, measured' },
  { id: 'nova',    label: 'Nova',    description: 'Warm, conversational' },
  { id: 'shimmer', label: 'Shimmer', description: 'Soft, gentle' },
];

const KEYS = {
  apiKey: 'hansardzzz_openai_key',
  voice:  'hansardzzz_openai_voice',
  model:  'hansardzzz_openai_model',
  speed:  'hansardzzz_openai_speed',
} as const;

export function getSettings() {
  return {
    apiKey: localStorage.getItem(KEYS.apiKey) ?? '',
    voice:  (localStorage.getItem(KEYS.voice)  ?? 'onyx') as OpenAiVoice,
    model:  (localStorage.getItem(KEYS.model)  ?? 'tts-1') as OpenAiModel,
    speed:  parseFloat(localStorage.getItem(KEYS.speed) ?? '1.0'),
  };
}

export function saveSettings(settings: Partial<ReturnType<typeof getSettings>>): void {
  if (settings.apiKey  !== undefined) localStorage.setItem(KEYS.apiKey, settings.apiKey);
  if (settings.voice   !== undefined) localStorage.setItem(KEYS.voice,  settings.voice);
  if (settings.model   !== undefined) localStorage.setItem(KEYS.model,  settings.model);
  if (settings.speed   !== undefined) localStorage.setItem(KEYS.speed,  String(settings.speed));
}

export function hasApiKey(): boolean {
  return getSettings().apiKey.length > 0;
}
