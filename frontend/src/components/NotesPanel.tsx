import { FormEvent, useState } from "react";
import { api } from "../services/api";
import type { InvestigationNote } from "../types/api";
import { formatTime } from "./Timeline";

interface Props {
  incidentId: number;
  notes: InvestigationNote[];
  onChanged: () => void;
}

export function NotesPanel({ incidentId, notes, onChanged }: Props) {
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.addNote(incidentId, content);
      setContent("");
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save note");
    }
  }

  return (
    <div>
      <ul className="plain">
        {notes.length === 0 && <li className="muted">No notes yet.</li>}
        {notes.map((n) => (
          <li key={n.id}>
            <div className="muted">
              {n.author} · {formatTime(n.created_at)}
            </div>
            {n.content}
          </li>
        ))}
      </ul>
      <form onSubmit={submit}>
        <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Add an investigation note" rows={3} />
        <button type="submit" disabled={!content.trim()}>
          Add note
        </button>
        {error && <p className="error">{error}</p>}
      </form>
    </div>
  );
}
