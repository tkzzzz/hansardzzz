import { searchDebates } from '../api/hansard';
import { DebateCard } from '../components/DebateCard';
import { el } from '../utils';

const PAGE_SIZE = 10;

const SUGGESTIONS = ['housing', 'NHS', 'climate', 'Brexit', 'education', 'defence', 'taxation'];

export function SearchPage(): HTMLElement {
  const page = el('div', { class: 'page search-page' });

  page.append(
    el('h2', { class: 'page-heading' }, 'Search debates'),
    el('p', { class: 'search-description' },
      'Search by topic, keyword, or proper noun to find debates by title. '
      + 'Covers Commons and Lords records back to 1803.'),
  );

  const form = el('form', { class: 'search-form' });
  const input = el('input', {
    class: 'search-input',
    type: 'search',
    placeholder: 'e.g. "railways" or "Margaret Thatcher"…',
    autocomplete: 'off',
  } as Partial<HTMLInputElement>);
  const houseSelect = el('select', { class: 'form-select' });
  houseSelect.append(
    el('option', { value: '' }, 'Both houses'),
    el('option', { value: 'Commons' }, 'Commons'),
    el('option', { value: 'Lords' }, 'Lords'),
  );
  const submitBtn = el('button', { class: 'search-btn', type: 'submit' }, 'Search');
  form.append(input, houseSelect, submitBtn);

  const suggestions = el('div', { class: 'search-suggestions' });
  suggestions.append(el('span', { class: 'search-suggestions__label' }, 'Try: '));
  for (const term of SUGGESTIONS) {
    const chip = el('button', { class: 'search-chip', type: 'button' }, term);
    chip.addEventListener('click', () => {
      input.value = term;
      doSearch(term, houseSelect.value, 0);
    });
    suggestions.append(chip);
  }

  const status = el('p', { class: 'status' });
  const results = el('div', { class: 'search-results' });
  const pagination = el('div', { class: 'pagination' });

  let currentSkip = 0;
  let totalCount = 0;
  let lastTerm = '';
  let lastHouse = '';

  async function doSearch(term: string, house: string, skip: number): Promise<void> {
    status.textContent = 'Searching…';
    results.replaceChildren();
    pagination.replaceChildren();
    suggestions.style.display = 'none';

    try {
      const data = await searchDebates(term, house, skip, PAGE_SIZE);
      totalCount = data.TotalResultCount;
      currentSkip = skip;
      lastTerm = term;
      lastHouse = house;

      if (data.Results.length === 0) {
        status.textContent = `No debates found for "${term}".`;
        suggestions.style.display = '';
        return;
      }

      const houseLabel = house ? `${house} ` : '';
      status.textContent = `${totalCount.toLocaleString()} ${houseLabel}debate${totalCount === 1 ? '' : 's'} found`;

      for (const item of data.Results) {
        results.append(DebateCard(item));
      }

      if (currentSkip > 0) {
        const prev = el('button', { class: 'pagination__btn' }, '← Previous');
        prev.addEventListener('click', () => doSearch(lastTerm, lastHouse, currentSkip - PAGE_SIZE));
        pagination.append(prev);
      }
      if (currentSkip + PAGE_SIZE < totalCount) {
        const next = el('button', { class: 'pagination__btn' }, 'Next →');
        next.addEventListener('click', () => doSearch(lastTerm, lastHouse, currentSkip + PAGE_SIZE));
        pagination.append(next);
      }
    } catch {
      status.textContent = 'Search failed. Please try again.';
    }
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const term = input.value.trim();
    if (!term) return;
    doSearch(term, houseSelect.value, 0);
  });

  page.append(form, suggestions, status, results, pagination);
  return page;
}
