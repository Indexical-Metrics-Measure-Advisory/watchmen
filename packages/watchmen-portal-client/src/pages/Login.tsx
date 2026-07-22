import { useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { SSOTypes } from "@/services/authService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Login() {
  const { user, login, loginConfig } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const from = (location.state as { from?: { pathname?: string } })?.from
    ?.pathname;

  // Already signed in — go back where we came from, or to the portal
  if (user) {
    return <Navigate to={from ?? "/"} replace />;
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await login({ username: username.trim(), password });
      navigate(from ?? "/", { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed");
      setIsSubmitting(false);
    }
  };

  const onSSOClick = () => {
    if (loginConfig.url) {
      window.location.href = loginConfig.url;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted px-4">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="mb-6 flex items-center justify-center gap-3">
          <div className="w-9 h-9 flex items-center justify-center rounded-md bg-primary text-primary-foreground">
            <span className="text-base font-bold font-heading">W</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-base font-semibold text-foreground">
              Watchmen
            </span>
            <span className="text-xs text-muted-foreground">Data Platform</span>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>
              {loginConfig.method === SSOTypes.DOLL
                ? "Sign in with your watchmen account"
                : "Sign in with your organization's identity provider"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loginConfig.method === SSOTypes.DOLL ? (
              <form onSubmit={onSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="username"
                    className="text-sm font-medium text-foreground"
                  >
                    Username
                  </label>
                  <Input
                    id="username"
                    type="text"
                    autoComplete="username"
                    autoFocus
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={isSubmitting}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label
                    htmlFor="password"
                    className="text-sm font-medium text-foreground"
                  >
                    Password
                  </label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isSubmitting}
                    required
                  />
                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Signing in…" : "Sign in"}
                </Button>
              </form>
            ) : (
              <Button
                className="w-full"
                onClick={onSSOClick}
                disabled={!loginConfig.url}
              >
                Continue with {loginConfig.method.toUpperCase()}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
