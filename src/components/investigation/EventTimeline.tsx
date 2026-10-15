import type { SecurityEvent } from '../../types/trace';
import { formatDay, formatTime, humanize } from '../../utils/format';
import { SeverityBadge } from '../common/Badges';
import { EmptyState } from '../common/StateViews';

interface Props {
  events: SecurityEvent[];
  highlightedIds: ReadonlySet<string>;
  onSelectEvent: (id: string) => void;
}

export function EventTimeline({ events, highlightedIds, onSelectEvent }: Props) {
  if (events.length === 0) {
    return <EmptyState title="No related events">The backend returned no events for this incident.</EmptyState>;
  }

  const ordered = [...events].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  let lastDay = '';

  return (
    <ol className="timeline">
      {ordered.map((event) => {
        const day = formatDay(event.timestamp);
        const showDay = day !== lastDay;
        lastDay = day;
        const highlighted = highlightedIds.has(event.id);
        return (
          <li key={event.id} className="timeline-item">
            {showDay && <div className="timeline-day">{day}</div>}
            <button
              type="button"
              className={`timeline-entry ${highlighted ? 'highlighted' : ''}`}
              onClick={() => onSelectEvent(event.id)}
              aria-pressed={highlighted}
            >
              <span className={`timeline-marker severity-${event.severity}`} aria-hidden="true" />
              <span className="timeline-time mono">{formatTime(event.timestamp)}</span>
              <span className="timeline-content">
                <span className="timeline-head">
                  <span className="cell-primary">{humanize(event.event_type)}</span>
                  <SeverityBadge severity={event.severity} />
                </span>
                {event.description && <span className="cell-secondary">{event.description}</span>}
                <span className="timeline-meta mono">
                  {event.id} · {event.source}
                  {event.username ? ` · ${event.username}` : ''}
                  {event.ip_address ? ` · ${event.ip_address}` : ''}
                  {event.device ? ` · ${event.device}` : ''}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
