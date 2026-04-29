import './style.css';
import { onRouteChange } from './router';
import { LandingPage } from './pages/LandingPage';
import { BrowsePage } from './pages/BrowsePage';
import { SearchPage } from './pages/SearchPage';
import { PlayerPage } from './pages/PlayerPage';
import { SettingsPage } from './pages/SettingsPage';
import { UpdatesPage } from './pages/UpdatesPage';
import { NowPlayingBar } from './components/NowPlayingBar';
import { el } from './utils';

const app = document.getElementById('app')!;

function renderNav(): HTMLElement {
  const nav = el('nav', { class: 'app-nav' });

  const logo = el('a', { class: 'app-logo' } as Partial<HTMLAnchorElement>, 'Hansardzzz 💤');
  (logo as HTMLAnchorElement).href = '#/';

  const links = [
    ['Browse',   '#/browse'],
    ['Search',   '#/search'],
    ['Updates',  '#/updates'],
    ['Settings', '#/settings'],
  ] as const;

  const navLinks = links.map(([text, href]) => {
    const a = el('a', {} as Partial<HTMLAnchorElement>, text);
    (a as HTMLAnchorElement).href = href;
    return a;
  });

  nav.append(logo, ...navLinks);
  return nav;
}

function renderFooter(): HTMLElement {
  const footer = el('footer', { class: 'app-footer' });

  const kofi = el('a',
    { class: 'kofi-link', href: 'https://ko-fi.com/atkzz', target: '_blank' } as Partial<HTMLAnchorElement>,
    '☕ Support on Ko-fi',
  );

  const updates = el('a',
    { class: 'footer-link', href: '#/updates' } as Partial<HTMLAnchorElement>,
    "What's new",
  );

  footer.append(kofi, el('span', { class: 'footer-sep' }, '·'), updates);
  return footer;
}

const nav = renderNav();
const nowPlayingBar = NowPlayingBar();
const main = document.createElement('main');
main.className = 'app-main';
const footer = renderFooter();
app.append(nav, nowPlayingBar, main, footer);

onRouteChange(async (route) => {
  main.replaceChildren();
  const loading = document.createElement('p');
  loading.className = 'status';
  loading.textContent = 'Loading…';
  main.append(loading);

  let page: HTMLElement;

  if (route.name === 'home') {
    page = LandingPage();
  } else if (route.name === 'browse') {
    page = await BrowsePage();
  } else if (route.name === 'search') {
    page = SearchPage();
  } else if (route.name === 'settings') {
    page = SettingsPage();
  } else if (route.name === 'updates') {
    page = UpdatesPage();
  } else {
    page = await PlayerPage(route.extId);
  }

  main.replaceChildren(page);
});

// Initial route is handled by onRouteChange above; empty hash → home via parseHash
