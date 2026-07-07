import { useState, useCallback } from 'react';

const MAX_RECENT_METRICS = 10;

function readRecentMetrics(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

export function useRecentMetrics(storageKey: string = 'recent_metrics') {
  const [recentMetrics, setRecentMetrics] = useState<string[]>(() => readRecentMetrics(storageKey));

  const addRecentMetric = useCallback(
    (metricName: string) => {
      setRecentMetrics((prev) => {
        const next = [metricName, ...prev.filter((item) => item !== metricName)].slice(0, MAX_RECENT_METRICS);
        localStorage.setItem(storageKey, JSON.stringify(next));
        return next;
      });
    },
    [storageKey],
  );

  return { recentMetrics, addRecentMetric };
}
