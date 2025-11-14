import { cn } from '@/lib/utils';

export type VariantKey = 'module' | 'model' | 'table' | 'info' | 'monitor';

// Centralized color styles to keep visual consistency across pages
export const variantStyles: Record<VariantKey, { container: string; label: string; value: string; icon: string; hover?: string }> = {
  module: {
    container: 'bg-blue-50 border-blue-200',
    label: 'text-blue-600',
    value: 'text-blue-700',
    icon: 'text-blue-600',
    hover: 'hover:bg-blue-100'
  },
  model: {
    container: 'bg-green-50 border-green-200',
    label: 'text-green-600',
    value: 'text-green-700',
    icon: 'text-green-600',
    hover: 'hover:bg-green-100'
  },
  table: {
    container: 'bg-purple-50 border-purple-200',
    label: 'text-purple-600',
    value: 'text-purple-700',
    icon: 'text-purple-600',
    hover: 'hover:bg-purple-100'
  },
  info: {
    container: 'bg-muted border',
    label: 'text-muted-foreground',
    value: 'text-foreground',
    icon: 'text-muted-foreground'
  },
  monitor: {
    container: 'bg-orange-50 border-orange-200',
    label: 'text-orange-600',
    value: 'text-orange-700',
    icon: 'text-orange-600',
    hover: 'hover:bg-orange-100'
  }
};

export const mergeVariant = (variant: VariantKey, extra?: string) => {
  const v = variantStyles[variant];
  return cn('rounded-lg', v.container, extra);
};