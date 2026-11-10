import type { LoginConfiguration, LoginCredentials, Token, User } from '@/model';
import { SSOTypes } from '@/model';
import { WATCHMEN_API_BASE_URL } from '@/utils/apiConfig';

class AuthService {
  async loadLoginConfig(): Promise<LoginConfiguration> {
    try {
      const response = await fetch(`${WATCHMEN_API_BASE_URL}/auth/config`);
      if (!response.ok) throw new Error(`Failed to load login configuration: ${response.status}`);
      return await response.json() as LoginConfiguration;
    } catch {
      return { method: SSOTypes.DOLL };
    }
  }

  async loginWithCredentials(credentials: LoginCredentials): Promise<Token> {
    const formData = new FormData();
    formData.append('username', credentials.username);
    formData.append('password', credentials.password);
    const response = await fetch(`${WATCHMEN_API_BASE_URL}/login`, { method: 'POST', body: formData });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(typeof error.detail === 'string' ? error.detail : `Login failed: ${response.status}`);
    }
    return await response.json() as Token;
  }

  async exchangeUser(token: string): Promise<User | null> {
    const response = await fetch(`${WATCHMEN_API_BASE_URL}/token/exchange-user`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (response.status === 401) return null;
    if (!response.ok) throw new Error(`Failed to exchange user: ${response.status}`);
    return await response.json() as User;
  }

  async handleSSORedirect(url: string): Promise<void> {
    window.location.assign(url);
  }

  storeToken(token: Token): void {
    localStorage.setItem('authToken', token.accessToken);
    localStorage.setItem('tokenType', token.tokenType);
    localStorage.setItem('userRole', token.role);
    localStorage.setItem('tenantId', token.tenantId);
  }

  getStoredToken(): string | null {
    return localStorage.getItem('authToken');
  }

  clearStoredAuth(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('tokenType');
    localStorage.removeItem('userRole');
    localStorage.removeItem('tenantId');
    localStorage.removeItem('user');
  }

  isAuthenticated(): boolean {
    return this.getStoredToken() !== null;
  }
}

export const authService = new AuthService();
