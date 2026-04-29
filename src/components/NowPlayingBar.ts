import { getState, pausePlaying, resumePlaying, stopPlaying, subscribe } from '../tts/state';
import { navigate } from '../router';
import { el } from '../utils';

const TIMER_PRESETS_MIN = [20, 30, 45, 60, 90];

export function NowPlayingBar(): HTMLElement {
  const bar = el('div', { class: 'now-playing-bar now-playing-bar--hidden' });

  // ── Main row ──────────────────────────────────────────────────────────────
  const mainRow = el('div', { class: 'now-playing__main' });

  const backLink  = el('button', { class: 'now-playing__back' }, '↩ Back');
  const titleEl   = el('span',   { class: 'now-playing__title' });
  const btnToggle = el('button', { class: 'now-playing__btn' }, '⏸');
  const btnStop   = el('button', { class: 'now-playing__btn now-playing__btn--stop' }, '⏹');
  const btnSnooze = el('button', { class: 'now-playing__btn now-playing__snooze-btn now-playing__snooze-btn--hidden' }, '+15m');
  const btnTimer  = el('button', { class: 'now-playing__btn now-playing__timer-btn', title: 'Sleep timer' }, '⏱');

  mainRow.append(backLink, titleEl, btnToggle, btnStop, btnSnooze, btnTimer);

  // ── Timer picker row ──────────────────────────────────────────────────────
  const pickerRow = el('div', { class: 'now-playing__picker now-playing__picker--hidden' });
  pickerRow.append(el('span', { class: 'now-playing__picker-label' }, 'Stop after:'));

  for (const mins of TIMER_PRESETS_MIN) {
    const chip = el('button', { class: 'now-playing__preset' }, `${mins}m`);
    chip.addEventListener('click', () => startTimer(mins));
    pickerRow.append(chip);
  }

  const cancelChip = el('button', { class: 'now-playing__preset now-playing__preset--cancel' }, '✕ off');
  cancelChip.addEventListener('click', () => { clearTimer(); closePicker(); });
  pickerRow.append(cancelChip);

  bar.append(mainRow, pickerRow);

  // ── Timer state ───────────────────────────────────────────────────────────
  let timerEnd: number | null = null;
  let timerIntervalId: number | null = null;
  let pickerOpen = false;

  function formatRemaining(ms: number): string {
    const totalSecs = Math.max(0, Math.ceil(ms / 1000));
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  }

  function startTimer(minutes: number): void {
    clearTimer();
    timerEnd = Date.now() + minutes * 60 * 1000;
    timerIntervalId = window.setInterval(tick, 1000);
    closePicker();
    syncTimerUI();
  }

  function clearTimer(): void {
    if (timerIntervalId !== null) { window.clearInterval(timerIntervalId); timerIntervalId = null; }
    timerEnd = null;
    syncTimerUI();
  }

  function tick(): void {
    if (!timerEnd) return;
    if (Date.now() >= timerEnd) { stopPlaying(); clearTimer(); }
    else syncTimerUI();
  }

  function syncTimerUI(): void {
    if (timerEnd) {
      btnTimer.textContent = formatRemaining(timerEnd - Date.now());
      btnTimer.classList.add('now-playing__timer-btn--active');
      btnSnooze.classList.remove('now-playing__snooze-btn--hidden');
    } else {
      btnTimer.textContent = '⏱';
      btnTimer.classList.remove('now-playing__timer-btn--active');
      btnSnooze.classList.add('now-playing__snooze-btn--hidden');
    }
  }

  function closePicker(): void {
    pickerOpen = false;
    pickerRow.classList.add('now-playing__picker--hidden');
  }

  // ── Event listeners ───────────────────────────────────────────────────────
  btnToggle.addEventListener('click', () => {
    const s = getState();
    if (!s) return;
    if (s.paused) { resumePlaying(); btnToggle.textContent = '⏸'; }
    else          { pausePlaying();  btnToggle.textContent = '▶'; }
  });

  btnStop.addEventListener('click', () => { clearTimer(); stopPlaying(); });

  backLink.addEventListener('click', () => {
    const s = getState();
    if (s) navigate(`play/${s.meta.extId}`);
  });

  btnTimer.addEventListener('click', () => {
    pickerOpen = !pickerOpen;
    pickerRow.classList.toggle('now-playing__picker--hidden', !pickerOpen);
  });

  btnSnooze.addEventListener('click', () => {
    if (timerEnd) { timerEnd += 15 * 60 * 1000; syncTimerUI(); }
  });

  // ── State subscription ────────────────────────────────────────────────────
  function render(): void {
    const s = getState();
    if (!s) {
      bar.classList.add('now-playing-bar--hidden');
      clearTimer();
      closePicker();
      return;
    }
    bar.classList.remove('now-playing-bar--hidden');
    titleEl.textContent = s.meta.title;
    btnToggle.textContent = s.paused ? '▶' : '⏸';
    syncTimerUI();
  }

  subscribe(render);
  return bar;
}
