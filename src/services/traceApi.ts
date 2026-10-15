import type {
  ActionHistoryEntry,
  EvidenceRelationship,
  Incident,
  NotePayload,
  ResponseActionPayload,
  SecurityEvent,
  StatusUpdatePayload,
} from '../types/trace';
import { asList, request } from './httpClient';

export interface TraceApi {
  listEvents(): Promise<SecurityEvent[]>;
  listIncidents(): Promise<Incident[]>;
  getIncident(id: string): Promise<Incident>;
  getIncidentEvents(id: string): Promise<SecurityEvent[]>;
  getIncidentRelationships(id: string): Promise<EvidenceRelationship[]>;
  getIncidentHistory(id: string): Promise<ActionHistoryEntry[]>;
  updateIncidentStatus(id: string, payload: StatusUpdatePayload): Promise<Incident>;
  addIncidentNote(id: string, payload: NotePayload): Promise<ActionHistoryEntry>;
  recordResponseAction(id: string, payload: ResponseActionPayload): Promise<ActionHistoryEntry>;
}

type ListPayload<T> = T[] | { items: T[] };

const incidentPath = (id: string) => `/incidents/${encodeURIComponent(id)}`;

export const httpTraceApi: TraceApi = {
  async listEvents() {
    return asList(await request<ListPayload<SecurityEvent>>('/events'));
  },
  async listIncidents() {
    return asList(await request<ListPayload<Incident>>('/incidents'));
  },
  getIncident(id) {
    return request<Incident>(incidentPath(id));
  },
  async getIncidentEvents(id) {
    return asList(await request<ListPayload<SecurityEvent>>(`${incidentPath(id)}/events`));
  },
  async getIncidentRelationships(id) {
    return asList(await request<ListPayload<EvidenceRelationship>>(`${incidentPath(id)}/relationships`));
  },
  async getIncidentHistory(id) {
    return asList(await request<ListPayload<ActionHistoryEntry>>(`${incidentPath(id)}/history`));
  },
  updateIncidentStatus(id, payload) {
    return request<Incident>(incidentPath(id), { method: 'PATCH', body: JSON.stringify(payload) });
  },
  addIncidentNote(id, payload) {
    return request<ActionHistoryEntry>(`${incidentPath(id)}/notes`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  recordResponseAction(id, payload) {
    return request<ActionHistoryEntry>(`${incidentPath(id)}/actions`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
