from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.enums import IncidentStatus, Severity
from app.db.session import get_db
from app.schemas.incident import (
    ActionCreate,
    ActionOut,
    IncidentDetailOut,
    IncidentSummaryOut,
    NoteCreate,
    NoteOut,
    RelationshipOut,
    StatusUpdate,
    TimelineEntryOut,
)
from app.services import incident_service

router = APIRouter(prefix="/incidents", tags=["incidents"])


@router.get("", response_model=list[IncidentSummaryOut])
def list_incidents(
    status_filter: IncidentStatus | None = Query(None, alias="status"),
    severity: Severity | None = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
) -> list[IncidentSummaryOut]:
    return incident_service.list_incidents(
        db,
        status=status_filter.value if status_filter else None,
        severity=severity.value if severity else None,
        limit=limit,
        offset=offset,
    )


@router.get("/{incident_id}", response_model=IncidentDetailOut)
def get_incident(incident_id: int, db: Session = Depends(get_db)) -> IncidentDetailOut:
    return incident_service.get_incident_detail(db, incident_id)


@router.get("/{incident_id}/timeline", response_model=list[TimelineEntryOut])
def get_timeline(incident_id: int, db: Session = Depends(get_db)) -> list[TimelineEntryOut]:
    return incident_service.get_timeline(db, incident_id)


@router.get("/{incident_id}/relationships", response_model=list[RelationshipOut])
def get_relationships(incident_id: int, db: Session = Depends(get_db)) -> list[RelationshipOut]:
    return incident_service.list_relationships(db, incident_id)


@router.patch("/{incident_id}/status", response_model=IncidentSummaryOut)
def update_status(
    incident_id: int, body: StatusUpdate, db: Session = Depends(get_db)
) -> IncidentSummaryOut:
    return incident_service.update_status(db, incident_id, body.status)


@router.get("/{incident_id}/notes", response_model=list[NoteOut])
def list_notes(incident_id: int, db: Session = Depends(get_db)) -> list[NoteOut]:
    return incident_service.list_notes(db, incident_id)


@router.post("/{incident_id}/notes", response_model=NoteOut, status_code=status.HTTP_201_CREATED)
def add_note(incident_id: int, body: NoteCreate, db: Session = Depends(get_db)) -> NoteOut:
    return incident_service.add_note(db, incident_id, body)


@router.get("/{incident_id}/actions", response_model=list[ActionOut])
def list_actions(incident_id: int, db: Session = Depends(get_db)) -> list[ActionOut]:
    return incident_service.list_actions(db, incident_id)


@router.post("/{incident_id}/actions", response_model=ActionOut, status_code=status.HTTP_201_CREATED)
def add_action(incident_id: int, body: ActionCreate, db: Session = Depends(get_db)) -> ActionOut:
    return incident_service.add_action(db, incident_id, body)
