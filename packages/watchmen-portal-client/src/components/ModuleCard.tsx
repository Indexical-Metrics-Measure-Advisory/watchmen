import { ArrowRight, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { PortalModule } from '@/config/modules';
import type { ModuleHealthResult } from '@/lib/moduleHealth';

interface ModuleCardProps {
  module: PortalModule;
  /** Called when the user clicks Enter — used to track last-accessed time. */
  onEnter?: (moduleId: string) => void;
  health?: ModuleHealthResult;
}

const healthConfig: Record<string, { dot: string; badge: 'success' | 'warning' | 'destructive' | 'secondary' }> = {
  available: { dot: 'bg-success', badge: 'success' },
  degraded: { dot: 'bg-warning', badge: 'warning' },
  unavailable: { dot: 'bg-destructive', badge: 'destructive' },
  checking: { dot: 'bg-muted-foreground animate-pulse', badge: 'secondary' },
  unknown: { dot: 'bg-muted-foreground', badge: 'secondary' },
};

export function ModuleCard({ module, onEnter, health }: ModuleCardProps) {
  const { t } = useTranslation();
  const { icon: Icon, status } = module;
  const isAvailable = status === 'available';
  const healthStatus = health?.status ?? 'unknown';
  const hc = healthConfig[healthStatus] ?? healthConfig.unknown;

  // Display text comes from the i18n bundle (`modules.<id>`); fall back to
  // the module's inline fields so a missing translation never renders a key.
  const title = t(`modules.${module.id}.title`, { defaultValue: module.title ?? module.id });
  const subtitle = t(`modules.${module.id}.subtitle`, { defaultValue: module.subtitle ?? '' });
  const description = t(`modules.${module.id}.description`, { defaultValue: module.description ?? '' });

  const badgeContent = isAvailable
    ? t(`health.${healthStatus}`)
    : t('module.comingSoon');
  const dotColor = isAvailable ? hc.dot : 'bg-muted-foreground';
  const badgeVariant = isAvailable ? hc.badge : 'outline' as const;

  return (
    <div
      className={cn(
        'flex flex-col p-6 rounded-lg border transition-colors',
        isAvailable
          ? 'bg-card border-border hover:border-primary'
          : 'bg-muted border-border'
      )}
    >
      {/* Top row: icon + status badge */}
      <div className="flex items-start justify-between">
        <div
          className={cn(
            'flex h-11 w-11 items-center justify-center shrink-0 rounded-md',
            isAvailable ? 'bg-primary/10' : 'bg-card'
          )}
        >
          <Icon
            className={cn('h-5 w-5', isAvailable ? 'text-primary' : 'text-muted-foreground')}
            strokeWidth={1.5}
          />
        </div>
        {isAvailable ? (
          <Badge variant={badgeVariant}>
            <span className={cn('h-1.5 w-1.5 rounded-full', dotColor)} />
            {badgeContent}
          </Badge>
        ) : (
          <Badge variant="outline">{badgeContent}</Badge>
        )}
      </div>

      {/* Title section */}
      <div className="mt-4 min-w-0">
        <h3
          className={cn(
            'font-heading text-lg font-semibold truncate',
            isAvailable ? 'text-foreground' : 'text-muted-foreground'
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
                {t('module.lastAccessed', { time: module.lastAccessed })}
              </span>
            ) : (
              <span />
            )}
            <a
              href={module.url}
              target="_blank"
              onClick={(event) => {
                onEnter?.(module.id);
                // Open via window.open with opener preserved: plain target="_blank" implies
                // noopener in modern browsers, which would block the new tab from cloning this
                // tab's sessionStorage (where the shared login session lives).
                event.preventDefault();
                window.open(module.url, '_blank');
              }}
              data-dom-id={`enter-${module.id}`}
              className={cn(
                'portal-btn-primary inline-flex items-center gap-1.5 h-9 px-4 rounded-md',
                'text-sm font-medium whitespace-nowrap shrink-0',
                'bg-primary text-primary-foreground hover:bg-primary-hover',
                'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                healthStatus === 'unavailable' && 'opacity-60 pointer-events-auto'
              )}
              title={
                healthStatus === 'unavailable'
                  ? t('health.unavailable')
                  : undefined
              }
            >
              {t('module.enter')}
              <ArrowRight className="portal-btn-arrow h-4 w-4 transition-transform" />
            </a>
          </div>
        ) : (
          <div className="flex items-center">
            <span className="inline-flex items-center gap-1 text-xs whitespace-nowrap text-muted-foreground">
              <Clock className="h-3 w-3" />
              {t('module.stayTuned')}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
