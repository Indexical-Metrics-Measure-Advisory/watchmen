import React from 'react';
import { cn } from '@/lib/utils';
import { type Tone, TONE_DOT_CLASS } from '@/utils/monitorConstants';

export interface StatusSegment {
  tone: Tone;
  /** Relative weight (flex-grow). Use counts or arbitrary weights. */
  weight: number;
  label?: string;
}

interface SegmentedStatusBarProps {
  segments: StatusSegment[];
  className?: string;
}

/**
 * Horizontal segmented bar with flex-grow weights per status (success/waiting/fail).
 * Maps to the design's `.ov-stage-bar` / `.gm-stat-bar`.
 */
export const SegmentedStatusBar: React.FC<SegmentedStatusBarProps> = ({ segments, className }) => {
  const total = segments.reduce((sum, s) => sum + Math.max(0, s.weight), 0);
  if (total <= 0) {
    return <div className={cn('h-2 w-full rounded-full bg-slate-100', className)} />;
  }
  return (
    <div className={cn('flex h-2 w-full overflow-hidden rounded-full bg-slate-100', className)}>
      {segments.map((seg, i) =>
        seg.weight > 0 ? (
          <div
            key={i}
            className={cn('h-full', TONE_DOT_CLASS[seg.tone])}
            style={{ flexGrow: seg.weight }}
            title={seg.label}
          />
        ) : null,
      )}
    </div>
  );
};

export default SegmentedStatusBar;
