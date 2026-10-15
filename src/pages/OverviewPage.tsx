import { SeverityBadge, StatusBadge } from '../components/common/Badges';
import { EmptyState, ErrorState, LoadingState, Panel } from '../components/common/StateViews';
import { PageHeader, RefreshButton } from '../components/layout/AppShell';
import { useApiResource } from '../hooks/useApiResource';
import { routeHref } from '../hooks/useHashRoute';
import { UNRESOLVED_STATUSES } from '../types/trace';
import { formatRelative, humanize, SEVERITY_RANK } from '../utils/format';

export function OverviewPage() {
  const resource = useApiResource('overview', async (api) => {
    const [incidents, events] = await Promise.all([api.listIncidents(), api.listEvents()]);
    return { incidents, events };
  });

  const header = (
    <PageHeader
      title="Overview"
      subtitle="Current incident posture and the latest ingested security activity."
      actions={<RefreshButton onClick={resource.reload} busy={resource.isRefreshing} />}
    />
  );

  if (resource.isLoading) return <>{header}<LoadingState label="Loading incidents and events…" /></>;
  if (resource.error || !resource.data) {
    return <>{header}<ErrorState error={resource.error ?? new Error('No data returned.')} onRetry={resource.reload} /></>;
  }

  const { incidents, events } = resource.data;
  const unresolved = incidents.filter((incident) => UNRESOLVED_STATUSES.includes(incident.status));
  const highSeverity = incidents.filter((incident) => SEVERITY_RANK[incident.severity] >= SEVERITY_RANK.high);
  const highUnresolved = highSeverity.filter((incident) => UNRESOLVED_STATUSES.includes(incident.status));
  const recentEvents = [...events].sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 8);
  const activeIncidents = [...unresolved]
    .sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] || b.updated_at.localeCompare(a.updated_at))
    .slice(0, 6);

  return (
    <>
      {header}
      {resource.error && <ErrorState error={resource.error} onRetry={resource.reload} />}

      <div className="stat-grid">
        <StatCard label="Total incidents" value={incidents.length} />
        <StatCard label="Open incidents" value={unresolved.length} hint="open, investigating, or contained" />
        <StatCard
          label="High severity"
          value={highSeverity.length}
          hint={`${highUnresolved.length} unresolved`}
          tone={highUnresolved.length > 0 ? 'alert' : undefined}
        />
        <StatCard label="Security events" value={events.length} hint="returned by /events" />
      </div>

      <div className="grid-2">
        <Panel title="Active incidents" actions={<a className="link" href={routeHref.incidents}>View all</a>}>
          {activeIncidents.length === 0 ? (
            <EmptyState title="No unresolved incidents">Nothing currently requires investigation.</EmptyState>
          ) : (
            <ul className="list">
              {activeIncidents.map((incident) => (
                <li key={incident.id}>
                  <a className="list-row" href={routeHref.incident(incident.id)}>
                    <div className="list-main">
                      <span className="list-title">{incident.title}</span>
                      <span className="list-meta mono">
                        {incident.id} · {incident.event_count} events · updated {formatRelative(incident.updated_at)}
                      </span>
                    </div>
                    <div className="list-side">
                      <SeverityBadge severity={incident.severity} />
                      <StatusBadge status={incident.status} />
                    </div>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Recent activity" actions={<a className="link" href={routeHref.events}>All events</a>}>
          {recentEvents.length === 0 ? (
            <EmptyState title="No events ingested">The backend returned no security events.</EmptyState>
          ) : (
            <ul className="list">
              {recentEvents.map((event) => (
                <li key={event.id} className="list-row static">
                  <div className="list-main">
                    <span className="list-title">{humanize(event.event_type)}</span>
                    <span className="list-meta mono">
                      {event.source}
                      {event.username ? ` · ${event.username}` : ''}
                      {event.ip_address ? ` · ${event.ip_address}` : ''}
                    </span>
                  </div>
                  <div className="list-side">
                    <span className="muted small">{formatRelative(event.timestamp)}</span>
                    <SeverityBadge severity={event.severity} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}

function StatCard({ label, value, hint, tone }: { label: string; value: number; hint?: string; tone?: 'alert' }) {
  return (
    <div className={`stat-card ${tone ?? ''}`}>
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value.toLocaleString()}</span>
      {hint && <span className="stat-hint">{hint}</span>}
    </div>
  );
}
