// ~150 wpm is a good approximation for natural TTS at 1.0x speed
const WORDS_PER_MINUTE_BASE = 150;

export function estimateListeningTime(totalWords: number, speed: number): string {
  const minutes = Math.round(totalWords / (WORDS_PER_MINUTE_BASE * speed));
  if (minutes < 1) return '< 1 min';
  if (minutes < 60) return `~${minutes} min`;
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `~${hrs} hr ${mins} min` : `~${hrs} hr`;
}

export function countWords(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

export function formatDate(isoString: string): string {
  const date = new Date(isoString.split('T')[0] + 'T00:00:00');
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Partial<HTMLElementTagNameMap[K]> & { class?: string } = {},
  ...children: (HTMLElement | string)[]
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  const { class: className, ...rest } = attrs;
  if (className) element.className = className;
  Object.assign(element, rest);
  element.append(...children);
  return element;
}
