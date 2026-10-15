import type { EntityType, IncidentStatus, Severity } from '../../types/trace';
import { ENTITY_LABEL, humanize } from '../../utils/format';

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span className={`badge severity severity-${severity}`}>
      <span className="dot" aria-hidden="true" />
      {severity}
    </span>
  );
}

export function StatusBadge({ status }: { status: IncidentStatus }) {
  return <span className={`badge status status-${status}`}>{humanize(status)}</span>;
}

export function EntityChip({ type, value }: { type: EntityType; value: string }) {
  return (
    <span className={`entity-chip entity-${type}`}>
      <span className="entity-type">{ENTITY_LABEL[type]}</span>
      <span className="mono">{value}</span>
    </span>
  );
}
