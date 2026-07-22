import { ArrowRight, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { PortalModule } from "@/config/modules";

interface ModuleCardProps {
  module: PortalModule;
  /** Called when the user clicks Enter — used to track last-accessed time. */
  onEnter?: (moduleId: string) => void;
}

export function ModuleCard({ module, onEnter }: ModuleCardProps) {
  const { icon: Icon, title, subtitle, description, status } = module;
  const isAvailable = status === "available";

  return (
    <div
      className={cn(
        "flex flex-col p-6 rounded-lg border transition-colors",
        isAvailable
          ? "bg-card border-border hover:border-primary"
          : "bg-muted border-border"
      )}
    >
      {/* Top row: icon + status badge */}
      <div className="flex items-start justify-between">
        <div
          className={cn(
            "flex h-11 w-11 items-center justify-center shrink-0 rounded-md",
            isAvailable ? "bg-primary/10" : "bg-card"
          )}
        >
          <Icon
            className={cn("h-5 w-5", isAvailable ? "text-primary" : "text-muted-foreground")}
            strokeWidth={1.5}
          />
        </div>
        {isAvailable ? (
          <Badge variant="success">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            Available
          </Badge>
        ) : (
          <Badge variant="outline">Coming Soon</Badge>
        )}
      </div>

      {/* Title section */}
      <div className="mt-4 min-w-0">
        <h3
          className={cn(
            "font-heading text-lg font-semibold truncate",
            isAvailable ? "text-foreground" : "text-muted-foreground"
          )}
        >
          {title}
        </h3>
        <p className="mt-0.5 text-xs truncate text-muted-foreground">
          {subtitle}
        </p>
      </div>

      {/* Description */}
      <p className="mt-3 text-sm leading-relaxed line-clamp-2 text-muted-foreground">
        {description}
      </p>

      {/* Spacer pushes footer to bottom */}
      <div className="flex-1" />

      {/* Footer: timestamp + action */}
      <div className="mt-5 pt-4 border-t border-border">
        {isAvailable ? (
          <div className="flex items-center justify-between">
            {module.lastAccessed ? (
              <span className="inline-flex items-center gap-1 text-xs whitespace-nowrap text-muted-foreground">
                <Clock className="h-3 w-3" />
                Last accessed {module.lastAccessed}
              </span>
            ) : (
              <span />
            )}
            <a
              href={module.url}
              onClick={() => onEnter?.(module.id)}
              data-dom-id={`enter-${module.id}`}
              className="portal-btn-primary inline-flex items-center gap-1.5 h-9 px-4 rounded-md text-sm font-medium whitespace-nowrap shrink-0 bg-primary text-primary-foreground hover:bg-primary-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              Enter
              <ArrowRight className="portal-btn-arrow h-4 w-4 transition-transform" />
            </a>
          </div>
        ) : (
          <div className="flex items-center">
            <span className="inline-flex items-center gap-1 text-xs whitespace-nowrap text-muted-foreground">
              <Clock className="h-3 w-3" />
              Stay tuned
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
