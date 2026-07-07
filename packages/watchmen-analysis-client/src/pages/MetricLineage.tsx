import React, { memo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { useAuth } from '@/contexts/AuthContext';
import { useSidebar } from '@/contexts/SidebarContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type {
  MetricLineageViewData, LineageNode, LineageStage, LineageEdge, LineagePath, LineageGroup, LineageRoot, LineageRoute,
} from '@/model/metricLineage';
import {
  getMetricLineage,
  getMetricLineageSuggestions,
  isMetricLineageMockData,
} from '@/services/metricLineageService';
import {
  ArrowRight,
  ArrowUpRight,
  Copy,
  ExternalLink,
  Layers3,
  Route,
  Search,
  Sparkles,
  TriangleAlert,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getRecentMetricsStorageKey, buildStageMeta, buildStatusMeta, getNodeIcon, getEdgeKindLabel, getMetricRoleLabel, getMetricDependencyDiagnostics, STAGE_ORDER } from '@/utils/lineageHelpers';
import { useRecentMetrics } from '@/hooks/useRecentMetrics';

const SummaryCard = memo(({ title, value, description }: { title: string; value: string | number; description: string }) => (
  <Card className="border-border/60 shadow-sm">
    <CardContent className="p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{title}</div>
      <div className="mt-2 text-2xl font-semibold tracking-tight">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{description}</div>
    </CardContent>
  </Card>
));
SummaryCard.displayName = 'SummaryCard';

const PathSignalCard = memo(({
  label,
  value,
  description,
}: {
  label: string;
  value: string | number;
  description: string;
}) => (
  <div className="rounded-2xl border bg-background/80 p-4">
    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
    <div className="mt-2 text-2xl font-semibold tracking-tight">{value}</div>
    <div className="mt-1 text-xs text-muted-foreground">{description}</div>
  </div>
));
PathSignalCard.displayName = 'PathSignalCard';

const GroupSummaryCard = memo(({
  group,
  nodeMap,
  onSelect,
}: {
  group: LineageGroup;
  nodeMap: Map<string, LineageNode>;
  onSelect: (nodeId: string) => void;
}) => {
  const { t } = useTranslation('metricLineage');
  return (
    <div className="rounded-2xl border bg-background/80 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium">{group.title}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            {t('routeGroups.nodesActive', { total: group.totalNodes, active: group.activeNodes })}
          </div>
        </div>
        <Badge variant="secondary">{group.totalNodes}</Badge>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {group.previewNodeIds.map(nodeId => {
          const node = nodeMap.get(nodeId);
          if (!node) return null;
          return (
            <button
              key={nodeId}
              type="button"
              onClick={() => onSelect(nodeId)}
              className="rounded-full border px-3 py-1 text-xs transition-colors hover:bg-muted"
            >
              {node.label || node.name}
            </button>
          );
        })}
        {group.collapsedNodeCount > 0 && (
          <Badge variant="outline">{t('routeGroups.more', { count: group.collapsedNodeCount })}</Badge>
        )}
      </div>
    </div>
  );
});
GroupSummaryCard.displayName = 'GroupSummaryCard';

const RootSummaryCard = memo(({
  root,
  onSelect,
}: {
  root: LineageRoot;
  onSelect: (nodeId: string) => void;
}) => {
  const { t } = useTranslation('metricLineage');
  return (
    <button
      type="button"
      onClick={() => onSelect(root.nodeId)}
      className="flex w-full items-center justify-between rounded-xl border p-3 text-left transition-colors hover:bg-muted/30"
    >
      <div>
        <div className="font-medium">{root.label}</div>
        <div className="mt-1 text-xs text-muted-foreground">
          {root.nodeType === 'topic' ? t('rootsPanel.rawTopic') : root.nodeType === 'source_table' ? t('rootsPanel.sourceTable') : t('rootsPanel.sourceField')} · {t('rootsPanel.routes', { count: root.routeIds.length })}
        </div>
      </div>
      <Badge variant="outline">{t('rootsPanel.hopDepth', { count: root.hopDepth })}</Badge>
    </button>
  );
});
RootSummaryCard.displayName = 'RootSummaryCard';

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

  const activePathStepMap = React.useMemo(
    () => new Map((activePath?.nodeIds || []).map((nodeId, index) => [nodeId, index + 1])),
    [activePath?.nodeIds]
  );

  const activePathEdges = React.useMemo(
    () => data?.edges.filter(edge => edge.pathId === activePath?.id) || [],
    [activePath?.id, data?.edges]
  );

  const edgesByPathId = React.useMemo(() => {
    const next = new Map<string, LineageEdge[]>();
    (data?.edges || []).forEach(edge => {
      const existing = next.get(edge.pathId) || [];
      existing.push(edge);
      next.set(edge.pathId, existing);
    });
    return next;
  }, [data?.edges]);

  const routes = React.useMemo<LineageRoute[]>(() => data?.routes || [], [data?.routes]);

  const groups = React.useMemo<LineageGroup[]>(() => data?.groups || [], [data?.groups]);

  const roots = React.useMemo<LineageRoot[]>(() => data?.roots || [], [data?.roots]);

  const referencedMetricNodes = React.useMemo(
    () => (data?.nodes || []).filter(node => node.type === 'metric_ref'),
    [data?.nodes]
  );

  const activeMetricChain = React.useMemo(
    () => (activePath?.nodeIds || [])
      .map(nodeId => nodeMap.get(nodeId))
      .filter((node): node is LineageNode => !!node && node.stage === 'metric'),
    [activePath?.nodeIds, nodeMap]
  );

  const dependencyDepth = Math.max(activeMetricChain.length - 1, 0);

  const activeRoute = React.useMemo(
    () => routes.find(route => route.id === selectedPathId) || routes.find(route => route.isPrimary) || routes[0] || null,
    [routes, selectedPathId]
  );

  const dependencyDiagnostics = React.useMemo(
    () => getMetricDependencyDiagnostics(
      data?.diagnostics,
      new Set(referencedMetricNodes.map(node => node.name))
    ),
    [data?.diagnostics, referencedMetricNodes]
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

  const selectedNodePaths = React.useMemo(
    () => selectedNode ? (data?.paths.filter(path => path.nodeIds.includes(selectedNode.id)) || []) : [],
    [data?.paths, selectedNode]
  );

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

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />

      <div className={`${collapsed ? 'pl-20' : 'pl-56'} min-h-screen transition-[padding] duration-300`}>
        <Header />

        <main className="container py-6 space-y-6">
          <div className="overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-primary/10 via-background to-background shadow-sm">
            <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
              <div className="space-y-4">
                <Badge variant="outline" className="gap-1 border-primary/20 bg-background/70 text-primary">
                  <Sparkles className="h-3.5 w-3.5" />
                  {t('badge')}
                </Badge>
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tight">{t('heroTitle')}</h1>
                  <p className="max-w-3xl text-sm text-muted-foreground">
                    {t('heroDescription')}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" onClick={handleCopyPath} disabled={!activePath}>
                  <Copy className="mr-2 h-4 w-4" />
                  {t('copyPath')}
                </Button>
                <Button variant="outline" onClick={handleExportJson} disabled={!data}>
                  <Route className="mr-2 h-4 w-4" />
                  {t('exportJson')}
                </Button>
              </div>
            </div>
          </div>

          <Card className="border-border/60 shadow-sm">
            <CardContent className="p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
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
                    className="h-11 pl-10"
                  />
                </div>
                <Button className="h-11 min-w-36" onClick={() => void runTrace(query)} disabled={loading}>
                  <Search className="mr-2 h-4 w-4" />
                  {loading ? t('tracing') : t('traceLineage')}
                </Button>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('suggested')}</span>
                {suggestions.map(metric => (
                  <Button key={metric} variant="outline" size="sm" onClick={() => { setQuery(metric); void runTrace(metric); }}>
                    {metric}
                  </Button>
                ))}
              </div>

              {recentMetrics.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('recent')}</span>
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
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            <SummaryCard title={t('summary.metricType.title')} value={data?.summary.metricType || '--'} description={t('summary.metricType.description')} />
            <SummaryCard title={t('summary.metricDependencies.title')} value={referencedMetricNodes.length} description={t('summary.metricDependencies.description')} />
            <SummaryCard title={t('summary.routes.title')} value={data?.summary.routeCount || data?.paths.length || 0} description={t('summary.routes.description')} />
            <SummaryCard title={t('summary.maxHopDepth.title')} value={data?.summary.maxHopDepth || 0} description={t('summary.maxHopDepth.description')} />
            <SummaryCard title={t('summary.topics.title')} value={data?.summary.topicCount || 0} description={t('summary.topics.description')} />
            <SummaryCard title={t('summary.pipelines.title')} value={data?.summary.pipelineCount || 0} description={t('summary.pipelines.description')} />
            <SummaryCard title={t('summary.sourceRoots.title')} value={(data?.summary.sourceTableCount || 0) + (data?.summary.sourceFieldCount || 0)} description={t('summary.sourceRoots.description')} />
            <Card className="border-border/60 shadow-sm">
              <CardContent className="flex h-full flex-col justify-between p-4">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">{t('summary.resolutionStatus')}</div>
                <div className="mt-3">
                  <Badge className={cn('gap-1 border', data ? statusMeta[data.status].className : statusMeta.unresolved.className)}>
                    {data ? statusMeta[data.status].icon : statusMeta.unresolved.icon}
                    {data ? statusMeta[data.status].label : statusMeta.unresolved.label}
                  </Badge>
                </div>
                <div className="mt-3 text-xs text-muted-foreground">
                  {data?.status === 'resolved' && t('status.resolvedDescription')}
                  {data?.status === 'partial' && t('status.partialDescription')}
                  {data?.status === 'unresolved' && t('status.unresolvedDescription')}
                </div>
              </CardContent>
            </Card>
          </div>

          {referencedMetricNodes.length > 0 && (
            <Card className="border-blue-200/70 bg-blue-50/40 shadow-sm">
              <CardContent className="p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="text-sm font-medium text-blue-900">{t('dependencyChain.title')}</div>
                    <div className="mt-1 max-w-3xl text-sm text-blue-800/80">
                      {t('dependencyChain.description')}
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <PathSignalCard
                      label={t('dependencyChain.dependencyDepthLabel')}
                      value={dependencyDepth}
                      description={t('dependencyChain.dependencyDepthDescription')}
                    />
                    <PathSignalCard
                      label={t('dependencyChain.referencedMetricsLabel')}
                      value={referencedMetricNodes.length}
                      description={t('dependencyChain.referencedMetricsDescription')}
                    />
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {referencedMetricNodes.map(node => (
                    <button
                      key={node.id}
                      type="button"
                      className={cn(
                        'rounded-full border border-blue-200 bg-background px-3 py-1 text-xs text-blue-700 transition-colors hover:bg-blue-100',
                        selectedNodeId === node.id && 'border-primary bg-primary/10 text-primary'
                      )}
                      onClick={() => selectNodeAndSyncPath(node.id)}
                    >
                      {node.label || node.name}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <Card className="overflow-hidden border-border/60 shadow-sm">
              <CardHeader className="border-b bg-muted/20">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg">{t('canvas.title')}</CardTitle>
                    <CardDescription>
                      {t('canvas.description')}
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="gap-1">
                    <Route className="h-3.5 w-3.5" />
                    {t('canvas.routesCount', { count: routes.length || 0 })}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                {!loading && data && activePath && (
                  <div className="mb-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                    <div className="rounded-3xl border bg-gradient-to-br from-primary/5 via-background to-background p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-medium">{t('canvas.focusedRoute')}</div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {t('canvas.focusedRouteDescription')}
                          </div>
                        </div>
                        <Badge className="border-primary/20 bg-primary/10 text-primary">
                          {activeRoute?.title || activePath.title}
                        </Badge>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        {activePath.nodeIds.map((id, index) => {
                          const node = nodeMap.get(id);
                          return (
                            <React.Fragment key={id}>
                              <button
                                type="button"
                                className={cn(
                                  'rounded-full border px-3 py-1 text-xs transition-colors',
                                  id === selectedNodeId ? 'border-primary bg-primary/10 text-primary' : 'border-border/60 bg-background hover:bg-muted'
                                )}
                                onClick={() => selectNodeAndSyncPath(id)}
                              >
                                {node?.label || node?.name || id}
                              </button>
                              {index < activePath.nodeIds.length - 1 && <Chevron />}
                            </React.Fragment>
                          );
                        })}
                      </div>

                      {activeMetricChain.length > 1 && (
                        <div className="mt-4 rounded-2xl border border-blue-200/70 bg-blue-50/40 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <div className="text-sm font-medium text-blue-900">{t('dependencyChain.activeTitle')}</div>
                              <div className="mt-1 text-xs text-blue-800/80">
                                {t('dependencyChain.activeDescription')}
                              </div>
                            </div>
                            <Badge className="border-blue-200 bg-blue-100 text-blue-700">
                              {t('dependencyChain.hops', { count: dependencyDepth })}
                            </Badge>
                          </div>

                          <div className="mt-4 flex flex-wrap items-center gap-2">
                            {activeMetricChain.map((node, index) => (
                              <React.Fragment key={node.id}>
                                <button
                                  type="button"
                                  onClick={() => selectNodeAndSyncPath(node.id)}
                                  className={cn(
                                    'rounded-full border px-3 py-1 text-xs transition-colors',
                                    node.id === selectedNodeId ? 'border-primary bg-primary/10 text-primary' : 'border-blue-200 bg-background text-blue-700 hover:bg-blue-100'
                                  )}
                                >
                                  {node.label || node.name}
                                </button>
                                {index < activeMetricChain.length - 1 && (
                                  <Badge variant="outline" className="border-blue-200 text-[10px] uppercase tracking-wide text-blue-700">
                                    {t('edgeKind.derived_from')}
                                  </Badge>
                                )}
                              </React.Fragment>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="mt-4 grid gap-2 md:grid-cols-5">
                        {STAGE_ORDER.map(stage => {
                          const group = groups.find(item => item.stage === stage);
                          const active = (activePath?.nodeIds || []).some(nodeId => nodeMap.get(nodeId)?.stage === stage);
                          return (
                          <div
                            key={stage}
                            className={cn(
                              'rounded-2xl border p-3 transition-colors',
                              active ? 'border-primary/30 bg-primary/5' : 'border-border/60 bg-background/70'
                            )}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="text-xs font-medium">{stageMeta[stage].title}</div>
                              <Badge variant="secondary">{group?.totalNodes || 0}</Badge>
                            </div>
                            <div className="mt-2 text-[11px] text-muted-foreground">
                              {active ? t('canvas.includedInRoute') : t('canvas.collapsedOutsideRoute')}
                            </div>
                          </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid gap-3">
                      <PathSignalCard
                        label={t('canvas.stageCoverage')}
                        value={`${STAGE_ORDER.filter(stage => (activePath?.nodeIds || []).some(nodeId => nodeMap.get(nodeId)?.stage === stage)).length}/${STAGE_ORDER.length}`}
                        description={t('canvas.stageCoverageDescription')}
                      />
                      <PathSignalCard
                        label={t('canvas.relations')}
                        value={activePathEdges.length}
                        description={t('canvas.relationsDescription')}
                      />
                      <PathSignalCard
                        label={t('canvas.rawRoots')}
                        value={roots.length}
                        description={t('canvas.rawRootsDescription')}
                      />
                    </div>
                  </div>
                )}

                {loading ? (
                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                    <div className="space-y-4">
                      <div className="h-24 rounded-xl bg-muted animate-pulse" />
                      <div className="h-32 rounded-xl bg-muted/80 animate-pulse" />
                      <div className="h-32 rounded-xl bg-muted/60 animate-pulse" />
                    </div>
                    <div className="space-y-3">
                      <div className="space-y-3">
                        <div className="h-10 rounded-xl bg-muted animate-pulse" />
                        <div className="h-28 rounded-xl bg-muted/80 animate-pulse" />
                      </div>
                    </div>
                  </div>
                ) : data && data.nodes.length > 0 ? (
                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_320px]">
                    <div className="space-y-4">
                      <Card className="border-border/60 shadow-sm">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">{t('routeGroups.title')}</CardTitle>
                          <CardDescription>
                            {t('routeGroups.description')}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-3">
                          {groups.map(group => (
                            <GroupSummaryCard
                              key={group.id}
                              group={group}
                              nodeMap={nodeMap}
                              onSelect={selectNodeAndSyncPath}
                            />
                          ))}
                        </CardContent>
                      </Card>

                      <Card className="border-border/60 shadow-sm">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">{t('routesPanel.title')}</CardTitle>
                          <CardDescription>
                            {t('routesPanel.description')}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {routes.map(route => (
                            <button
                              type="button"
                              key={route.id}
                              onClick={() => selectPath({id: route.id, title: route.title, nodeIds: route.nodeIds, isPrimary: route.isPrimary})}
                              className={cn(
                                'flex w-full items-center justify-between rounded-2xl border p-4 text-left transition-all hover:shadow-sm',
                                route.id === activeRoute?.id ? 'border-primary bg-primary/5' : 'border-border/60 bg-card'
                              )}
                            >
                              <div>
                                <div className="font-medium">{route.title}</div>
                                <div className="mt-1 text-xs text-muted-foreground">
                                  {t('routesPanel.routeMeta', {
                                    hops: route.hopDepth,
                                    source: route.reachesSource ? t('routesPanel.reachesSource') : t('routesPanel.sourceUnresolved'),
                                    rawTopic: route.reachesRawTopic ? t('routesPanel.rawTopicReached') : t('routesPanel.rawTopicPending'),
                                  })}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {route.isPrimary && <Badge>{t('routesPanel.primary')}</Badge>}
                                <Badge variant="outline">{t('routesPanel.nodesCount', { count: route.nodeIds.length })}</Badge>
                              </div>
                            </button>
                          ))}
                        </CardContent>
                      </Card>
                    </div>

                    <Card className="border-border/60 shadow-sm">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">{t('rootsPanel.title')}</CardTitle>
                        <CardDescription>
                          {t('rootsPanel.description')}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {roots.length > 0 ? roots.map(root => (
                          <RootSummaryCard
                            key={root.nodeId}
                            root={root}
                            onSelect={selectNodeAndSyncPath}
                          />
                        )) : (
                          <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                            {t('rootsPanel.empty')}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <div className="flex min-h-[440px] flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/20 px-6 text-center">
                    <div className="rounded-full border bg-background p-4 shadow-sm">
                      <Search className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div className="mt-4 text-lg font-medium">{t('empty.title')}</div>
                    <div className="mt-2 max-w-md text-sm text-muted-foreground">
                      {t('empty.description')}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/60 shadow-sm xl:sticky xl:top-20 xl:h-fit">
              <CardHeader className="border-b bg-muted/20">
                <CardTitle className="text-lg">{t('inspector.title')}</CardTitle>
                <CardDescription>{t('inspector.description')}</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {selectedNode ? (
                  <ScrollArea className="h-[720px]">
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

                      <div className="space-y-3">
                        <div className="text-sm font-medium">{t('inspector.overview')}</div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="rounded-xl border p-3">
                            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{t('inspector.stage')}</div>
                            <div className="mt-1 font-medium">{stageMeta[selectedNode.stage].title}</div>
                          </div>
                          <div className="rounded-xl border p-3">
                            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{t('inspector.type')}</div>
                            <div className="mt-1 font-medium">{selectedNode.type}</div>
                          </div>
                          <div className="rounded-xl border p-3">
                            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{t('inspector.role')}</div>
                            <div className="mt-1 font-medium">{getMetricRoleLabel(selectedNode, t) || t('roles.lineageNode')}</div>
                          </div>
                          <div className="rounded-xl border p-3">
                            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{t('inspector.dependencyStep')}</div>
                            <div className="mt-1 font-medium">{activePathStepMap.get(selectedNode.id) || '--'}</div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="text-sm font-medium">{t('inspector.connectedNodes')}</div>
                        <div className="space-y-2">
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
                      </div>

                      <div className="space-y-3">
                        <div className="text-sm font-medium">{t('inspector.pathMembership')}</div>
                        {selectedNodePaths.length > 0 ? (
                          <div className="space-y-2">
                            {selectedNodePaths.map(path => (
                              <button
                                type="button"
                                key={path.id}
                                onClick={() => selectPath(path)}
                                className={cn(
                                  'flex w-full items-center justify-between rounded-xl border p-3 text-left transition-colors',
                                  path.id === activePath?.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/30'
                                )}
                              >
                                <div>
                                  <div className="font-medium">{path.title}</div>
                                  <div className="mt-1 text-xs text-muted-foreground">{t('inspector.pathNodes', { count: path.nodeIds.length })}</div>
                                </div>
                                {path.isPrimary && <Badge>{t('routesPanel.primary')}</Badge>}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                            {t('inspector.noPathMembership')}
                          </div>
                        )}
                      </div>

                      <div className="space-y-3">
                        <div className="text-sm font-medium">{t('inspector.metadata')}</div>
                        {selectedNode.metadata && Object.keys(selectedNode.metadata).length > 0 ? (
                          <div className="space-y-2">
                            {Object.entries(selectedNode.metadata).map(([key, value]) => (
                              <div key={key} className="rounded-xl border p-3">
                                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{key}</div>
                                <div className="mt-1 text-sm">
                                  {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                            {t('inspector.noMetadata')}
                          </div>
                        )}
                      </div>

                      <Collapsible>
                        <CollapsibleTrigger asChild>
                          <button type="button" className="text-sm font-medium hover:underline text-left w-full">
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

          <Card className="border-border/60 shadow-sm">
            <CardContent className="p-5">
              <Tabs defaultValue="paths" className="w-full">
                <TabsList>
                  <TabsTrigger value="paths">{t('tabs.routes')}</TabsTrigger>
                  <TabsTrigger value="json">{t('tabs.rawJson')}</TabsTrigger>
                  <TabsTrigger value="diagnostics">{t('tabs.diagnostics')}</TabsTrigger>
                </TabsList>

                <TabsContent value="paths">
                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    {(routes.length > 0 ? routes : (data?.paths || [])).map(path => (
                      <button
                        type="button"
                        key={path.id}
                        onClick={() => {
                          setSelectedPathId(path.id);
                          setSelectedNodeId(path.nodeIds[0] || null);
                        }}
                        className={cn(
                          'rounded-2xl border p-4 text-left transition-all hover:shadow-sm',
                          path.id === selectedPathId ? 'border-primary bg-primary/5' : 'border-border/60 bg-card'
                        )}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="font-medium">{path.title}</div>
                            <div className="mt-1 text-xs text-muted-foreground">
                              {t('routesPanel.nodesCount', { count: path.nodeIds.length })} · {'hopDepth' in path ? t('routesPanel.hops', { count: path.hopDepth }) : t('diagnostics.routeDepthPending')}
                            </div>
                          </div>
                          {path.isPrimary && <Badge>{t('routesPanel.primary')}</Badge>}
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          {path.nodeIds.map((id, index) => {
                            const node = nodeMap.get(id);
                            return (
                              <React.Fragment key={id}>
                                <Badge variant="secondary">{node?.label || node?.name || id}</Badge>
                                {index < path.nodeIds.length - 1 && <Chevron />}
                              </React.Fragment>
                            );
                          })}
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          {(edgesByPathId.get(path.id) || [])
                            .map(edge => (
                              <Badge key={edge.id} variant="outline" className="text-[10px] uppercase tracking-wide">
                                {getEdgeKindLabel(edge.kind, t)}
                              </Badge>
                            ))}
                        </div>
                      </button>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="json">
                  <ScrollArea className="mt-4 h-[320px] rounded-xl border bg-muted/20 p-3">
                    <pre className="text-xs">{JSON.stringify(data, null, 2)}</pre>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="diagnostics">
                  <div className="mt-4 space-y-3">
                    {dependencyDiagnostics.some(item => item.kind === 'referenced_metric_missing_semantic') && (
                      <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-amber-900">
                          <TriangleAlert className="h-4 w-4" />
                          {t('diagnostics.referencedMetricGaps')}
                        </div>
                        <div className="mt-2 text-sm text-amber-800/90">
                          {t('diagnostics.referencedMetricGapsDescription')}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {dependencyDiagnostics
                            .filter(item => item.kind === 'referenced_metric_missing_semantic')
                            .map(item => (
                              <Badge key={item.item} variant="outline" className="border-amber-200 bg-background text-amber-800">
                                {item.metricName}
                              </Badge>
                            ))}
                        </div>
                      </div>
                    )}

                    {(data?.diagnostics || []).length > 0 ? (
                      dependencyDiagnostics.map(item => (
                        <div
                          key={item.item}
                          className={cn(
                            'rounded-xl border p-4 text-sm',
                            item.kind === 'referenced_metric_missing_semantic'
                              ? 'border-amber-200 bg-amber-50/50 text-amber-900'
                              : 'bg-muted/20 text-muted-foreground'
                          )}
                        >
                          {item.kind === 'referenced_metric_missing_semantic' && item.metricName && (
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                              <Badge className="border-amber-200 bg-background text-amber-800">{t('diagnostics.referencedMetric')}</Badge>
                              <Badge variant="outline" className="border-amber-200 text-amber-800">{item.metricName}</Badge>
                            </div>
                          )}
                          {item.item}
                        </div>
                      ))
                    ) : (
                      <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                        {t('diagnostics.none')}
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">{t('footer.title')}</CardTitle>
              <CardDescription>
                {t('footer.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => navigate('/metrics/management')}>
                {t('footer.openMetricsManagement')}
              </Button>
              <Button variant="ghost" onClick={() => navigate('/metrics/lineage')}>
                {t('footer.useExampleMetric')}
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
};

const Chevron = () => <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />;

export default MetricLineagePage;
