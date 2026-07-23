
/**
 * Service host resolution, mirroring packages/watchmen-monitor-client/src/utils/utils.ts.
 *
 * The DQC console talks to two backends:
 * - watchmen-rest-dqc: every `/dqc/**` endpoint (rules, results, catalog, profile, health, pii).
 * - watchmen-rest-doll: `/login`, `/token/**` (authentication) and the admin
 *   `/topic/**` + `/user/**` endpoints used for topic/factor/owner pickers.
 *
 * On localhost (or when VITE_FORCE_SERVICE_URL=true) the explicit env URLs are
 * used; when empty, same-origin relative paths are used so the vite dev proxy
 * (see vite.config.ts) forwards them. Deployed behind the gateway, APIs are
 * reached through same-origin prefixes.
 */
const isLocalhost = (): boolean =>
	window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

const forceServiceUrl = (): boolean => import.meta.env.VITE_FORCE_SERVICE_URL === 'true';

export const getDqcServiceHost = (): string => {
	const envUrl: string | undefined = import.meta.env.VITE_DQC_API_URL;
	if (isLocalhost() || forceServiceUrl()) {
		return envUrl ?? '';
	} else {
		return `${window.location.protocol}//${window.location.host}/watchmen-dqc`;
	}
};

export const getAuthServiceHost = (): string => {
	const envUrl: string | undefined = import.meta.env.VITE_AUTH_API_URL;
	if (isLocalhost() || forceServiceUrl()) {
		return envUrl ?? '';
	} else {
		return `${window.location.protocol}//${window.location.host}/watchmen`;
	}
};

/** PII classification feature toggle (mirrors backend PII_CLASSIFICATION_ENABLED). */
export const isPiiEnabled = (): boolean => import.meta.env.VITE_PII_ENABLED === 'true';

export const getWebContext = (): string => {
	const context = import.meta.env.VITE_WEB_CONTEXT || '';
	if (context == null || context.trim().length === 0) {
		return '';
	} else if (context.trim() === '/') {
		return '';
	} else if (context.trim().endsWith('/')) {
		return context.trim().substr(0, context.trim().length - 1);
	} else {
		return context.trim();
	}
};
