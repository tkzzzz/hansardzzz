import { getLastSittingDate, getSectionsForDay, getSectionTrees } from '../api/hansard';
import { el } from '../utils';
import { navigate } from '../router';

const HANSARD_START_YEAR = 1803;

export async function BrowsePage(): Promise<HTMLElement> {
  const page = el('div', { class: 'page browse-page' });
  const heading = el('h2', {}, 'Browse debates');
  page.append(heading);

  const form = el('div', { class: 'browse-form' });

  const houseLabel = el('label', { class: 'form-label' }, 'House ');
  const houseSelect = el('select', { class: 'form-select' });
  houseSelect.append(el('option', { value: 'Commons' }, 'Commons'), el('option', { value: 'Lords' }, 'Lords'));
  houseLabel.append(houseSelect);

  const currentYear = new Date().getFullYear();

  const yearLabel = el('label', { class: 'form-label' }, 'Year ');
  const yearInput = el('input', {
    class: 'form-input form-input--year',
    type: 'number',
    min: String(HANSARD_START_YEAR),
    max: String(currentYear),
    step: '1',
  } as Partial<HTMLInputElement>);
  yearLabel.append(yearInput);

  const dateLabel = el('label', { class: 'form-label' }, 'Date ');
  const dateInput = el('input', {
    class: 'form-input',
    type: 'date',
    min: `${HANSARD_START_YEAR}-01-01`,
    max: new Date().toISOString().split('T')[0],
  } as Partial<HTMLInputElement>);
  dateLabel.append(dateInput);

  const sectionLabel = el('label', { class: 'form-label' }, 'Section ');
  const sectionSelect = el('select', { class: 'form-select' });
  sectionSelect.disabled = true;
  sectionLabel.append(sectionSelect);

  const debateList = el('div', { class: 'debate-list' });
  const status = el('p', { class: 'status' }, 'Loading last sitting date…');

  form.append(houseLabel, yearLabel, dateLabel, sectionLabel);
  page.append(form, status, debateList);

  // Keep year input in sync when date changes
  function syncYearFromDate(): void {
    const val = dateInput.value;
    if (val) yearInput.value = val.split('-')[0];
  }

  async function loadSections(): Promise<void> {
    const date = dateInput.value;
    const house = houseSelect.value;
    if (!date) return;

    syncYearFromDate();
    status.textContent = 'Loading sections…';
    sectionSelect.disabled = true;
    debateList.replaceChildren();

    try {
      const sections = await getSectionsForDay(date, house);
      sectionSelect.replaceChildren();
      if (sections.length === 0) {
        sectionSelect.append(el('option', {}, 'No sitting on this date'));
        status.textContent = 'Parliament did not sit on this date. Try a nearby weekday.';
        return;
      }
      for (const s of sections) {
        sectionSelect.append(el('option', { value: s }, s));
      }
      sectionSelect.disabled = false;
      status.textContent = '';
      await loadDebates();
    } catch {
      status.textContent = 'Could not load sections for this date.';
    }
  }

  async function loadDebates(): Promise<void> {
    const date = dateInput.value;
    const house = houseSelect.value;
    const section = sectionSelect.value;
    if (!date || !section) return;

    status.textContent = 'Loading debates…';
    debateList.replaceChildren();

    try {
      const trees = await getSectionTrees(date, house, section);
      if (trees.length === 0) {
        status.textContent = 'No debates found for this section.';
        return;
      }
      status.textContent = '';

      for (const item of trees) {
        const btn = el('button', { class: 'debate-list__item' }, item.Title);
        btn.addEventListener('click', () => navigate(`play/${item.ExternalId}`));
        debateList.append(btn);
      }
    } catch {
      status.textContent = 'Could not load debates.';
    }
  }

  yearInput.addEventListener('change', () => {
    const y = parseInt(yearInput.value, 10);
    if (isNaN(y) || y < HANSARD_START_YEAR || y > currentYear) return;
    // Set date to Nov 5 of that year (a reliable sitting day in most years) then load
    const month = y === currentYear ? new Date().toISOString().split('T')[0].slice(5) : '11-05';
    dateInput.value = `${y}-${month}`;
    loadSections();
  });

  dateInput.addEventListener('change', loadSections);
  houseSelect.addEventListener('change', loadSections);
  sectionSelect.addEventListener('change', loadDebates);

  try {
    const lastDate = await getLastSittingDate(houseSelect.value);
    dateInput.value = lastDate;
    yearInput.value = lastDate.split('-')[0];
    await loadSections();
  } catch {
    status.textContent = 'Could not fetch the latest sitting date.';
  }

  return page;
}
