/**
 * Session storage convention shared by all watchmen web clients
 * (web-client, monitor-client, ingestion-client). Since every UI is served
 * from the same origin behind the gateway, a token stored here by the portal
 * login is picked up by the other clients in the same tab.
 */
const ACCOUNT_KEY_IN_SESSION = 'IMMA-ACCOUNT';
const ACCOUNT_TOKEN = 'IMMA-ACCOUNT-TOKEN';

// UTF-8 safe base64, wire-compatible with Buffer-based encode/decode in the other clients
const base64Encode = (str: string): string =>
	btoa(String.fromCharCode(...new TextEncoder().encode(str)));

export interface SessionAccount {
	name: string;
	admin: boolean;
	super: boolean;
	tenantId?: string;
}

export const saveAccountIntoSession = (account: SessionAccount): void => {
	sessionStorage.setItem(ACCOUNT_KEY_IN_SESSION, base64Encode(JSON.stringify(account)));
};

export const saveTokenIntoSession = (token: string): void => {
	sessionStorage.setItem(ACCOUNT_TOKEN, token);
};

export const findToken = (): string | null => {
	return sessionStorage.getItem(ACCOUNT_TOKEN) || null;
};

export const clearSession = (): void => {
	sessionStorage.removeItem(ACCOUNT_KEY_IN_SESSION);
	sessionStorage.removeItem(ACCOUNT_TOKEN);
};
