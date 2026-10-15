import { useState } from "react";
import { formatTime } from "../components/Timeline";
import { useAsync } from "../hooks/useAsync";
import { api } from "../services/api";
import { SEVERITIES, STATUSES, type IncidentStatus, type Severity } from "../types/api";

export function DashboardPage({ onOpenIncident }: { onOpenIncident: (id: number) => void }) {
  const [status, setStatus] = useState<IncidentStatus | "">("");
  const [severity, setSeverity] = useState<Severity | "">("");
  const [message, setMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const overview = useAsync(() => api.overview(), []);
  const incidents = useAsync(() => api.listIncidents({ status, severity }), [status, severity]);

  async function run(label: string, action: () => Promise<unknown>) {
    setMessage(null);
    setActionError(null);
    try {
      const result = await action();
      setMessage(`${label}: ${JSON.stringify(result)}`);
      overview.reload();
      incidents.reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : `${label} failed`);
    }
  }

  const o = overview.data;
  return (
    <div>
      <div className="row">
        <button onClick={() => run("Demo data loaded", api.loadDemo)}>Load demo data</button>
        <button onClick={() => run("Correlation finished", api.runCorrelation)}>Run correlation</button>
        <button
          className="danger"
          onClick={() => {
            if (window.confirm("Delete ALL events, incidents, notes and actions and reload the demo data?")) {
              run("Demo data reset", api.resetDemo);
            }
          }}
        >
          Reset demo data
        </button>
      </div>
      {message && <p className="muted">{message}</p>}
      {actionError && <p className="error">{actionError}</p>}
      {overview.error && <p className="error">{overview.error}</p>}

      {o && (
        <div className="metrics">
          <div className="card metric"><strong>{o.total_events}</strong> events</div>
          <div className="card metric"><strong>{o.total_incidents}</strong> potential incidents</div>
          {STATUSES.map((s) => (
            <div className="card metric" key={s}><strong>{o.incidents_by_status[s]}</strong> {s}</div>
          ))}
        </div>
      )}

      <h2>Potential incidents</h2>
      <div className="row">
        <select value={status} onChange={(e) => setStatus(e.target.value as IncidentStatus | "")}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select value={severity} onChange={(e) => setSeverity(e.target.value as Severity | "")}>
          <option value="">All severities</option>
          {SEVERITIES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      {incidents.error && <p className="error">{incidents.error}</p>}
      {incidents.data && incidents.data.length === 0 && (
        <p className="muted">No incidents. Load the demo data, then run correlation.</p>
      )}
      {incidents.data && incidents.data.length > 0 && (
        <table>
          <thead>
            <tr><th>Title</th><th>Severity</th><th>Status</th><th>Events</th><th>Created</th></tr>
          </thead>
          <tbody>
            {incidents.data.map((i) => (
              <tr key={i.id} className="clickable" onClick={() => onOpenIncident(i.id)}>
                <td>{i.title}</td>
                <td><span className={`badge sev-${i.severity}`}>{i.severity}</span></td>
                <td>{i.status}</td>
                <td>{i.event_count}</td>
                <td>{formatTime(i.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
