export type ModuleHealthStatus = 'available' | 'degraded' | 'unavailable' | 'checking' | 'unknown';

export interface ModuleHealthResult {
  status: ModuleHealthStatus;
  /** Response time in milliseconds, undefined if not checked */
  responseTime?: number;
  /** Timestamp when the check was performed */
  checkedAt?: number;
}

const HEALTH_CHECK_TIMEOUT = 5000;
const DEGRADED_THRESHOLD = 3000;

/**
 * Perform a lightweight health check for a module URL.
 * Uses HEAD request to minimize overhead.
 * - 'available': responded within DEGRADED_THRESHOLD
 * - 'degraded': responded but slower than DEGRADED_THRESHOLD
 * - 'unavailable': network error or non-2xx status
 */
export const checkModuleHealth = async (
  url: string
): Promise<ModuleHealthResult> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT);

  const start = performance.now();

  try {
    await fetch(url, {
      method: 'HEAD',
      mode: 'no-cors',
      cache: 'no-store',
      signal: controller.signal,
    });

    const elapsed = Math.round(performance.now() - start);
    clearTimeout(timeoutId);

    // In no-cors mode, response.type is 'opaque' and status is 0.
    // A resolved fetch (even opaque) means the server is reachable.
    const status: ModuleHealthStatus =
      elapsed > DEGRADED_THRESHOLD ? 'degraded' : 'available';

    return { status, responseTime: elapsed, checkedAt: Date.now() };
  } catch (error) {
    clearTimeout(timeoutId);

    // AbortError means timeout
    if (error instanceof DOMException && error.name === 'AbortError') {
      return { status: 'unavailable', responseTime: HEALTH_CHECK_TIMEOUT, checkedAt: Date.now() };
    }

    return { status: 'unavailable', checkedAt: Date.now() };
  }
};

/**
 * Check health for multiple module URLs in parallel.
 * Returns a map of moduleId -> health result.
 */
export const checkAllModulesHealth = async (
  modules: { id: string; url?: string }[]
): Promise<Record<string, ModuleHealthResult>> => {
  const entries = modules
    .filter((m) => m.url)
    .map(async (m) => {
      const result = await checkModuleHealth(m.url!);
      return [m.id, result] as const;
    });

  const results = await Promise.all(entries);
  return Object.fromEntries(results);
};
