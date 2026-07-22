import { useMemo, useState } from "react";
import { LogOut } from "lucide-react";
import { ModuleCard } from "@/components/ModuleCard";
import {
  portalModules,
  availableCount,
  comingSoonCount,
} from "@/config/modules";
import { useAuth } from "@/context/AuthContext";
import {
  formatRelativeTime,
  loadLastAccessed,
  markAccessed,
} from "@/lib/lastAccessed";

export default function Portal() {
  const { user, logout } = useAuth();
  const [lastAccessed, setLastAccessed] = useState<Record<string, number>>(
    loadLastAccessed
  );

  const modules = useMemo(
    () =>
      portalModules.map((module) => ({
        ...module,
        lastAccessed: lastAccessed[module.id]
          ? formatRelativeTime(lastAccessed[module.id])
          : undefined,
      })),
    [lastAccessed]
  );

  const handleEnter = (moduleId: string) => {
    setLastAccessed(markAccessed(moduleId));
  };

  const displayName = user?.nickName || user?.name || "";
  const avatarInitial = displayName.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="w-full border-b border-border bg-background">
        <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-3">
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

          {/* User info */}
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium text-foreground">
                {displayName}
              </div>
              <div className="text-xs text-muted-foreground">{user?.role}</div>
            </div>
            <div className="w-9 h-9 flex items-center justify-center rounded-full bg-primary/10 text-primary">
              <span className="text-sm font-semibold">{avatarInitial}</span>
            </div>
            <button
              type="button"
              onClick={logout}
              title="Sign out"
              className="w-9 h-9 flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero / Welcome */}
      <section className="px-6 pt-14 pb-10 lg:pt-16 lg:pb-12">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <h1 className="text-3xl lg:text-4xl font-bold font-heading text-foreground leading-[1.2] tracking-tight">
              Watchmen Data Platform
            </h1>
            <p className="mt-4 text-base lg:text-lg leading-relaxed text-muted-foreground max-w-2xl">
              Unified data governance and management platform, empowering data
              teams with end-to-end collaboration from ingestion to development
              to analysis
            </p>

            {/* Stats */}
            <div className="mt-8 flex items-center gap-6">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold tabular-nums font-heading text-primary">
                  {availableCount}
                </span>
                <span className="text-sm text-muted-foreground">
                  available modules
                </span>
              </div>
              <div className="w-px h-6 bg-border" />
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold tabular-nums font-heading text-muted-foreground">
                  {comingSoonCount}
                </span>
                <span className="text-sm text-muted-foreground">
                  coming soon
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Module Card Grid */}
      <section className="px-6 pb-16 lg:pb-20 flex-1">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {modules.map((module) => (
              <ModuleCard
                key={module.id}
                module={module}
                onEnter={handleEnter}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="mx-auto max-w-7xl px-6 py-6 flex items-center justify-between">
          <span className="text-xs whitespace-nowrap text-muted-foreground">
            Watchmen Data Platform v0.1.0
          </span>
          <span className="text-xs whitespace-nowrap text-muted-foreground">
            © 2026 Watchmen Team
          </span>
        </div>
      </footer>
    </div>
  );
}
