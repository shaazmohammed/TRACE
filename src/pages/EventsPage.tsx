import { useMemo, useState } from 'react';
import { SeverityBadge } from '../components/common/Badges';
import { EmptyState, ErrorState, LoadingState } from '../components/common/StateViews';
import { PageHeader, RefreshButton } from '../components/layout/AppShell';
import { useApiResource } from '../hooks/useApiResource';
import { routeHref } from '../hooks/useHashRoute';
import { SEVERITIES, type SecurityEvent, type Severity } from '../types/trace';
import { formatDateTime, humanize } from '../utils/format';

const SEARCH_FIELDS: (keyof SecurityEvent)[] = ['id', 'source', 'event_type', 'username', 'ip_address', 'device', 'description'];

export function EventsPage() {
  const resource = useApiResource('events', (api) => api.listEvents());
  const [query, setQuery] = useState('');
  const [severity, setSeverity] = useState<Severity | ''>('');
  const [source, setSource] = useState('');
  const [eventType, setEventType] = useState('');

  const events = resource.data ?? [];
  const sources = useMemo(() => [...new Set(events.map((event) => event.source))].sort(), [events]);
  const eventTypes = useMemo(() => [...new Set(events.map((event) => event.event_type))].sort(), [events]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return events
      .filter((event) => !severity || event.severity === severity)
      .filter((event) => !source || event.source === source)
      .filter((event) => !eventType || event.event_type === eventType)
      .filter(
        (event) =>
          !needle || SEARCH_FIELDS.some((field) => String(event[field] ?? '').toLowerCase().includes(needle)),
      )
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }, [events, query, severity, source, eventType]);

  const hasFilters = Boolean(query || severity || source || eventType);
  const clearFilters = () => {
    setQuery('');
    setSeverity('');
    setSource('');
    setEventType('');
  };

  return (
    <>
      <PageHeader
        title="Security events"
        subtitle="Normalized events ingested by the TRACE backend."
        actions={<RefreshButton onClick={resource.reload} busy={resource.isRefreshing} />}
      />

      <div className="toolbar" role="search">
        <label className="field grow">
          <span className="sr-only">Search events</span>
          <input
            type="search"
            className="input"
            placeholder="Search user, IP, device, source, type…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <FilterSelect label="Severity" value={severity} onChange={(v) => setSeverity(v as Severity | '')} options={SEVERITIES} />
        <FilterSelect label="Source" value={source} onChange={setSource} options={sources} />
        <FilterSelect label="Event type" value={eventType} onChange={setEventType} options={eventTypes} format={humanize} />
        {hasFilters && (
          <button type="button" className="btn btn-ghost" onClick={clearFilters}>
            Clear
          </button>
        )}
      </div>

      {resource.isLoading ? (
        <LoadingState label="Loading security events…" />
      ) : resource.error && !resource.data ? (
        <ErrorState error={resource.error} onRetry={resource.reload} />
      ) : events.length === 0 ? (
        <EmptyState title="No security events">The backend returned an empty event list.</EmptyState>
      ) : (
        <>
          {resource.error && <ErrorState error={resource.error} onRetry={resource.reload} />}
          <p className="result-count" aria-live="polite">
            Showing {filtered.length} of {events.length} events
          </p>
          {filtered.length === 0 ? (
            <EmptyState title="No events match these filters">Adjust the search or clear filters.</EmptyState>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">Timestamp</th>
                    <th scope="col">Source</th>
                    <th scope="col">Event type</th>
                    <th scope="col">Username</th>
                    <th scope="col">IP address</th>
                    <th scope="col">Device</th>
                    <th scope="col">Severity</th>
                    <th scope="col">Incident</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((event) => (
                    <tr key={event.id}>
                      <td className="mono nowrap">{formatDateTime(event.timestamp)}</td>
                      <td>{event.source}</td>
                      <td>
                        <span className="cell-primary">{humanize(event.event_type)}</span>
                        {event.description && <span className="cell-secondary">{event.description}</span>}
                      </td>
                      <td className="mono">{event.username ?? <Dash />}</td>
                      <td className="mono">{event.ip_address ?? <Dash />}</td>
                      <td className="mono">{event.device ?? <Dash />}</td>
                      <td>
                        <SeverityBadge severity={event.severity} />
                      </td>
                      <td className="mono">
                        {event.incident_id ? (
                          <a className="link" href={routeHref.incident(event.incident_id)}>
                            {event.incident_id}
                          </a>
                        ) : (
                          <Dash />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </>
  );
}

function Dash() {
  return (
    <span className="muted" aria-label="none">
      —
    </span>
  );
}

export function FilterSelect({
  label,
  value,
  onChange,
  options,
  format = (v: string) => v,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  format?: (value: string) => string;
}) {
  return (
    <label className="field">
      <span className="sr-only">{label}</span>
      <select className="input select" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">All {label.toLowerCase()}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {format(option)}
          </option>
        ))}
      </select>
    </label>
  );
}
