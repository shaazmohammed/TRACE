"""API tests against a real PostgreSQL test database."""

from app.core.config import get_settings


def test_health(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "database": "ok"}


def test_load_demo_is_repeatable(client):
    first = client.post("/api/demo/load").json()
    second = client.post("/api/demo/load").json()
    assert first == {"events_inserted": 11, "total_events": 11}
    assert second == {"events_inserted": 0, "total_events": 11}


def test_demo_endpoints_disabled_outside_development(client, monkeypatch):
    monkeypatch.setattr(get_settings(), "app_env", "production")
    assert client.post("/api/demo/load").status_code == 403
    assert client.post("/api/demo/reset").status_code == 403


def test_reset_clears_incidents_and_reloads_events(demo_client):
    assert len(demo_client.get("/api/incidents").json()) == 1
    reset = demo_client.post("/api/demo/reset").json()
    assert reset == {"events_inserted": 11, "total_events": 11}
    assert demo_client.get("/api/incidents").json() == []


def test_event_filters_and_pagination(client):
    client.post("/api/demo/load")
    assert client.get("/api/events").json()["total"] == 11
    assert client.get("/api/events", params={"source": "Network"}).json()["total"] == 2
    assert client.get("/api/events", params={"severity": "High"}).json()["total"] == 3
    assert client.get("/api/events", params={"search": "jdoe-sample"}).json()["total"] == 6
    page = client.get("/api/events", params={"limit": 3, "offset": 9}).json()
    assert len(page["items"]) == 2 and page["total"] == 11


def test_event_validation_and_not_found(client):
    client.post("/api/demo/load")
    assert client.get("/api/events", params={"source": "Printer"}).status_code == 422
    assert client.get("/api/events", params={"limit": 0}).status_code == 422
    assert client.get("/api/events/99999").status_code == 404
    event = client.get("/api/events/1").json()
    assert event["external_id"] == "evt-001" and event["raw_data"]["attempt"] == 1


def test_correlation_creates_one_potential_incident(client):
    client.post("/api/demo/load")
    run = client.post("/api/correlation/run").json()
    assert run == {
        "events_considered": 11,
        "incidents_created": 1,
        "incidents_updated": 0,
        "incidents_unchanged": 0,
        "relationships_created": 6,
    }
    incident = client.get("/api/incidents").json()[0]
    assert incident["status"] == "Open" and incident["severity"] == "High"
    assert incident["event_count"] == 7
    assert incident["title"].startswith("Potential incident")
    assert "not a confirmed attack" in incident["summary"]


def test_correlation_is_idempotent_and_keeps_analyst_changes(demo_client):
    incident_id = demo_client.get("/api/incidents").json()[0]["id"]
    demo_client.patch(f"/api/incidents/{incident_id}/status", json={"status": "Investigating"})
    demo_client.post(f"/api/incidents/{incident_id}/notes", json={"content": "Checking VPN logs"})

    rerun = demo_client.post("/api/correlation/run").json()
    assert rerun["incidents_created"] == 0 and rerun["relationships_created"] == 0
    assert rerun["incidents_unchanged"] == 1

    incidents = demo_client.get("/api/incidents").json()
    assert len(incidents) == 1 and incidents[0]["status"] == "Investigating"
    assert len(demo_client.get(f"/api/incidents/{incident_id}/notes").json()) == 1


def test_incident_detail_contains_expected_events_and_excludes_benign_ones(demo_client):
    incident_id = demo_client.get("/api/incidents").json()[0]["id"]
    detail = demo_client.get(f"/api/incidents/{incident_id}").json()
    external_ids = [e["external_id"] for e in detail["events"]]
    assert external_ids == ["evt-002", "evt-003", "evt-004", "evt-005", "evt-007", "evt-008", "evt-010"]
    for benign in ("evt-001", "evt-006", "evt-009", "evt-011"):
        assert benign not in external_ids


def test_relationships_carry_rule_and_explanation(demo_client):
    incident_id = demo_client.get("/api/incidents").json()[0]["id"]
    relationships = demo_client.get(f"/api/incidents/{incident_id}/relationships").json()
    assert len(relationships) == 6
    assert {r["rule_id"] for r in relationships} == {
        "R1_REPEATED_FAILED_LOGIN",
        "R2_FAILED_THEN_SUCCESS",
        "R3_SAME_DEVICE_PROXIMITY",
        "R4_ENDPOINT_THEN_NETWORK",
    }
    assert all(r["explanation"] and r["rule_name"] for r in relationships)
    hypotheses = [r for r in relationships if r["evidence_type"] == "hypothesis"]
    assert [r["rule_id"] for r in hypotheses] == ["R3_SAME_DEVICE_PROXIMITY"]


def test_timeline_is_chronological(demo_client):
    incident_id = demo_client.get("/api/incidents").json()[0]["id"]
    timeline = demo_client.get(f"/api/incidents/{incident_id}/timeline").json()
    stamps = [entry["event"]["timestamp"] for entry in timeline]
    assert stamps == sorted(stamps) and len(timeline) == 7
    assert timeline[0]["explained_by"] == []  # first event is only ever a source
    assert timeline[-1]["explained_by"][0]["rule_id"] == "R4_ENDPOINT_THEN_NETWORK"


def test_incident_filters(demo_client):
    assert len(demo_client.get("/api/incidents", params={"status": "Open"}).json()) == 1
    assert demo_client.get("/api/incidents", params={"status": "Resolved"}).json() == []
    assert len(demo_client.get("/api/incidents", params={"severity": "High"}).json()) == 1
    assert demo_client.get("/api/incidents", params={"status": "Closed"}).status_code == 422


def test_status_update_and_overview(demo_client):
    incident_id = demo_client.get("/api/incidents").json()[0]["id"]
    updated = demo_client.patch(f"/api/incidents/{incident_id}/status", json={"status": "False Positive"})
    assert updated.status_code == 200 and updated.json()["status"] == "False Positive"
    assert demo_client.patch(f"/api/incidents/{incident_id}/status", json={"status": "Bogus"}).status_code == 422
    assert demo_client.patch("/api/incidents/99999/status", json={"status": "Open"}).status_code == 404

    overview = demo_client.get("/api/overview").json()
    assert overview["total_events"] == 11 and overview["total_incidents"] == 1
    assert overview["incidents_by_status"]["False Positive"] == 1
    assert overview["incidents_by_status"]["Open"] == 0


def test_notes_and_actions(demo_client):
    incident_id = demo_client.get("/api/incidents").json()[0]["id"]

    note = demo_client.post(f"/api/incidents/{incident_id}/notes", json={"content": "  Looks suspicious  "})
    assert note.status_code == 201 and note.json()["content"] == "Looks suspicious"
    assert demo_client.post(f"/api/incidents/{incident_id}/notes", json={"content": "   "}).status_code == 422
    assert demo_client.post("/api/incidents/99999/notes", json={"content": "x"}).status_code == 404

    action = demo_client.post(
        f"/api/incidents/{incident_id}/actions",
        json={"action_type": "Reset Credentials", "description": "Reset jdoe-sample password", "status": "Completed"},
    )
    assert action.status_code == 201 and action.json()["status"] == "Completed"
    bad = demo_client.post(
        f"/api/incidents/{incident_id}/actions", json={"action_type": "Delete Everything", "description": "x"}
    )
    assert bad.status_code == 422

    history = demo_client.get(f"/api/incidents/{incident_id}/actions").json()
    assert [a["action_type"] for a in history] == ["Reset Credentials"]
    detail = demo_client.get(f"/api/incidents/{incident_id}").json()
    assert len(detail["notes"]) == 1 and len(detail["actions"]) == 1


def test_cors_allows_only_configured_origin(client):
    allowed = client.get("/api/health", headers={"Origin": "http://localhost:5173"})
    assert allowed.headers.get("access-control-allow-origin") == "http://localhost:5173"
    blocked = client.get("/api/health", headers={"Origin": "http://evil.example"})
    assert "access-control-allow-origin" not in blocked.headers
