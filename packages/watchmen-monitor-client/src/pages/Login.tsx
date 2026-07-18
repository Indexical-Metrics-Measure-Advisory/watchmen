
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';

import { toast } from '@/hooks/use-toast';
import { LoginCredentials, SSOTypes } from '@/services/authService';
import { useTranslation } from 'react-i18next';

type LoginFormData = LoginCredentials;

const Login: React.FC = () => {
  const { login, loginConfig, loadLoginConfiguration, handleSSOLogin, isLoading: authLoading, user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation(['auth']);

  const loginSchema = z.object({
    username: z.string().min(1, t('auth:validation.usernameRequired')),
    password: z.string().min(1, t('auth:validation.passwordRequired')),
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  useEffect(() => {
    // Load login configuration when component mounts
    if (!loginConfig) {
      loadLoginConfiguration();
    }
  }, [loginConfig, loadLoginConfiguration]);

  useEffect(() => {
    // If the user is already logged in, redirect to the target page or the homepage.
    if (user) {
      const from = (location.state as any)?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  }, [user, navigate, location.state]);

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      await login(data as LoginCredentials);
      toast({
        title: t('auth:loginSuccessfulTitle'),
        description: t('auth:loginSuccessfulDescription'),
      });
      // Redirect to the page the user originally wanted to visit, or the homepage
      const from = (location.state as any)?.from?.pathname || '/';
      navigate(from, { replace: true });
    } catch (error: any) {
      console.error('Login failed:', error);
      toast({
        title: t('auth:loginFailedTitle'),
        description: error.message || t('auth:loginFailedDescription'),
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSSOClick = async () => {
    if (loginConfig?.url) {
      try {
        await handleSSOLogin(loginConfig.url);
      } catch (error: any) {
        toast({
          title: t('auth:ssoLoginFailedTitle'),
          description: error.message || t('auth:ssoLoginFailedDescription'),
          variant: "destructive"
        });
      }
    }
  };

  const renderLoginMethod = () => {
    if (authLoading || !loginConfig) {
      return (
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-600">{t('auth:loadingConfiguration')}</p>
          </div>
        </div>
      );
    }

    switch (loginConfig.method) {
      case SSOTypes.SAML2:
        return (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 text-center">
              {t('auth:saml2Description')}
            </p>
            <Button 
              onClick={handleSSOClick}
              className="w-full"
              disabled={!loginConfig.url}
            >
              {t('auth:signInWithSaml2')}
            </Button>
          </div>
        );

      case SSOTypes.OIDC:
        return (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 text-center">
              {t('auth:oidcDescription')}
            </p>
            <Button 
              onClick={handleSSOClick}
              className="w-full"
              disabled={!loginConfig.url}
            >
              {t('auth:signInWithOidc')}
            </Button>
          </div>
        );

      case SSOTypes.DOLL:
      default:
        return (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">{t('auth:username')}</Label>
              <Input
                id="username"
                type="text"
                placeholder={t('auth:usernamePlaceholder')}
                {...register('username')}
                disabled={isLoading}
              />
              {errors.username && (
                <p className="text-sm text-red-600">{errors.username.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">{t('auth:password')}</Label>
              <Input
                id="password"
                type="password"
                placeholder={t('auth:passwordPlaceholder')}
                {...register('password')}
                disabled={isLoading}
              />
              {errors.password && (
                <p className="text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
            >
              {isLoading ? t('auth:signingIn') : t('auth:signIn')}
            </Button>
          </form>
        );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t('auth:title')}</CardTitle>
          <CardDescription>
            {loginConfig?.method === SSOTypes.DOLL 
              ? t('auth:descriptionCredentials')
              : t('auth:descriptionSso')
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {renderLoginMethod()}
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
