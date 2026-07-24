import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { useAuth } from '@/contexts/AuthContext';
import { useSidebar } from '@/contexts/SidebarContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type {
  MetricLineageViewData, LineageNode, LineageEdge, LineagePath,
} from '@/model/metricLineage';
import {
  getMetricLineage,
  getMetricLineageSuggestions,
  isMetricLineageMockData,
} from '@/services/metricLineageService';
import {
  ArrowUpRight,
  Copy,
  ExternalLink,
  Layers3,
  Route,
  Search,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getRecentMetricsStorageKey, buildStageMeta, buildStatusMeta, getNodeIcon, getEdgeKindLabel } from '@/utils/lineageHelpers';
import { useRecentMetrics } from '@/hooks/useRecentMetrics';
import MetricLineageGraph from '@/components/lineage/MetricLineageGraph';

const MetricLineagePage: React.FC = () => {
  const { collapsed } = useSidebar();
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation('metricLineage');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = React.useState(searchParams.get('metric') || '');
  const [data, setData] = React.useState<MetricLineageViewData | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [selectedNodeId, setSelectedNodeId] = React.useState<string | null>(null);
  const [selectedPathId, setSelectedPathId] = React.useState<string | null>(null);
  const [suggestions, setSuggestions] = React.useState<string[]>([]);
  const recentMetricsStorageKey = React.useMemo(() => getRecentMetricsStorageKey(user?.tenantId), [user?.tenantId]);
  const { recentMetrics, addRecentMetric } = useRecentMetrics(recentMetricsStorageKey);
  const stageMeta = React.useMemo(() => buildStageMeta(t), [t]);
  const statusMeta = React.useMemo(() => buildStatusMeta(t), [t]);

  const runTrace = React.useCallback(async (metricName: string) => {
    const trimmed = metricName.trim();
    if (!trimmed) {
      toast({ title: t('toast.metricRequiredTitle'), description: t('toast.metricRequiredDescription') });
      return;
    }

    setLoading(true);
    try {
      const result = await getMetricLineage(trimmed);
      setData(result);
      const primaryPath = result.paths.find(path => path.isPrimary) || result.paths[0];
      const nextSelectedNodeId = primaryPath?.nodeIds[0] || result.nodes[0]?.id || null;
      setSelectedPathId(primaryPath?.id || null);
      setSelectedNodeId(nextSelectedNodeId);
      setSearchParams({ metric: trimmed });
      if (!isMetricLineageMockData(result)) {
        addRecentMetric(trimmed);
      }
    } catch (error) {
      console.error('Failed to load metric lineage:', error);
      toast({
        title: t('toast.failedTitle'),
        description: t('toast.failedDescription'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [setSearchParams, t, toast, user?.tenantId, addRecentMetric]);

  React.useEffect(() => {
    let active = true;

    const loadSuggestions = async () => {
      try {
        const nextSuggestions = await getMetricLineageSuggestions();
        if (active) {
          setSuggestions(nextSuggestions);
        }
      } catch (error) {
        console.error('Failed to load metric lineage suggestions:', error);
      }
    };

    void loadSuggestions();

    return () => {
      active = false;
    };
  }, []);

  React.useEffect(() => {
    void runTrace(searchParams.get('metric') || '');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedNode = React.useMemo(
    () => data?.nodes.find(node => node.id === selectedNodeId) || null,
    [data?.nodes, selectedNodeId]
  );

  const nodeMap = React.useMemo(
    () => new Map((data?.nodes || []).map(node => [node.id, node])),
    [data?.nodes]
  );

  const activePath = React.useMemo(
    () => data?.paths.find(path => path.id === selectedPathId) || data?.paths[0] || null,
    [data?.paths, selectedPathId]
  );

  const referencedMetricNodes = React.useMemo(
    () => (data?.nodes || []).filter(node => node.type === 'metric_ref'),
    [data?.nodes]
  );

  const selectPath = React.useCallback((path: LineagePath) => {
    setSelectedPathId(path.id);
    setSelectedNodeId(path.nodeIds[0] || null);
  }, []);

  const selectNodeAndSyncPath = React.useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
    const matchedPath = data?.paths.find(path => path.nodeIds.includes(nodeId));
    if (matchedPath) {
      setSelectedPathId(matchedPath.id);
    }
  }, [data?.paths]);

  const selectedNodeRelations = React.useMemo(() => {
    if (!selectedNode || !data) {
      return { upstream: [] as Array<{ edge: LineageEdge; node: LineageNode }>, downstream: [] as Array<{ edge: LineageEdge; node: LineageNode }> };
    }

    const upstream = data.edges
      .filter(edge => edge.to === selectedNode.id)
      .map(edge => ({ edge, node: nodeMap.get(edge.from) }))
      .filter((item): item is { edge: LineageEdge; node: LineageNode } => !!item.node);

    const downstream = data.edges
      .filter(edge => edge.from === selectedNode.id)
      .map(edge => ({ edge, node: nodeMap.get(edge.to) }))
      .filter((item): item is { edge: LineageEdge; node: LineageNode } => !!item.node);

    return { upstream, downstream };
  }, [data, nodeMap, selectedNode]);

  const handleCopyPath = React.useCallback(async () => {
    if (!activePath || !data) return;
    const label = activePath.nodeIds
      .map(id => nodeMap.get(id)?.label || nodeMap.get(id)?.name || id)
      .join(' -> ');
    await navigator.clipboard.writeText(label);
    toast({ title: t('toast.pathCopiedTitle'), description: t('toast.pathCopiedDescription') });
  }, [activePath, data, nodeMap, t, toast]);

  const handleCopyNodeName = React.useCallback(async () => {
    if (!selectedNode) return;
    await navigator.clipboard.writeText(selectedNode.name);
    toast({ title: t('toast.nodeCopiedTitle'), description: t('toast.nodeCopiedDescription') });
  }, [selectedNode, t, toast]);

  const handleOpenNodeWorkspace = React.useCallback((node: LineageNode) => {
    if (node.stage === 'metric') {
      navigate('/metrics/management');
      return;
    }
    if (node.stage === 'semantic') {
      navigate('/metrics/semantic-models');
      return;
    }

    toast({
      title: t('toast.drillDownPendingTitle'),
      description: t('toast.drillDownPendingDescription', { stage: stageMeta[node.stage].title.toLowerCase() }),
    });
  }, [navigate, stageMeta, t, toast]);

  const handleExportJson = React.useCallback(() => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${data.metricName || 'metric-lineage'}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }, [data]);

  const summaryLine = React.useMemo(() => {
    if (!data) return '';
    return [
      `${t('summaryLine.type')} ${data.summary.metricType || '--'}`,
      `${t('summaryLine.referencedMetrics')} ${referencedMetricNodes.length}`,
      `${t('summaryLine.routes')} ${data.summary.routeCount || data.paths.length || 0}`,
      `${t('summaryLine.topics')} ${data.summary.topicCount || 0}`,
      `${t('summaryLine.pipelines')} ${data.summary.pipelineCount || 0}`,
      `${t('summaryLine.sources')} ${(data.summary.sourceTableCount || 0) + (data.summary.sourceFieldCount || 0)}`,
    ].join(' · ');
  }, [data, referencedMetricNodes.length, t]);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />

      <div className={`${collapsed ? 'pl-20' : 'pl-56'} min-h-screen transition-[padding] duration-300`}>
        <Header />

        <main className="container py-6 space-y-4">
          {/* Page header: title + resolution status + actions */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{t('pageTitle')}</h1>
              {data && (
                <Badge className={cn('gap-1 border', statusMeta[data.status].className)}>
                  {statusMeta[data.status].icon}
                  {statusMeta[data.status].label}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleCopyPath} disabled={!activePath}>
                <Copy className="mr-2 h-4 w-4" />
                {t('copyPath')}
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportJson} disabled={!data}>
                <Route className="mr-2 h-4 w-4" />
                {t('exportJson')}
              </Button>
            </div>
          </div>

          {/* Compact search card */}
          <Card className="border-border/60 shadow-sm">
            <CardContent className="space-y-3 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={event => setQuery(event.target.value)}
                    onKeyDown={event => {
                      if (event.key === 'Enter') {
                        void runTrace(query);
                      }
                    }}
                    placeholder={t('searchPlaceholder')}
                    className="pl-10"
                  />
                </div>
                <Button className="min-w-32" onClick={() => void runTrace(query)} disabled={loading}>
                  <Search className="mr-2 h-4 w-4" />
                  {loading ? t('tracing') : t('traceLineage')}
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('suggested')}</span>
                {suggestions.map(metric => (
                  <Button key={metric} variant="outline" size="sm" onClick={() => { setQuery(metric); void runTrace(metric); }}>
                    {metric}
                  </Button>
                ))}
                {recentMetrics.length > 0 && (
                  <>
                    <span className="ml-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('recent')}</span>
                    {recentMetrics.map(metric => (
                      <Badge
                        key={metric}
                        variant="secondary"
                        className="cursor-pointer hover:bg-secondary/80"
                        onClick={() => {
                          setQuery(metric);
                          void runTrace(metric);
                        }}
                      >
                        {metric}
                      </Badge>
                    ))}
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* One-line summary strip */}
          {!loading && data && (
            <p className="text-sm text-muted-foreground">{summaryLine}</p>
          )}

          {/* Lineage flow graph + inspector */}
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
            <MetricLineageGraph
              data={data}
              loading={loading}
              activePathId={activePath?.id || null}
              selectedNodeId={selectedNodeId}
              diagnostics={data?.diagnostics || []}
              onSelectNode={selectNodeAndSyncPath}
              onSelectPath={selectPath}
            />

            <Card className="border-border/60 shadow-sm xl:sticky xl:top-20 xl:h-fit">
              <CardContent className="p-0">
                {selectedNode ? (
                  <ScrollArea className="h-[640px]">
                    <div className="space-y-5 p-5">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Badge className={cn('gap-1 border', stageMeta[selectedNode.stage].className)}>
                            {getNodeIcon(selectedNode)}
                            {stageMeta[selectedNode.stage].title}
                          </Badge>
                          {selectedNode.badge && <Badge variant="outline">{selectedNode.badge}</Badge>}
                        </div>
                        <div>
                          <div className="text-xl font-semibold tracking-tight">{selectedNode.label || selectedNode.name}</div>
                          <div className="mt-1 font-mono text-xs text-muted-foreground">{selectedNode.name}</div>
                        </div>
                        {selectedNode.description && (
                          <div className="rounded-xl border bg-muted/30 p-3 text-sm text-muted-foreground">
                            {selectedNode.description}
                          </div>
                        )}
                        <div className="flex flex-wrap gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleOpenNodeWorkspace(selectedNode)}>
                            <ExternalLink className="mr-2 h-4 w-4" />
                            {selectedNode.stage === 'metric'
                              ? t('inspector.openMetrics')
                              : selectedNode.stage === 'semantic'
                                ? t('inspector.openSemanticModels')
                                : t('inspector.openWorkspace')}
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => void handleCopyNodeName()}>
                            <Copy className="mr-2 h-4 w-4" />
                            {t('inspector.copyNodeName')}
                          </Button>
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-2">
                        <div className="text-sm font-medium">{t('inspector.connectedNodes')}</div>
                        {selectedNodeRelations.upstream.length > 0 ? selectedNodeRelations.upstream.map(({ edge, node }) => (
                          <button
                            type="button"
                            key={`${edge.id}-upstream`}
                            onClick={() => selectNodeAndSyncPath(node.id)}
                            className="flex w-full items-center justify-between rounded-xl border p-3 text-left transition-colors hover:bg-muted/30"
                          >
                            <div>
                              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                                {t('inspector.upstream')} · {getEdgeKindLabel(edge.kind, t)}
                              </div>
                              <div className="mt-1 font-medium">{node.label || node.name}</div>
                              <div className="mt-1 text-xs text-muted-foreground">{stageMeta[node.stage].title}</div>
                            </div>
                            <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                          </button>
                        )) : (
                          <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                            {t('inspector.noUpstream')}
                          </div>
                        )}

                        {selectedNodeRelations.downstream.length > 0 ? selectedNodeRelations.downstream.map(({ edge, node }) => (
                          <button
                            type="button"
                            key={`${edge.id}-downstream`}
                            onClick={() => selectNodeAndSyncPath(node.id)}
                            className="flex w-full items-center justify-between rounded-xl border p-3 text-left transition-colors hover:bg-muted/30"
                          >
                            <div>
                              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                                {t('inspector.downstream')} · {getEdgeKindLabel(edge.kind, t)}
                              </div>
                              <div className="mt-1 font-medium">{node.label || node.name}</div>
                              <div className="mt-1 text-xs text-muted-foreground">{stageMeta[node.stage].title}</div>
                            </div>
                            <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                          </button>
                        )) : (
                          <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                            {t('inspector.noDownstream')}
                          </div>
                        )}
                      </div>

                      <Collapsible>
                        <CollapsibleTrigger asChild>
                          <button type="button" className="w-full text-left text-sm font-medium hover:underline">
                            {t('inspector.metadata')}
                          </button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-2 space-y-2">
                          {selectedNode.metadata && Object.keys(selectedNode.metadata).length > 0 ? (
                            Object.entries(selectedNode.metadata).map(([key, value]) => (
                              <div key={key} className="rounded-xl border p-3">
                                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{key}</div>
                                <div className="mt-1 text-sm">
                                  {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                              {t('inspector.noMetadata')}
                            </div>
                          )}
                        </CollapsibleContent>
                      </Collapsible>

                      <Collapsible>
                        <CollapsibleTrigger asChild>
                          <button type="button" className="w-full text-left text-sm font-medium hover:underline">
                            {t('inspector.rawJson')}
                          </button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-2">
                          <pre className="overflow-x-auto rounded-xl border bg-muted/20 p-3 text-xs">
                            {JSON.stringify(selectedNode, null, 2)}
                          </pre>
                        </CollapsibleContent>
                      </Collapsible>
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="flex min-h-[320px] flex-col items-center justify-center p-6 text-center">
                    <div className="rounded-full border bg-background p-4 shadow-sm">
                      <Layers3 className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div className="mt-4 font-medium">{t('inspector.selectNode')}</div>
                    <div className="mt-2 text-sm text-muted-foreground">
                      {t('inspector.selectNodeDescription')}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
};

export default MetricLineagePage;
