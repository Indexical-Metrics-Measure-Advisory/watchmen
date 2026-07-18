import React from 'react';
import { cn } from '@/lib/utils';
import { TONE_DOT_CLASS, TONE_PILL_CLASS, type Tone } from '@/utils/monitorConstants';

interface StatusPillProps {
  tone: Tone;
  label: string;
  dotOnly?: boolean;
  className?: string;
}

/** Rounded status pill with a leading colored dot. Maps to the design's `.ip-status-pill`. */
export const StatusPill: React.FC<StatusPillProps> = ({ tone, label, dotOnly = false, className }) => {
  if (dotOnly) {
    return (
      <span className={cn('inline-flex items-center gap-1.5 text-xs text-muted-foreground', className)}>
        <span className={cn('h-2 w-2 rounded-full', TONE_DOT_CLASS[tone])} />
        {label}
      </span>
    );
  }
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium',
        TONE_PILL_CLASS[tone],
        className,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', TONE_DOT_CLASS[tone])} />
      {label}
    </span>
  );
};

export default StatusPill;
