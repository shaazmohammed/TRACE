# Architecture

## Layers

```
React (Vite)  ──HTTP/JSON──>  FastAPI routes  ──>  services  ──>  SQLAlchemy  ──>  PostgreSQL
                              (validation)         (logic)        (models)
                                                   └─ correlation/ (pure Python rules)
```

- **Routes** only parse/validate input and call a service.
- **Services** hold the logic and manage transactions (`commit` / `rollback`).
- **`services/correlation/`** imports no database or web code, so it can be tested without PostgreSQL.
  `correlation_service.py` is the only bridge: it loads events, calls `correlate()`, and saves the result.

Structure follows the suggested layout; additions: `app/api/routes/`, `services/correlation/`, `scripts/`.

## Database schema

| Table | Purpose | Key constraints |
|---|---|---|
| `security_events` | Raw events | `external_id` unique; `source` and `severity` CHECK lists; `raw_data` JSONB; indexes on timestamp, username, device_id, severity |
| `incidents` | Potential incidents | `status` and `severity` CHECK lists; indexes on status, severity |
| `incident_events` | Incident ↔ event (many-to-many) | composite primary key (`incident_id`, `event_id`) prevents duplicate links; both FKs `ON DELETE CASCADE` |
| `evidence_relationships` | One row per link between two events | unique (`incident_id`, `source_event_id`, `target_event_id`, `rule_id`); CHECK `source <> target`; `evidence_type` is `observed` or `hypothesis` |
| `investigation_notes` | Analyst notes | FK to incident, cascade delete |
| `response_actions` | Response history | FK to incident; `action_type` and `status` CHECK lists |

Allowed values — statuses: Open, Investigating, Resolved, False Positive. Severities: Low, Medium, High, Critical.
Sources: Authentication, Endpoint, Network. Action types: Isolate Device, Reset Credentials, Block IP, Monitor, Other.
Action statuses: Planned, Completed, Failed.

Allowed values use CHECK constraints on text columns rather than PostgreSQL enum types, which keeps migrations simple.

## Correlation rules

Every link stores `rule_id`, `rule_name`, an explanation, and the two event IDs. `observed` means the event data
itself supports the link; `hypothesis` means only a weak signal does.

| Rule | Links | Evidence |
|---|---|---|
| `R1_REPEATED_FAILED_LOGIN` | Consecutive failed logins, same username (≥3 failures, each within 10 min of the previous) | observed |
| `R2_FAILED_THEN_SUCCESS` | Last failure of an R1 run → next success for the same username within 15 min | observed |
| `R4_ENDPOINT_THEN_NETWORK` | Endpoint event flagged `suspicious` → network event on the same device within 10 min **with the same `process_id`** | observed |
| `R3_SAME_DEVICE_PROXIMITY` | Neighbouring Medium+ events on one device within 30 min, if no stronger rule already links them | hypothesis |

(IDs are numbered by the order the rules were specified.) Nothing is linked by timing alone except R3, which is
labelled a hypothesis and limited to elevated severity. Thresholds are in `.env`.

**Grouping:** events connected by links form one group (union-find). Each group becomes one potential incident;
severity is the highest event severity.

**Idempotency:** before creating an incident, the service looks for an existing incident that already contains any of
the group's events and extends it instead. Existing event links and relationships are skipped (also enforced by
the unique constraints with `ON CONFLICT DO NOTHING`). A second run on unchanged data creates nothing.

## Design choices

- Sync SQLAlchemy and sync routes: simplest, and fast enough for a demo.
- Alembic migration is hand-written to match the models (explicit constraint names). If you change a model, add a new migration (`alembic revision --autogenerate -m "..."` and review it).
- CORS allows only `FRONTEND_ORIGIN`, and only GET/POST/PATCH.
- Demo load/reset endpoints return 403 unless `APP_ENV=development`.
