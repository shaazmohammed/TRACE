import type { ReactNode } from 'react';
import { routeHref, type Route } from '../../hooks/useHashRoute';
import { API_BASE_URL } from '../../services/config';
import { useDataSource } from '../../services/DataSourceContext';
import { Icon, type IconName } from '../common/Icon';

const NAV: { key: 'overview' | 'events' | 'incidents'; label: string; icon: IconName; href: string }[] = [
  { key: 'overview', label: 'Overview', icon: 'overview', href: routeHref.overview },
  { key: 'events', label: 'Security events', icon: 'events', href: routeHref.events },
  { key: 'incidents', label: 'Incidents', icon: 'incidents', href: routeHref.incidents },
];

export function AppShell({ route, children }: { route: Route; children: ReactNode }) {
  const { mode, enableLiveApi } = useDataSource();
  const activeKey = route.name === 'incident' ? 'incidents' : route.name;

  return (
    <div className="shell">
      <aside className="sidebar">
        <a href={routeHref.overview} className="brand">
          <span className="brand-mark">
            <Icon name="shield" size={18} />
          </span>
          <span className="brand-text">
            <span className="brand-name">TRACE</span>
            <span className="brand-sub">Threat Reconstruction &amp; Analysis</span>
          </span>
        </a>

        <nav aria-label="Primary" className="nav">
          {NAV.map((item) => (
            <a
              key={item.key}
              href={item.href}
              className={`nav-link ${activeKey === item.key ? 'active' : ''}`}
              aria-current={activeKey === item.key ? 'page' : undefined}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </a>
          ))}
        </nav>

        <div className="source-card">
          <span className="source-label">Data source</span>
          {mode === 'live' ? (
            <>
              <span className="source-value">
                <span className="source-dot live" aria-hidden="true" />
                FastAPI
              </span>
              <span className="mono source-url" title={API_BASE_URL ?? undefined}>
                {API_BASE_URL ?? 'Not configured'}
              </span>
            </>
          ) : (
            <>
              <span className="source-value">
                <span className="source-dot demo" aria-hidden="true" />
                Demo fixtures
              </span>
              <button type="button" className="btn btn-ghost btn-sm" onClick={enableLiveApi}>
                Switch to live API
              </button>
            </>
          )}
        </div>
      </aside>

      <div className="main-column">
        {mode === 'demo' && (
          <div className="demo-banner" role="status">
            <strong>Demo fixtures</strong>
            <span>
              {"You're viewing local development data, not your FastAPI backend. Changes are in-memory and reset on reload."}
            </span>
            <button type="button" className="btn btn-sm btn-secondary" onClick={enableLiveApi}>
              Return to live API
            </button>
          </div>
        )}
        <main className="main">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="page-header">
      <div>
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  );
}

export function RefreshButton({ onClick, busy }: { onClick: () => void; busy?: boolean }) {
  return (
    <button type="button" className="btn btn-secondary" onClick={onClick} disabled={busy}>
      <span className={busy ? 'spin' : ''}>
        <Icon name="refresh" size={14} />
      </span>
      {busy ? 'Refreshing' : 'Refresh'}
    </button>
  );
}
