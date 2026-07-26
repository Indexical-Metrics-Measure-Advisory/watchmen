import React from 'react';
import { useTranslation } from 'react-i18next';
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
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { ChevronLeft, ChevronRight, Plus, Search, X } from 'lucide-react';
import { MonoText, EmptyState, ErrorBanner, PanelHeader } from '@/components/monitor/common';
import { useTopic, useTopicDataRow, useTopicDataQuery } from '@/hooks/useMonitorQueries';
import type { TopicDataCondition } from '@/models/topic.models';

const PAGE_SIZE = 10;

const formatCell = (value: unknown): string => {
  if (value == null) return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

interface DraftCondition {
  factorId: string | null;
  value: string;
}

/**
 * Topic data panel: factor-level view of one data row (by dataId, from the selected
 * monitor log) plus an ad-hoc factor-equals row query on the same topic. The target
 * topic may also be an upstream topic picked in the lineage panel (dataId then absent).
 */
const TopicDataPanel: React.FC<{
  topicId: string | null;
  dataId?: string | number | null;
}> = ({ topicId, dataId }) => {
  const { t } = useTranslation(['pipeline', 'common']);
  const [drafts, setDrafts] = React.useState<DraftCondition[]>([{ factorId: null, value: '' }]);
  const [submitted, setSubmitted] = React.useState<TopicDataCondition[] | null>(null);
  const [page, setPage] = React.useState(1);

  const topicQ = useTopic(topicId);
  const rowQ = useTopicDataRow(topicId, dataId, dataId != null);
  const queryQ = useTopicDataQuery(topicId, submitted ?? [], { pageNumber: page, pageSize: PAGE_SIZE }, submitted != null);

  const factors = topicQ.data?.factors ?? [];

  // Reset local query state when the target topic changes (e.g. picked from the lineage panel).
  React.useEffect(() => {
    setDrafts([{ factorId: null, value: '' }]);
    setSubmitted(null);
    setPage(1);
  }, [topicId]);

  const setDraft = (index: number, patch: Partial<DraftCondition>) =>
    setDrafts((list) => list.map((d, i) => (i === index ? { ...d, ...patch } : d)));

  const submit = () => {
    const conditions = drafts
      .filter((d): d is TopicDataCondition => d.factorId != null && d.value !== '')
      .map((d) => ({ factorId: d.factorId, value: d.value }));
    setPage(1);
    setSubmitted(conditions);
  };

  const row = rowQ.data ?? null;
  const resultPage = queryQ.data;
  const pageCount = resultPage?.pageCount ?? resultPage?.totalPages ?? 1;

  return (
    <Card className="p-0">
      <PanelHeader
        title={t('pipeline:data.title')}
        extra={
          <MonoText className="text-xs">
            {topicQ.data?.name ?? topicId ?? '—'}
            {dataId != null ? ` · id ${dataId}` : ''}
          </MonoText>
        }
      />

      {/* Row detail by dataId (from the selected monitor log) */}
      {dataId != null && (
        <div className="border-b">
          <p className="px-4 pt-3 text-xs font-semibold text-foreground">{t('pipeline:data.rowDetail')}</p>
          {rowQ.error ? (
            <div className="p-4"><ErrorBanner message={String(rowQ.error)} onRetry={() => rowQ.refetch()} /></div>
          ) : rowQ.isLoading || topicQ.isLoading ? (
            <div className="space-y-2 p-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-7 w-full" />)}</div>
          ) : row == null ? (
            <EmptyState title={t('pipeline:data.noResults')} />
          ) : (
            <div className="max-h-[280px] overflow-auto p-3">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="h-8 px-3 text-[11px] font-semibold uppercase tracking-wide">{t('pipeline:data.factor')}</TableHead>
                    <TableHead className="h-8 px-3 text-[11px] font-semibold uppercase tracking-wide">{t('common:type')}</TableHead>
                    <TableHead className="h-8 px-3 text-[11px] font-semibold uppercase tracking-wide">{t('pipeline:data.value')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {factors.map((factor) => (
                    <TableRow key={factor.factorId} className="text-xs">
                      <TableCell className="px-3 py-1.5">
                        <span className="text-foreground">{factor.label ?? factor.name}</span>
                        <MonoText className="ml-1.5 text-muted-foreground">{factor.name}</MonoText>
                      </TableCell>
                      <TableCell className="px-3 py-1.5 text-muted-foreground">{factor.type ?? '—'}</TableCell>
                      <TableCell className="px-3 py-1.5">
                        <MonoText className="break-all">{formatCell(row[factor.name ?? ''])}</MonoText>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}

      {/* Factor-equals conditions */}
      <div className="border-b px-4 py-3">
        <p className="mb-2 text-xs font-semibold text-foreground">{t('pipeline:data.conditions')}</p>
        <div className="space-y-2">
          {drafts.map((draft, i) => (
            <div key={i} className="flex items-center gap-2">
              <Select value={draft.factorId ?? ''} onValueChange={(v) => setDraft(i, { factorId: v || null })}>
                <SelectTrigger className="h-8 w-56"><SelectValue placeholder={t('pipeline:data.selectFactor')} /></SelectTrigger>
                <SelectContent>
                  {factors.map((factor) => (
                    <SelectItem key={factor.factorId} value={factor.factorId!}>
                      {factor.label ?? factor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                className="h-8 flex-1"
                placeholder={t('pipeline:data.value')}
                value={draft.value}
                onChange={(e) => setDraft(i, { value: e.target.value })}
              />
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 shrink-0"
                disabled={drafts.length <= 1}
                onClick={() => setDrafts((list) => list.filter((_, idx) => idx !== i))}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-8"
            onClick={() => setDrafts((list) => [...list, { factorId: null, value: '' }])}
          >
            <Plus className="mr-1 h-3.5 w-3.5" />{t('pipeline:data.addCondition')}
          </Button>
          <Button size="sm" className="h-8 bg-indigo-600 text-white hover:bg-indigo-700" onClick={submit}>
            <Search className="mr-1 h-3.5 w-3.5" />{t('pipeline:data.query')}
          </Button>
        </div>
      </div>

      {/* Query results */}
      {submitted != null && (
        <div>
          {queryQ.error ? (
            <div className="p-4"><ErrorBanner message={String(queryQ.error)} onRetry={() => queryQ.refetch()} /></div>
          ) : queryQ.isLoading ? (
            <div className="space-y-2 p-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
          ) : (resultPage?.data ?? []).length === 0 ? (
            <EmptyState title={t('pipeline:data.noResults')} />
          ) : (
            <>
              <div className="max-h-[320px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      {factors.map((factor) => (
                        <TableHead key={factor.factorId} className="h-8 whitespace-nowrap px-3 text-[11px] font-semibold uppercase tracking-wide">
                          {factor.label ?? factor.name}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(resultPage?.data ?? []).map((dataRow, ri) => (
                      <TableRow key={ri} className="text-xs">
                        {factors.map((factor) => (
                          <TableCell key={factor.factorId} className="max-w-[220px] truncate px-3 py-1.5">
                            <MonoText>{formatCell(dataRow[factor.name ?? ''])}</MonoText>
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex items-center justify-between border-t px-4 py-2 text-xs text-muted-foreground">
                <span className="tabular-nums">
                  {resultPage?.itemCount != null && <span className="mr-2">{resultPage.itemCount}</span>}
                  {page} / {Math.max(1, pageCount)}
                </span>
                <div className="flex gap-1">
                  <Button size="icon" variant="outline" className="h-7 w-7" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="outline" className="h-7 w-7" disabled={page >= pageCount} onClick={() => setPage((p) => p + 1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </Card>
  );
};

export default TopicDataPanel;
