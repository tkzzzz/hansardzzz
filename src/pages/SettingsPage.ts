import { getSettings, saveSettings, OPENAI_VOICES } from '../settings';
import { el } from '../utils';

export function SettingsPage(): HTMLElement {
  const page = el('div', { class: 'page settings-page' });
  const settings = getSettings();

  page.append(el('h2', { class: 'page-heading' }, 'Settings'));

  // ── API Key ──────────────────────────────────────────────────────────────────
  const keySection = el('section', { class: 'settings-section' });
  keySection.append(el('h3', { class: 'settings-heading' }, 'OpenAI voice (optional)'));

  const hasKey = !!settings.apiKey;

  const callout = el('div', { class: `settings-callout ${hasKey ? 'settings-callout--active' : ''}` });
  callout.append(
    el('p', { class: 'settings-callout__title' },
      hasKey ? '✓ Human-quality voices enabled' : 'Enable human-quality voices'),
    el('p', { class: 'settings-callout__body' },
      hasKey
        ? 'Your OpenAI API key is saved. Voices are read aloud using OpenAI TTS.'
        : 'By default the app uses your device\'s built-in text-to-speech, which can sound robotic. '
        + 'Adding an OpenAI API key unlocks natural, human-sounding voices — much better for falling asleep to.'),
  );
  keySection.append(callout);

  if (!hasKey) {
    const steps = el('ol', { class: 'settings-steps' });
    [
      ['Go to ', 'platform.openai.com', 'https://platform.openai.com', ' and sign in or create a free account.'],
      ['Navigate to ', 'API Keys', null, ' in the left sidebar and click ', 'Create new secret key', null, '.'],
      ['Copy the key — it starts with ', 'sk-…', null, '.'],
      ['Paste it in the field below and click ', 'Save settings', null, '.'],
    ].forEach((parts) => {
      const li = el('li', { class: 'settings-step' });
      for (const part of parts) {
        if (typeof part === 'string' && part.startsWith('http')) continue; // handled as href
        li.append(String(part));
      }
      // Rebuild properly
      li.replaceChildren();
      steps.append(li);
    });

    // Build steps manually for clean output
    steps.replaceChildren();

    const step1 = el('li', { class: 'settings-step' });
    const link1 = el('a', { class: 'settings-link', href: 'https://platform.openai.com', target: '_blank' } as Partial<HTMLAnchorElement>, 'platform.openai.com');
    step1.append('Go to ', link1, ' and sign in or create a free account.');
    steps.append(step1);

    const step2 = el('li', { class: 'settings-step' });
    step2.append('Navigate to ', el('strong', {}, 'API Keys'), ' in the left sidebar and click ', el('strong', {}, '+ Create new secret key'), '.');
    steps.append(step2);

    const step3 = el('li', { class: 'settings-step' });
    step3.append('Copy the key — it starts with ', el('code', { class: 'settings-code' }, 'sk-…'), '.');
    steps.append(step3);

    const step4 = el('li', { class: 'settings-step' });
    step4.append('Paste it in the field below and click ', el('strong', {}, 'Save settings'), '.');
    steps.append(step4);

    keySection.append(steps);

    keySection.append(
      el('p', { class: 'settings-hint' },
        '💷 Cost: roughly £0.01–0.03 per debate (billed by OpenAI per character of text). A long debate costs pennies.'),
    );
  }

  const keyInput = el('input', {
    class: 'form-input settings-key-input',
    type: 'password',
    placeholder: 'sk-…',
    value: settings.apiKey,
  } as Partial<HTMLInputElement>);

  const keyToggle = el('button', { class: 'settings-toggle-btn', type: 'button' }, 'Show');
  keyToggle.addEventListener('click', () => {
    const isHidden = keyInput.type === 'password';
    keyInput.type = isHidden ? 'text' : 'password';
    keyToggle.textContent = isHidden ? 'Hide' : 'Show';
  });

  keySection.append(el('div', { class: 'settings-row' }, keyInput, keyToggle));

  const keyStatus = el('p', { class: 'settings-status' });
  if (hasKey) keyStatus.textContent = 'Key saved.';
  keySection.append(keyStatus);

  // ── Voice ────────────────────────────────────────────────────────────────────
  const voiceSection = el('section', { class: 'settings-section' });
  voiceSection.append(el('h3', { class: 'settings-heading' }, 'Voice'));

  if (!hasKey) {
    voiceSection.append(
      el('p', { class: 'settings-hint' }, 'Add an API key above to unlock OpenAI voices.'),
    );
  }

  const voiceGrid = el('div', { class: `voice-grid ${!hasKey ? 'voice-grid--locked' : ''}` });
  for (const v of OPENAI_VOICES) {
    const card = el('label', { class: 'voice-card' });
    const radio = el('input', {
      type: 'radio',
      name: 'voice',
      value: v.id,
      checked: settings.voice === v.id,
      disabled: !hasKey,
    } as Partial<HTMLInputElement>);
    card.append(
      radio,
      el('span', { class: 'voice-card__name' }, v.label),
      el('span', { class: 'voice-card__desc' }, v.description),
    );
    if (settings.voice === v.id) card.classList.add('voice-card--selected');
    radio.addEventListener('change', () => {
      voiceGrid.querySelectorAll('.voice-card--selected').forEach((c) =>
        c.classList.remove('voice-card--selected'),
      );
      card.classList.add('voice-card--selected');
    });
    voiceGrid.append(card);
  }
  voiceSection.append(voiceGrid);

  // ── Model ────────────────────────────────────────────────────────────────────
  const modelSection = el('section', { class: 'settings-section' });
  modelSection.append(el('h3', { class: 'settings-heading' }, 'Model'));
  modelSection.append(
    el('p', { class: 'settings-hint' },
      'tts-1-hd sounds noticeably better; tts-1 responds faster and costs half as much.'),
  );

  const modelSelect = el('select', { class: 'form-select', disabled: !hasKey } as Partial<HTMLSelectElement>);
  for (const [value, label] of [
    ['tts-1-hd', 'tts-1-hd — high quality (recommended)'],
    ['tts-1',    'tts-1 — faster, cheaper'],
  ] as const) {
    const opt = el('option', { value }, label);
    if (settings.model === value) opt.selected = true;
    modelSelect.append(opt);
  }
  modelSection.append(modelSelect);

  // ── Speed ────────────────────────────────────────────────────────────────────
  const speedSection = el('section', { class: 'settings-section' });
  speedSection.append(el('h3', { class: 'settings-heading' }, 'Default speed'));

  const speedValue = el('span', { class: 'tts-rate-value' }, String(settings.speed.toFixed(2)));
  const speedSlider = el('input', {
    class: 'tts-slider',
    type: 'range',
    min: '0.5',
    max: '1.5',
    step: '0.05',
    value: String(settings.speed),
  } as Partial<HTMLInputElement>);
  speedSlider.addEventListener('input', () => {
    speedValue.textContent = parseFloat(speedSlider.value).toFixed(2);
  });
  speedSection.append(el('div', { class: 'settings-row' }, speedSlider, speedValue, el('span', {}, 'x')));

  // ── Save ─────────────────────────────────────────────────────────────────────
  const saveBtn = el('button', { class: 'search-btn settings-save-btn' }, 'Save settings');
  const saveStatus = el('p', { class: 'settings-status' });

  saveBtn.addEventListener('click', () => {
    const chosenVoice = voiceGrid.querySelector<HTMLInputElement>('input[name="voice"]:checked');
    saveSettings({
      apiKey: keyInput.value.trim(),
      voice: (chosenVoice?.value ?? 'onyx') as ReturnType<typeof getSettings>['voice'],
      model: modelSelect.value as ReturnType<typeof getSettings>['model'],
      speed: parseFloat(speedSlider.value),
    });
    keyStatus.textContent = keyInput.value.trim() ? 'Key saved.' : '';
    saveStatus.textContent = '✓ Settings saved.';
    setTimeout(() => { saveStatus.textContent = ''; }, 2500);
  });

  page.append(keySection, voiceSection, modelSection, speedSection, saveBtn, saveStatus);
  return page;
}
