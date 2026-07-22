import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import {
	exchangeUser,
	loadLoginConfig,
	loginWithCredentials,
	SSOTypes,
	type LoginConfiguration,
	type LoginCredentials,
	type Token,
	type User
} from '@/services/authService';
import { clearSession, findToken, saveAccountIntoSession, saveTokenIntoSession } from '@/services/accountService';

const isAdmin = (token: Token): boolean => token.role === 'admin' || token.role === 'superadmin';
const isSuperAdmin = (token: Token): boolean => token.role === 'superadmin';

interface AuthContextType {
	user: User | null;
	loginConfig: LoginConfiguration;
	/** true while the initial session restore is in flight */
	isLoading: boolean;
	login: (credentials: LoginCredentials) => Promise<void>;
	logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = (): AuthContextType => {
	const context = useContext(AuthContext);
	if (context === undefined) {
		throw new Error('useAuth must be used within an AuthProvider');
	}
	return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
	const [user, setUser] = useState<User | null>(null);
	const [loginConfig, setLoginConfig] = useState<LoginConfiguration>({ method: SSOTypes.DOLL });
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		const initialize = async () => {
			setLoginConfig(await loadLoginConfig());

			const token = findToken();
			if (token) {
				try {
					const userData = await exchangeUser(token);
					if (userData) {
						setUser(userData);
					} else {
						clearSession();
					}
				} catch (error) {
					console.error('Error restoring session:', error);
					clearSession();
				}
			}
			setIsLoading(false);
		};
		initialize();
	}, []);

	const login = useCallback(async (credentials: LoginCredentials): Promise<void> => {
		const token = await loginWithCredentials(credentials);
		saveTokenIntoSession(token.accessToken);

		const userData = await exchangeUser(token.accessToken);
		if (!userData) {
			clearSession();
			throw new Error('Failed to load user information');
		}

		saveAccountIntoSession({
			name: credentials.username.trim(),
			admin: isAdmin(token),
			super: isSuperAdmin(token),
			tenantId: token.tenantId
		});
		setUser(userData);
	}, []);

	const logout = useCallback((): void => {
		setUser(null);
		clearSession();
	}, []);

	return (
		<AuthContext.Provider value={{ user, loginConfig, isLoading, login, logout }}>
			{children}
		</AuthContext.Provider>
	);
};
