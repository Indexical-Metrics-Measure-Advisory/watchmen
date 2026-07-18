import { useEffect, useRef, useState } from 'react';

/**
 * Lightweight auto-refresh hook returning a `refreshKey` that increments on a fixed interval,
 * plus an explicit `refresh()` and an `isRefreshing` pulse. Pages pass `refreshKey` into their
 * react-query `queryKey` (or use it to invalidate) so polling re-fetches data.
 *
 * @param intervalMs default 30s; pass 0 to disable.
 */
export const useAutoRefresh = (intervalMs = 30000) => {
  const [refreshKey, setRefreshKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = () => {
    setIsRefreshing(true);
    setRefreshKey((k) => k + 1);
    // brief pulse so callers can show a spinner
    setTimeout(() => setIsRefreshing(false), 400);
  };

  useEffect(() => {
    if (!intervalMs || intervalMs <= 0) return;
    timerRef.current = setInterval(() => setRefreshKey((k) => k + 1), intervalMs);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [intervalMs]);

  return { refreshKey, refresh, isRefreshing };
};
