"""Runs all rules and groups linked events into potential incidents."""

from __future__ import annotations

from typing import Sequence

from .rules import (
    rule_endpoint_then_network,
    rule_failed_then_success,
    rule_repeated_failed_logins,
    rule_same_device_proximity,
)
from .types import CorrelationConfig, CorrelationResult, EventData, Group, Link


def correlate(events: Sequence[EventData], cfg: CorrelationConfig | None = None) -> CorrelationResult:
    """Apply every rule to ``events``; the result does not depend on input order."""
    cfg = cfg or CorrelationConfig()
    ordered = sorted(events, key=lambda e: (e.timestamp, e.id))

    # Data-backed rules first, so the weaker device rule can skip pairs they already cover.
    strong = [
        *rule_repeated_failed_logins(ordered, cfg),
        *rule_failed_then_success(ordered, cfg),
        *rule_endpoint_then_network(ordered, cfg),
    ]
    linked_pairs = {frozenset((l.source_event_id, l.target_event_id)) for l in strong}
    weak = rule_same_device_proximity(ordered, cfg, linked_pairs)

    links = _dedupe_and_sort([*strong, *weak])
    return CorrelationResult(links=tuple(links), groups=tuple(_group(links)))


def _dedupe_and_sort(links: list[Link]) -> list[Link]:
    unique: dict[tuple[int, int, str], Link] = {}
    for link in links:
        unique.setdefault((link.source_event_id, link.target_event_id, link.rule_id), link)
    return [unique[key] for key in sorted(unique)]


def _group(links: list[Link]) -> list[Group]:
    """Connected components over the links (union-find)."""
    parent: dict[int, int] = {}

    def find(x: int) -> int:
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    for link in links:
        for event_id in (link.source_event_id, link.target_event_id):
            parent.setdefault(event_id, event_id)
        parent[find(link.source_event_id)] = find(link.target_event_id)

    members: dict[int, set[int]] = {}
    for event_id in parent:
        members.setdefault(find(event_id), set()).add(event_id)

    groups = [
        Group(
            event_ids=tuple(sorted(ids)),
            links=tuple(l for l in links if l.source_event_id in ids),
        )
        for ids in members.values()
    ]
    return sorted(groups, key=lambda g: g.event_ids[0])
