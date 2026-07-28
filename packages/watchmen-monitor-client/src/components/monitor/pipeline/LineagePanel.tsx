import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowRight, ChevronDown, ChevronRight } from 'lucide-react';
import { MonoText, EmptyState, ErrorBanner, PanelHeader } from '@/components/monitor/common';
import { useTopicConsanguinity } from '@/hooks/useMonitorQueries';
import type { TopicLineageLink } from '@/models/lineage.models';

/** One upstream hop: source topic --(pipeline)--> target topic, expandable to factor pairs. */
const LinkRow: React.FC<{
  link: TopicLineageLink;
}> = ({ link }) => {
  const [open, setOpen] = React.useState(false);
  const factorPairs = link.factors ?? [];
  return (
    <div className="border-b px-4 py-2.5 last:border-0">
      <div className="flex flex-wrap items-center gap-2">
        {factorPairs.length > 0 ? (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="inline-flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-muted"
          >
            {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
        ) : (
          <span className="inline-block w-5" />
        )}
        <MonoText className="text-sm font-semibold text-foreground">
          {link.sourceTopicName ?? link.sourceTopicId ?? '—'}
        </MonoText>
        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        {link.pipelineId && (
          <span className="rounded border border-indigo-200 bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700">
            {link.pipelineName ?? link.pipelineId}
          </span>
        )}
        <MonoText className="text-sm text-muted-foreground">
          {link.targetTopicName ?? link.targetTopicId ?? '—'}
        </MonoText>
      </div>
      {open && factorPairs.length > 0 && (
        <div className="ml-7 mt-1.5 space-y-0.5">
          {factorPairs.map((pair, i) => (
            <p key={i} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <MonoText>{pair.sourceFactorName ?? pair.sourceFactorId ?? '—'}</MonoText>
              <ArrowRight className="h-3 w-3 shrink-0" />
              <MonoText>{pair.targetFactorName ?? pair.targetFactorId ?? '—'}</MonoText>
              {pair.relationType && (
                <span className="rounded bg-slate-100 px-1 text-[10px] text-slate-600">{pair.relationType}</span>
              )}
              {pair.arithmetic && (
                <span className="rounded bg-slate-100 px-1 text-[10px] text-slate-600">{pair.arithmetic}</span>
              )}
            </p>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Data-source lineage panel: upstream chain of the given topic, grouped by level
 * (level 1 = direct sources of the failed run's topic).
 */
const LineagePanel: React.FC<{
  topicId: string;
}> = ({ topicId }) => {
  const { t } = useTranslation(['pipeline', 'common']);
  const consanguinityQ = useTopicConsanguinity(topicId);

  const links = React.useMemo(() => consanguinityQ.data?.upstream ?? [], [consanguinityQ.data]);
  const byLevel = React.useMemo(() => {
    const groups = new Map<number, TopicLineageLink[]>();
    for (const link of links) {
      const level = link.level ?? 1;
      groups.set(level, [...(groups.get(level) ?? []), link]);
    }
    return [...groups.entries()].sort((a, b) => a[0] - b[0]);
  }, [links]);

  return (
    <Card className="p-0">
      <PanelHeader
        title={t('pipeline:lineage.title')}
        extra={links.length > 0 ? <span className="tabular-nums">{links.length}</span> : null}
      />
      {consanguinityQ.error ? (
        <div className="p-4">
          <ErrorBanner message={String(consanguinityQ.error)} onRetry={() => consanguinityQ.refetch()} />
        </div>
      ) : consanguinityQ.isLoading ? (
        <div className="space-y-2 p-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}
        </div>
      ) : links.length === 0 ? (
        <EmptyState title={t('pipeline:lineage.noUpstream')} />
      ) : (
        <div className="max-h-[320px] overflow-auto">
          {byLevel.map(([level, levelLinks]) => (
            <div key={level}>
              <p className="border-b bg-muted/40 px-4 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {t('pipeline:lineage.level', { n: level })}
              </p>
              {levelLinks.map((link, i) => (
                <LinkRow
                  key={`${link.sourceTopicId}-${link.pipelineId}-${i}`}
                  link={link}
                />
              ))}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

export default LineagePanel;
