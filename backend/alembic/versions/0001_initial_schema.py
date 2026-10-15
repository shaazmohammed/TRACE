"""Initial schema: events, incidents, evidence, notes, response actions.

Revision ID: 0001
Revises:
"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None

NOW = sa.text("now()")


def upgrade() -> None:
    op.create_table(
        "security_events",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("external_id", sa.String(64), nullable=False),
        sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False),
        sa.Column("source", sa.String(20), nullable=False),
        sa.Column("event_type", sa.String(50), nullable=False),
        sa.Column("username", sa.String(100)),
        sa.Column("source_ip", sa.String(45)),
        sa.Column("device_id", sa.String(100)),
        sa.Column("severity", sa.String(10), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("raw_data", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=NOW),
        sa.UniqueConstraint("external_id"),
        sa.CheckConstraint(
            "source IN ('Authentication', 'Endpoint', 'Network')", name="ck_security_events_source"
        ),
        sa.CheckConstraint(
            "severity IN ('Low', 'Medium', 'High', 'Critical')", name="ck_security_events_severity"
        ),
    )
    op.create_index("ix_security_events_timestamp", "security_events", ["timestamp"])
    op.create_index("ix_security_events_username", "security_events", ["username"])
    op.create_index("ix_security_events_device_id", "security_events", ["device_id"])
    op.create_index("ix_security_events_severity", "security_events", ["severity"])

    op.create_table(
        "incidents",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("summary", sa.Text(), nullable=False),
        sa.Column("severity", sa.String(10), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="Open"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=NOW),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=NOW),
        sa.CheckConstraint(
            "severity IN ('Low', 'Medium', 'High', 'Critical')", name="ck_incidents_severity"
        ),
        sa.CheckConstraint(
            "status IN ('Open', 'Investigating', 'Resolved', 'False Positive')",
            name="ck_incidents_status",
        ),
    )
    op.create_index("ix_incidents_status", "incidents", ["status"])
    op.create_index("ix_incidents_severity", "incidents", ["severity"])

    op.create_table(
        "incident_events",
        sa.Column(
            "incident_id",
            sa.Integer(),
            sa.ForeignKey("incidents.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "event_id",
            sa.Integer(),
            sa.ForeignKey("security_events.id", ondelete="CASCADE"),
            primary_key=True,
        ),
    )
    op.create_index("ix_incident_events_event_id", "incident_events", ["event_id"])

    op.create_table(
        "evidence_relationships",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "incident_id", sa.Integer(), sa.ForeignKey("incidents.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column(
            "source_event_id",
            sa.Integer(),
            sa.ForeignKey("security_events.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "target_event_id",
            sa.Integer(),
            sa.ForeignKey("security_events.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("relationship_type", sa.String(50), nullable=False),
        sa.Column("evidence_type", sa.String(20), nullable=False),
        sa.Column("rule_id", sa.String(50), nullable=False),
        sa.Column("rule_name", sa.String(120), nullable=False),
        sa.Column("explanation", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=NOW),
        sa.UniqueConstraint(
            "incident_id", "source_event_id", "target_event_id", "rule_id", name="uq_evidence_link"
        ),
        sa.CheckConstraint("source_event_id <> target_event_id", name="ck_evidence_distinct_events"),
        sa.CheckConstraint("evidence_type IN ('observed', 'hypothesis')", name="ck_evidence_type"),
    )
    op.create_index("ix_evidence_incident_id", "evidence_relationships", ["incident_id"])

    op.create_table(
        "investigation_notes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "incident_id", sa.Integer(), sa.ForeignKey("incidents.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("author", sa.String(80), nullable=False, server_default="analyst"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=NOW),
    )
    op.create_index("ix_notes_incident_id", "investigation_notes", ["incident_id"])

    op.create_table(
        "response_actions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "incident_id", sa.Integer(), sa.ForeignKey("incidents.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column("action_type", sa.String(30), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="Planned"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=NOW),
        sa.CheckConstraint(
            "action_type IN ('Isolate Device', 'Reset Credentials', 'Block IP', 'Monitor', 'Other')",
            name="ck_actions_type",
        ),
        sa.CheckConstraint(
            "status IN ('Planned', 'Completed', 'Failed')", name="ck_actions_status"
        ),
    )
    op.create_index("ix_actions_incident_id", "response_actions", ["incident_id"])


def downgrade() -> None:
    op.drop_table("response_actions")
    op.drop_table("investigation_notes")
    op.drop_table("evidence_relationships")
    op.drop_table("incident_events")
    op.drop_table("incidents")
    op.drop_table("security_events")
