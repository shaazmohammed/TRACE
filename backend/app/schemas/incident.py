from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.core.enums import ActionStatus, ActionType, IncidentStatus
from app.schemas.event import EventOut


class RelationshipOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    incident_id: int
    source_event_id: int
    target_event_id: int
    relationship_type: str
    evidence_type: str  # "observed" or "hypothesis"
    rule_id: str
    rule_name: str
    explanation: str


class NoteCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    content: str = Field(min_length=1, max_length=4000)
    author: str = Field(default="analyst", min_length=1, max_length=80)


class NoteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    incident_id: int
    content: str
    author: str
    created_at: datetime


class ActionCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    action_type: ActionType
    description: str = Field(min_length=1, max_length=2000)
    status: ActionStatus = ActionStatus.PLANNED


class ActionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    incident_id: int
    action_type: str
    description: str
    status: str
    created_at: datetime


class StatusUpdate(BaseModel):
    status: IncidentStatus


class IncidentSummaryOut(BaseModel):
    id: int
    title: str
    summary: str
    severity: str
    status: str
    created_at: datetime
    updated_at: datetime
    event_count: int


class IncidentDetailOut(IncidentSummaryOut):
    events: list[EventOut]
    relationships: list[RelationshipOut]
    notes: list[NoteOut]
    actions: list[ActionOut]


class TimelineEntryOut(BaseModel):
    event: EventOut
    # Relationships that point at this event, i.e. why it was linked to earlier events.
    explained_by: list[RelationshipOut]


class OverviewOut(BaseModel):
    total_events: int
    total_incidents: int
    incidents_by_status: dict[str, int]
    incidents_by_severity: dict[str, int]


class CorrelationRunOut(BaseModel):
    events_considered: int
    incidents_created: int
    incidents_updated: int
    incidents_unchanged: int
    relationships_created: int


class DemoLoadOut(BaseModel):
    events_inserted: int
    total_events: int
