import { useState } from "react";
import { formatTime } from "../components/Timeline";
import { useAsync } from "../hooks/useAsync";
import { api } from "../services/api";
import { SEVERITIES, SOURCES, type Severity, type Source } from "../types/api";

const PAGE_SIZE = 20;

export function EventsPage() {
  const [search, setSearch] = useState("");
  const [source, setSource] = useState<Source | "">("");
  const [severity, setSeverity] = useState<Severity | "">("");
  const [offset, setOffset] = useState(0);

  const { data, error, loading } = useAsync(
    () => api.listEvents({ search, source, severity, limit: PAGE_SIZE, offset }),
    [search, source, severity, offset],
  );

  // Any filter change goes back to the first page.
  const resetPage = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    setOffset(0);
  };

  return (
    <div>
      <h2>Security events</h2>
      <div className="row">
        <input placeholder="Search description, user, IP, device…" value={search} onChange={(e) => resetPage(setSearch)(e.target.value)} />
        <select value={source} onChange={(e) => resetPage(setSource)(e.target.value as Source | "")}>
          <option value="">All sources</option>
          {SOURCES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select value={severity} onChange={(e) => resetPage(setSeverity)(e.target.value as Severity | "")}>
          <option value="">All severities</option>
          {SEVERITIES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      {error && <p className="error">{error}</p>}
      {loading && !data && <p>Loading events…</p>}
      {data && data.items.length === 0 && <p className="muted">No events match. Load the demo data from the dashboard.</p>}
      {data && data.items.length > 0 && (
        <>
          <table>
            <thead>
              <tr><th>ID</th><th>Time</th><th>Source</th><th>Type</th><th>User</th><th>IP</th><th>Device</th><th>Severity</th><th>Description</th></tr>
            </thead>
            <tbody>
              {data.items.map((e) => (
                <tr key={e.id}>
                  <td>{e.id}</td>
                  <td>{formatTime(e.timestamp)}</td>
                  <td>{e.source}</td>
                  <td>{e.event_type}</td>
                  <td>{e.username ?? "—"}</td>
                  <td>{e.source_ip ?? "—"}</td>
                  <td>{e.device_id ?? "—"}</td>
                  <td><span className={`badge sev-${e.severity}`}>{e.severity}</span></td>
                  <td>{e.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="row">
            <button disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>Previous</button>
            <span className="muted">
              {offset + 1}–{Math.min(offset + PAGE_SIZE, data.total)} of {data.total}
            </span>
            <button disabled={offset + PAGE_SIZE >= data.total} onClick={() => setOffset(offset + PAGE_SIZE)}>Next</button>
          </div>
        </>
      )}
    </div>
  );
}
