import type {
  SearchDebatesResult,
  SearchContributionsResult,
  Debate,
  SectionTreeItem,
  SectionTreeSection,
} from './types';

const BASE_URL = '/api';

async function apiFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(BASE_URL + path, window.location.origin);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`API error ${res.status}: ${url}`);
  return res.json() as Promise<T>;
}

export async function getLastSittingDate(house: string): Promise<string> {
  const raw = await apiFetch<string>('/overview/lastsittingdate.json', { house });
  return (raw as unknown as string).split('T')[0];
}

export async function getSectionsForDay(date: string, house: string): Promise<string[]> {
  return apiFetch<string[]>('/overview/sectionsforday.json', { date, house });
}

export async function getSectionTrees(
  date: string,
  house: string,
  section: string,
): Promise<SectionTreeItem[]> {
  const sections = await apiFetch<SectionTreeSection[]>('/overview/sectiontrees.json', {
    date,
    house,
    section,
  });
  // Flatten all SectionTreeItems from all sections, excluding the root item (ParentId === null)
  return sections.flatMap((s) => s.SectionTreeItems.filter((i) => i.ParentId !== null));
}

export async function searchDebates(
  searchTerm: string,
  house: string,
  skip: number,
  take: number,
): Promise<SearchDebatesResult> {
  return apiFetch<SearchDebatesResult>('/search/debates.json', {
    searchTerm,
    house,
    skip: String(skip),
    take: String(take),
  });
}

export async function searchContributions(
  searchTerm: string,
  house: string,
  skip: number,
  take: number,
): Promise<SearchContributionsResult> {
  return apiFetch<SearchContributionsResult>('/search/contributions/Spoken.json', {
    searchTerm,
    house,
    skip: String(skip),
    take: String(take),
  });
}

export async function getDebate(extId: string): Promise<Debate> {
  return apiFetch<Debate>(`/debates/debate/${extId}.json`);
}
