
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

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

const Login: React.FC = () => {
  const { login, loginConfig, loadLoginConfiguration, handleSSOLogin, isLoading: authLoading, user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

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
    // 如果用户已经登录，重定向到目标页面或首页
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
        title: "Login successful",
        description: "Welcome back!",
      });
      // 重定向到用户原本想访问的页面，或者首页
      const from = (location.state as any)?.from?.pathname || '/';
      navigate(from, { replace: true });
    } catch (error: any) {
      console.error('Login failed:', error);
      toast({
        title: "Login failed",
        description: error.message || "An error occurred during login",
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
          title: "SSO Login failed",
          description: error.message || "An error occurred during SSO login",
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
            <p className="mt-2 text-sm text-gray-600">Loading login configuration...</p>
          </div>
        </div>
      );
    }

    switch (loginConfig.method) {
      case SSOTypes.SAML2:
        return (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 text-center">
              This application uses SAML2 authentication
            </p>
            <Button 
              onClick={handleSSOClick}
              className="w-full"
              disabled={!loginConfig.url}
            >
              Sign in with SAML2
            </Button>
          </div>
        );

      case SSOTypes.OIDC:
        return (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 text-center">
              This application uses OpenID Connect authentication
            </p>
            <Button 
              onClick={handleSSOClick}
              className="w-full"
              disabled={!loginConfig.url}
            >
              Sign in with OIDC
            </Button>
          </div>
        );

      case SSOTypes.DOLL:
      default:
        return (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter your username"
                {...register('username')}
                disabled={isLoading}
              />
              {errors.username && (
                <p className="text-sm text-red-600">{errors.username.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
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
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
        );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sign In</CardTitle>
          <CardDescription>
            {loginConfig?.method === SSOTypes.DOLL 
              ? "Enter your credentials to access your account"
              : "Use your organization's authentication system"
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
