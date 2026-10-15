import { createDemoDataset } from '../fixtures/demoFixtures';
import type { ActionHistoryEntry } from '../types/trace';
import { ApiError } from './httpClient';
import type { TraceApi } from './traceApi';

const LATENCY_MS = 200;

const wait = <T,>(value: T) =>
  new Promise<T>((resolve) => setTimeout(() => resolve(structuredClone(value)), LATENCY_MS));

/** In-memory implementation of TraceApi for explicit development use. Changes reset on reload. */
export function createDemoTraceApi(): TraceApi {
  const data = createDemoDataset();
  let sequence = 0;

  const findIncident = (id: string) => {
    const incident = data.incidents.find((item) => item.id === id);
    if (!incident) throw new ApiError(`Incident ${id} not found.`, 'http', 404);
    return incident;
  };

  const appendHistory = (entry: Omit<ActionHistoryEntry, 'id' | 'created_at'>) => {
    const created: ActionHistoryEntry = {
      ...entry,
      id: `DEMO-H-${++sequence}`,
      created_at: new Date().toISOString(),
    };
    (data.history[entry.incident_id] ??= []).push(created);
    findIncident(entry.incident_id).updated_at = created.created_at;
    return created;
  };

  return {
    listEvents: () => wait(data.events),
    listIncidents: () => wait(data.incidents),
    getIncident: async (id) => wait(findIncident(id)),
    getIncidentEvents: async (id) => {
      findIncident(id);
      return wait(data.events.filter((event) => event.incident_id === id));
    },
    getIncidentRelationships: async (id) => {
      findIncident(id);
      return wait(data.relationships[id] ?? []);
    },
    getIncidentHistory: async (id) => {
      findIncident(id);
      return wait(data.history[id] ?? []);
    },
    updateIncidentStatus: async (id, payload) => {
      const incident = findIncident(id);
      const previous = incident.status;
      incident.status = payload.status;
      appendHistory({
        incident_id: id,
        entry_type: 'status_change',
        author: payload.author,
        content: `Status changed from ${previous} to ${payload.status}`,
        previous_status: previous,
        new_status: payload.status,
      });
      return wait(incident);
    },
    addIncidentNote: async (id, payload) =>
      wait(appendHistory({ incident_id: id, entry_type: 'note', author: payload.author, content: payload.content })),
    recordResponseAction: async (id, payload) =>
      wait(
        appendHistory({
          incident_id: id,
          entry_type: 'response_action',
          author: payload.author,
          content: payload.description,
          action_type: payload.action_type,
        }),
      ),
  };
}
