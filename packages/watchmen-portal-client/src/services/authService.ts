/**
 * Authentication against the watchmen backend, reached via the same-origin
 * "/watchmen" prefix which the gateway proxies to the watchmen server.
 */
export enum SSOTypes {
	DOLL = "doll",
	SAML2 = "saml2",
	OIDC = "oidc",
}

export interface LoginConfiguration {
	method: SSOTypes;
	url?: string;
}

export interface Token {
	accessToken: string;
	tokenType: string;
	role: string;
	tenantId: string;
}

export interface User {
	userId?: string;
	name: string;
	nickName?: string;
	email?: string;
	role: string;
	tenantId?: string;
	isActive?: boolean;
}

export interface LoginCredentials {
	username: string;
	password: string;
}

const getServiceHost = (): string => {
	if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
		return import.meta.env.VITE_API_BASE_URL ?? `${window.location.origin}/watchmen`;
	}
	return `${window.location.protocol}//${window.location.host}/watchmen`;
};

const API_BASE_URL = getServiceHost();

/**
 * Load login configuration to determine authentication method.
 * Corresponds to: GET /auth/config. Falls back to DOLL on failure.
 */
export const loadLoginConfig = async (): Promise<LoginConfiguration> => {
	try {
		const response = await fetch(`${API_BASE_URL}/auth/config`, {
			headers: { "Content-Type": "application/json" },
		});
		if (!response.ok) {
			throw new Error(`Failed to load login configuration: ${response.statusText}`);
		}
		return await response.json();
	} catch (error) {
		console.error("Error loading login configuration:", error);
		return { method: SSOTypes.DOLL };
	}
};

/**
 * Login with username and password.
 * Corresponds to: POST /login (OAuth2 password form).
 */
export const loginWithCredentials = async (credentials: LoginCredentials): Promise<Token> => {
	const formData = new FormData();
	formData.append("username", credentials.username);
	formData.append("password", credentials.password);

	const response = await fetch(`${API_BASE_URL}/login`, {
		method: "POST",
		body: formData,
	});

	if (!response.ok) {
		const errorData = await response.json().catch(() => ({}));
		throw new Error(errorData.detail || "Incorrect username or password");
	}

	return await response.json();
};

/**
 * Exchange a token for the current user. Returns null when the token is
 * invalid or expired (401).
 * Corresponds to: GET /token/exchange-user
 */
export const exchangeUser = async (token: string): Promise<User | null> => {
	const response = await fetch(`${API_BASE_URL}/token/exchange-user`, {
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`,
		},
	});

	if (response.status === 401) {
		return null;
	}
	if (!response.ok) {
		throw new Error(`Failed to exchange user: ${response.statusText}`);
	}

	return await response.json();
};
