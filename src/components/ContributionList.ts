import type { DebateItem } from '../api/types';
import { el } from '../utils';
import { stripHtml, stripParentheticals } from '../tts/speech';

export function ContributionList(
  items: DebateItem[],
  onSelect: (index: number) => void,
): HTMLElement {
  const list = el('ol', { class: 'contribution-list' });

  items.forEach((item, i) => {
    const speaker = el(
      'span',
      { class: 'contribution__speaker' },
      item.AttributedTo ? stripParentheticals(item.AttributedTo) : '',
    );
    const text = el('p', { class: 'contribution__text' }, stripHtml(item.Value));
    const li = el('li', { class: 'contribution', id: `contribution-${i}` }, speaker, text);

    li.addEventListener('click', () => {
      list.querySelectorAll('.contribution--selected').forEach((el) =>
        el.classList.remove('contribution--selected'),
      );
      li.classList.add('contribution--selected');
      onSelect(i);
    });

    list.append(li);
  });

  return list;
}

export function highlightContribution(list: HTMLElement, index: number): void {
  list.querySelectorAll('.contribution--active').forEach((el) =>
    el.classList.remove('contribution--active'),
  );
  if (index < 0) return;
  const target = list.querySelector(`#contribution-${index}`);
  if (target) {
    target.classList.add('contribution--active');
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}
