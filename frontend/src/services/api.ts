import type {
  ActionStatus,
  ActionType,
  CorrelationRun,
  DemoLoad,
  EventFilters,
  EventPage,
  EvidenceRelationship,
  IncidentDetail,
  IncidentFilters,
  IncidentStatus,
  IncidentSummary,
  InvestigationNote,
  Overview,
  ResponseAction,
  SecurityEvent,
  TimelineEntry,
} from "../types/api";

const BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function toQuery(params: Record<string, string | number | undefined>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") query.set(key, String(value));
  }
  const text = query.toString();
  return text ? `?${text}` : "";
}

/** Backend errors come as {detail: string} or, for validation errors, {detail: [{msg}]}. */
async function errorMessage(response: Response): Promise<string> {
  try {
    const body = await response.json();
    if (typeof body.detail === "string") return body.detail;
    if (Array.isArray(body.detail)) return body.detail.map((d: { msg: string }) => d.msg).join("; ");
  } catch {
    /* body was not JSON */
  }
  return `Request failed (${response.status})`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    throw new ApiError(0, "Cannot reach the TRACE backend. Is it running on the configured API URL?");
  }
  if (!response.ok) throw new ApiError(response.status, await errorMessage(response));
  return (await response.json()) as T;
}

const post = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) });

export const api = {
  health: () => request<{ status: string; database: string }>("/health"),
  overview: () => request<Overview>("/overview"),

  listEvents: (f: EventFilters = {}) =>
    request<EventPage>(`/events${toQuery({ ...f })}`),
  getEvent: (id: number) => request<SecurityEvent>(`/events/${id}`),

  listIncidents: (f: IncidentFilters = {}) =>
    request<IncidentSummary[]>(`/incidents${toQuery({ ...f })}`),
  getIncident: (id: number) => request<IncidentDetail>(`/incidents/${id}`),
  getTimeline: (id: number) => request<TimelineEntry[]>(`/incidents/${id}/timeline`),
  getRelationships: (id: number) => request<EvidenceRelationship[]>(`/incidents/${id}/relationships`),
  updateStatus: (id: number, status: IncidentStatus) =>
    request<IncidentSummary>(`/incidents/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),

  addNote: (id: number, content: string, author = "analyst") =>
    post<InvestigationNote>(`/incidents/${id}/notes`, { content, author }),
  addAction: (id: number, action_type: ActionType, description: string, status: ActionStatus) =>
    post<ResponseAction>(`/incidents/${id}/actions`, { action_type, description, status }),

  runCorrelation: () => post<CorrelationRun>("/correlation/run"),
  loadDemo: () => post<DemoLoad>("/demo/load"),
  resetDemo: () => post<DemoLoad>("/demo/reset"),
};
