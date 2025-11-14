import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { VariantKey, variantStyles } from '@/lib/variants';
import { ArrowRight } from 'lucide-react';

export interface ActionTileProps {
  to: string;
  title: string;
  subtitle: string;
  icon: React.ReactElement;
  variant: VariantKey;
  className?: string;
}

/**
 * ActionTile: Reusable clickable tile used in dashboard quick actions.
 * - Color system follows variantStyles
 * - Ensures accessible focus & keyboard navigation via Link
 */
const ActionTile: React.FC<ActionTileProps> = ({ to, title, subtitle, icon, variant, className }) => {
  const styles = variantStyles[variant];
  const Icon = React.cloneElement(icon, { className: cn('h-4 w-4', styles.icon, icon.props.className) });

  return (
    <Link to={to} aria-label={title} className="block focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background rounded-lg">
      <div className={cn('flex items-center justify-between p-3 rounded-lg transition-colors cursor-pointer group', styles.container, styles.hover, className)}>
        <div className="flex items-center gap-3">
          <div className={cn('p-2 rounded-lg', styles.container.replace('bg-', 'bg-'))}>{Icon}</div>
          <div>
            <p className="font-medium text-gray-900">{title}</p>
            <p className="text-sm text-gray-600">{subtitle}</p>
          </div>
        </div>
        <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-primary" />
      </div>
    </Link>
  );
};

export default ActionTile;