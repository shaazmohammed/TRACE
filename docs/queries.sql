-- Useful queries for TRACE. Run with:  psql "<your database url>" -f docs/queries.sql
-- (Written for the schema in backend/alembic/versions/0001_initial_schema.py.)

-- 1. Filter incidents by severity and status
SELECT id, title, severity, status, created_at
FROM incidents
WHERE severity IN ('High', 'Critical')
  AND status IN ('Open', 'Investigating')
ORDER BY created_at DESC;

-- 2. Join incidents to their events (chronological)
SELECT i.id AS incident_id, i.title, e.id AS event_id, e.external_id, e.timestamp,
       e.source, e.event_type, e.username, e.source_ip, e.device_id, e.severity
FROM incidents i
JOIN incident_events ie ON ie.incident_id = i.id
JOIN security_events e  ON e.id = ie.event_id
ORDER BY i.id, e.timestamp, e.id;

-- 3. Count incidents by status
SELECT status, COUNT(*) AS incidents
FROM incidents
GROUP BY status
ORDER BY incidents DESC;

-- 4. Response history for all incidents (newest first)
SELECT a.created_at, i.id AS incident_id, i.title, a.action_type, a.status, a.description
FROM response_actions a
JOIN incidents i ON i.id = a.incident_id
ORDER BY a.created_at DESC, a.id DESC;

-- 5. Evidence relationships for one incident, with the events on both ends
--    (change the incident id)
SELECT r.rule_id, r.evidence_type,
       s.external_id AS from_event, t.external_id AS to_event,
       r.explanation
FROM evidence_relationships r
JOIN security_events s ON s.id = r.source_event_id
JOIN security_events t ON t.id = r.target_event_id
WHERE r.incident_id = 1
ORDER BY s.timestamp, r.id;

-- 6. Events not part of any incident
SELECT e.id, e.external_id, e.event_type, e.username, e.device_id
FROM security_events e
LEFT JOIN incident_events ie ON ie.event_id = e.id
WHERE ie.event_id IS NULL
ORDER BY e.timestamp;

-- 7. Notes for one incident (change the incident id)
SELECT created_at, author, content
FROM investigation_notes
WHERE incident_id = 1
ORDER BY created_at, id;
