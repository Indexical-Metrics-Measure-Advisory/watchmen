import React from 'react';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { StatusPill } from '@/components/monitor/StatusPill';
import { MonoText, EmptyState, ErrorBanner } from '@/components/monitor/common';
import { useDataSources, useDataSourceHealth } from '@/hooks/useMonitorQueries';
import {
  getDataSourceHealthMeta,
  formatDuration,
  TONE_DOT_CLASS,
  type DataSourceHealthStatus,
  type Tone,
} from '@/utils/monitorConstants';
import type {
  DataSourceItem,
  DataSourceHealthItem,
} from '@/services/dataSourceService';
import { isCollectorDataSource } from '@/services/dataSourceService';

const HEALTH_STATUS_VALUES: ReadonlyArray<DataSourceHealthStatus> = ['ok', 'error', 'skipped', 'timeout'];

const healthStatusLabel = (status: DataSourceHealthStatus, t: (k: string) => string) =>
  status === 'ok'
    ? t('datasource:statusOk')
    : status === 'error'
      ? t('datasource:statusError')
      : status === 'timeout'
        ? t('datasource:statusTimeout')
        : t('datasource:statusSkipped');

const DataSourceMonitor: React.FC = () => {
  const { t } = useTranslation(['datasource', 'common']);
  const [search, setSearch] = React.useState('');
  const [typeFilter, setTypeFilter] = React.useState<string>('all');
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  const [collectorOnly, setCollectorOnly] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const sourcesQ = useDataSources();
  const healthQ = useDataSourceHealth();

  const healthById = React.useMemo(() => {
    const map: Record<string, DataSourceHealthItem> = {};
    for (const h of healthQ.data?.sources ?? []) {
      if (h.dataSourceId) map[h.dataSourceId] = h;
    }
    return map;
  }, [healthQ.data]);

  const allTypes = React.useMemo(() => {
    const set = new Set<string>();
    for (const s of sourcesQ.data ?? []) if (s.dataSourceType) set.add(s.dataSourceType);
    return Array.from(set).sort();
  }, [sourcesQ.data]);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return (sourcesQ.data ?? []).filter((s) => {
      if (collectorOnly && !isCollectorDataSource(s)) return false;
      if (typeFilter !== 'all' && s.dataSourceType !== typeFilter) return false;
      const h = s.dataSourceId ? healthById[s.dataSourceId] : undefined;
      if (statusFilter !== 'all' && (h?.status ?? 'skipped') !== statusFilter) return false;
      if (!q) return true;
      return [s.name, s.dataSourceCode, s.host, s.dataSourceId]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(q));
    });
  }, [sourcesQ.data, healthById, search, typeFilter, statusFilter, collectorOnly]);

  const selected = filtered.find((s) => s.dataSourceId === selectedId) ?? filtered[0] ?? null;
  const selectedHealth = selected?.dataSourceId ? healthById[selected.dataSourceId] : undefined;

  const resetFilters = () => {
    setSearch('');
    setTypeFilter('all');
    setStatusFilter('all');
    setCollectorOnly(false);
  };

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">{t('datasource:filters.search')}</label>
            <Input
              className="h-9 w-64"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('datasource:filters.search')}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">{t('datasource:filters.type')}</label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common:all')}</SelectItem>
                {allTypes.map((tp) => (
                  <SelectItem key={tp} value={tp}>{tp}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">{t('datasource:filters.status')}</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common:all')}</SelectItem>
                {HEALTH_STATUS_VALUES.map((st) => (
                  <SelectItem key={st} value={st}>{healthStatusLabel(st, t)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <label
            className="flex h-9 cursor-pointer select-none items-center gap-1.5 rounded-md border bg-background px-3 text-xs font-medium"
            title={t('common:collectorSourceHelp')}
          >
            <input
              type="checkbox"
              className="h-3.5 w-3.5 accent-blue-600"
              checked={collectorOnly}
              onChange={(e) => setCollectorOnly(e.target.checked)}
            />
            {t('common:collectorOnly')}
          </label>
          <Button variant="outline" size="sm" className="h-9" onClick={() => sourcesQ.refetch()}>
            {t('common:refresh')}
          </Button>
          {(search || typeFilter !== 'all' || statusFilter !== 'all' || collectorOnly) && (
            <Button variant="ghost" size="sm" className="h-9" onClick={resetFilters}>
              {t('common:cancel')}
            </Button>
          )}
        </div>
      </Card>

      {/* Master-detail */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        {/* List */}
        <Card className="p-0">
          <div className="max-h-[640px] overflow-auto">
            {sourcesQ.error ? (
              <div className="p-4"><ErrorBanner message={String(sourcesQ.error)} onRetry={() => sourcesQ.refetch()} /></div>
            ) : sourcesQ.isLoading ? (
              <div className="space-y-2 p-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : filtered.length === 0 ? (
              <EmptyState title={t('datasource:empty')} />
            ) : (
              filtered.map((s) => {
                const h = s.dataSourceId ? healthById[s.dataSourceId] : undefined;
                const meta = getDataSourceHealthMeta(h?.status);
                const active = s.dataSourceId === selected?.dataSourceId;
                const label = h ? healthStatusLabel(h.status as DataSourceHealthStatus, t) : t('datasource:statusSkipped');
                return (
                  <div
                    key={s.dataSourceId}
                    onClick={() => setSelectedId(s.dataSourceId)}
                    className={`flex cursor-pointer items-center gap-3 border-b px-3 py-2.5 last:border-0 ${
                      active ? 'bg-blue-50/60 ring-1 ring-inset ring-blue-300' : 'hover:bg-muted/40'
                    }`}
                  >
                    <span className={`h-2 w-2 shrink-0 rounded-full ${TONE_DOT_CLASS[meta.tone]}`} />
                    <div className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-medium text-foreground">
                          {s.name || s.dataSourceCode || s.dataSourceId}
                        </span>
                        {isCollectorDataSource(s) && (
                          <span
                            className="shrink-0 rounded border border-amber-200 bg-amber-50 px-1.5 py-0 text-[10px] font-semibold text-amber-700"
                            title={t('common:collectorSourceHelp')}
                          >
                            {t('common:collectorSource')}
                          </span>
                        )}
                      </span>
                      <MonoText className="block truncate text-xs text-muted-foreground">
                        {s.dataSourceType ? `${s.dataSourceType} · ` : ''}{s.host ?? s.dataSourceId}
                      </MonoText>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 text-right">
                      {h?.latencyMs != null && <MonoText className="text-xs text-muted-foreground">{formatDuration(h.latencyMs)}</MonoText>}
                      <StatusPill tone={meta.tone as Tone} label={label} dotOnly />
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <div className="flex items-center justify-between border-t px-3 py-2 text-xs text-muted-foreground">
            <span>{filtered.length} / {sourcesQ.data?.length ?? 0}</span>
            {healthQ.data?.checkedAt && (
              <span>{t('datasource:detail.checkedAt')}: {formatDistanceToNow(new Date(healthQ.data.checkedAt), { addSuffix: true })}</span>
            )}
          </div>
        </Card>

        {/* Detail */}
        <Card className="p-5">
          {!selected ? (
            <EmptyState title={t('datasource:empty')} />
          ) : (
            <DataSourceDetail source={selected} health={selectedHealth} t={t} />
          )}
        </Card>
      </div>
    </div>
  );
};

const DataSourceDetail: React.FC<{
  source: DataSourceItem;
  health: DataSourceHealthItem | undefined;
  t: (k: string) => string;
}> = ({ source, health, t }) => {
  const meta = getDataSourceHealthMeta(health?.status);
  const statusLabel = health
    ? healthStatusLabel(health.status as DataSourceHealthStatus, t)
    : t('datasource:detail.noHealth');

  const rows: Array<{ label: string; value?: React.ReactNode }> = [
    { label: t('datasource:detail.id'), value: <MonoText>{source.dataSourceId}</MonoText> },
    { label: t('datasource:detail.code'), value: source.dataSourceCode ? <MonoText>{source.dataSourceCode}</MonoText> : '-' },
    { label: t('datasource:detail.type'), value: source.dataSourceType ?? '-' },
    { label: t('datasource:detail.host'), value: source.host ?? '-' },
    { label: t('datasource:detail.port'), value: source.port ?? '-' },
    { label: t('datasource:detail.tenant'), value: source.tenantId ?? '-' },
    { label: t('datasource:detail.createdAt'), value: source.createdAt ? formatDistanceToNow(new Date(source.createdAt), { addSuffix: true }) : '-' },
    { label: t('datasource:detail.createdBy'), value: source.createdBy ?? '-' },
  ];

  return (
    <div>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill tone={meta.tone as Tone} label={statusLabel} />
            <span className="truncate text-sm font-semibold text-foreground">
              {source.name || source.dataSourceCode || source.dataSourceId}
            </span>
            {isCollectorDataSource(source) && (
              <span
                className="shrink-0 rounded border border-amber-200 bg-amber-50 px-1.5 py-0 text-[10px] font-semibold text-amber-700"
                title={t('common:collectorSourceHelp')}
              >
                {t('common:collectorSource')}
              </span>
            )}
          </div>
          <MonoText className="mt-1 block text-xs text-muted-foreground">{source.dataSourceId}</MonoText>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-x-4 gap-y-3">
        {rows.map((r) => (
          <div key={r.label}>
            <p className="text-xs font-medium text-muted-foreground">{r.label}</p>
            <p className="mt-0.5 text-sm text-foreground">{r.value}</p>
          </div>
        ))}
      </div>

      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {t('datasource:detail.status')}
      </p>
      {!health ? (
        <p className="rounded-lg border bg-muted/20 px-3 py-3 text-xs text-muted-foreground">
          {t('datasource:detail.noHealth')}
        </p>
      ) : (
        <div className="space-y-2 rounded-lg border p-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t('datasource:detail.status')}</span>
            <StatusPill tone={meta.tone as Tone} label={statusLabel} />
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t('datasource:detail.latency')}</span>
            <MonoText>{formatDuration(health.latencyMs)}</MonoText>
          </div>
          {health.error && (
            <div>
              <p className="mb-1 text-xs text-muted-foreground">{t('datasource:detail.error')}</p>
              <pre className="max-h-40 overflow-auto rounded bg-red-50 p-2 text-xs text-red-700">{health.error}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DataSourceMonitor;
