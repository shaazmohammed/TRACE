import { RESPONSE_ACTION_TYPES, type ActionHistoryEntry } from '../../types/trace';
import { formatDateTime, humanize } from '../../utils/format';
import { StatusBadge } from '../common/Badges';
import { EmptyState } from '../common/StateViews';

const TYPE_LABEL = { status_change: 'Status', note: 'Note', response_action: 'Action' } as const;
const actionLabel = (value?: string | null) =>
  RESPONSE_ACTION_TYPES.find((option) => option.value === value)?.label ?? (value ? humanize(value) : null);

export function ActionHistory({ entries }: { entries: ActionHistoryEntry[] }) {
  if (entries.length === 0) {
    return <EmptyState title="No activity yet">Status changes, notes, and response actions will appear here.</EmptyState>;
  }

  const ordered = [...entries].sort((a, b) => b.created_at.localeCompare(a.created_at));

  return (
    <ol className="history">
      {ordered.map((entry) => (
        <li key={entry.id} className={`history-item type-${entry.entry_type}`}>
          <div className="history-head">
            <span className={`history-type type-${entry.entry_type}`}>{TYPE_LABEL[entry.entry_type]}</span>
            <span className="mono small">{entry.author}</span>
            <time className="muted small mono" dateTime={entry.created_at}>
              {formatDateTime(entry.created_at)}
            </time>
          </div>
          {entry.entry_type === 'status_change' && entry.new_status ? (
            <div className="history-status">
              {entry.previous_status && <StatusBadge status={entry.previous_status} />}
              <span className="muted" aria-label="changed to">→</span>
              <StatusBadge status={entry.new_status} />
            </div>
          ) : null}
          {entry.entry_type === 'response_action' && actionLabel(entry.action_type) && (
            <span className="history-action">{actionLabel(entry.action_type)}</span>
          )}
          {entry.content && entry.entry_type !== 'status_change' && <p className="history-body">{entry.content}</p>}
        </li>
      ))}
    </ol>
  );
}
