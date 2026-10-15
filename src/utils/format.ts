import type { EntityType, Severity } from '../types/trace';

const dateTime = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'short',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

const timeOnly = new Intl.DateTimeFormat(undefined, {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

const dayOnly = new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: '2-digit' });

const safe = (iso: string, formatter: Intl.DateTimeFormat) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : formatter.format(date);
};

export const formatDateTime = (iso: string) => safe(iso, dateTime);
export const formatTime = (iso: string) => safe(iso, timeOnly);
export const formatDay = (iso: string) => safe(iso, dayOnly);

export function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diff)) return iso;
  const minutes = Math.round(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  if (minutes < 60) return rest ? `${minutes}m ${rest}s` : `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

export const humanize = (value: string) => value.replace(/_/g, ' ');

export const ENTITY_LABEL: Record<EntityType, string> = {
  username: 'User',
  ip_address: 'IP',
  device: 'Device',
};

export const SEVERITY_RANK: Record<Severity, number> = { critical: 4, high: 3, medium: 2, low: 1 };
