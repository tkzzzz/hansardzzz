import { getSectionsForDay, getSectionTrees, getDebate } from '../api/hansard';
import { navigate } from '../router';
import { el } from '../utils';
import { collectContributions } from './PlayerPage';

const WITTY_LINES = [
  'Sleep faster with the power of parliamentary procedure.',
  'Drift off to the soothing drone of standing orders.',
  'Nothing ends a thought quite like a point of order.',
  'Certified soporific since 1803.',
  'The Lords have been boring people to sleep for centuries. Now it\'s your turn.',
  'Recommended by insomniacs across all party lines.',
  'Filibuster your way to eight hours.',
  'The Hansard record: where urgency goes to die.',
];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDateBetween(startYear: number, endYear: number): string {
  const start = new Date(startYear, 0, 1).getTime();
  const end = new Date(endYear, 11, 31).getTime();
  const d = new Date(start + Math.random() * (end - start));
  return d.toISOString().split('T')[0];
}

async function pickRandomDebate(): Promise<string | null> {
  const houses = ['Commons', 'Lords'];

  for (let attempt = 0; attempt < 10; attempt++) {
    try {
      const house = randomItem(houses);
      const date = randomDateBetween(1803, 2025);
      const sections = await getSectionsForDay(date, house);
      if (!sections.length) continue;

      const section = randomItem(sections);
      const items = await getSectionTrees(date, house, section);
      const debates = items.filter((i) => i.ExternalId);
      if (!debates.length) continue;

      const extId = randomItem(debates).ExternalId;
      const debate = await getDebate(extId);
      if (collectContributions(debate).length === 0) continue;

      return extId;
    } catch {
      // non-sitting day, 404, or API hiccup — try again
    }
  }
  return null;
}

export function LandingPage(): HTMLElement {
  const page = el('div', { class: 'page landing-page' });

  const hero = el('section', { class: 'landing-hero' });

  const eyebrow = el('p', { class: 'landing-eyebrow' }, 'UK Parliamentary Debates · TTS Sleep Aid');

  const title = el('h1', { class: 'landing-title' });
  title.innerHTML = 'Hansard<span class="landing-title__zzz">zzz</span>';

  const tagline = el('p', { class: 'landing-tagline' }, randomItem(WITTY_LINES));

  const btnRandom = el('button', { class: 'landing-btn landing-btn--primary' }, '🎲 Random debate');
  const btnStatus = el('p', { class: 'landing-btn-status' });
  const btnNote   = el('p', { class: 'landing-btn-note' }, 'Plays debate after debate — set a sleep timer to stop automatically.');

  btnRandom.addEventListener('click', async () => {
    btnRandom.disabled = true;
    btnRandom.textContent = 'Finding a debate…';
    btnStatus.textContent = '';

    const extId = await pickRandomDebate();
    if (extId) {
      navigate(`play/${extId}`);
    } else {
      btnRandom.disabled = false;
      btnRandom.textContent = '🎲 Random debate';
      btnStatus.textContent = 'Could not find a debate — try again.';
    }
  });

  const explainer = el('section', { class: 'landing-explainer' });

  const steps: [string, string, string][] = [
    ['📜', 'Browse or search', 'Explore decades of Commons and Lords debates — from urgent questions to lengthy budget readings.'],
    ['▶', 'Press play', 'The app reads contributions aloud, speaker by speaker. Debates chain automatically — one ends, the next begins.'],
    ['💤', 'Fall asleep', 'Set a sleep timer so playback stops once you\'ve drifted off — no credits quietly ticking away while you sleep.'],
  ];

  for (const [icon, heading, body] of steps) {
    const card = el('div', { class: 'landing-step' });
    card.append(
      el('span', { class: 'landing-step__icon' }, icon),
      el('strong', { class: 'landing-step__heading' }, heading),
      el('p', { class: 'landing-step__body' }, body),
    );
    explainer.append(card);
  }

  const nav = el('div', { class: 'landing-nav' });
  const browseLink = el('a', { href: '#/browse', class: 'landing-link' }, 'Browse by date →');
  const searchLink = el('a', { href: '#/search', class: 'landing-link' }, 'Search debates →');
  nav.append(browseLink, searchLink);

  hero.append(eyebrow, title, tagline, btnRandom, btnStatus, btnNote);
  page.append(hero, explainer, nav);

  return page;
}
