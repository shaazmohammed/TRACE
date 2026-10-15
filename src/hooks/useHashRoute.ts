import { useSyncExternalStore } from 'react';

export type Route =
  | { name: 'overview' }
  | { name: 'events' }
  | { name: 'incidents' }
  | { name: 'incident'; id: string };

function parse(hash: string): Route {
  const path = hash.replace(/^#\/?/, '');
  const [section, id] = path.split('/');
  if (section === 'events') return { name: 'events' };
  if (section === 'incidents' && id) return { name: 'incident', id: decodeURIComponent(id) };
  if (section === 'incidents') return { name: 'incidents' };
  return { name: 'overview' };
}

const subscribe = (callback: () => void) => {
  window.addEventListener('hashchange', callback);
  return () => window.removeEventListener('hashchange', callback);
};

export function useHashRoute(): Route {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash);
  return parse(hash);
}

export const routeHref = {
  overview: '#/overview',
  events: '#/events',
  incidents: '#/incidents',
  incident: (id: string) => `#/incidents/${encodeURIComponent(id)}`,
};
