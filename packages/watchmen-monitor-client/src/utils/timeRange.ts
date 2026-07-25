/** Global top-bar time ranges — keep in sync with TIME_RANGES in `src/components/Layout.tsx`. */
export type MonitorTimeRange = '1h' | '24h' | '7d' | '30d';

const RANGE_MS: Record<MonitorTimeRange, number> = {
  '1h': 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
};

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Backend monitor-log criteria accept all-digit datetimes only
 * (watchmen-data-kernel DATETIME_FORMATS: '%Y%m%d%H%M%S').
 */
const formatBackendDateTime = (d: Date) =>
  `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;

/** Map the top-bar time range to backend-compatible startDate/endDate criteria values. */
export const timeRangeToDates = (
  range: MonitorTimeRange,
  now: Date = new Date(),
): { startDate: string; endDate: string } => {
  const start = new Date(now.getTime() - RANGE_MS[range]);
  return { startDate: formatBackendDateTime(start), endDate: formatBackendDateTime(now) };
};
