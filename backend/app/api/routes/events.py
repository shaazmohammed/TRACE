from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.enums import Severity, Source
from app.db.session import get_db
from app.schemas.event import EventOut, EventPage
from app.services import event_service

router = APIRouter(prefix="/events", tags=["events"])


@router.get("", response_model=EventPage)
def list_events(
    search: str | None = Query(None, max_length=100),
    source: Source | None = None,
    severity: Severity | None = None,
    event_type: str | None = Query(None, max_length=50),
    username: str | None = Query(None, max_length=100),
    device_id: str | None = Query(None, max_length=100),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
) -> EventPage:
    return event_service.list_events(
        db,
        search=search,
        source=source.value if source else None,
        severity=severity.value if severity else None,
        event_type=event_type,
        username=username,
        device_id=device_id,
        limit=limit,
        offset=offset,
    )


@router.get("/{event_id}", response_model=EventOut)
def get_event(event_id: int, db: Session = Depends(get_db)) -> EventOut:
    return event_service.get_event(db, event_id)
