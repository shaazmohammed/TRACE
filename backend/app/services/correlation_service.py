"""Runs the correlation engine over stored events and saves the results.

Re-running is safe: a group of events that already belongs to an incident
extends that incident instead of creating a new one, and links/events that
are already stored are skipped (enforced by unique constraints as well).
"""

from datetime import timedelta

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.core.enums import IncidentStatus
from app.models import EvidenceRelationship, Incident, SecurityEvent, incident_events
from app.schemas.incident import CorrelationRunOut
from app.services.correlation.engine import correlate
from app.services.correlation.text import build_incident_text
from app.services.correlation.types import CorrelationConfig, EventData, Link


def config_from_settings(settings: Settings) -> CorrelationConfig:
    return CorrelationConfig(
        failed_login_threshold=settings.failed_login_threshold,
        failed_login_window=timedelta(minutes=settings.failed_login_window_minutes),
        success_window=timedelta(minutes=settings.success_window_minutes),
        device_window=timedelta(minutes=settings.device_window_minutes),
        endpoint_network_window=timedelta(minutes=settings.endpoint_network_window_minutes),
        min_device_severity=settings.min_device_severity,
    )


def _to_event_data(row: SecurityEvent) -> EventData:
    return EventData(
        id=row.id,
        timestamp=row.timestamp,
        source=row.source,
        event_type=row.event_type,
        severity=row.severity,
        username=row.username,
        source_ip=row.source_ip,
        device_id=row.device_id,
        raw_data=row.raw_data or {},
    )


def run_correlation(db: Session, cfg: CorrelationConfig | None = None) -> CorrelationRunOut:
    """Correlate all stored events in a single transaction."""
    cfg = cfg or config_from_settings(get_settings())
    try:
        result = _run(db, cfg)
        db.commit()
        return result
    except Exception:
        db.rollback()
        raise


def _run(db: Session, cfg: CorrelationConfig) -> CorrelationRunOut:
    rows = db.scalars(select(SecurityEvent).order_by(SecurityEvent.timestamp, SecurityEvent.id)).all()
    events = [_to_event_data(r) for r in rows]
    events_by_id = {e.id: e for e in events}
    result = correlate(events, cfg)

    created = updated = unchanged = relationships_created = 0
    for group in result.groups:
        title, summary, severity = build_incident_text(group, events_by_id)
        incident = _find_incident(db, group.event_ids)
        is_new = incident is None
        if incident is None:
            incident = Incident(
                title=title, summary=summary, severity=severity, status=IncidentStatus.OPEN.value
            )
            db.add(incident)
            db.flush()  # assigns incident.id

        new_events = _add_events(db, incident.id, group.event_ids)
        new_links = _add_relationships(db, incident.id, group.links)
        relationships_created += new_links

        if is_new:
            created += 1
        elif new_events or new_links:
            # Refresh generated text; the analyst's status is left untouched.
            incident.title, incident.summary, incident.severity = title, summary, severity
            updated += 1
        else:
            unchanged += 1

    return CorrelationRunOut(
        events_considered=len(events),
        incidents_created=created,
        incidents_updated=updated,
        incidents_unchanged=unchanged,
        relationships_created=relationships_created,
    )


def _find_incident(db: Session, event_ids: tuple[int, ...]) -> Incident | None:
    """Existing incident that already contains any of these events (lowest id wins)."""
    return db.scalars(
        select(Incident)
        .join(incident_events, incident_events.c.incident_id == Incident.id)
        .where(incident_events.c.event_id.in_(event_ids))
        .order_by(Incident.id)
        .limit(1)
    ).first()


def _add_events(db: Session, incident_id: int, event_ids: tuple[int, ...]) -> int:
    existing = set(
        db.scalars(select(incident_events.c.event_id).where(incident_events.c.incident_id == incident_id))
    )
    missing = [i for i in event_ids if i not in existing]
    if missing:
        db.execute(
            pg_insert(incident_events)
            .values([{"incident_id": incident_id, "event_id": i} for i in missing])
            .on_conflict_do_nothing()
        )
    return len(missing)


def _add_relationships(db: Session, incident_id: int, links: tuple[Link, ...]) -> int:
    existing = {
        (row.source_event_id, row.target_event_id, row.rule_id)
        for row in db.execute(
            select(
                EvidenceRelationship.source_event_id,
                EvidenceRelationship.target_event_id,
                EvidenceRelationship.rule_id,
            ).where(EvidenceRelationship.incident_id == incident_id)
        )
    }
    missing = [l for l in links if (l.source_event_id, l.target_event_id, l.rule_id) not in existing]
    if missing:
        db.execute(
            pg_insert(EvidenceRelationship)
            .values(
                [
                    {
                        "incident_id": incident_id,
                        "source_event_id": l.source_event_id,
                        "target_event_id": l.target_event_id,
                        "relationship_type": l.relationship_type,
                        "evidence_type": l.evidence_type,
                        "rule_id": l.rule_id,
                        "rule_name": l.rule_name,
                        "explanation": l.explanation,
                    }
                    for l in missing
                ]
            )
            .on_conflict_do_nothing(constraint="uq_evidence_link")
        )
    return len(missing)
