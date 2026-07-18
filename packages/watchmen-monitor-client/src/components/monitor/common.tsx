import React from 'react';
import { cn } from '@/lib/utils';
import { Inbox, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Monospace text for identifiers / enum values / trace IDs (design's `.wm-mono`). */
export const MonoText: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <span className={cn('font-mono text-[0.8em]', className)}>{children}</span>
);

export const MonoTextProps = MonoText; // alias for clarity when importing
export default MonoText;

interface EmptyStateProps {
  title: string;
  description?: string;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ title, description, className }) => (
  <div className={cn('flex flex-col items-center justify-center gap-2 py-12 text-center', className)}>
    <Inbox className="h-8 w-8 text-muted-foreground/60" />
    <p className="text-sm font-medium text-foreground">{title}</p>
    {description && <p className="max-w-sm text-xs text-muted-foreground">{description}</p>}
  </div>
);

interface ErrorBannerProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({
  title = 'Something went wrong',
  message,
  onRetry,
  className,
}) => (
  <div className={cn('flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4', className)}>
    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
    <div className="flex-1">
      <p className="text-sm font-medium text-red-700">{title}</p>
      {message && <p className="mt-0.5 text-xs text-red-600">{message}</p>}
    </div>
    {onRetry && (
      <Button size="sm" variant="outline" onClick={onRetry} className="border-red-200 text-red-600 hover:bg-red-100">
        <RefreshCw className="mr-1 h-3.5 w-3.5" />
        Retry
      </Button>
    )}
  </div>
);
