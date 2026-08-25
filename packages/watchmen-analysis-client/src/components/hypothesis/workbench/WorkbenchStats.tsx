import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { HypothesisType } from '@/model/Hypothesis';
import { hypothesisStatusConfig, hypothesisStatuses, isDueForValidation } from './utils';
import { cn } from '@/lib/utils';

interface WorkbenchStatsProps {
  hypotheses: HypothesisType[];
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const WorkbenchStats: React.FC<WorkbenchStatsProps> = ({ hypotheses }) => {
  const { t } = useTranslation('hypothesis');

  const stats = useMemo(() => {
    const perStatus = hypotheses.reduce((acc, hypothesis) => {
      acc[hypothesis.status] = (acc[hypothesis.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const dueForValidation = hypotheses.filter(isDueForValidation).length;

    const validatedThisWeek = hypotheses.filter(hypothesis =>
      hypothesis.status === 'validated'
      && Date.now() - new Date(hypothesis.createdAt).getTime() < WEEK_MS
    ).length;

    return { perStatus, dueForValidation, validatedThisWeek };
  }, [hypotheses]);

  return (
    <div className="flex flex-wrap gap-3 mb-6">
      {hypothesisStatuses.map(status => (
        <div
          key={status}
          className="glass-card rounded-lg px-4 py-3 flex items-center gap-3 min-w-[120px]"
        >
          <span className={cn('h-2.5 w-2.5 rounded-full', hypothesisStatusConfig[status].dot)} />
          <div>
            <div className="text-lg font-semibold leading-none">{stats.perStatus[status] || 0}</div>
            <div className="text-xs text-muted-foreground mt-1">{t(`columns.${status}`)}</div>
          </div>
        </div>
      ))}
      <div className="glass-card rounded-lg px-4 py-3 flex items-center gap-3 min-w-[120px]">
        <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
        <div>
          <div className="text-lg font-semibold leading-none">{stats.dueForValidation}</div>
          <div className="text-xs text-muted-foreground mt-1">{t('stats.dueForValidation')}</div>
        </div>
      </div>
      <div className="glass-card rounded-lg px-4 py-3 flex items-center gap-3 min-w-[120px]">
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
        <div>
          <div className="text-lg font-semibold leading-none">{stats.validatedThisWeek}</div>
          <div className="text-xs text-muted-foreground mt-1">{t('stats.validatedThisWeek')}</div>
        </div>
      </div>
    </div>
  );
};

export default WorkbenchStats;
