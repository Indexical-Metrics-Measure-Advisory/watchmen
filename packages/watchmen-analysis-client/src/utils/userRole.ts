import { User } from '@/services/authService';

/**
 * Console users (backend role `console`) work in a restricted mode: they only
 * see the metrics section (analysis / lineage / management) and published
 * metrics only; every mutating action is hidden.
 */
export const isConsoleUser = (user: Pick<User, 'role'> | null | undefined): boolean =>
  user?.role?.toLowerCase() === 'console';

// Paths a console user may open; anything else is redirected to the metrics analysis home.
const CONSOLE_ALLOWED_PATHS = ['/', '/metrics/bi-analysis', '/metrics/tree', '/metrics/lineage', '/metrics/management', '/metrics/alert-configuration'];

export const isConsoleAllowedPath = (pathname: string): boolean => {
  if (pathname === '/login' || pathname.startsWith('/share/analysis/')) {
    return true;
  }
  return CONSOLE_ALLOWED_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
};
