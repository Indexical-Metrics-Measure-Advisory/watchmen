import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ListChecks, LogIn, ShieldCheck } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { SSOTypes } from '@/model';
import { APP_TITLE } from '@/config';

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, loginConfig, isLoading, login, loadLoginConfiguration, handleSSOLogin } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loginConfig) void loadLoginConfiguration();
  }, [loginConfig, loadLoginConfiguration]);

  useEffect(() => {
    if (user) navigate('/', { replace: true });
  }, [user, navigate]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    try {
      await login({ username, password });
      navigate('/', { replace: true });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    }
  };

  const sso = loginConfig?.method === SSOTypes.SAML2 || loginConfig?.method === SSOTypes.OIDC;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <Card className="w-full max-w-md p-8 shadow-xl">
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white"><ListChecks className="h-6 w-6" /></div>
          <h1 className="mt-4 text-2xl font-bold">{APP_TITLE}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t('统一注册 · 统一编排 · 统一监控')}</p>
        </div>
        {sso ? <div className="space-y-4">
          <p className="text-center text-sm text-muted-foreground">{t('使用企业身份认证登录')}</p>
          <Button className="w-full" disabled={!loginConfig?.url || isLoading} onClick={() => loginConfig?.url && void handleSSOLogin(loginConfig.url)}>
            <ShieldCheck className="h-4 w-4" />{t('通过 {{method}} 登录', { method: loginConfig.method.toUpperCase() })}
          </Button>
        </div> : <form className="space-y-4" onSubmit={submit}>
          <label className="block text-xs font-medium">{t('用户名')}<input autoComplete="username" required className="field mt-1.5 w-full" value={username} onChange={(event) => setUsername(event.target.value)} /></label>
          <label className="block text-xs font-medium">{t('密码')}<input type="password" autoComplete="current-password" required className="field mt-1.5 w-full" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
          {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">{error}</div>}
          <Button type="submit" className="w-full" disabled={isLoading}><LogIn className="h-4 w-4" />{t(isLoading ? '登录中…' : '登录')}</Button>
        </form>}
      </Card>
    </div>
  );
}
