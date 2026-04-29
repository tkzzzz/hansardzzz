import { el } from '../utils';

interface Release {
  version: string;
  date: string;
  label?: string;
  changes: string[];
}

const RELEASES: Release[] = [
  {
    version: '1.0',
    date: 'May 2025',
    label: 'Launch',
    changes: [
      'Browse decades of Commons and Lords debates by date, house, and section — back to 1803.',
      'Search Hansard by keyword to find debates on any topic.',
      'Human-quality voices via OpenAI TTS (API key required) or free browser TTS.',
      'Auto-advance: when a debate ends, the next one starts automatically — no fiddling required.',
      'Estimated listening time shown on every debate.',
      'Now Playing bar persists across navigation so you can browse while listening.',
      'Random debate button on the home page — verified to have spoken contributions before sending you there.',
    ],
  },
];

export function UpdatesPage(): HTMLElement {
  const page = el('div', { class: 'page updates-page' });

  page.append(
    el('h2', { class: 'page-heading' }, "What's new"),
    el('p', { class: 'updates-intro' },
      'Hansardzzz is a labour of love. Here\'s what\'s been added over time.'),
  );

  for (const release of RELEASES) {
    const section = el('section', { class: 'updates-release' });

    const badge = release.label
      ? el('span', { class: 'updates-badge' }, release.label)
      : null;

    const heading = el('h3', { class: 'updates-version' });
    heading.append(`v${release.version}`);
    if (badge) heading.append(' ', badge);

    const dateEl = el('p', { class: 'updates-date' }, release.date);

    const list = el('ul', { class: 'updates-list' });
    for (const change of release.changes) {
      list.append(el('li', { class: 'updates-item' }, change));
    }

    section.append(heading, dateEl, list);
    page.append(section);
  }

  return page;
}
