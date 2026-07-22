/**
 * Tracks when each portal module was last entered, in localStorage.
 * Keyed by module id, value is an epoch timestamp (ms).
 */
const STORAGE_KEY = "portal-module-last-accessed";

export const loadLastAccessed = (): Record<string, number> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch {
    return {};
  }
};

export const markAccessed = (moduleId: string): Record<string, number> => {
  const map = { ...loadLastAccessed(), [moduleId]: Date.now() };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // storage unavailable — tracking is best-effort
  }
  return map;
};

/** "just now" / "5m ago" / "2h ago" / "3d ago", falling back to a locale date. */
export const formatRelativeTime = (timestamp: number): string => {
  const minutes = Math.floor((Date.now() - timestamp) / 60000);
  if (minutes < 1) {
    return "just now";
  }
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  if (days < 30) {
    return `${days}d ago`;
  }
  return new Date(timestamp).toLocaleDateString();
};
