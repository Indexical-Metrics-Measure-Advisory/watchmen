import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { authService } from '@/services/authService';
import { findToken, quit, saveAccountIntoSession, saveTokenIntoSession } from '@/services/accountService';
import type { LoginCredentials, Token, User } from '@/models/user';

export enum UserRole {
	CONSOLE = 'console',
	ADMIN = 'admin',
	SUPER_ADMIN = 'superadmin',
}

const isAdminRole = (loginResult: any) =>
	loginResult.role === UserRole.ADMIN || loginResult.role === UserRole.SUPER_ADMIN;
const isSuperAdminRole = (loginResult: any) => loginResult.role === UserRole.SUPER_ADMIN;

interface AuthContextType {
	user: User | null;
	login: (credentials: LoginCredentials) => Promise<void>;
	logout: () => void;
	isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
	const context = useContext(AuthContext);
	if (context === undefined) {
		throw new Error('useAuth must be used within an AuthProvider');
	}
	return context;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
	const [user, setUser] = useState<User | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		void initializeAuth();
	}, []);

	const initializeAuth = async () => {
		setIsLoading(true);
		try {
			const storedToken = findToken();
			if (storedToken) {
				try {
					const userData = await authService.exchangeUser(storedToken);
					if (userData) {
						setUser(userData);
					} else {
						quit();
					}
				} catch (error) {
					console.error('Error validating stored token:', error);
					quit();
				}
			}
		} finally {
			setIsLoading(false);
		}
	};

	const login = async (credentials: LoginCredentials): Promise<void> => {
		setIsLoading(true);
		try {
			const tokenData: Token = await authService.loginWithCredentials(credentials);
			saveTokenIntoSession(tokenData.accessToken);

			const userData = await authService.exchangeUser(tokenData.accessToken);
			if (userData) {
				setUser(userData);
				saveAccountIntoSession({
					name: (credentials.username || '').trim(),
					admin: isAdminRole(tokenData),
					super: isSuperAdminRole(tokenData),
					tenantId: tokenData.tenantId,
				});
			}
		} finally {
			setIsLoading(false);
		}
	};

	const logout = () => {
		setUser(null);
		quit();
	};

	return (
		<AuthContext.Provider value={{ user, login, logout, isLoading }}>
			{children}
		</AuthContext.Provider>
	);
};
