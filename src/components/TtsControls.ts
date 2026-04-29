import { loadVoices } from '../tts/speech';
import { hasApiKey, getSettings, OPENAI_VOICES } from '../settings';
import { el } from '../utils';

export interface TtsState {
  rate: number;
  voice: SpeechSynthesisVoice | null;
  playing: boolean;
  paused: boolean;
}

export interface TtsControlsCallbacks {
  onPlay: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onRateChange: (rate: number) => void;
  onVoiceChange: (voice: SpeechSynthesisVoice) => void;
}

export function TtsControls(state: TtsState, cb: TtsControlsCallbacks): HTMLElement {
  const wrapper = el('div', { class: 'tts-controls' });

  const btnPlay  = el('button', { class: 'tts-btn tts-btn--play',  title: 'Play'  }, '▶ Play');
  const btnPause = el('button', { class: 'tts-btn tts-btn--pause', title: 'Pause' }, '⏸ Pause');
  const btnStop  = el('button', { class: 'tts-btn tts-btn--stop',  title: 'Stop'  }, '⏹ Stop');
  btnPause.disabled = true;
  btnStop.disabled  = true;

  btnPlay.addEventListener('click', () => {
    if (state.paused) {
      cb.onResume();
      btnPlay.disabled  = true;
      btnPause.disabled = false;
    } else {
      cb.onPlay();
      btnPlay.disabled  = true;
      btnPause.disabled = false;
      btnStop.disabled  = false;
    }
  });

  btnPause.addEventListener('click', () => {
    cb.onPause();
    btnPlay.disabled      = false;
    btnPlay.textContent   = '▶ Resume';
    btnPause.disabled     = true;
  });

  btnStop.addEventListener('click', () => {
    cb.onStop();
    btnPlay.disabled    = false;
    btnPlay.textContent = '▶ Play';
    btnPause.disabled   = true;
    btnStop.disabled    = true;
  });

  const settings = getSettings();

  // Speed — always shown, but label changes to reflect which engine controls it
  const rateLabel = el('label', { class: 'tts-label' }, 'Speed: ');
  const rateValue = el('span', { class: 'tts-rate-value' }, String(settings.speed.toFixed(2)));
  const rateSlider = el('input', {
    class: 'tts-slider',
    type: 'range',
    min: '0.5',
    max: '1.5',
    step: '0.05',
    value: String(settings.speed),
  } as Partial<HTMLInputElement>);
  rateSlider.addEventListener('input', () => {
    const r = parseFloat(rateSlider.value);
    rateValue.textContent = r.toFixed(2);
    cb.onRateChange(r);
  });
  rateLabel.append(rateSlider, ' ', rateValue, 'x');

  // Voice selector — OpenAI voices if key is set, browser voices otherwise
  const voiceLabel = el('label', { class: 'tts-label' });
  const voiceSelect = el('select', { class: 'tts-select' });

  if (hasApiKey()) {
    voiceLabel.append('Voice: ', voiceSelect);
    for (const v of OPENAI_VOICES) {
      const opt = el('option', { value: v.id }, v.label);
      if (v.id === settings.voice) opt.selected = true;
      voiceSelect.append(opt);
    }
    // OpenAI voice changes don't use SpeechSynthesisVoice; handled in PlayerPage via settings
    voiceSelect.addEventListener('change', () => {
      // Persist choice immediately so PlayerPage picks it up on next play
      import('../settings').then(({ saveSettings }) => {
        saveSettings({ voice: voiceSelect.value as ReturnType<typeof getSettings>['voice'] });
      });
    });
  } else {
    voiceLabel.append('Voice: ', voiceSelect);
    voiceSelect.append(el('option', {}, 'Loading…'));
    voiceSelect.disabled = true;
    loadVoices().then((voices) => {
      voiceSelect.replaceChildren();
      const engVoices = voices.filter((v) => v.lang.startsWith('en'));
      const all = engVoices.length > 0 ? engVoices : voices;
      for (const v of all) {
        voiceSelect.append(el('option', { value: v.name }, `${v.name} (${v.lang})`));
      }
      voiceSelect.disabled = false;
      if (all[0]) { state.voice = all[0]; cb.onVoiceChange(all[0]); }
    });
    voiceSelect.addEventListener('change', () => {
      const voices = window.speechSynthesis.getVoices();
      const chosen = voices.find((v) => v.name === voiceSelect.value);
      if (chosen) cb.onVoiceChange(chosen);
    });
  }

  const engineBadge = hasApiKey()
    ? el('span', { class: 'tts-badge tts-badge--openai' }, 'OpenAI')
    : el('span', { class: 'tts-badge tts-badge--browser' }, 'Browser TTS');

  const buttons  = el('div', { class: 'tts-buttons' }, btnPlay, btnPause, btnStop, engineBadge);
  const settings2 = el('div', { class: 'tts-settings' }, rateLabel, voiceLabel);

  wrapper.append(buttons, settings2);
  return wrapper;
}

export function markPlayDone(controls: HTMLElement): void {
  const btnPlay  = controls.querySelector<HTMLButtonElement>('.tts-btn--play');
  const btnPause = controls.querySelector<HTMLButtonElement>('.tts-btn--pause');
  const btnStop  = controls.querySelector<HTMLButtonElement>('.tts-btn--stop');
  if (btnPlay)  { btnPlay.disabled = false; btnPlay.textContent = '▶ Play'; }
  if (btnPause) { btnPause.disabled = true;  btnPause.textContent = '⏸ Pause'; }
  if (btnStop)  btnStop.disabled  = true;
}

export function markLoading(controls: HTMLElement): void {
  const btnPause = controls.querySelector<HTMLButtonElement>('.tts-btn--pause');
  if (btnPause) { btnPause.textContent = '⏳ Loading…'; btnPause.disabled = true; }
}

export function markReady(controls: HTMLElement): void {
  const btnPause = controls.querySelector<HTMLButtonElement>('.tts-btn--pause');
  if (btnPause) { btnPause.textContent = '⏸ Pause'; btnPause.disabled = false; }
}
