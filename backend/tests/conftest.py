"""Test setup. Uses a SEPARATE PostgreSQL database (TEST_DATABASE_URL); its tables are wiped."""

import os

TEST_DATABASE_URL = os.environ.get(
    "TEST_DATABASE_URL", "postgresql+psycopg://trace_user:CHANGE_ME@localhost:5432/trace_test_db"
)
# Safety: these tests TRUNCATE tables, so never run them against a non-test database.
assert "test" in TEST_DATABASE_URL.rsplit("/", 1)[-1], "TEST_DATABASE_URL must point to a database whose name contains 'test'"

# Must be set before the app is imported, because settings and the engine are created at import time.
os.environ["DATABASE_URL"] = TEST_DATABASE_URL
os.environ["APP_ENV"] = "development"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import text  # noqa: E402

from app.db.base import Base  # noqa: E402
from app.db.session import engine  # noqa: E402
from app.main import app  # noqa: E402
import app.models  # noqa: E402,F401


@pytest.fixture(scope="session", autouse=True)
def database():
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    yield
    Base.metadata.drop_all(engine)


@pytest.fixture(autouse=True)
def clean_tables(database):
    with engine.begin() as conn:
        conn.execute(
            text(
                "TRUNCATE TABLE response_actions, investigation_notes, evidence_relationships, "
                "incident_events, incidents, security_events RESTART IDENTITY CASCADE"
            )
        )


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture
def demo_client(client: TestClient) -> TestClient:
    """Client with the demo events loaded and correlation already run."""
    assert client.post("/api/demo/load").status_code == 200
    assert client.post("/api/correlation/run").status_code == 200
    return client
