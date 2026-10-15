import type { ReactNode } from 'react';
import { useDataSource } from '../../services/DataSourceContext';
import { ApiError } from '../../services/httpClient';

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="state-view" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="state-view empty">
      <p className="state-title">{title}</p>
      {children && <p className="state-body">{children}</p>}
    </div>
  );
}

const ERROR_TITLES: Record<string, string> = {
  config: 'Backend not configured',
  network: 'Backend unreachable',
  timeout: 'Request timed out',
  http: 'Backend returned an error',
  parse: 'Unexpected response',
};

export function ErrorState({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  const { mode, demoAvailable, enableDemoFixtures } = useDataSource();
  const kind = error instanceof ApiError ? error.kind : undefined;
  const status = error instanceof ApiError ? error.status : undefined;
  const offerDemo = demoAvailable && mode === 'live' && (kind === 'network' || kind === 'config' || kind === 'timeout');

  return (
    <div className="state-view error" role="alert">
      <p className="state-title">
        {(kind && ERROR_TITLES[kind]) ?? 'Something went wrong'}
        {status ? <span className="mono muted"> · HTTP {status}</span> : null}
      </p>
      <p className="state-body">{error.message}</p>
      <div className="state-actions">
        {onRetry && (
          <button type="button" className="btn btn-secondary" onClick={onRetry}>
            Retry
          </button>
        )}
        {offerDemo && (
          <button type="button" className="btn btn-ghost" onClick={enableDemoFixtures}>
            Use demo fixtures (development only)
          </button>
        )}
      </div>
    </div>
  );
}

export function Panel({
  title,
  actions,
  children,
  className = '',
}: {
  title: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      <header className="panel-header">
        <h2 className="panel-title">{title}</h2>
        {actions && <div className="panel-actions">{actions}</div>}
      </header>
      <div className="panel-body">{children}</div>
    </section>
  );
}
