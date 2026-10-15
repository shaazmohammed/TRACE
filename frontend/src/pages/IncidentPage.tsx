import { useCallback, useState } from "react";
import { ActionsPanel } from "../components/ActionsPanel";
import { EvidencePanel } from "../components/EvidencePanel";
import { IncidentGraph } from "../components/IncidentGraph";
import { NotesPanel } from "../components/NotesPanel";
import { Timeline } from "../components/Timeline";
import { useAsync } from "../hooks/useAsync";
import { api } from "../services/api";
import { STATUSES, type IncidentStatus } from "../types/api";

export function IncidentPage({ incidentId, onBack }: { incidentId: number; onBack: () => void }) {
  const { data, error, loading, reload } = useAsync(
    () => Promise.all([api.getIncident(incidentId), api.getTimeline(incidentId)]),
    [incidentId],
  );
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const select = useCallback((id: number | null) => setSelectedId(id), []);

  async function changeStatus(status: IncidentStatus) {
    setStatusError(null);
    try {
      await api.updateStatus(incidentId, status);
      reload();
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : "Could not update status");
    }
  }

  if (error) return <p className="error">{error}</p>;
  if (!data) return <p>{loading ? "Loading incident…" : ""}</p>;

  const [incident, timeline] = data;
  const selected = incident.relationships.find((r) => r.id === selectedId) ?? null;

  return (
    <div>
      <button className="link-button" onClick={onBack}>
        ← Back to incidents
      </button>
      <h2>{incident.title}</h2>
      <p>{incident.summary}</p>
      <div className="row">
        <span className={`badge sev-${incident.severity}`}>{incident.severity}</span>
        <label>
          Status{" "}
          <select value={incident.status} onChange={(e) => changeStatus(e.target.value as IncidentStatus)}>
            {STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <span className="muted">{incident.event_count} events</span>
      </div>
      {statusError && <p className="error">{statusError}</p>}

      <div className="grid-2">
        <section className="card">
          <h3>Relationship graph</h3>
          <p className="muted">Solid = observed in event data. Dashed = hypothesis only.</p>
          <IncidentGraph
            events={incident.events}
            relationships={incident.relationships}
            selectedRelationshipId={selectedId}
            onSelectRelationship={select}
          />
        </section>
        <section className="card">
          <h3>Evidence</h3>
          <EvidencePanel relationship={selected} />
        </section>
      </div>

      <section className="card">
        <h3>Timeline</h3>
        <Timeline entries={timeline} onSelectRelationship={select} />
      </section>

      <div className="grid-2">
        <section className="card">
          <h3>Investigation notes</h3>
          <NotesPanel incidentId={incidentId} notes={incident.notes} onChanged={reload} />
        </section>
        <section className="card">
          <h3>Response actions</h3>
          <ActionsPanel incidentId={incidentId} actions={incident.actions} onChanged={reload} />
        </section>
      </div>
    </div>
  );
}
