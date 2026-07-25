import React from 'react';
import { cn } from '@/lib/utils';
import { Inbox, AlertCircle, RefreshCw, Copy } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

/** Monospace text for identifiers / enum values / trace IDs (design's `.wm-mono`). */
export const MonoText: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <span className={cn('font-mono text-[0.8em]', className)}>{children}</span>
);

export const MonoTextProps = MonoText; // alias for clarity when importing
export default MonoText;

/** Icon-only copy-to-clipboard button with a toast confirmation. Stops event propagation (usable inside clickable rows). */
export const CopyButton: React.FC<{ text: string; className?: string }> = ({ text, className }) => {
  const { t } = useTranslation(['common']);
  const copy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t('common:copied'));
    } catch {
      toast.error(t('common:copyFailed'));
    }
  };
  return (
    <button
      type="button"
      onClick={copy}
      title={t('common:copy')}
      className={cn(
        'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
        className,
      )}
    >
      <Copy className="h-3 w-3" />
    </button>
  );
};

/** Section header bar for border-first panels (`Card p-0`): title on the left, optional extra on the right. */
export const PanelHeader: React.FC<{ title: React.ReactNode; extra?: React.ReactNode; className?: string }> = ({
  title,
  extra,
  className,
}) => (
  <div className={cn('flex items-center justify-between gap-2 border-b px-4 py-3', className)}>
    <p className="text-sm font-semibold text-foreground">{title}</p>
    {extra != null && <div className="text-xs text-muted-foreground">{extra}</div>}
  </div>
);

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
