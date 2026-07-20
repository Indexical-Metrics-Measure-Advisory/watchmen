import { useCallback, useState } from 'react';

/**
 * Persisted auto-refresh interval preference.
 *
 * Mirrors the localStorage-backed pattern used by `useLocale`. The chosen
 * interval drives the global `useAutoRefresh` in `Layout`; selecting `manual`
 * (intervalMs = 0) disables the timer so data is only refreshed on demand.
 */
export const REFRESH_INTERVAL_STORAGE_KEY = 'watchmen_monitor_refresh_interval';

export type RefreshInterval = '1m' | '5m' | '10m' | 'manual';

export const REFRESH_INTERVAL_OPTIONS: ReadonlyArray<RefreshInterval> = ['1m', '5m', '10m', 'manual'];

/** Default is slower than the legacy 30s cadence, matching the "refresh too frequent" feedback. */
export const DEFAULT_REFRESH_INTERVAL: RefreshInterval = '1m';

const INTERVAL_MS: Record<RefreshInterval, number> = {
  '1m': 60_000,
  '5m': 300_000,
  '10m': 600_000,
  manual: 0,
};

/** Resolve a `RefreshInterval` preference to the millisecond cadence used by `useAutoRefresh`. */
export const refreshIntervalToMs = (interval: RefreshInterval): number => INTERVAL_MS[interval];

const isRefreshInterval = (value: unknown): value is RefreshInterval =>
  typeof value === 'string' && (REFRESH_INTERVAL_OPTIONS as ReadonlyArray<string>).includes(value);

const readStoredInterval = (): RefreshInterval => {
  if (typeof window === 'undefined') return DEFAULT_REFRESH_INTERVAL;
  const stored = window.localStorage.getItem(REFRESH_INTERVAL_STORAGE_KEY);
  return isRefreshInterval(stored) ? stored : DEFAULT_REFRESH_INTERVAL;
};

export const useRefreshInterval = () => {
  const [interval, setIntervalState] = useState<RefreshInterval>(readStoredInterval);

  const setInterval = useCallback((nextInterval: RefreshInterval) => {
    window.localStorage.setItem(REFRESH_INTERVAL_STORAGE_KEY, nextInterval);
    setIntervalState(nextInterval);
  }, []);

  return {
    interval,
    setInterval,
    intervalMs: INTERVAL_MS[interval],
  };
};
