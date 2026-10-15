"""Plain data types used by the correlation engine (no database objects)."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any


@dataclass(frozen=True)
class EventData:
    """A security event as seen by the rules."""

    id: int
    timestamp: datetime
    source: str
    event_type: str
    severity: str
    username: str | None = None
    source_ip: str | None = None
    device_id: str | None = None
    raw_data: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class CorrelationConfig:
    """Tunable thresholds. Defaults match the demo scenario."""

    failed_login_threshold: int = 3
    failed_login_window: timedelta = timedelta(minutes=10)
    success_window: timedelta = timedelta(minutes=15)
    device_window: timedelta = timedelta(minutes=30)
    endpoint_network_window: timedelta = timedelta(minutes=10)
    min_device_severity: str = "Medium"


@dataclass(frozen=True)
class Link:
    """One evidence-backed relationship between two events."""

    source_event_id: int
    target_event_id: int
    rule_id: str
    rule_name: str
    relationship_type: str
    evidence_type: str  # "observed" or "hypothesis"
    explanation: str


@dataclass(frozen=True)
class Group:
    """Events connected through at least one link (a potential incident)."""

    event_ids: tuple[int, ...]
    links: tuple[Link, ...]


@dataclass(frozen=True)
class CorrelationResult:
    links: tuple[Link, ...]
    groups: tuple[Group, ...]
