"""Unit tests for the correlation rules. Pure Python: no database needed."""

import json
import random
from datetime import datetime, timedelta, timezone
from pathlib import Path

from app.services.correlation.engine import correlate
from app.services.correlation.rules import (
    R1_ID,
    R2_ID,
    R3_ID,
    R4_ID,
    rule_endpoint_then_network,
    rule_failed_then_success,
    rule_repeated_failed_logins,
    rule_same_device_proximity,
)
from app.services.correlation.types import CorrelationConfig, EventData

BASE = datetime(2026, 3, 10, 9, 0, tzinfo=timezone.utc)
CFG = CorrelationConfig()
DEMO_FILE = Path(__file__).resolve().parents[2] / "data" / "demo_events.json"


def ev(id_, minutes, event_type="LOGIN_FAILED", source="Authentication", severity="Medium", **kw):
    return EventData(
        id=id_,
        timestamp=BASE + timedelta(minutes=minutes),
        source=source,
        event_type=event_type,
        severity=severity,
        **kw,
    )


def failures(start_id, count, gap_minutes=1, username="u1"):
    return [ev(start_id + i, i * gap_minutes, username=username) for i in range(count)]


# --- R1 ---------------------------------------------------------------------

def test_r1_links_three_failures_in_window():
    links = rule_repeated_failed_logins(failures(1, 3), CFG)
    assert [(l.source_event_id, l.target_event_id) for l in links] == [(1, 2), (2, 3)]
    assert all(l.rule_id == R1_ID and l.evidence_type == "observed" for l in links)


def test_r1_ignores_below_threshold():
    assert rule_repeated_failed_logins(failures(1, 2), CFG) == []


def test_r1_ignores_failures_spread_beyond_window():
    assert rule_repeated_failed_logins(failures(1, 3, gap_minutes=11), CFG) == []


def test_r1_does_not_mix_usernames():
    events = [ev(1, 0, username="a"), ev(2, 1, username="b"), ev(3, 2, username="a"), ev(4, 3, username="b")]
    assert rule_repeated_failed_logins(events, CFG) == []


# --- R2 ---------------------------------------------------------------------

def test_r2_links_last_failure_to_success_for_same_user():
    events = failures(1, 3) + [ev(10, 5, "LOGIN_SUCCESS", username="u1", source_ip="203.0.113.5")]
    links = rule_failed_then_success(events, CFG)
    assert [(l.source_event_id, l.target_event_id, l.rule_id) for l in links] == [(3, 10, R2_ID)]
    assert "does not by itself prove" in links[0].explanation


def test_r2_requires_threshold_failures():
    events = failures(1, 2) + [ev(10, 5, "LOGIN_SUCCESS", username="u1")]
    assert rule_failed_then_success(events, CFG) == []


def test_r2_ignores_success_outside_window():
    events = failures(1, 3) + [ev(10, 2 + 16, "LOGIN_SUCCESS", username="u1")]
    assert rule_failed_then_success(events, CFG) == []


def test_r2_ignores_success_for_other_user():
    events = failures(1, 3) + [ev(10, 5, "LOGIN_SUCCESS", username="someone-else")]
    assert rule_failed_then_success(events, CFG) == []


# --- R3 ---------------------------------------------------------------------

def test_r3_links_elevated_events_on_same_device_as_hypothesis():
    events = [ev(1, 0, "X", "Endpoint", "High", device_id="D1"), ev(2, 5, "Y", "Network", "Medium", device_id="D1")]
    links = rule_same_device_proximity(events, CFG, set())
    assert len(links) == 1 and links[0].rule_id == R3_ID and links[0].evidence_type == "hypothesis"


def test_r3_ignores_low_severity_events():
    events = [ev(1, 0, "X", "Endpoint", "Low", device_id="D1"), ev(2, 5, "Y", "Network", "High", device_id="D1")]
    assert rule_same_device_proximity(events, CFG, set()) == []


def test_r3_ignores_events_outside_window_or_on_other_devices():
    far = [ev(1, 0, "X", "Endpoint", "High", device_id="D1"), ev(2, 31, "Y", "Network", "High", device_id="D1")]
    other = [ev(1, 0, "X", "Endpoint", "High", device_id="D1"), ev(2, 5, "Y", "Network", "High", device_id="D2")]
    assert rule_same_device_proximity(far, CFG, set()) == []
    assert rule_same_device_proximity(other, CFG, set()) == []


def test_r3_skips_pairs_already_linked():
    events = [ev(1, 0, "X", "Endpoint", "High", device_id="D1"), ev(2, 5, "Y", "Network", "High", device_id="D1")]
    assert rule_same_device_proximity(events, CFG, {frozenset((1, 2))}) == []


# --- R4 ---------------------------------------------------------------------

def _endpoint(pid=7, suspicious=True):
    return ev(1, 0, "SCRIPT_EXECUTION", "Endpoint", "High", device_id="D1", raw_data={"process_id": pid, "suspicious": suspicious})


def _network(pid=7, minutes=3, device="D1"):
    return ev(2, minutes, "NETWORK_CONNECTION", "Network", "High", device_id=device, raw_data={"process_id": pid})


def test_r4_links_when_device_and_process_match():
    links = rule_endpoint_then_network([_endpoint(), _network()], CFG)
    assert [(l.source_event_id, l.target_event_id, l.rule_id) for l in links] == [(1, 2, R4_ID)]


def test_r4_requires_matching_process_id():
    assert rule_endpoint_then_network([_endpoint(pid=7), _network(pid=8)], CFG) == []


def test_r4_requires_suspicious_endpoint_event():
    assert rule_endpoint_then_network([_endpoint(suspicious=False), _network()], CFG) == []


def test_r4_requires_same_device_and_window():
    assert rule_endpoint_then_network([_endpoint(), _network(device="D2")], CFG) == []
    assert rule_endpoint_then_network([_endpoint(), _network(minutes=11)], CFG) == []


# --- Demo scenario ----------------------------------------------------------

def load_demo_events():
    """Event ids follow file order (1..11), matching evt-001..evt-011."""
    rows = json.loads(DEMO_FILE.read_text())
    return [
        EventData(
            id=i,
            timestamp=datetime.fromisoformat(r["timestamp"].replace("Z", "+00:00")),
            source=r["source"],
            event_type=r["event_type"],
            severity=r["severity"],
            username=r["username"],
            source_ip=r["source_ip"],
            device_id=r["device_id"],
            raw_data=r["raw_data"],
        )
        for i, r in enumerate(rows, start=1)
    ]


def test_demo_scenario_produces_one_group_with_expected_events():
    result = correlate(load_demo_events(), CFG)
    assert len(result.groups) == 1
    # jdoe failures (2-5), jdoe success (7), script (8), suspicious network (10)
    assert result.groups[0].event_ids == (2, 3, 4, 5, 7, 8, 10)


def test_demo_scenario_leaves_benign_events_out():
    result = correlate(load_demo_events(), CFG)
    grouped = set(result.groups[0].event_ids)
    # lone failure, asmith success, routine network event, hours-later backup job
    assert not grouped & {1, 6, 9, 11}


def test_demo_scenario_links_per_rule():
    result = correlate(load_demo_events(), CFG)
    by_rule = {}
    for link in result.links:
        by_rule.setdefault(link.rule_id, []).append((link.source_event_id, link.target_event_id))
    assert by_rule[R1_ID] == [(2, 3), (3, 4), (4, 5)]
    assert by_rule[R2_ID] == [(5, 7)]
    assert by_rule[R3_ID] == [(7, 8)]  # hypothesis only
    assert by_rule[R4_ID] == [(8, 10)]


def test_every_link_has_rule_name_and_explanation():
    for link in correlate(load_demo_events(), CFG).links:
        assert link.rule_id and link.rule_name and link.explanation
        assert link.evidence_type in {"observed", "hypothesis"}


def test_correlation_is_independent_of_input_order():
    events = load_demo_events()
    shuffled = events[:]
    random.Random(1).shuffle(shuffled)
    assert correlate(events, CFG) == correlate(shuffled, CFG)
