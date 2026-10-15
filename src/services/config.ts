const DEV_FALLBACK_BASE_URL = 'http://localhost:8000';

function resolveBaseUrl(): string | null {
  const configured = import.meta.env.VITE_API_BASE_URL?.trim();
  if (configured) return configured.replace(/\/+$/, '');
  return import.meta.env.DEV ? DEV_FALLBACK_BASE_URL : null;
}

export const API_BASE_URL = resolveBaseUrl();

export const API_TIMEOUT_MS = 10_000;

/** Demo fixtures are opt-in only: available in `vite dev`, or when explicitly enabled for a build. */
export const DEMO_FIXTURES_AVAILABLE =
  import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEMO_FIXTURES === 'true';
