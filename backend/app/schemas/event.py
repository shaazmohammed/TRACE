from datetime import datetime
from typing import Any

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field

from app.core.enums import Severity, Source


class EventCreate(BaseModel):
    """Validated shape of one event in data/demo_events.json."""

    external_id: str = Field(min_length=1, max_length=64)
    timestamp: AwareDatetime
    source: Source
    event_type: str = Field(min_length=1, max_length=50)
    username: str | None = Field(default=None, max_length=100)
    source_ip: str | None = Field(default=None, max_length=45)
    device_id: str | None = Field(default=None, max_length=100)
    severity: Severity
    description: str = Field(min_length=1)
    raw_data: dict[str, Any] = Field(default_factory=dict)


class EventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    external_id: str
    timestamp: datetime
    source: str
    event_type: str
    username: str | None
    source_ip: str | None
    device_id: str | None
    severity: str
    description: str
    raw_data: dict[str, Any]


class EventPage(BaseModel):
    items: list[EventOut]
    total: int
    limit: int
    offset: int
