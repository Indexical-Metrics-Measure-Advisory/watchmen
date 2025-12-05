import { API_BASE_URL } from '@/utils/apiConfig';

// Types based on the backend models
export enum SSOTypes {
  DOLL = 'doll',
  SAML2 = 'saml2',
  OIDC = 'oidc'
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
  id: string;
  name: string;
  email?: string;
  role: string;
  tenantId: string;
  isActive: boolean;
}

export interface LoginCredentials {
  username: string;
  password: string;
}



class AuthService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  /**
   * Load login configuration to determine authentication method
   * Corresponds to: GET /auth/config
   */
  async loadLoginConfig(): Promise<LoginConfiguration> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/config`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to load login configuration: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error loading login configuration:', error);
      // Fallback to DOLL method if config fails
      return { method: SSOTypes.DOLL };
    }
  }

  /**
   * Login with username and password
   * Corresponds to: POST /login
   */
  async loginWithCredentials(credentials: LoginCredentials): Promise<Token> {
    try {
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
    } catch (error) {
      console.error('Error during login:', error);
      throw error;
    }
  }

  /**
   * Validate JWT token
   * Corresponds to: GET /token/validate/jwt
   */
  async validateJwtToken(token: string): Promise<User> {
    try {
      const response = await fetch(`${this.baseUrl}/token/validate/jwt?token=${encodeURIComponent(token)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Token validation failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error validating token:', error);
      throw error;
    }
  }

  /**
   * Exchange token for user information
   * Corresponds to: GET /token/exchange-user
   */
  async exchangeUser(token: string): Promise<User | null> {
    try {
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
    } catch (error) {
      console.error('Error exchanging user:', error);
      throw error;
    }
  }

  /**
   * Handle SSO redirect for SAML2 or OIDC
   */
  async handleSSORedirect(url: string): Promise<void> {
    window.location.href = url;
  }

  /**
   * Store token in localStorage
   */
  storeToken(token: Token): void {
    localStorage.setItem('authToken', token.accessToken);
    localStorage.setItem('tokenType', token.tokenType);
    localStorage.setItem('userRole', token.role);
    localStorage.setItem('tenantId', token.tenantId);
  }

  /**
   * Get stored token from localStorage
   */
  getStoredToken(): string | null {
    return localStorage.getItem('authToken');
  }

  /**
   * Clear stored authentication data
   */
  clearStoredAuth(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('tokenType');
    localStorage.removeItem('userRole');
    localStorage.removeItem('tenantId');
    localStorage.removeItem('user');
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    const token = this.getStoredToken();
    return !!token;
  }
}

// Export singleton instance
export const authService = new AuthService();