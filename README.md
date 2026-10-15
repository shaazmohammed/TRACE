# TRACE — Threat Reconstruction and Analysis Console

TRACE processes a fixed set of **synthetic** security events, links related events with explainable
rules, groups them into **potential incidents**, shows the evidence behind every link, and lets an
analyst track the investigation in PostgreSQL.

It does three things only:

1. **Correlation** – deterministic rules link events and group them into potential incidents.
2. **Visual investigation** – chronological timeline + Cytoscape.js evidence graph; every link shows its rule and explanation.
3. **SQL incident management** – events, incidents, notes and response actions persist in PostgreSQL, with filtering, status updates and action history.

No machine learning, no AI, no authentication. Incidents are *potential* incidents for analyst review, not confirmed attacks.

> **Status:** the correlation engine tests were run and pass (21/21). The FastAPI app, migrations, API tests
> and the React frontend were written but **not executed** (the build sandbox could not install packages).
> Follow the steps below and report any error. See [Known limitations](#known-limitations).

## Requirements

- Python 3.11+
- Node.js 18+ and npm
- PostgreSQL 14+ running locally

## 1. Create the database

```bash
# Linux/macOS (adjust the superuser as needed). On Windows use pgAdmin or psql with the postgres user.
psql -U postgres -c "CREATE ROLE trace_user LOGIN PASSWORD 'choose_a_password';"
psql -U postgres -c "CREATE DATABASE trace_db OWNER trace_user;"
psql -U postgres -c "CREATE DATABASE trace_test_db OWNER trace_user;"   # used only by the tests
```

## 2. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate            # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                 # then edit DATABASE_URL / TEST_DATABASE_URL with your password

alembic upgrade head                 # create the tables
python -m scripts.seed_demo --correlate   # load demo events and run correlation
uvicorn app.main:app --reload --port 8000
```

API docs (auto-generated): <http://localhost:8000/docs>. Health check: <http://localhost:8000/api/health>.

## 3. Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev                          # http://localhost:5173
```

The dashboard has buttons for **Load demo data**, **Run correlation** and **Reset demo data**,
so you can also start with an empty database and do everything from the browser.

## 4. Tests

```bash
cd backend
# TEST_DATABASE_URL must point to a database whose name contains "test" (its tables are wiped).
pytest -v
```

- `tests/test_rules.py` – correlation rules and the demo scenario (pure Python, no database).
- `tests/test_api.py` – API behaviour against the PostgreSQL test database.

## Demo scenario

The dataset in `data/demo_events.json` has 11 fictional events (users `jdoe-sample`, `asmith-sample`;
devices `WS-SYNTH-014`, `LAPTOP-SYNTH-022`; documentation-reserved IPs). Expected result: **one potential
incident with 7 events** (4 failed logins, a success from an unfamiliar IP, a suspicious script run, a
network connection from the same process) and **4 events deliberately left out** (a lone failed login, a
routine login, a routine network event, and a backup job hours later on the same device).

Reload or reset the data any time:

```bash
python -m scripts.seed_demo              # add missing events only
python -m scripts.seed_demo --reset      # delete ALL data, reload (development only)
```

## Project layout

```
backend/app/
  api/routes/       HTTP endpoints (thin: validation + calling services)
  services/         business logic; services/correlation/ is the rule engine (no DB/web imports)
  models/           SQLAlchemy 2.x tables
  schemas/          Pydantic request/response models
  core/ db/         settings, enums, errors; engine and session
backend/alembic/    migrations        backend/tests/   pytest
frontend/src/       services/api.ts (typed client), types/, hooks/, components/, pages/
data/               demo_events.json
docs/               ARCHITECTURE.md, API.md, queries.sql
```

More detail: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) (schema, rules), [docs/API.md](docs/API.md) (endpoints),
[docs/queries.sql](docs/queries.sql) (useful SQL).

## Known limitations

- **Not fully verified yet:** only the rule engine tests have been run (see Status above).
- Rules are simple and tuned to the demo data; thresholds are configurable via `.env`, but real logs would need more rules and tuning.
- The device rule (R3) is a **hypothesis** link and is restricted to Medium+ severity events; it can still link unrelated activity on a shared device.
- Incident growth: if new events later extend a group, the existing incident is extended. If a new group would connect two existing incidents, they are **not merged**.
- Re-running correlation refreshes an incident's generated title/summary but never changes its status, notes or actions.
- No authentication or user accounts; the note author is a free-text label.
- Demo endpoints (`/api/demo/*`) are disabled unless `APP_ENV=development`. Reset deletes everything.
- The frontend is a plain functional shell to be restyled with v0.app; no router library or client-side tests.
- All data is synthetic. Do not load real logs without adding authentication, access control and data-handling controls.
