import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/context/AuthContext';

const LoginPage: React.FC = () => {
	const { t } = useTranslation(['auth', 'common']);
	const { login, isLoading } = useAuth();
	const navigate = useNavigate();
	const location = useLocation();
	const [username, setUsername] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);

	const from = (location.state as any)?.from?.pathname ?? '/';

	const onSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		setSubmitting(true);
		try {
			await login({ username, password });
			navigate(from, { replace: true });
		} catch (err: any) {
			setError(err?.message || t('auth:loginFailed'));
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<div className="grid min-h-screen place-items-center bg-[radial-gradient(ellipse_at_top,_hsl(226_60%_12%),_hsl(var(--background)))] p-4">
			<Card className="w-[min(420px,92vw)]">
				<CardHeader>
					<div className="mb-2 flex items-center gap-3">
						<div className="logo-dot grid h-9 w-9 place-items-center rounded-lg text-white">
							<Lock className="h-4 w-4" />
						</div>
						<CardTitle className="text-2xl">{t('auth:title')}</CardTitle>
					</div>
					<CardDescription>{t('auth:subtitle')}</CardDescription>
				</CardHeader>
				<CardContent>
					<Separator className="mb-4" />
					<form onSubmit={onSubmit} className="flex flex-col gap-3">
						<div className="flex flex-col gap-1.5">
							<Label htmlFor="username">{t('auth:username')}</Label>
							<Input
								id="username"
								value={username}
								onChange={(e) => setUsername(e.target.value)}
								autoComplete="username"
								required
							/>
						</div>
						<div className="flex flex-col gap-1.5">
							<Label htmlFor="password">{t('auth:password')}</Label>
							<Input
								id="password"
								type="password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								autoComplete="current-password"
								required
							/>
						</div>
						{error && <p className="text-sm text-destructive">{error}</p>}
						<Button type="submit" disabled={submitting || isLoading} className="mt-1">
							{submitting ? t('auth:signingIn') : t('auth:signIn')}
						</Button>
					</form>
					<p className="mt-4 text-center text-[11px] text-muted-foreground">{t('auth:footer')}</p>
				</CardContent>
			</Card>
		</div>
	);
};

export default LoginPage;
