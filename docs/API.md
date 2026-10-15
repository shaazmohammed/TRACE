# API contract

Base URL: `http://localhost:8000/api` (interactive docs at `http://localhost:8000/docs`).
All bodies are JSON. Timestamps are ISO 8601 with timezone. TypeScript types: `frontend/src/types/api.ts`.

**Errors:** `404 {"detail": "Incident 5 not found"}`, `403` for demo endpoints outside development,
`422 {"detail": [{"loc": [...], "msg": "..."}]}` for invalid input.

| Method & path | Purpose | Success |
|---|---|---|
| `GET /health` | API and database check | 200 `{status, database}`; 503 if the database is down |
| `GET /overview` | Counts for dashboard metrics | 200 `{total_events, total_incidents, incidents_by_status, incidents_by_severity}` |
| `GET /events` | List events | 200 `{items, total, limit, offset}` |
| `GET /events/{id}` | One event | 200 event |
| `POST /demo/load` | Insert missing demo events (dev only) | 200 `{events_inserted, total_events}` |
| `POST /demo/reset` | **Delete everything**, reload demo events (dev only) | 200 `{events_inserted, total_events}` |
| `POST /correlation/run` | Correlate all stored events | 200 `{events_considered, incidents_created, incidents_updated, incidents_unchanged, relationships_created}` |
| `GET /incidents` | List incidents | 200 array of incident summaries |
| `GET /incidents/{id}` | Incident with events, relationships, notes, actions | 200 |
| `GET /incidents/{id}/timeline` | Events in time order with the relationships that explain them | 200 array of `{event, explained_by[]}` |
| `GET /incidents/{id}/relationships` | Evidence relationships (graph edges) | 200 array |
| `PATCH /incidents/{id}/status` | Body `{"status": "Investigating"}` | 200 incident summary |
| `GET /incidents/{id}/notes` / `POST` | Body `{"content": "...", "author": "analyst"}` (author optional) | 200 / 201 |
| `GET /incidents/{id}/actions` / `POST` | Body `{"action_type": "Block IP", "description": "...", "status": "Planned"}` (status optional) | 200 / 201 |

## Query parameters

- `GET /events`: `search` (matches description, username, source IP, device, event type), `source`, `severity`,
  `event_type`, `username`, `device_id`, `limit` (1–200, default 50), `offset`. Newest first.
- `GET /incidents`: `status`, `severity`, `limit`, `offset`. Newest first.

## Objects

```jsonc
// event
{ "id": 7, "external_id": "evt-007", "timestamp": "2026-03-10T09:06:00Z", "source": "Authentication",
  "event_type": "LOGIN_SUCCESS", "username": "jdoe-sample", "source_ip": "203.0.113.77",
  "device_id": "WS-SYNTH-014", "severity": "High", "description": "...", "raw_data": { } }

// relationship (a graph edge from source_event_id to target_event_id)
{ "id": 5, "incident_id": 1, "source_event_id": 5, "target_event_id": 7,
  "relationship_type": "failed_then_success", "evidence_type": "observed",   // or "hypothesis"
  "rule_id": "R2_FAILED_THEN_SUCCESS", "rule_name": "Failed logins followed by success",
  "explanation": "Observed: 4 failed logins ..." }

// incident summary
{ "id": 1, "title": "Potential incident: user jdoe-sample; device WS-SYNTH-014", "summary": "...",
  "severity": "High", "status": "Open", "created_at": "...", "updated_at": "...", "event_count": 7 }
```

Enumerations — status: `Open | Investigating | Resolved | False Positive`; severity: `Low | Medium | High | Critical`;
source: `Authentication | Endpoint | Network`; action type: `Isolate Device | Reset Credentials | Block IP | Monitor | Other`;
action status: `Planned | Completed | Failed`.

## Building the UI from this contract

- Graph: nodes = `incident.events`, edges = `incident.relationships` (`source_event_id` → `target_event_id`). Style `hypothesis` edges differently from `observed` ones.
- Evidence panel: show `rule_name`, `rule_id`, `evidence_type` and `explanation` of the selected edge.
- Timeline: `GET /incidents/{id}/timeline`; `explained_by` says why each event is linked to an earlier one.
- After any write (status, note, action) refetch `GET /incidents/{id}`.
