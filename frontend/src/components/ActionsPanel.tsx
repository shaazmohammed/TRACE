import { FormEvent, useState } from "react";
import { api } from "../services/api";
import { ACTION_STATUSES, ACTION_TYPES, type ActionStatus, type ActionType, type ResponseAction } from "../types/api";
import { formatTime } from "./Timeline";

interface Props {
  incidentId: number;
  actions: ResponseAction[];
  onChanged: () => void;
}

export function ActionsPanel({ incidentId, actions, onChanged }: Props) {
  const [actionType, setActionType] = useState<ActionType>("Monitor");
  const [status, setStatus] = useState<ActionStatus>("Planned");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.addAction(incidentId, actionType, description, status);
      setDescription("");
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not record action");
    }
  }

  return (
    <div>
      <ul className="plain">
        {actions.length === 0 && <li className="muted">No response actions recorded.</li>}
        {actions.map((a) => (
          <li key={a.id}>
            <div className="muted">{formatTime(a.created_at)}</div>
            <strong>{a.action_type}</strong> <span className="badge">{a.status}</span>
            <div>{a.description}</div>
          </li>
        ))}
      </ul>
      <form onSubmit={submit}>
        <div className="row">
          <select value={actionType} onChange={(e) => setActionType(e.target.value as ActionType)}>
            {ACTION_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value as ActionStatus)}>
            {ACTION_STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What was done or planned?" />
        <button type="submit" disabled={!description.trim()}>
          Record action
        </button>
        {error && <p className="error">{error}</p>}
      </form>
    </div>
  );
}
