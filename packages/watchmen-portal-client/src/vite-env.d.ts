/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_API_BASE_URL?: string;
	readonly VITE_WEB_CONTEXT?: string;
	/** Brand title shown in the portal and login headers. */
	readonly VITE_APP_TITLE?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
