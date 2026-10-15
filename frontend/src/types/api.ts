// Types mirror the backend Pydantic schemas. See docs/API.md.

export type Source = "Authentication" | "Endpoint" | "Network";
export type Severity = "Low" | "Medium" | "High" | "Critical";
export type IncidentStatus = "Open" | "Investigating" | "Resolved" | "False Positive";
export type EvidenceType = "observed" | "hypothesis";
export type ActionType = "Isolate Device" | "Reset Credentials" | "Block IP" | "Monitor" | "Other";
export type ActionStatus = "Planned" | "Completed" | "Failed";

export const SOURCES: Source[] = ["Authentication", "Endpoint", "Network"];
export const SEVERITIES: Severity[] = ["Low", "Medium", "High", "Critical"];
export const STATUSES: IncidentStatus[] = ["Open", "Investigating", "Resolved", "False Positive"];
export const ACTION_TYPES: ActionType[] = ["Isolate Device", "Reset Credentials", "Block IP", "Monitor", "Other"];
export const ACTION_STATUSES: ActionStatus[] = ["Planned", "Completed", "Failed"];

export interface SecurityEvent {
  id: number;
  external_id: string;
  timestamp: string; // ISO 8601
  source: Source;
  event_type: string;
  username: string | null;
  source_ip: string | null;
  device_id: string | null;
  severity: Severity;
  description: string;
  raw_data: Record<string, unknown>;
}

export interface EventPage {
  items: SecurityEvent[];
  total: number;
  limit: number;
  offset: number;
}

export interface EvidenceRelationship {
  id: number;
  incident_id: number;
  source_event_id: number;
  target_event_id: number;
  relationship_type: string;
  evidence_type: EvidenceType;
  rule_id: string;
  rule_name: string;
  explanation: string;
}

export interface InvestigationNote {
  id: number;
  incident_id: number;
  content: string;
  author: string;
  created_at: string;
}

export interface ResponseAction {
  id: number;
  incident_id: number;
  action_type: ActionType;
  description: string;
  status: ActionStatus;
  created_at: string;
}

export interface IncidentSummary {
  id: number;
  title: string;
  summary: string;
  severity: Severity;
  status: IncidentStatus;
  created_at: string;
  updated_at: string;
  event_count: number;
}

export interface IncidentDetail extends IncidentSummary {
  events: SecurityEvent[];
  relationships: EvidenceRelationship[];
  notes: InvestigationNote[];
  actions: ResponseAction[];
}

export interface TimelineEntry {
  event: SecurityEvent;
  explained_by: EvidenceRelationship[];
}

export interface Overview {
  total_events: number;
  total_incidents: number;
  incidents_by_status: Record<IncidentStatus, number>;
  incidents_by_severity: Record<Severity, number>;
}

export interface CorrelationRun {
  events_considered: number;
  incidents_created: number;
  incidents_updated: number;
  incidents_unchanged: number;
  relationships_created: number;
}

export interface DemoLoad {
  events_inserted: number;
  total_events: number;
}

export interface EventFilters {
  search?: string;
  source?: Source | "";
  severity?: Severity | "";
  limit?: number;
  offset?: number;
}

export interface IncidentFilters {
  status?: IncidentStatus | "";
  severity?: Severity | "";
}
