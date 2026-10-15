import type { EvidenceRelationship } from "../types/api";

export function EvidencePanel({ relationship }: { relationship: EvidenceRelationship | null }) {
  if (!relationship) {
    return <p className="muted">Click a link in the graph or timeline to see why two events are related.</p>;
  }
  return (
    <div>
      <h4>
        #{relationship.source_event_id} → #{relationship.target_event_id}{" "}
        <span className={`badge ev-${relationship.evidence_type}`}>{relationship.evidence_type}</span>
      </h4>
      <p>
        <strong>{relationship.rule_name}</strong> <span className="muted">({relationship.rule_id})</span>
      </p>
      <p>{relationship.explanation}</p>
    </div>
  );
}
