import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MonoText, EmptyState, ErrorBanner } from '@/components/monitor/common';
import { useTopicsSearch, useAllPipelines, useAllTopics } from '@/hooks/useMonitorQueries';
import { topicService } from '@/services/topicService';
import {
  TOPIC_TYPE_LABEL,
  TOPIC_KIND_LABEL,
} from '@/utils/monitorConstants';
import { TopicType, type Topic } from '@/models/topic.models';
import { formatDistanceToNow } from 'date-fns';

const PAGE_SIZE = 20;

const Topics: React.FC = () => {
  const { t } = useTranslation(['topics', 'common']);
  const [query, setQuery] = React.useState('');
  const [debounced, setDebounced] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [yaml, setYaml] = React.useState<string | null>(null);
  const [yamlLoading, setYamlLoading] = React.useState(false);
  const [detailTab, setDetailTab] = React.useState('factors');

  // debounce search
  React.useEffect(() => {
    const h = setTimeout(() => {
      setDebounced(query);
      setPage(1);
    }, 300);
    return () => clearTimeout(h);
  }, [query]);

  const searchQ = useTopicsSearch(debounced || null, { pageNumber: page, pageSize: PAGE_SIZE });
  const pipelinesQ = useAllPipelines();
  const allTopicsQ = useAllTopics(); // cheap fallback for detail lookups

  const topics = searchQ.data?.data ?? [];
  const pageCount = searchQ.data?.pageCount ?? 1;

  // Resolve the selected topic (from search list or all-topics fallback)
  const selected: Topic | null = React.useMemo(() => {
    if (!selectedId) return null;
    return topics.find((tp) => tp.topicId === selectedId) ?? allTopicsQ.data?.find((tp) => tp.topicId === selectedId) ?? null;
  }, [selectedId, topics, allTopicsQ.data]);

  const relatedPipelines = React.useMemo(() => {
    if (!selected?.topicId) return [];
    return (pipelinesQ.data ?? []).filter((p) => p.topicId === selected.topicId);
  }, [selected, pipelinesQ.data]);

  // Load YAML when a topic is selected and YAML tab opened
  React.useEffect(() => {
    if (!selected?.name || detailTab !== 'yaml') {
      setYaml(null);
      return;
    }
    setYamlLoading(true);
    topicService
      .getTopicYamlByName(selected.name)
      .then(setYaml)
      .catch(() => setYaml(''))
      .finally(() => setYamlLoading(false));
  }, [selected, detailTab]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.2fr]">
        {/* List */}
        <Card className="p-4">
          <Input
            placeholder={t('topics:searchPlaceholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="mb-3 h-9"
          />
          {searchQ.error ? (
            <ErrorBanner message={String(searchQ.error)} onRetry={() => searchQ.refetch()} />
          ) : searchQ.isLoading ? (
            <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : topics.length === 0 ? (
            <EmptyState title={t('topics:empty')} />
          ) : (
            <>
              <div className="overflow-hidden rounded-lg border">
                {topics.map((tp) => {
                  const active = tp.topicId === selectedId;
                  return (
                    <button
                      key={tp.topicId}
                      onClick={() => { setSelectedId(tp.topicId ?? null); setDetailTab('factors'); }}
                      className={`flex w-full items-center justify-between border-b px-3 py-2 text-left last:border-0 ${
                        active ? 'bg-blue-50/60 ring-1 ring-inset ring-blue-300' : 'hover:bg-muted/40'
                      }`}
                    >
                      <div className="min-w-0">
                        <MonoText className="block truncate text-sm font-medium text-foreground">{tp.name ?? '—'}</MonoText>
                        <span className="text-xs text-muted-foreground">{tp.factors?.length ?? 0} factors</span>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <Badge variant="outline" className="text-[10px]">{TOPIC_TYPE_LABEL[tp.type ?? TopicType.DISTINCT]}</Badge>
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 flex items-center justify-end gap-2">
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs text-muted-foreground">{page} / {Math.max(1, pageCount)}</span>
                <Button size="sm" variant="outline" disabled={page >= pageCount} onClick={() => setPage((p) => p + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </Card>

        {/* Detail */}
        <Card className="p-5">
          {!selected ? (
            <EmptyState title={t('topics:empty')} />
          ) : (
            <div>
              <div className="mb-4">
                <div className="flex items-center gap-2">
                  <MonoText className="text-base font-semibold text-foreground">{selected.name}</MonoText>
                  <Badge variant="outline" className="text-[10px]">{TOPIC_TYPE_LABEL[selected.type ?? TopicType.DISTINCT]}</Badge>
                  <Badge variant="secondary" className="text-[10px]">{TOPIC_KIND_LABEL[selected.kind ?? 'business' as any]}</Badge>
                </div>
                {selected.description && <p className="mt-1 text-sm text-muted-foreground">{selected.description}</p>}
                <p className="mt-1 text-xs text-muted-foreground">
                  {selected.lastModifiedAt ? formatDistanceToNow(new Date(selected.lastModifiedAt), { addSuffix: true }) : ''}
                </p>
              </div>

              <Tabs value={detailTab} onValueChange={setDetailTab}>
                <TabsList>
                  <TabsTrigger value="factors">{t('topics:factorsTitle')}</TabsTrigger>
                  <TabsTrigger value="pipelines">{t('topics:relatedPipelines')}</TabsTrigger>
                  <TabsTrigger value="yaml">{t('topics:yamlView')}</TabsTrigger>
                </TabsList>

                <TabsContent value="factors" className="mt-3">
                  <div className="max-h-[480px] overflow-auto rounded-lg border">
                    <div className="grid grid-cols-[1.4fr_1fr_1fr_1.2fr] border-b bg-muted/50 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      <span>Name</span><span>Type</span><span>Encrypt</span><span>Label</span>
                    </div>
                    {(selected.factors ?? []).map((f) => (
                      <div key={f.factorId} className="grid grid-cols-[1.4fr_1fr_1fr_1.2fr] border-b px-3 py-1.5 text-xs last:border-0">
                        <MonoText className="text-foreground">{f.name}</MonoText>
                        <span className="text-muted-foreground">{f.type}</span>
                        <MonoText className="text-muted-foreground">{f.encrypt ?? 'none'}</MonoText>
                        <span className="text-muted-foreground">{f.label ?? '—'}</span>
                      </div>
                    ))}
                    {(selected.factors ?? []).length === 0 && (
                      <p className="px-3 py-6 text-center text-sm text-muted-foreground">{t('common:empty')}</p>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="pipelines" className="mt-3">
                  {pipelinesQ.isLoading ? (
                    <Skeleton className="h-16 w-full" />
                  ) : relatedPipelines.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">{t('common:empty')}</p>
                  ) : (
                    <div className="space-y-2">
                      {relatedPipelines.map((p) => (
                        <div key={p.pipelineId} className="flex items-center justify-between rounded-md border px-3 py-2">
                          <MonoText className="text-sm text-foreground">{p.name ?? p.pipelineId}</MonoText>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px]">{p.type}</Badge>
                            <Badge variant={p.enabled ? 'default' : 'secondary'} className="text-[10px]">
                              {p.enabled ? 'enabled' : 'disabled'}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="yaml" className="mt-3">
                  {yamlLoading ? (
                    <Skeleton className="h-64 w-full" />
                  ) : yaml ? (
                    <pre className="max-h-[480px] overflow-auto rounded-lg bg-slate-900 p-4 text-xs text-slate-100">{yaml}</pre>
                  ) : (
                    <p className="py-6 text-center text-sm text-muted-foreground">{t('common:empty')}</p>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Topics;
