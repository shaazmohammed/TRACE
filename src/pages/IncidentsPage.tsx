import { useMemo, useState } from 'react';
import { SeverityBadge, StatusBadge } from '../components/common/Badges';
import { EmptyState, ErrorState, LoadingState } from '../components/common/StateViews';
import { PageHeader, RefreshButton } from '../components/layout/AppShell';
import { useApiResource } from '../hooks/useApiResource';
import { routeHref } from '../hooks/useHashRoute';
import { INCIDENT_STATUSES, SEVERITIES, type IncidentStatus, type Severity } from '../types/trace';
import { formatDateTime, formatRelative, humanize, SEVERITY_RANK } from '../utils/format';
import { FilterSelect } from './EventsPage';

export function IncidentsPage() {
  const resource = useApiResource('incidents', (api) => api.listIncidents());
  const [status, setStatus] = useState<IncidentStatus | ''>('');
  const [severity, setSeverity] = useState<Severity | ''>('');

  const incidents = resource.data ?? [];
  const filtered = useMemo(
    () =>
      incidents
        .filter((incident) => !status || incident.status === status)
        .filter((incident) => !severity || incident.severity === severity)
        .sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] || b.updated_at.localeCompare(a.updated_at)),
    [incidents, status, severity],
  );

  return (
    <>
      <PageHeader
        title="Incidents"
        subtitle="Correlated incidents produced by the TRACE correlation engine."
        actions={<RefreshButton onClick={resource.reload} busy={resource.isRefreshing} />}
      />

      <div className="toolbar">
        <FilterSelect label="Statuses" value={status} onChange={(v) => setStatus(v as IncidentStatus | '')} options={INCIDENT_STATUSES} format={humanize} />
        <FilterSelect label="Severities" value={severity} onChange={(v) => setSeverity(v as Severity | '')} options={SEVERITIES} />
      </div>

      {resource.isLoading ? (
        <LoadingState label="Loading incidents…" />
      ) : resource.error && !resource.data ? (
        <ErrorState error={resource.error} onRetry={resource.reload} />
      ) : incidents.length === 0 ? (
        <EmptyState title="No incidents">The correlation engine has not produced any incidents yet.</EmptyState>
      ) : filtered.length === 0 ? (
        <EmptyState title="No incidents match these filters" />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Incident</th>
                <th scope="col">Severity</th>
                <th scope="col">Status</th>
                <th scope="col" className="num">Events</th>
                <th scope="col">Assignee</th>
                <th scope="col">Created</th>
                <th scope="col">Updated</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((incident) => (
                <tr key={incident.id} className="row-link">
                  <td>
                    <a className="cell-link" href={routeHref.incident(incident.id)}>
                      <span className="cell-primary">{incident.title}</span>
                      <span className="cell-secondary mono">{incident.id}</span>
                    </a>
                  </td>
                  <td>
                    <SeverityBadge severity={incident.severity} />
                  </td>
                  <td>
                    <StatusBadge status={incident.status} />
                  </td>
                  <td className="num mono">{incident.event_count}</td>
                  <td className="mono">{incident.assigned_to ?? <span className="muted">Unassigned</span>}</td>
                  <td className="mono nowrap">{formatDateTime(incident.created_at)}</td>
                  <td className="nowrap muted">{formatRelative(incident.updated_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
