import type { EvidenceRelationship, SecurityEvent } from '../../types/trace';
import { formatDateTime, formatDuration, humanize } from '../../utils/format';
import { EntityChip, SeverityBadge } from '../common/Badges';
import { EmptyState } from '../common/StateViews';

interface Props {
  relationships: EvidenceRelationship[];
  eventsById: Map<string, SecurityEvent>;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

export function EvidencePanel({ relationships, eventsById, selectedId, onSelect }: Props) {
  const selected = relationships.find((rel) => rel.id === selectedId) ?? null;

  if (relationships.length === 0) {
    return <EmptyState title="No evidence to show">No correlation rules linked events in this incident.</EmptyState>;
  }

  return (
    <div className="evidence">
      <label className="field">
        <span className="field-label">Relationship</span>
        <select className="input select" value={selectedId ?? ''} onChange={(e) => onSelect(e.target.value || null)}>
          <option value="">Select a relationship…</option>
          {relationships.map((rel) => (
            <option key={rel.id} value={rel.id}>
              {rel.source_event_id} → {rel.target_event_id} · {rel.rule.name}
            </option>
          ))}
        </select>
      </label>

      {!selected ? (
        <EmptyState title="No relationship selected">
          Click an edge in the graph or choose one above to see the rule and evidence.
        </EmptyState>
      ) : (
        <div className="evidence-detail">
          <div className="evidence-rule">
            <div className="evidence-rule-head">
              <span className="cell-primary">{selected.rule.name}</span>
              <span className="mono muted small">{selected.rule.id}</span>
            </div>
            <p className="cell-secondary">{selected.rule.description}</p>
            <pre className="code" aria-label="Rule logic">
              <code>{selected.rule.logic}</code>
            </pre>
          </div>

          <div>
            <h3 className="subhead">Why these events were connected</h3>
            <p className="evidence-explanation">{selected.explanation}</p>
          </div>

          <dl className="kv">
            {selected.time_delta_seconds != null && (
              <>
                <dt>Time between events</dt>
                <dd className="mono">{formatDuration(selected.time_delta_seconds)}</dd>
              </>
            )}
            {selected.confidence != null && (
              <>
                <dt>Confidence</dt>
                <dd className="mono">{Math.round(selected.confidence * 100)}%</dd>
              </>
            )}
          </dl>

          <div>
            <h3 className="subhead">Shared entities</h3>
            {selected.shared_entities.length === 0 ? (
              <p className="muted small">No shared entities reported.</p>
            ) : (
              <div className="chip-row">
                {selected.shared_entities.map((entity) => (
                  <EntityChip key={`${entity.type}:${entity.value}`} type={entity.type} value={entity.value} />
                ))}
              </div>
            )}
          </div>

          <div className="evidence-events">
            <EventCard label="Source event" event={eventsById.get(selected.source_event_id)} id={selected.source_event_id} />
            <EventCard label="Target event" event={eventsById.get(selected.target_event_id)} id={selected.target_event_id} />
          </div>
        </div>
      )}
    </div>
  );
}

function EventCard({ label, event, id }: { label: string; event?: SecurityEvent; id: string }) {
  return (
    <div className="event-card">
      <span className="field-label">{label}</span>
      {event ? (
        <>
          <div className="timeline-head">
            <span className="cell-primary">{humanize(event.event_type)}</span>
            <SeverityBadge severity={event.severity} />
          </div>
          <span className="mono small muted">
            {event.id} · {formatDateTime(event.timestamp)}
          </span>
          {event.description && <span className="cell-secondary">{event.description}</span>}
        </>
      ) : (
        <span className="mono small muted">{id} (not in incident event list)</span>
      )}
    </div>
  );
}
