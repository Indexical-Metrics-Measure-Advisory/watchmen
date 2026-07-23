import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';

/** Redirects unauthenticated users to /login, preserving the target path. */
const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const { user, isLoading } = useAuth();
	const location = useLocation();
	const { t } = useTranslation('common');

	if (isLoading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-background">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
					<p className="mt-4 text-sm text-muted-foreground">{t('loading')}</p>
				</div>
			</div>
		);
	}

	if (!user) {
		return <Navigate to="/login" state={{ from: location }} replace />;
	}

	return <>{children}</>;
};

export default AuthGuard;
