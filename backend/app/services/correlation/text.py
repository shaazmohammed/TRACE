"""Builds incident title, summary and severity from a correlated group."""

from __future__ import annotations

from collections import Counter

from app.core.enums import SEVERITY_ORDER, EvidenceType

from .types import EventData, Group


def build_incident_text(group: Group, events_by_id: dict[int, EventData]) -> tuple[str, str, str]:
    """Return (title, summary, severity). Wording stays hedged: these are potential incidents."""
    events = [events_by_id[i] for i in group.event_ids]
    users = sorted({e.username for e in events if e.username})
    devices = sorted({e.device_id for e in events if e.device_id})

    parts = []
    if users:
        parts.append(f"user {', '.join(users)}")
    if devices:
        parts.append(f"device {', '.join(devices)}")
    title = "Potential incident: " + ("; ".join(parts) if parts else f"{len(events)} correlated events")

    rule_counts = Counter(link.rule_name for link in group.links)
    rules_text = "; ".join(f"{name} ({count})" for name, count in sorted(rule_counts.items()))
    observed = sum(1 for l in group.links if l.evidence_type == EvidenceType.OBSERVED.value)
    hypothesis = len(group.links) - observed
    summary = (
        f"{len(events)} events were linked by deterministic rules: {rules_text}. "
        f"{observed} link(s) are directly supported by event data; {hypothesis} are hypotheses. "
        "This is a potential incident for analyst review, not a confirmed attack."
    )

    severity = max((e.severity for e in events), key=lambda s: SEVERITY_ORDER.get(s, 0))
    return title, summary, severity
