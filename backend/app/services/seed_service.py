"""Loads and resets the synthetic demo dataset in data/demo_events.json."""

import json
from pathlib import Path

from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from app.models import SecurityEvent
from app.schemas.event import EventCreate

# backend/app/services/seed_service.py -> repository root is three levels up from the folder
DEMO_FILE = Path(__file__).resolve().parents[3] / "data" / "demo_events.json"


def read_demo_events(path: Path = DEMO_FILE) -> list[EventCreate]:
    """Read and validate the demo file; raises if any event is malformed."""
    return [EventCreate.model_validate(row) for row in json.loads(path.read_text(encoding="utf-8"))]


def load_demo_events(db: Session) -> tuple[int, int]:
    """Insert demo events that are not stored yet. Returns (inserted, total_events)."""
    events = read_demo_events()
    try:
        known = set(db.scalars(select(SecurityEvent.external_id)))
        new_rows = [
            SecurityEvent(
                external_id=e.external_id,
                timestamp=e.timestamp,
                source=e.source.value,
                event_type=e.event_type,
                username=e.username,
                source_ip=e.source_ip,
                device_id=e.device_id,
                severity=e.severity.value,
                description=e.description,
                raw_data=e.raw_data,
            )
            for e in events
            if e.external_id not in known
        ]
        db.add_all(new_rows)
        db.commit()
    except Exception:
        db.rollback()
        raise
    total = db.scalar(select(func.count()).select_from(SecurityEvent)) or 0
    return len(new_rows), total


def reset_demo_data(db: Session) -> tuple[int, int]:
    """Delete ALL stored data and reload the demo events (ids restart at 1)."""
    read_demo_events()  # fail early, before deleting anything, if the file is invalid
    try:
        db.execute(
            text(
                "TRUNCATE TABLE response_actions, investigation_notes, evidence_relationships, "
                "incident_events, incidents, security_events RESTART IDENTITY CASCADE"
            )
        )
        db.commit()
    except Exception:
        db.rollback()
        raise
    return load_demo_events(db)
