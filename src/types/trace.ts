export type Severity = 'low' | 'medium' | 'high' | 'critical';
export const SEVERITIES: Severity[] = ['critical', 'high', 'medium', 'low'];

export type IncidentStatus = 'open' | 'investigating' | 'contained' | 'resolved' | 'closed';
export const INCIDENT_STATUSES: IncidentStatus[] = ['open', 'investigating', 'contained', 'resolved', 'closed'];
export const UNRESOLVED_STATUSES: IncidentStatus[] = ['open', 'investigating', 'contained'];

export interface SecurityEvent {
  id: string;
  timestamp: string;
  source: string;
  event_type: string;
  username: string | null;
  ip_address: string | null;
  device: string | null;
  severity: Severity;
  description?: string | null;
  incident_id?: string | null;
}

export interface Incident {
  id: string;
  title: string;
  summary: string;
  severity: Severity;
  status: IncidentStatus;
  created_at: string;
  updated_at: string;
  event_count: number;
  assigned_to?: string | null;
}

export type EntityType = 'username' | 'ip_address' | 'device';

export interface SharedEntity {
  type: EntityType;
  value: string;
}

export interface CorrelationRule {
  id: string;
  name: string;
  description: string;
  /** The rule condition as evaluated by the backend correlation engine. */
  logic: string;
}

export interface EvidenceRelationship {
  id: string;
  source_event_id: string;
  target_event_id: string;
  rule: CorrelationRule;
  shared_entities: SharedEntity[];
  explanation: string;
  time_delta_seconds?: number | null;
  confidence?: number | null;
}

export type HistoryEntryType = 'status_change' | 'note' | 'response_action';

export type ResponseActionType =
  | 'block_ip'
  | 'disable_account'
  | 'reset_credentials'
  | 'isolate_device'
  | 'escalate'
  | 'other';

export const RESPONSE_ACTION_TYPES: { value: ResponseActionType; label: string }[] = [
  { value: 'block_ip', label: 'Block IP address' },
  { value: 'disable_account', label: 'Disable user account' },
  { value: 'reset_credentials', label: 'Reset credentials' },
  { value: 'isolate_device', label: 'Isolate device' },
  { value: 'escalate', label: 'Escalate to tier 2' },
  { value: 'other', label: 'Other' },
];

export interface ActionHistoryEntry {
  id: string;
  incident_id: string;
  entry_type: HistoryEntryType;
  author: string;
  created_at: string;
  content: string;
  previous_status?: IncidentStatus | null;
  new_status?: IncidentStatus | null;
  action_type?: ResponseActionType | null;
}

export interface StatusUpdatePayload {
  status: IncidentStatus;
  author: string;
}

export interface NotePayload {
  content: string;
  author: string;
}

export interface ResponseActionPayload {
  action_type: ResponseActionType;
  description: string;
  author: string;
}
