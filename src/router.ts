export type Route =
  | { name: 'home' }
  | { name: 'browse' }
  | { name: 'search' }
  | { name: 'settings' }
  | { name: 'updates' }
  | { name: 'play'; extId: string };

export function parseHash(hash: string): Route {
  const path = hash.replace(/^#\/?/, '');
  if (!path || path === 'home') return { name: 'home' };
  if (path.startsWith('play/')) {
    return { name: 'play', extId: path.slice(5) };
  }
  if (path === 'search') return { name: 'search' };
  if (path === 'settings') return { name: 'settings' };
  if (path === 'updates') return { name: 'updates' };
  if (path === 'browse') return { name: 'browse' };
  return { name: 'home' };
}

export function navigate(path: string): void {
  window.location.hash = path;
}

export function onRouteChange(handler: (route: Route) => void): void {
  window.addEventListener('hashchange', () => handler(parseHash(window.location.hash)));
  handler(parseHash(window.location.hash));
}
