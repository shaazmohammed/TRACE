"""Reading and updating incidents, notes and response actions."""

from collections import defaultdict

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.enums import IncidentStatus, Severity
from app.core.errors import NotFoundError
from app.models import (
    EvidenceRelationship,
    Incident,
    InvestigationNote,
    ResponseAction,
    SecurityEvent,
    incident_events,
)
from app.schemas.event import EventOut
from app.schemas.incident import (
    ActionCreate,
    ActionOut,
    IncidentDetailOut,
    IncidentSummaryOut,
    NoteCreate,
    NoteOut,
    OverviewOut,
    RelationshipOut,
    TimelineEntryOut,
)


def _get_incident(db: Session, incident_id: int) -> Incident:
    incident = db.get(Incident, incident_id)
    if incident is None:
        raise NotFoundError("Incident", incident_id)
    return incident


def _summary_fields(incident: Incident, event_count: int) -> dict:
    return {
        "id": incident.id,
        "title": incident.title,
        "summary": incident.summary,
        "severity": incident.severity,
        "status": incident.status,
        "created_at": incident.created_at,
        "updated_at": incident.updated_at,
        "event_count": event_count,
    }


def list_incidents(
    db: Session,
    *,
    status: str | None = None,
    severity: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> list[IncidentSummaryOut]:
    counts = (
        select(incident_events.c.incident_id, func.count().label("event_count"))
        .group_by(incident_events.c.incident_id)
        .subquery()
    )
    stmt = select(Incident, func.coalesce(counts.c.event_count, 0)).outerjoin(
        counts, counts.c.incident_id == Incident.id
    )
    if status:
        stmt = stmt.where(Incident.status == status)
    if severity:
        stmt = stmt.where(Incident.severity == severity)
    stmt = stmt.order_by(Incident.created_at.desc(), Incident.id.desc()).limit(limit).offset(offset)
    return [IncidentSummaryOut(**_summary_fields(i, n)) for i, n in db.execute(stmt).all()]


def get_incident_detail(db: Session, incident_id: int) -> IncidentDetailOut:
    incident = _get_incident(db, incident_id)
    events = sorted(incident.events, key=lambda e: (e.timestamp, e.id))
    return IncidentDetailOut(
        **_summary_fields(incident, len(events)),
        events=[EventOut.model_validate(e) for e in events],
        relationships=[RelationshipOut.model_validate(r) for r in incident.evidence],
        notes=[NoteOut.model_validate(n) for n in incident.notes],
        actions=[ActionOut.model_validate(a) for a in incident.actions],
    )


def list_relationships(db: Session, incident_id: int) -> list[RelationshipOut]:
    _get_incident(db, incident_id)
    rows = db.scalars(
        select(EvidenceRelationship)
        .where(EvidenceRelationship.incident_id == incident_id)
        .order_by(EvidenceRelationship.id)
    ).all()
    return [RelationshipOut.model_validate(r) for r in rows]


def get_timeline(db: Session, incident_id: int) -> list[TimelineEntryOut]:
    """Events in time order, each with the relationships that explain how it was linked."""
    incident = _get_incident(db, incident_id)
    explained_by: dict[int, list[RelationshipOut]] = defaultdict(list)
    for rel in incident.evidence:
        explained_by[rel.target_event_id].append(RelationshipOut.model_validate(rel))
    events = sorted(incident.events, key=lambda e: (e.timestamp, e.id))
    return [
        TimelineEntryOut(event=EventOut.model_validate(e), explained_by=explained_by.get(e.id, []))
        for e in events
    ]


def update_status(db: Session, incident_id: int, status: IncidentStatus) -> IncidentSummaryOut:
    incident = _get_incident(db, incident_id)
    incident.status = status.value
    db.commit()
    db.refresh(incident)
    count = db.scalar(
        select(func.count()).select_from(incident_events).where(incident_events.c.incident_id == incident_id)
    )
    return IncidentSummaryOut(**_summary_fields(incident, count or 0))


def add_note(db: Session, incident_id: int, data: NoteCreate) -> NoteOut:
    _get_incident(db, incident_id)
    note = InvestigationNote(incident_id=incident_id, content=data.content, author=data.author)
    db.add(note)
    db.commit()
    db.refresh(note)
    return NoteOut.model_validate(note)


def list_notes(db: Session, incident_id: int) -> list[NoteOut]:
    _get_incident(db, incident_id)
    rows = db.scalars(
        select(InvestigationNote)
        .where(InvestigationNote.incident_id == incident_id)
        .order_by(InvestigationNote.id)
    ).all()
    return [NoteOut.model_validate(r) for r in rows]


def add_action(db: Session, incident_id: int, data: ActionCreate) -> ActionOut:
    _get_incident(db, incident_id)
    action = ResponseAction(
        incident_id=incident_id,
        action_type=data.action_type.value,
        description=data.description,
        status=data.status.value,
    )
    db.add(action)
    db.commit()
    db.refresh(action)
    return ActionOut.model_validate(action)


def list_actions(db: Session, incident_id: int) -> list[ActionOut]:
    """Action history for an incident, oldest first."""
    _get_incident(db, incident_id)
    rows = db.scalars(
        select(ResponseAction).where(ResponseAction.incident_id == incident_id).order_by(ResponseAction.id)
    ).all()
    return [ActionOut.model_validate(r) for r in rows]


def get_overview(db: Session) -> OverviewOut:
    by_status = {s.value: 0 for s in IncidentStatus}
    by_severity = {s.value: 0 for s in Severity}
    for status, count in db.execute(select(Incident.status, func.count()).group_by(Incident.status)):
        by_status[status] = count
    for severity, count in db.execute(select(Incident.severity, func.count()).group_by(Incident.severity)):
        by_severity[severity] = count
    return OverviewOut(
        total_events=db.scalar(select(func.count()).select_from(SecurityEvent)) or 0,
        total_incidents=sum(by_status.values()),
        incidents_by_status=by_status,
        incidents_by_severity=by_severity,
    )
