import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { VariantKey, variantStyles } from '@/lib/variants';

export interface MetricCardProps {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactElement;
  variant: VariantKey;
  className?: string;
  'aria-label'?: string;
}

/**
 * MetricCard: Unified metric tile built on Card.
 * - Uses centralized variant styles for color and typography
 * - Keeps border radius consistent with theme (`rounded-lg`)
 * - Accessible label via `aria-label`
 */
const MetricCard: React.FC<MetricCardProps> = ({ label, value, icon, variant, className, ...rest }) => {
  const styles = variantStyles[variant];
  const Icon = icon
    ? React.cloneElement(icon, { className: cn('h-8 w-8', styles.icon, icon.props.className) })
    : null;

  return (
    <Card className={cn(styles.container, 'shadow-sm', className)} {...rest}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className={cn('text-sm font-medium', styles.label)}>{label}</p>
            <p className={cn('text-2xl font-bold', styles.value)}>{value}</p>
          </div>
          {Icon}
        </div>
      </CardContent>
    </Card>
  );
};

export default MetricCard;