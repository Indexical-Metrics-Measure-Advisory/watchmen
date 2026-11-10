import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { LoginConfiguration, LoginCredentials, User } from '@/model';
import { authService } from '@/services/authService';
import { setUnauthorizedHandler } from '@/utils/apiConfig';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  loginConfig: LoginConfiguration | null;
  isLoading: boolean;
  isAdmin: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  loadLoginConfiguration: () => Promise<void>;
  handleSSOLogin: (url: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loginConfig, setLoginConfig] = useState<LoginConfiguration | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadLoginConfiguration = useCallback(async () => {
    setLoginConfig(await authService.loadLoginConfig());
  }, []);

  useEffect(() => {
    const initialize = async () => {
      setIsLoading(true);
      await loadLoginConfiguration();
      const storedToken = authService.getStoredToken();
      if (storedToken) {
        try {
          const currentUser = await authService.exchangeUser(storedToken);
          if (currentUser) {
            setUser(currentUser);
            setToken(storedToken);
          } else {
            authService.clearStoredAuth();
          }
        } catch {
          authService.clearStoredAuth();
        }
      }
      setIsLoading(false);
    };
    void initialize();
  }, [loadLoginConfiguration]);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      authService.clearStoredAuth();
      setUser(null);
      setToken(null);
      if (location.pathname !== '/login') navigate('/login', { replace: true });
    });
    return () => setUnauthorizedHandler(null);
  }, [navigate, location.pathname]);

  const login = useCallback(async (credentials: LoginCredentials) => {
    setIsLoading(true);
    try {
      const tokenData = await authService.loginWithCredentials(credentials);
      const currentUser = await authService.exchangeUser(tokenData.accessToken);
      if (!currentUser) throw new Error('Unable to load the authenticated user.');
      authService.storeToken(tokenData);
      setToken(tokenData.accessToken);
      setUser(currentUser);
      localStorage.setItem('user', JSON.stringify(currentUser));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    authService.clearStoredAuth();
    setUser(null);
    setToken(null);
    navigate('/login', { replace: true });
  }, [navigate]);

  const handleSSOLogin = useCallback(async (url: string) => {
    await authService.handleSSORedirect(url);
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user, token, loginConfig, isLoading, isAdmin: user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN',
    login, logout, loadLoginConfiguration, handleSSOLogin
  }), [user, token, loginConfig, isLoading, login, logout, loadLoginConfiguration, handleSSOLogin]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
