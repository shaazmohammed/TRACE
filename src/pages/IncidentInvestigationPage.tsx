import { useMemo, useState } from 'react';
import { SeverityBadge, StatusBadge } from '../components/common/Badges';
import { Icon } from '../components/common/Icon';
import { ErrorState, LoadingState, Panel } from '../components/common/StateViews';
import { ActionHistory } from '../components/investigation/ActionHistory';
import { EventTimeline } from '../components/investigation/EventTimeline';
import { EvidencePanel } from '../components/investigation/EvidencePanel';
import { IncidentControls } from '../components/investigation/IncidentControls';
import { RelationshipGraph } from '../components/investigation/RelationshipGraph';
import { RefreshButton } from '../components/layout/AppShell';
import { useApiResource } from '../hooks/useApiResource';
import { routeHref } from '../hooks/useHashRoute';
import { useDataSource } from '../services/DataSourceContext';
import type { IncidentStatus, ResponseActionType } from '../types/trace';
import { formatDateTime, formatRelative } from '../utils/format';

export function IncidentInvestigationPage({ incidentId }: { incidentId: string }) {
  const { api } = useDataSource();
  const incident = useApiResource(`incident:${incidentId}`, (a) => a.getIncident(incidentId));
  const evidence = useApiResource(`evidence:${incidentId}`, async (a) => {
    const [events, relationships] = await Promise.all([
      a.getIncidentEvents(incidentId),
      a.getIncidentRelationships(incidentId),
    ]);
    return { events, relationships };
  });
  const history = useApiResource(`history:${incidentId}`, (a) => a.getIncidentHistory(incidentId));

  const [selectedRelationshipId, setSelectedRelationshipId] = useState<string | null>(null);
  const [focusedEventId, setFocusedEventId] = useState<string | null>(null);

  const events = evidence.data?.events ?? [];
  const relationships = evidence.data?.relationships ?? [];
  const eventsById = useMemo(() => new Map(events.map((event) => [event.id, event])), [events]);

  const highlightedIds = useMemo(() => {
    const ids = new Set<string>();
    const rel = relationships.find((item) => item.id === selectedRelationshipId);
    if (rel) ids.add(rel.source_event_id).add(rel.target_event_id);
    if (focusedEventId) ids.add(focusedEventId);
    return ids;
  }, [relationships, selectedRelationshipId, focusedEventId]);

  const refreshAfterMutation = () => Promise.all([incident.reload(), history.reload()]).then(() => undefined);

  const handleStatus = async (status: IncidentStatus, author: string) => {
    await api.updateIncidentStatus(incidentId, { status, author });
    await refreshAfterMutation();
  };
  const handleNote = async (content: string, author: string) => {
    await api.addIncidentNote(incidentId, { content, author });
    await refreshAfterMutation();
  };
  const handleAction = async (action_type: ResponseActionType, description: string, author: string) => {
    await api.recordResponseAction(incidentId, { action_type, description, author });
    await refreshAfterMutation();
  };

  const refreshAll = () => Promise.all([incident.reload(), evidence.reload(), history.reload()]);
  const refreshing = incident.isRefreshing || evidence.isRefreshing || history.isRefreshing;

  if (incident.isLoading) return <LoadingState label={`Loading incident ${incidentId}…`} />;
  if (!incident.data) {
    return (
      <>
        <a className="back-link" href={routeHref.incidents}>
          <Icon name="back" size={14} /> Incidents
        </a>
        <ErrorState error={incident.error ?? new Error('Incident not found.')} onRetry={incident.reload} />
      </>
    );
  }

  const inc = incident.data;

  return (
    <>
      <a className="back-link" href={routeHref.incidents}>
        <Icon name="back" size={14} /> Incidents
      </a>

      <header className="incident-header">
        <div className="incident-heading">
          <div className="incident-badges">
            <span className="mono muted">{inc.id}</span>
            <SeverityBadge severity={inc.severity} />
            <StatusBadge status={inc.status} />
          </div>
          <h1 className="page-title">{inc.title}</h1>
          <p className="page-subtitle">{inc.summary}</p>
        </div>
        <RefreshButton onClick={refreshAll} busy={refreshing} />
      </header>

      {incident.error && <ErrorState error={incident.error} onRetry={incident.reload} />}

      <dl className="summary-strip">
        <div><dt>Related events</dt><dd className="mono">{inc.event_count}</dd></div>
        <div><dt>Relationships</dt><dd className="mono">{evidence.data ? relationships.length : '—'}</dd></div>
        <div><dt>Assignee</dt><dd className="mono">{inc.assigned_to ?? 'Unassigned'}</dd></div>
        <div><dt>Created</dt><dd className="mono">{formatDateTime(inc.created_at)}</dd></div>
        <div><dt>Last updated</dt><dd>{formatRelative(inc.updated_at)}</dd></div>
      </dl>

      <div className="investigation-grid">
        <div className="col-main">
          <Panel title="Relationship graph" className="panel-graph">
            {evidence.isLoading ? (
              <LoadingState label="Loading evidence relationships…" />
            ) : evidence.error && !evidence.data ? (
              <ErrorState error={evidence.error} onRetry={evidence.reload} />
            ) : (
              <RelationshipGraph
                events={events}
                relationships={relationships}
                selectedRelationshipId={selectedRelationshipId}
                focusedEventId={focusedEventId}
                onSelectRelationship={setSelectedRelationshipId}
              />
            )}
          </Panel>

          <Panel title="Evidence">
            {evidence.isLoading ? (
              <LoadingState />
            ) : evidence.data ? (
              <EvidencePanel
                relationships={relationships}
                eventsById={eventsById}
                selectedId={selectedRelationshipId}
                onSelect={setSelectedRelationshipId}
              />
            ) : null}
          </Panel>

          <Panel title={`Event timeline${evidence.data ? ` · ${events.length}` : ''}`}>
            {evidence.isLoading ? (
              <LoadingState label="Loading related events…" />
            ) : evidence.error && !evidence.data ? (
              <ErrorState error={evidence.error} onRetry={evidence.reload} />
            ) : (
              <EventTimeline
                events={events}
                highlightedIds={highlightedIds}
                onSelectEvent={(id) => setFocusedEventId((current) => (current === id ? null : id))}
              />
            )}
          </Panel>
        </div>

        <div className="col-side">
          <Panel title="Incident management">
            <IncidentControls
              key={`${inc.id}:${inc.status}`}
              incident={inc}
              onUpdateStatus={handleStatus}
              onAddNote={handleNote}
              onRecordAction={handleAction}
            />
          </Panel>

          <Panel title="Action history">
            {history.isLoading ? (
              <LoadingState label="Loading history…" />
            ) : history.error && !history.data ? (
              <ErrorState error={history.error} onRetry={history.reload} />
            ) : (
              <ActionHistory entries={history.data ?? []} />
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
