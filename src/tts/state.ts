import type { TtsController } from './speech';

export interface NowPlayingMeta {
  title: string;
  extId: string;
}

interface GlobalTtsState {
  controller: TtsController;
  meta: NowPlayingMeta;
  paused: boolean;
}

let current: GlobalTtsState | null = null;
const listeners = new Set<() => void>();

function notify(): void {
  for (const fn of listeners) fn();
}

export function startPlaying(controller: TtsController, meta: NowPlayingMeta): void {
  current = { controller, meta, paused: false };
  notify();
}

export function stopPlaying(): void {
  current?.controller.stop();
  current = null;
  notify();
}

export function pausePlaying(): void {
  if (!current) return;
  current.controller.pause();
  current.paused = true;
  notify();
}

export function resumePlaying(): void {
  if (!current) return;
  current.controller.resume();
  current.paused = false;
  notify();
}

export function markDone(): void {
  current = null;
  notify();
}

export function getState(): Readonly<GlobalTtsState> | null {
  return current;
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
