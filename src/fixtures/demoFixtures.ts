/**
 * DEVELOPMENT-ONLY demo fixtures.
 * Never imported by the live HTTP service; used exclusively by `demoTraceApi`
 * after the analyst explicitly opts in from the UI.
 */
import type { ActionHistoryEntry, EvidenceRelationship, Incident, SecurityEvent } from '../types/trace';

export interface DemoDataset {
  events: SecurityEvent[];
  incidents: Incident[];
  relationships: Record<string, EvidenceRelationship[]>;
  history: Record<string, ActionHistoryEntry[]>;
}

const events: SecurityEvent[] = [
  { id: 'EVT-9001', timestamp: '2026-10-14T08:02:11Z', source: 'auth-gateway', event_type: 'failed_login', username: 'j.chen', ip_address: '185.220.101.47', device: null, severity: 'medium', description: 'Invalid password for j.chen', incident_id: 'INC-1042' },
  { id: 'EVT-9002', timestamp: '2026-10-14T08:02:39Z', source: 'auth-gateway', event_type: 'failed_login', username: 'j.chen', ip_address: '185.220.101.47', device: null, severity: 'medium', description: 'Invalid password for j.chen', incident_id: 'INC-1042' },
  { id: 'EVT-9003', timestamp: '2026-10-14T08:03:05Z', source: 'auth-gateway', event_type: 'failed_login', username: 'j.chen', ip_address: '185.220.101.47', device: null, severity: 'high', description: 'Invalid password for j.chen (3rd attempt)', incident_id: 'INC-1042' },
  { id: 'EVT-9004', timestamp: '2026-10-14T08:04:12Z', source: 'auth-gateway', event_type: 'successful_login', username: 'j.chen', ip_address: '185.220.101.47', device: 'FIN-WS-022', severity: 'critical', description: 'Login succeeded after repeated failures from Tor exit node', incident_id: 'INC-1042' },
  { id: 'EVT-9005', timestamp: '2026-10-14T08:09:47Z', source: 'edr', event_type: 'privilege_escalation', username: 'j.chen', ip_address: '10.20.4.17', device: 'FIN-WS-022', severity: 'critical', description: 'User added to local Administrators group', incident_id: 'INC-1042' },
  { id: 'EVT-9006', timestamp: '2026-10-14T08:15:30Z', source: 'dlp', event_type: 'large_file_transfer', username: 'j.chen', ip_address: '10.20.4.17', device: 'FIN-WS-022', severity: 'high', description: '2.3 GB uploaded to external storage', incident_id: 'INC-1042' },
  { id: 'EVT-9007', timestamp: '2026-10-14T11:21:03Z', source: 'dns-resolver', event_type: 'suspicious_dns_query', username: 'a.okafor', ip_address: '10.30.8.52', device: 'ENG-LT-114', severity: 'medium', description: 'Query for newly registered domain cdn-update-sync.net', incident_id: 'INC-1043' },
  { id: 'EVT-9008', timestamp: '2026-10-14T11:21:09Z', source: 'firewall', event_type: 'outbound_connection', username: null, ip_address: '10.30.8.52', device: 'ENG-LT-114', severity: 'high', description: 'Periodic HTTPS beacon to 45.137.21.9 every 60s', incident_id: 'INC-1043' },
  { id: 'EVT-9009', timestamp: '2026-10-14T11:24:44Z', source: 'edr', event_type: 'process_execution', username: 'a.okafor', ip_address: '10.30.8.52', device: 'ENG-LT-114', severity: 'high', description: 'Encoded PowerShell spawned by winword.exe', incident_id: 'INC-1043' },
  { id: 'EVT-9010', timestamp: '2026-10-12T06:40:00Z', source: 'auth-gateway', event_type: 'successful_login', username: 'm.rossi', ip_address: '93.41.12.8', device: 'CTR-LT-007', severity: 'low', description: 'Login from Milan, IT', incident_id: 'INC-1039' },
  { id: 'EVT-9011', timestamp: '2026-10-12T07:05:00Z', source: 'auth-gateway', event_type: 'successful_login', username: 'm.rossi', ip_address: '201.17.66.140', device: null, severity: 'medium', description: 'Login from São Paulo, BR', incident_id: 'INC-1039' },
  { id: 'EVT-9012', timestamp: '2026-10-14T13:02:18Z', source: 'firewall', event_type: 'port_scan', username: null, ip_address: '64.62.197.33', device: null, severity: 'low', description: 'Inbound SYN scan on 22/tcp, 3389/tcp', incident_id: null },
  { id: 'EVT-9013', timestamp: '2026-10-14T13:40:51Z', source: 'auth-gateway', event_type: 'successful_login', username: 'p.nguyen', ip_address: '10.20.1.33', device: 'HR-WS-004', severity: 'low', description: 'Routine login', incident_id: null },
];

const incidents: Incident[] = [
  { id: 'INC-1042', title: 'Credential stuffing followed by privileged activity', summary: 'Repeated failed logins for j.chen from a Tor exit node were followed by a successful login, local privilege escalation on FIN-WS-022, and a large outbound file transfer.', severity: 'critical', status: 'investigating', created_at: '2026-10-14T08:04:20Z', updated_at: '2026-10-14T09:12:00Z', event_count: 6, assigned_to: 'r.alvarez' },
  { id: 'INC-1043', title: 'Possible C2 beaconing from engineering laptop', summary: 'ENG-LT-114 resolved a newly registered domain and began periodic HTTPS beacons shortly before an encoded PowerShell execution.', severity: 'high', status: 'open', created_at: '2026-10-14T11:22:00Z', updated_at: '2026-10-14T11:25:00Z', event_count: 3, assigned_to: null },
  { id: 'INC-1039', title: 'Impossible travel for contractor account', summary: 'Contractor m.rossi authenticated from Milan and São Paulo 25 minutes apart.', severity: 'medium', status: 'resolved', created_at: '2026-10-12T07:06:00Z', updated_at: '2026-10-12T15:30:00Z', event_count: 2, assigned_to: 'k.osei' },
];

const relationships: Record<string, EvidenceRelationship[]> = {
  'INC-1042': [
    { id: 'REL-1', source_event_id: 'EVT-9001', target_event_id: 'EVT-9002', rule: { id: 'R-AUTH-002', name: 'Repeated authentication failure', description: 'Consecutive failed logins for the same account from the same source address.', logic: "event_type == 'failed_login'\n  AND same(username, ip_address)\n  AND delta(timestamp) <= 60s" }, shared_entities: [{ type: 'username', value: 'j.chen' }, { type: 'ip_address', value: '185.220.101.47' }], explanation: 'Both failures target j.chen from 185.220.101.47, 28 seconds apart.', time_delta_seconds: 28, confidence: 0.9 },
    { id: 'REL-2', source_event_id: 'EVT-9002', target_event_id: 'EVT-9003', rule: { id: 'R-AUTH-002', name: 'Repeated authentication failure', description: 'Consecutive failed logins for the same account from the same source address.', logic: "event_type == 'failed_login'\n  AND same(username, ip_address)\n  AND delta(timestamp) <= 60s" }, shared_entities: [{ type: 'username', value: 'j.chen' }, { type: 'ip_address', value: '185.220.101.47' }], explanation: 'Third consecutive failure for j.chen from the same address, 26 seconds after the previous attempt.', time_delta_seconds: 26, confidence: 0.9 },
    { id: 'REL-3', source_event_id: 'EVT-9003', target_event_id: 'EVT-9004', rule: { id: 'R-AUTH-001', name: 'Brute force followed by success', description: 'A successful login that follows three or more failures for the same account and source.', logic: "count(failed_login WHERE same(username, ip_address) WITHIN 5m) >= 3\n  AND next.event_type == 'successful_login'\n  AND delta(timestamp) <= 10m" }, shared_entities: [{ type: 'username', value: 'j.chen' }, { type: 'ip_address', value: '185.220.101.47' }], explanation: 'j.chen logged in successfully from 185.220.101.47 67 seconds after the third failed attempt from that address.', time_delta_seconds: 67, confidence: 0.95 },
    { id: 'REL-4', source_event_id: 'EVT-9004', target_event_id: 'EVT-9005', rule: { id: 'R-PRIV-004', name: 'Privilege escalation after anomalous login', description: 'Privilege change on a device shortly after a flagged login by the same user.', logic: "prev.severity IN ('high','critical') AND prev.event_type == 'successful_login'\n  AND event_type == 'privilege_escalation'\n  AND same(username, device) AND delta(timestamp) <= 30m" }, shared_entities: [{ type: 'username', value: 'j.chen' }, { type: 'device', value: 'FIN-WS-022' }], explanation: 'j.chen was added to local Administrators on FIN-WS-022 5m 35s after the flagged login on the same device.', time_delta_seconds: 335, confidence: 0.85 },
    { id: 'REL-5', source_event_id: 'EVT-9005', target_event_id: 'EVT-9006', rule: { id: 'R-EXFIL-002', name: 'Data transfer after privilege change', description: 'Large outbound transfer from a device that recently had a privilege change.', logic: "prev.event_type == 'privilege_escalation'\n  AND event_type == 'large_file_transfer'\n  AND same(device) AND delta(timestamp) <= 1h" }, shared_entities: [{ type: 'username', value: 'j.chen' }, { type: 'device', value: 'FIN-WS-022' }], explanation: 'A 2.3 GB upload left FIN-WS-022 under j.chen 5m 43s after the privilege change.', time_delta_seconds: 343, confidence: 0.8 },
  ],
  'INC-1043': [
    { id: 'REL-6', source_event_id: 'EVT-9007', target_event_id: 'EVT-9008', rule: { id: 'R-NET-007', name: 'DNS lookup followed by beacon', description: 'Outbound periodic connection from a host shortly after it resolved a newly registered domain.', logic: "prev.event_type == 'suspicious_dns_query'\n  AND event_type == 'outbound_connection'\n  AND same(device, ip_address) AND delta(timestamp) <= 2m" }, shared_entities: [{ type: 'device', value: 'ENG-LT-114' }, { type: 'ip_address', value: '10.30.8.52' }], explanation: 'ENG-LT-114 (10.30.8.52) started beaconing 6 seconds after resolving cdn-update-sync.net.', time_delta_seconds: 6, confidence: 0.75 },
    { id: 'REL-7', source_event_id: 'EVT-9008', target_event_id: 'EVT-9009', rule: { id: 'R-EDR-011', name: 'Suspicious execution on beaconing host', description: 'Encoded script execution on a device with active suspicious outbound traffic.', logic: "prev.event_type == 'outbound_connection' AND prev.severity >= 'high'\n  AND event_type == 'process_execution'\n  AND same(device) AND delta(timestamp) <= 15m" }, shared_entities: [{ type: 'device', value: 'ENG-LT-114' }], explanation: 'Encoded PowerShell ran on ENG-LT-114 3m 35s after beaconing began.', time_delta_seconds: 215, confidence: 0.7 },
  ],
  'INC-1039': [
    { id: 'REL-8', source_event_id: 'EVT-9010', target_event_id: 'EVT-9011', rule: { id: 'R-AUTH-009', name: 'Impossible travel', description: 'Two logins for one account whose geolocations imply travel faster than 900 km/h.', logic: "event_type == 'successful_login' AND same(username)\n  AND geo_distance(ip_address) / delta(timestamp) > 900 km/h" }, shared_entities: [{ type: 'username', value: 'm.rossi' }], explanation: 'm.rossi logged in from Milan and São Paulo (~9,500 km) 25 minutes apart.', time_delta_seconds: 1500, confidence: 0.6 },
  ],
};

const history: Record<string, ActionHistoryEntry[]> = {
  'INC-1042': [
    { id: 'H-1', incident_id: 'INC-1042', entry_type: 'status_change', author: 'r.alvarez', created_at: '2026-10-14T08:20:00Z', content: 'Began investigation', previous_status: 'open', new_status: 'investigating' },
    { id: 'H-2', incident_id: 'INC-1042', entry_type: 'response_action', author: 'r.alvarez', created_at: '2026-10-14T08:31:00Z', content: 'Blocked 185.220.101.47 at the perimeter firewall.', action_type: 'block_ip' },
    { id: 'H-3', incident_id: 'INC-1042', entry_type: 'note', author: 'r.alvarez', created_at: '2026-10-14T09:12:00Z', content: 'User confirms they did not initiate the transfer. Requesting DLP payload sample.' },
  ],
  'INC-1043': [],
  'INC-1039': [
    { id: 'H-4', incident_id: 'INC-1039', entry_type: 'note', author: 'k.osei', created_at: '2026-10-12T15:20:00Z', content: 'Contractor confirmed VPN egress in São Paulo. Benign.' },
    { id: 'H-5', incident_id: 'INC-1039', entry_type: 'status_change', author: 'k.osei', created_at: '2026-10-12T15:30:00Z', content: 'Confirmed false positive', previous_status: 'investigating', new_status: 'resolved' },
  ],
};

export function createDemoDataset(): DemoDataset {
  return structuredClone({ events, incidents, relationships, history });
}
