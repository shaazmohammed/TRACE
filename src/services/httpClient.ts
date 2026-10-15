import { API_BASE_URL, API_TIMEOUT_MS } from './config';

export type ApiErrorKind = 'config' | 'network' | 'timeout' | 'http' | 'parse';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly kind: ApiErrorKind,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface FastApiValidationItem {
  loc?: (string | number)[];
  msg?: string;
}

function extractDetail(body: unknown): string | null {
  if (!body || typeof body !== 'object' || !('detail' in body)) return null;
  const detail = (body as { detail: unknown }).detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((item: FastApiValidationItem) => {
        const field = item.loc?.filter((part) => part !== 'body').join('.');
        return field ? `${field}: ${item.msg}` : item.msg;
      })
      .filter(Boolean)
      .join('; ');
  }
  return null;
}

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!API_BASE_URL) {
    throw new ApiError('VITE_API_BASE_URL is not configured. Set it to your FastAPI backend URL.', 'config');
  }

  const url = `${API_BASE_URL}${path}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...init.headers,
      },
    });
  } catch (error) {
    if (controller.signal.aborted) {
      throw new ApiError(`Request to ${url} timed out after ${API_TIMEOUT_MS / 1000}s.`, 'timeout');
    }
    throw new ApiError(
      `Could not reach the TRACE backend at ${API_BASE_URL}. Check that the FastAPI server is running and that CORS allows this origin.`,
      'network',
    );
  } finally {
    clearTimeout(timer);
  }

  const text = await response.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      if (response.ok) throw new ApiError(`Unexpected non-JSON response from ${path}.`, 'parse', response.status);
    }
  }

  if (!response.ok) {
    const detail = extractDetail(body);
    throw new ApiError(
      detail ?? `${init.method ?? 'GET'} ${path} failed with HTTP ${response.status}.`,
      'http',
      response.status,
    );
  }

  return body as T;
}

/** Accepts either a bare array or a paginated `{ items: [...] }` envelope. */
export function asList<T>(payload: T[] | { items: T[] } | null): T[] {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.items)) return payload.items;
  throw new ApiError('Expected a list response from the backend.', 'parse');
}
