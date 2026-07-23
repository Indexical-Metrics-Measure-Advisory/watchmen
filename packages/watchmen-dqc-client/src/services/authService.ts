// Authentication service — mirrors
// packages/watchmen-monitor-client/src/services/authService.ts.
// watchmen-rest-dqc mounts no login route; authentication is provided by the
// doll authenticate router (packages/watchmen-rest-doll/.../auth/authenticate_router.py):
// POST /login (OAuth2PasswordRequestForm) and GET /token/exchange-user.
import { findToken } from '@/services/accountService';
import { getAuthServiceHost } from '@/utils/utils';
import type { LoginCredentials, Token, User } from '@/models/user';

class AuthService {
	private baseUrl: string;

	constructor() {
		this.baseUrl = getAuthServiceHost();
	}

	/**
	 * Login with username and password.
	 * Corresponds to: POST /login (doll authenticate_router, OAuth2 form).
	 */
	async loginWithCredentials(credentials: LoginCredentials): Promise<Token> {
		// Create form data as expected by OAuth2PasswordRequestForm
		const formData = new FormData();
		formData.append('username', credentials.username);
		formData.append('password', credentials.password);

		const response = await fetch(`${this.baseUrl}/login`, {
			method: 'POST',
			body: formData,
		});

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			throw new Error(errorData.detail || 'Login failed');
		}

		return await response.json();
	}

	/**
	 * Exchange token for user information.
	 * Corresponds to: GET /token/exchange-user (doll authenticate_router).
	 */
	async exchangeUser(token: string): Promise<User | null> {
		const response = await fetch(`${this.baseUrl}/token/exchange-user`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${token}`,
			},
		});

		if (!response.ok) {
			if (response.status === 401) {
				return null; // Token is invalid or expired
			}
			throw new Error(`Failed to exchange user: ${response.statusText}`);
		}

		return await response.json();
	}

	/** Get stored token from session storage. */
	getStoredToken(): string | null {
		return findToken();
	}

	/** Check if user is authenticated. */
	isAuthenticated(): boolean {
		return !!this.getStoredToken();
	}
}

// Export singleton instance
export const authService = new AuthService();
export default authService;
