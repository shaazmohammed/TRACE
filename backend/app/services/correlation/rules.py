"""Deterministic correlation rules.

Each rule only links events when the event data itself supports the link.
Time proximity alone is never enough, except in the clearly labelled
SAME_DEVICE rule, which is restricted to elevated-severity events and is
always marked as a hypothesis.
"""

from __future__ import annotations

from collections import defaultdict
from datetime import timedelta
from typing import Sequence

from app.core.enums import SEVERITY_ORDER, EventTypes, EvidenceType, Source

from .types import CorrelationConfig, EventData, Link

R1_ID, R1_NAME = "R1_REPEATED_FAILED_LOGIN", "Repeated failed logins"
R2_ID, R2_NAME = "R2_FAILED_THEN_SUCCESS", "Failed logins followed by success"
R3_ID, R3_NAME = "R3_SAME_DEVICE_PROXIMITY", "Same device, elevated severity"
R4_ID, R4_NAME = "R4_ENDPOINT_THEN_NETWORK", "Suspicious endpoint event then network event"


def _ordered(events: Sequence[EventData]) -> list[EventData]:
    return sorted(events, key=lambda e: (e.timestamp, e.id))


def _fmt(delta: timedelta) -> str:
    minutes, seconds = divmod(int(delta.total_seconds()), 60)
    return f"{minutes}m {seconds:02d}s"


def failed_login_runs(events: Sequence[EventData], cfg: CorrelationConfig) -> list[list[EventData]]:
    """Group failed logins per username into runs.

    Consecutive failures belong to the same run while the gap between them is
    within ``failed_login_window``. Only runs with at least
    ``failed_login_threshold`` failures are returned.
    """
    by_user: dict[str, list[EventData]] = defaultdict(list)
    for event in _ordered(events):
        if event.event_type == EventTypes.LOGIN_FAILED and event.username:
            by_user[event.username].append(event)

    runs: list[list[EventData]] = []
    for username in sorted(by_user):
        current: list[EventData] = []
        for event in by_user[username]:
            if current and event.timestamp - current[-1].timestamp > cfg.failed_login_window:
                runs.append(current)
                current = []
            current.append(event)
        if current:
            runs.append(current)
    return [run for run in runs if len(run) >= cfg.failed_login_threshold]


def rule_repeated_failed_logins(events: Sequence[EventData], cfg: CorrelationConfig) -> list[Link]:
    """R1: link consecutive failed logins in a run for the same username."""
    links: list[Link] = []
    window_min = int(cfg.failed_login_window.total_seconds() // 60)
    for run in failed_login_runs(events, cfg):
        for earlier, later in zip(run, run[1:]):
            gap = _fmt(later.timestamp - earlier.timestamp)
            links.append(
                Link(
                    source_event_id=earlier.id,
                    target_event_id=later.id,
                    rule_id=R1_ID,
                    rule_name=R1_NAME,
                    relationship_type="repeated_failed_login",
                    evidence_type=EvidenceType.OBSERVED.value,
                    explanation=(
                        f"Observed: two failed logins for username '{earlier.username}' "
                        f"{gap} apart, part of a run of {len(run)} failures "
                        f"(rule needs at least {cfg.failed_login_threshold} failures, "
                        f"each within {window_min} minutes of the previous one)."
                    ),
                )
            )
    return links


def rule_failed_then_success(events: Sequence[EventData], cfg: CorrelationConfig) -> list[Link]:
    """R2: link the last failure of a run to the next success for that username."""
    ordered = _ordered(events)
    links: list[Link] = []
    for run in failed_login_runs(ordered, cfg):
        last = run[-1]
        for candidate in ordered:
            if candidate.event_type != EventTypes.LOGIN_SUCCESS or candidate.username != last.username:
                continue
            delta = candidate.timestamp - last.timestamp
            if delta <= timedelta(0):
                continue
            if delta > cfg.success_window:
                break  # events are time-ordered, so later ones are even further away
            links.append(_failed_then_success_link(run, candidate, delta))
            break
    return links


def _failed_then_success_link(run: list[EventData], success: EventData, delta: timedelta) -> Link:
    failed_ips = sorted({e.source_ip for e in run if e.source_ip})
    ip_text = ", ".join(failed_ips) if failed_ips else "unknown"
    if success.source_ip and success.source_ip not in failed_ips:
        ip_note = "The successful login came from a different source IP than the failed attempts."
    elif success.source_ip:
        ip_note = "The successful login came from the same source IP as the failed attempts."
    else:
        ip_note = "The successful login has no source IP recorded."
    if success.raw_data.get("ip_previously_seen_for_user") is False:
        ip_note += " The dataset flags this IP as not previously seen for this user."
    return Link(
        source_event_id=run[-1].id,
        target_event_id=success.id,
        rule_id=R2_ID,
        rule_name=R2_NAME,
        relationship_type="failed_then_success",
        evidence_type=EvidenceType.OBSERVED.value,
        explanation=(
            f"Observed: {len(run)} failed logins for '{success.username}' (source IP {ip_text}) "
            f"were followed {_fmt(delta)} later by a successful login for the same username "
            f"from {success.source_ip or 'unknown IP'}. {ip_note} "
            "This does not by itself prove the account was compromised."
        ),
    )


def rule_endpoint_then_network(events: Sequence[EventData], cfg: CorrelationConfig) -> list[Link]:
    """R4: suspicious endpoint event followed by a network event from the same process.

    Requires the same device AND the same ``process_id`` in raw_data, so the
    link is backed by data rather than timing alone.
    """
    ordered = _ordered(events)
    links: list[Link] = []
    for endpoint in ordered:
        if endpoint.source != Source.ENDPOINT.value or endpoint.raw_data.get("suspicious") is not True:
            continue
        process_id = endpoint.raw_data.get("process_id")
        if not endpoint.device_id or process_id is None:
            continue
        for network in ordered:
            if network.source != Source.NETWORK.value or network.device_id != endpoint.device_id:
                continue
            delta = network.timestamp - endpoint.timestamp
            if delta <= timedelta(0) or delta > cfg.endpoint_network_window:
                continue
            if network.raw_data.get("process_id") != process_id:
                continue
            links.append(
                Link(
                    source_event_id=endpoint.id,
                    target_event_id=network.id,
                    rule_id=R4_ID,
                    rule_name=R4_NAME,
                    relationship_type="endpoint_then_network",
                    evidence_type=EvidenceType.OBSERVED.value,
                    explanation=(
                        f"Observed: a suspicious endpoint event ({endpoint.event_type}) on device "
                        f"'{endpoint.device_id}' was followed {_fmt(delta)} later by a network event "
                        f"on the same device from the same process id ({process_id}). "
                        "Not established: whether the network destination is malicious."
                    ),
                )
            )
    return links


def rule_same_device_proximity(
    events: Sequence[EventData],
    cfg: CorrelationConfig,
    already_linked: set[frozenset[int]],
) -> list[Link]:
    """R3: hypothesis link between neighbouring elevated-severity events on one device.

    Only events at or above ``min_device_severity`` are considered, and pairs
    already linked by a stronger rule are skipped.
    """
    min_rank = SEVERITY_ORDER[cfg.min_device_severity]
    by_device: dict[str, list[EventData]] = defaultdict(list)
    for event in _ordered(events):
        if event.device_id and SEVERITY_ORDER.get(event.severity, 0) >= min_rank:
            by_device[event.device_id].append(event)

    links: list[Link] = []
    window_min = int(cfg.device_window.total_seconds() // 60)
    for device_id in sorted(by_device):
        for earlier, later in zip(by_device[device_id], by_device[device_id][1:]):
            delta = later.timestamp - earlier.timestamp
            if delta > cfg.device_window or frozenset((earlier.id, later.id)) in already_linked:
                continue
            links.append(
                Link(
                    source_event_id=earlier.id,
                    target_event_id=later.id,
                    rule_id=R3_ID,
                    rule_name=R3_NAME,
                    relationship_type="same_device",
                    evidence_type=EvidenceType.HYPOTHESIS.value,
                    explanation=(
                        f"Observed: both events were recorded on device '{device_id}' within "
                        f"{_fmt(delta)} of each other (window {window_min} minutes) and both have "
                        f"severity {cfg.min_device_severity} or higher. "
                        "Hypothesis only: they may be part of the same activity; no direct "
                        "causal evidence links them."
                    ),
                )
            )
    return links
