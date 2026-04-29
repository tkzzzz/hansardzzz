import type { DebateSearchItem } from '../api/types';
import { el, formatDate } from '../utils';
import { navigate } from '../router';

export function DebateCard(item: DebateSearchItem): HTMLElement {
  const card = el('article', { class: 'debate-card' });

  const title = el('h3', { class: 'debate-card__title' }, item.Title);
  const meta = el(
    'p',
    { class: 'debate-card__meta' },
    `${item.House} · ${item.DebateSection} · ${formatDate(item.SittingDate)}`,
  );
  const btn = el('button', { class: 'debate-card__btn' }, 'Read me to sleep →');

  btn.addEventListener('click', () => navigate(`play/${item.DebateSectionExtId}`));

  card.append(title, meta, btn);
  return card;
}
