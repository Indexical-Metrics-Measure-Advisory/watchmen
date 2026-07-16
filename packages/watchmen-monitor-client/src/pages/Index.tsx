import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { KpiTile } from '@/components/monitor/KpiTile';
import { SegmentedStatusBar, type StatusSegment } from '@/components/monitor/SegmentedStatusBar';
import { StatusPill } from '@/components/monitor/StatusPill';
import { MonoText, ErrorBanner } from '@/components/monitor/common';
import { useIngestEvents, usePipelineLogs, useAllTopics } from '@/hooks/useMonitorQueries';
import { getIngestStatusMeta } from '@/utils/monitorConstants';
import { MonitorLogStatus } from '@/models/pipeline.models';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  CartesianGrid,
} from 'recharts';
import { formatDistanceToNow } from 'date-fns';

const Overview: React.FC = () => {
  const { t } = useTranslation(['overview', 'common']);
  const navigate = useNavigate();

  // NOTE (design doc §7.1 #1): there is no single rollup endpoint today,
  // so the Overview fans out to the three services and aggregates client-side.
  const eventsPage = useIngestEvents({ pageNumber: 1, pageSize: 50 });
  const errorLogs = usePipelineLogs({ pageNumber: 1, pageSize: 10, status: MonitorLogStatus.ERROR });
  const topics = useAllTopics();

  const events = eventsPage.data?.data ?? [];
  const eventCounts = React.useMemo(() => {
    let success = 0;
    let executing = 0;
    let failed = 0;
    let waiting = 0;
    for (const e of events) {
      const m = getIngestStatusMeta(e.status);
      if (m.tone === 'success') success++;
      else if (m.tone === 'info') executing++;
      else if (m.tone === 'error') failed++;
      else if (m.tone === 'warning') waiting++;
    }
    return { success, executing, failed, waiting, total: events.length };
  }, [events]);

  const logs = errorLogs.data?.data ?? [];
  const topicCount = topics.data?.length ?? 0;

  const stageSegments: StatusSegment[] = [
    { tone: 'success', weight: eventCounts.success || 0 },
    { tone: 'info', weight: eventCounts.executing || 0 },
    { tone: 'warning', weight: eventCounts.waiting || 0 },
    { tone: 'error', weight: eventCounts.failed || 0 },
  ];

  // Mock throughput series until a backend rollup exists (§7.1 #1).
  const throughputSeries = React.useMemo(() => {
    const now = Date.now();
    return Array.from({ length: 24 }, (_, i) => ({
      hour: new Date(now - (23 - i) * 3600_000).getHours() + ':00',
      rows: Math.round(8000 + Math.sin(i / 3) * 3000 + Math.random() * 1000),
    }));
  }, []);

  const healthScore = React.useMemo(() => {
    if (eventCounts.total === 0) return 100;
    return Math.round((eventCounts.success / eventCounts.total) * 100);
  }, [eventCounts]);

  return (
    <div className="space-y-6">
      {/* Hero */}
      <Card className="overflow-hidden border-0 bg-gradient-to-br from-slate-800 to-blue-700 p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-blue-200">{t('overview:healthScore')}</p>
            <p className="mt-1 text-5xl font-bold tabular-nums">
              {healthScore}
              <span className="text-2xl text-blue-200">/100</span>
            </p>
            <p className="mt-2 text-sm text-blue-100">
              <span className="text-red-300">{eventCounts.failed} failed</span> ·{' '}
              <span className="text-orange-300">{eventCounts.waiting} waiting</span> ·{' '}
              <span className="text-blue-200">{eventCounts.executing} executing</span>
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-blue-100">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-400" />
            </span>
            Live
          </div>
        </div>
      </Card>

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        <KpiTile label={t('overview:triggerEvents')} value={eventCounts.total} tone="info" onClick={() => navigate('/ingestion')} />
        <KpiTile
          label={t('overview:pipelineSuccessRate')}
          value={eventCounts.total ? `${Math.round((eventCounts.success / eventCounts.total) * 100)}%` : '—'}
          tone="success"
          onClick={() => navigate('/pipeline')}
        />
        <KpiTile
          label={t('overview:activeErrors')}
          value={eventCounts.failed + logs.length}
          tone="error"
          onClick={() => navigate('/pipeline')}
        />
        <KpiTile label={t('overview:throughput')} value="12.4K" tone="neutral" caption="approx." />
        {topics.isLoading ? (
          <Skeleton className="h-[88px] w-full rounded-xl" />
        ) : (
          <KpiTile label={t('overview:topicsCount')} value={topicCount} tone="neutral" onClick={() => navigate('/topics')} />
        )}
      </div>

      {/* Stage health + throughput */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card className="p-5">
          <h3 className="mb-4 text-sm font-semibold text-foreground">{t('overview:stageHealth')}</h3>
          <div className="space-y-4">
            {([
              { label: t('overview:sources'), seg: [{ tone: 'success', weight: 7 }, { tone: 'error', weight: 0 }] },
              { label: t('overview:ingest'), seg: stageSegments },
              { label: t('overview:pipeline'), seg: [{ tone: 'success', weight: 89 }, { tone: 'error', weight: 5 }] },
              { label: t('overview:topicsCol'), seg: [{ tone: 'success', weight: topicCount }] },
            ] as const).map((row) => (
              <div key={row.label}>
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground">{row.label}</span>
                </div>
                <SegmentedStatusBar segments={row.seg as StatusSegment[]} />
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="mb-4 text-sm font-semibold text-foreground">{t('overview:throughputTrend')}</h3>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={throughputSeries} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="tp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="hour" tick={{ fontSize: 10 }} stroke="#94A3B8" interval={3} />
              <YAxis tick={{ fontSize: 10 }} stroke="#94A3B8" />
              <RTooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Area type="monotone" dataKey="rows" stroke="#2563EB" strokeWidth={2} fill="url(#tp)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Recent pipeline errors */}
      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">{t('overview:recentPipelineErrors')}</h3>
          <button onClick={() => navigate('/pipeline')} className="text-xs text-blue-600 hover:underline">
            {t('common:viewDetails')}
          </button>
        </div>
        {errorLogs.error ? (
          <ErrorBanner message={String(errorLogs.error)} />
        ) : errorLogs.isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : logs.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{t('overview:noRecentErrors')}</p>
        ) : (
          <div className="space-y-2">
            {logs.slice(0, 6).map((log) => (
              <div
                key={log.uid}
                className="flex items-center justify-between rounded-md border border-l-4 border-l-red-400 bg-red-50/40 px-3 py-2"
              >
                <div className="flex items-center gap-3">
                  <StatusPill tone="error" label="ERROR" />
                  <MonoText className="text-xs text-foreground">{log.pipelineId ?? '—'}</MonoText>
                  <MonoText className="text-xs text-muted-foreground">{log.traceId ?? ''}</MonoText>
                </div>
                <span className="text-xs text-muted-foreground">
                  {log.startTime ? formatDistanceToNow(new Date(log.startTime), { addSuffix: true }) : ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default Overview;
