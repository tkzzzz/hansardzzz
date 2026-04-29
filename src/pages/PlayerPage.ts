import { getDebate } from '../api/hansard';
import type { Debate, DebateItem } from '../api/types';
import { ContributionList, highlightContribution } from '../components/ContributionList';
import { TtsControls, markPlayDone, markReady } from '../components/TtsControls';
import { speakSequence, stripHtml, stripParentheticals } from '../tts/speech';
import type { TtsController, TtsOptions } from '../tts/speech';
import { speakSequenceOpenAi } from '../tts/openai';
import { hasApiKey, getSettings } from '../settings';
import { startPlaying, stopPlaying, markDone, getState } from '../tts/state';
import { el, formatDate, estimateListeningTime, countWords } from '../utils';

export async function PlayerPage(extId: string): Promise<HTMLElement> {
  const page = el('div', { class: 'page player-page' });
  const status = el('p', { class: 'status' }, 'Loading debate…');
  page.append(status);

  let controller: TtsController | null = null;
  const ttsOptions: TtsOptions = { rate: getSettings().speed, pitch: 1.0, voice: null };
  let selectedIndex: number | null = null;
  const errorBanner   = el('p', { class: 'status status--error' });
  const loadingBanner = el('p', { class: 'status status--loading' }, '⏳ Fetching audio from OpenAI…');
  loadingBanner.hidden = true;

  if (getState()) stopPlaying();

  try {
    const debate = await getDebate(extId);
    const contributions = collectContributions(debate);

    if (contributions.length === 0) {
      status.textContent = 'This debate has no spoken contributions.';
      return page;
    }

    status.replaceWith(el('span'));

    const totalWords = contributions.reduce(
      (sum, c) => sum + countWords(stripHtml(c.Value)), 0,
    );

    const shareBtn = el('button', { class: 'player-share-btn', title: 'Share this debate' }, '↗');
    shareBtn.addEventListener('click', async () => {
      const shareData = {
        title: debate.Overview.Title,
        text: `"${debate.Overview.Title}" — listen on Hansardzzz, the parliamentary sleep aid.`,
        url: window.location.href,
      };
      if (navigator.share) {
        await navigator.share(shareData).catch(() => {});
      } else {
        await navigator.clipboard.writeText(window.location.href).catch(() => {});
        shareBtn.textContent = '✓';
        setTimeout(() => { shareBtn.textContent = '↗'; }, 2000);
      }
    });

    const titleEl   = el('h2', { class: 'player-title' }, debate.Overview.Title);
    const durationEl = el('span', { class: 'player-duration' },
      estimateListeningTime(totalWords, ttsOptions.rate));
    const metaEl    = el('p', { class: 'player-meta' },
      `${debate.Overview.House} · ${debate.Overview.Location} · ${formatDate(debate.Overview.Date)} · `,
      durationEl,
    );
    const header = el('header', { class: 'player-header' }, titleEl, metaEl, shareBtn);

    let listEl: HTMLElement = ContributionList(contributions, (i) => { selectedIndex = i; });
    const listWrapper = el('div');
    listWrapper.append(listEl);

    // Declared before startSpeaking/advance so closures can reference it
    let controls!: HTMLElement;

    function startSpeaking(d: Debate, contribs: DebateItem[]): void {
      const texts = buildTexts(contribs, selectedIndex);
      const startIndex = selectedIndex ?? 0;
      selectedIndex = null;
      const meta = { title: d.Overview.Title, extId: d.Overview.ExtId };

      function handleDone(): void {
        const nextId = d.Overview.NextDebateExtId;
        if (nextId) {
          advance(nextId);
        } else {
          markPlayDone(controls);
          markDone();
        }
      }

      if (hasApiKey()) {
        const s = getSettings();
        let firstChunk = true;
        loadingBanner.hidden = false;
        controller = speakSequenceOpenAi(
          texts,
          { apiKey: s.apiKey, voice: s.voice, model: s.model, speed: ttsOptions.rate },
          (i) => {
            if (firstChunk) { firstChunk = false; markReady(controls); loadingBanner.hidden = true; }
            highlightContribution(listEl, i < 0 ? -1 : startIndex + i);
          },
          (msg) => {
            loadingBanner.hidden = true;
            errorBanner.textContent = `TTS error: ${msg}. Check your API key in Settings.`;
            markPlayDone(controls);
            markDone();
          },
          handleDone,
        );
      } else {
        controller = speakSequence(
          texts,
          ttsOptions,
          (i) => {
            if (i === 0) markReady(controls);
            highlightContribution(listEl, i < 0 ? -1 : startIndex + i);
          },
          handleDone,
        );
      }
      startPlaying(controller, meta);
    }

    async function advance(nextExtId: string): Promise<void> {
      try {
        const nextDebate = await getDebate(nextExtId);
        const nextContribs = collectContributions(nextDebate);
        if (nextContribs.length === 0) {
          const after = nextDebate.Overview.NextDebateExtId;
          if (after) { advance(after); return; }
          markPlayDone(controls);
          markDone();
          return;
        }
        const nextWords = nextContribs.reduce((sum, c) => sum + countWords(stripHtml(c.Value)), 0);
        titleEl.textContent      = nextDebate.Overview.Title;
        durationEl.textContent   = estimateListeningTime(nextWords, ttsOptions.rate);
        metaEl.replaceChildren(
          `${nextDebate.Overview.House} · ${nextDebate.Overview.Location} · ${formatDate(nextDebate.Overview.Date)} · `,
          durationEl,
        );
        const newList = ContributionList(nextContribs, (i) => { selectedIndex = i; });
        listWrapper.replaceChildren(newList);
        listEl = newList;
        startSpeaking(nextDebate, nextContribs);
      } catch {
        markPlayDone(controls);
        markDone();
      }
    }

    controls = TtsControls(
      { rate: ttsOptions.rate, voice: null, playing: false, paused: false },
      {
        onPlay() {
          errorBanner.textContent = '';
          loadingBanner.hidden = true;
          startSpeaking(debate, contributions);
        },
        onPause()  { controller?.pause(); },
        onResume() { controller?.resume(); },
        onStop()   { stopPlaying(); controller = null; loadingBanner.hidden = true; },
        onRateChange(r) { ttsOptions.rate = r; durationEl.textContent = estimateListeningTime(totalWords, r); },
        onVoiceChange(v) { ttsOptions.voice = v; },
      },
    );

    page.append(header, errorBanner, loadingBanner, listWrapper, controls);
  } catch {
    status.textContent = 'Could not load this debate. It may not exist or the API is unavailable.';
  }

  return page;
}

export function collectContributions(debate: Debate): DebateItem[] {
  const direct = debate.Items.filter(
    (i): i is DebateItem => i.ItemType === 'Contribution' && i.AttributedTo !== null,
  );
  const fromChildren = debate.ChildDebates?.flatMap(collectContributions) ?? [];
  return [...direct, ...fromChildren];
}

function buildTexts(contributions: DebateItem[], fromIndex: number | null): string[] {
  const slice = fromIndex !== null ? contributions.slice(fromIndex) : contributions;
  return slice.map(
    (c) => `${stripParentheticals(c.AttributedTo!)}. ${stripHtml(c.Value)}`,
  );
}
