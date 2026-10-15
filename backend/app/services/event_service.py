"""Queries for security events."""

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.errors import NotFoundError
from app.models import SecurityEvent
from app.schemas.event import EventOut, EventPage


def list_events(
    db: Session,
    *,
    search: str | None = None,
    source: str | None = None,
    severity: str | None = None,
    event_type: str | None = None,
    username: str | None = None,
    device_id: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> EventPage:
    conditions = []
    if search and search.strip():
        term = search.strip()
        conditions.append(
            or_(
                SecurityEvent.description.icontains(term, autoescape=True),
                SecurityEvent.username.icontains(term, autoescape=True),
                SecurityEvent.source_ip.icontains(term, autoescape=True),
                SecurityEvent.device_id.icontains(term, autoescape=True),
                SecurityEvent.event_type.icontains(term, autoescape=True),
            )
        )
    if source:
        conditions.append(SecurityEvent.source == source)
    if severity:
        conditions.append(SecurityEvent.severity == severity)
    if event_type:
        conditions.append(SecurityEvent.event_type == event_type)
    if username:
        conditions.append(SecurityEvent.username == username)
    if device_id:
        conditions.append(SecurityEvent.device_id == device_id)

    total = db.scalar(select(func.count()).select_from(SecurityEvent).where(*conditions)) or 0
    rows = db.scalars(
        select(SecurityEvent)
        .where(*conditions)
        .order_by(SecurityEvent.timestamp.desc(), SecurityEvent.id.desc())
        .limit(limit)
        .offset(offset)
    ).all()
    return EventPage(
        items=[EventOut.model_validate(r) for r in rows], total=total, limit=limit, offset=offset
    )


def get_event(db: Session, event_id: int) -> EventOut:
    row = db.get(SecurityEvent, event_id)
    if row is None:
        raise NotFoundError("Event", event_id)
    return EventOut.model_validate(row)
