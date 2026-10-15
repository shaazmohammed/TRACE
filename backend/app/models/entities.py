"""SQLAlchemy 2.x models. Constraint names are explicit so migrations stay in sync."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import (
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Index,
    String,
    Table,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.enums import ActionStatus, ActionType, IncidentStatus, Severity, Source
from app.db.base import Base


def _in(column: str, enum_cls: type) -> str:
    values = ", ".join(f"'{member.value}'" for member in enum_cls)  # type: ignore[attr-defined]
    return f"{column} IN ({values})"


# Many-to-many link between incidents and events; the composite key prevents duplicates.
incident_events = Table(
    "incident_events",
    Base.metadata,
    Column("incident_id", ForeignKey("incidents.id", ondelete="CASCADE"), primary_key=True),
    Column("event_id", ForeignKey("security_events.id", ondelete="CASCADE"), primary_key=True),
    Index("ix_incident_events_event_id", "event_id"),
)


class SecurityEvent(Base):
    __tablename__ = "security_events"
    __table_args__ = (
        CheckConstraint(_in("source", Source), name="ck_security_events_source"),
        CheckConstraint(_in("severity", Severity), name="ck_security_events_severity"),
        Index("ix_security_events_timestamp", "timestamp"),
        Index("ix_security_events_username", "username"),
        Index("ix_security_events_device_id", "device_id"),
        Index("ix_security_events_severity", "severity"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    external_id: Mapped[str] = mapped_column(String(64), unique=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    source: Mapped[str] = mapped_column(String(20))
    event_type: Mapped[str] = mapped_column(String(50))
    username: Mapped[str | None] = mapped_column(String(100))
    source_ip: Mapped[str | None] = mapped_column(String(45))
    device_id: Mapped[str | None] = mapped_column(String(100))
    severity: Mapped[str] = mapped_column(String(10))
    description: Mapped[str] = mapped_column(Text)
    raw_data: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, server_default="{}")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Incident(Base):
    __tablename__ = "incidents"
    __table_args__ = (
        CheckConstraint(_in("severity", Severity), name="ck_incidents_severity"),
        CheckConstraint(_in("status", IncidentStatus), name="ck_incidents_status"),
        Index("ix_incidents_status", "status"),
        Index("ix_incidents_severity", "severity"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200))
    summary: Mapped[str] = mapped_column(Text)
    severity: Mapped[str] = mapped_column(String(10))
    status: Mapped[str] = mapped_column(
        String(20), default=IncidentStatus.OPEN.value, server_default=IncidentStatus.OPEN.value
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    events: Mapped[list[SecurityEvent]] = relationship(
        secondary=incident_events, order_by="SecurityEvent.timestamp"
    )
    evidence: Mapped[list[EvidenceRelationship]] = relationship(
        back_populates="incident", cascade="all, delete-orphan", order_by="EvidenceRelationship.id"
    )
    notes: Mapped[list[InvestigationNote]] = relationship(
        back_populates="incident", cascade="all, delete-orphan", order_by="InvestigationNote.id"
    )
    actions: Mapped[list[ResponseAction]] = relationship(
        back_populates="incident", cascade="all, delete-orphan", order_by="ResponseAction.id"
    )


class EvidenceRelationship(Base):
    __tablename__ = "evidence_relationships"
    __table_args__ = (
        UniqueConstraint(
            "incident_id", "source_event_id", "target_event_id", "rule_id", name="uq_evidence_link"
        ),
        CheckConstraint("source_event_id <> target_event_id", name="ck_evidence_distinct_events"),
        CheckConstraint("evidence_type IN ('observed', 'hypothesis')", name="ck_evidence_type"),
        Index("ix_evidence_incident_id", "incident_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    incident_id: Mapped[int] = mapped_column(ForeignKey("incidents.id", ondelete="CASCADE"))
    source_event_id: Mapped[int] = mapped_column(ForeignKey("security_events.id", ondelete="CASCADE"))
    target_event_id: Mapped[int] = mapped_column(ForeignKey("security_events.id", ondelete="CASCADE"))
    relationship_type: Mapped[str] = mapped_column(String(50))
    evidence_type: Mapped[str] = mapped_column(String(20))
    rule_id: Mapped[str] = mapped_column(String(50))
    rule_name: Mapped[str] = mapped_column(String(120))
    explanation: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    incident: Mapped[Incident] = relationship(back_populates="evidence")


class InvestigationNote(Base):
    __tablename__ = "investigation_notes"
    __table_args__ = (Index("ix_notes_incident_id", "incident_id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    incident_id: Mapped[int] = mapped_column(ForeignKey("incidents.id", ondelete="CASCADE"))
    content: Mapped[str] = mapped_column(Text)
    author: Mapped[str] = mapped_column(String(80), default="analyst", server_default="analyst")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    incident: Mapped[Incident] = relationship(back_populates="notes")


class ResponseAction(Base):
    __tablename__ = "response_actions"
    __table_args__ = (
        CheckConstraint(_in("action_type", ActionType), name="ck_actions_type"),
        CheckConstraint(_in("status", ActionStatus), name="ck_actions_status"),
        Index("ix_actions_incident_id", "incident_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    incident_id: Mapped[int] = mapped_column(ForeignKey("incidents.id", ondelete="CASCADE"))
    action_type: Mapped[str] = mapped_column(String(30))
    description: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(
        String(20), default=ActionStatus.PLANNED.value, server_default=ActionStatus.PLANNED.value
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    incident: Mapped[Incident] = relationship(back_populates="actions")
