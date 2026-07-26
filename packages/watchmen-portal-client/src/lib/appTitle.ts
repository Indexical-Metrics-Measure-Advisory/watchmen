/**
 * Brand title for the portal, sourced from the VITE_APP_TITLE env var.
 * Falls back to "Watchmen" when unset (e.g. standalone dev without a .env).
 */
export const APP_TITLE: string = import.meta.env.VITE_APP_TITLE ?? 'Watchmen';

/**
 * Single-character monogram used in the brand avatar, derived from the title.
 */
export const APP_TITLE_MONOGRAM: string = APP_TITLE.trim().charAt(0).toUpperCase() || 'W';
