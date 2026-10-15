import type { TimelineEntry } from "../types/api";

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "medium" });
}

interface Props {
  entries: TimelineEntry[];
  onSelectRelationship: (id: number) => void;
}

export function Timeline({ entries, onSelectRelationship }: Props) {
  return (
    <ol className="timeline">
      {entries.map(({ event, explained_by }) => (
        <li key={event.id}>
          <div className="timeline-head">
            <time>{formatTime(event.timestamp)}</time>
            <span className={`badge sev-${event.severity}`}>{event.severity}</span>
            <span className="badge">{event.source}</span>
            <strong>
              #{event.id} {event.event_type}
            </strong>
          </div>
          <div>{event.description}</div>
          <div className="muted">
            {[event.username && `user ${event.username}`, event.source_ip && `ip ${event.source_ip}`, event.device_id && `device ${event.device_id}`]
              .filter(Boolean)
              .join(" · ")}
          </div>
          {explained_by.map((rel) => (
            <button key={rel.id} className="link-button" onClick={() => onSelectRelationship(rel.id)}>
              Linked from #{rel.source_event_id} by {rel.rule_id} ({rel.evidence_type})
            </button>
          ))}
        </li>
      ))}
    </ol>
  );
}
