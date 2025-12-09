
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authService, User, Token, LoginCredentials, LoginConfiguration, SSOTypes } from '@/services/authService';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loginConfig: LoginConfiguration | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  loadLoginConfiguration: () => Promise<void>;
  handleSSOLogin: (url: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loginConfig, setLoginConfig] = useState<LoginConfiguration | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initializeAuth();
  }, []);

  useEffect(() => {
    if (!isLoading && !user && location.pathname !== '/login') {
      navigate('/login');
    }
  }, [isLoading, user, location.pathname, navigate]);

  const initializeAuth = async () => {
    setIsLoading(true);
    try {
      // Load login configuration
      await loadLoginConfiguration();
      
      // Check if user is already logged in
      const storedToken = authService.getStoredToken();
      
      if (storedToken) {
        try {
          // Validate the stored token and get user info
          const userData = await authService.exchangeUser(storedToken);
          if (userData) {
            setUser(userData);
            setToken(storedToken);
          } else {
            // Token is invalid, clear stored auth
            authService.clearStoredAuth();
          }
        } catch (error) {
          console.error('Error validating stored token:', error);
          authService.clearStoredAuth();
        }
      }
    } catch (error) {
      console.error('Error initializing auth:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadLoginConfiguration = async (): Promise<void> => {
    try {
      const config = await authService.loadLoginConfig();
      setLoginConfig(config);
    } catch (error) {
      console.error('Error loading login configuration:', error);
      // Fallback to DOLL method
      setLoginConfig({ method: SSOTypes.DOLL });
    }
  };

  const login = async (credentials: LoginCredentials): Promise<void> => {
    setIsLoading(true);
    try {
      const tokenData: Token = await authService.loginWithCredentials(credentials);
      
      // Store token
      authService.storeToken(tokenData);
      setToken(tokenData.accessToken);
      
      // Get user information
      const userData = await authService.exchangeUser(tokenData.accessToken);
      if (userData) {
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const handleSSOLogin = async (url: string): Promise<void> => {
    try {
      await authService.handleSSORedirect(url);
    } catch (error) {
      console.error('SSO login error:', error);
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    authService.clearStoredAuth();
  };

  const value: AuthContextType = {
    user,
    token,
    loginConfig,
    login,
    logout,
    isLoading,
    loadLoginConfiguration,
    handleSSOLogin
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
