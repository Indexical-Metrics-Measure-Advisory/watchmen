import React from 'react';
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
import type {
  MetricLineageViewData, LineageNode, LineageStage, LineageEdge, LineagePath, LineageGroup, LineageRoot, LineageRoute,
} from '@/model/metricLineage';
import {
  getMetricLineage,
  getMetricLineageSuggestions,
  isMetricLineageMockData,
  isMetricLineageMockMetric,
} from '@/services/metricLineageService';
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Binary,
  CheckCircle2,
  Copy,
  Database,
  ExternalLink,
  GitBranch,
  Layers3,
  Network,
  Route,
  Search,
  Sparkles,
  TableProperties,
  TriangleAlert,
  Workflow,
} from 'lucide-react';

const RECENT_METRICS_KEY = 'watchmen_metric_lineage_recent_metrics';
const getRecentMetricsStorageKey = (tenantId?: string | null): string =>
  tenantId ? `${RECENT_METRICS_KEY}:${tenantId}` : RECENT_METRICS_KEY;

const clearLegacyRecentMetricsStorageKey = (): void => {
  localStorage.removeItem(RECENT_METRICS_KEY);
};
const STAGE_ORDER: LineageStage[] = ['metric', 'semantic', 'topic', 'pipeline', 'source'];

const STAGE_META: Record<LineageStage, { title: string; description: string; icon: React.ReactNode; className: string; accentClass: string }> = {
  metric: {
    title: 'Metric',
    description: 'Business definitions and references',
    icon: <BarChart3 className="h-4 w-4" />,
    className: 'border-blue-200 bg-blue-50/70 text-blue-700',
    accentClass: 'from-blue-500/20 to-blue-500/5',
  },
  semantic: {
    title: 'Semantic',
    description: 'Semantic models and measures',
    icon: <GitBranch className="h-4 w-4" />,
    className: 'border-violet-200 bg-violet-50/70 text-violet-700',
    accentClass: 'from-violet-500/20 to-violet-500/5',
  },
  topic: {
    title: 'Topic',
    description: 'Datamart topics and factors',
    icon: <Network className="h-4 w-4" />,
    className: 'border-cyan-200 bg-cyan-50/70 text-cyan-700',
    accentClass: 'from-cyan-500/20 to-cyan-500/5',
  },
  pipeline: {
    title: 'Pipeline',
    description: 'Pipeline definitions and jobs',
    icon: <Workflow className="h-4 w-4" />,
    className: 'border-orange-200 bg-orange-50/70 text-orange-700',
    accentClass: 'from-orange-500/20 to-orange-500/5',
  },
  source: {
    title: 'Source',
    description: 'Origin tables and fields',
    icon: <Database className="h-4 w-4" />,
    className: 'border-emerald-200 bg-emerald-50/70 text-emerald-700',
    accentClass: 'from-emerald-500/20 to-emerald-500/5',
  },
};

const STATUS_META = {
  resolved: {
    label: 'Resolved',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  partial: {
    label: 'Partial',
    className: 'border-amber-200 bg-amber-50 text-amber-700',
    icon: <TriangleAlert className="h-3.5 w-3.5" />,
  },
  unresolved: {
    label: 'Unresolved',
    className: 'border-muted bg-muted/60 text-muted-foreground',
    icon: <Binary className="h-3.5 w-3.5" />,
  },
} as const;

const getNodeIcon = (node: LineageNode) => {
  switch (node.type) {
    case 'metric':
    case 'metric_ref':
      return <BarChart3 className="h-4 w-4" />;
    case 'semantic_model':
    case 'semantic_measure':
      return <GitBranch className="h-4 w-4" />;
    case 'topic':
    case 'topic_factor':
      return <Network className="h-4 w-4" />;
    case 'pipeline':
      return <Workflow className="h-4 w-4" />;
    case 'source_table':
      return <TableProperties className="h-4 w-4" />;
    case 'source_field':
      return <Database className="h-4 w-4" />;
    default:
      return <Layers3 className="h-4 w-4" />;
  }
};

const readRecentMetrics = (tenantId?: string | null): string[] => {
  try {
    const raw = localStorage.getItem(getRecentMetricsStorageKey(tenantId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string' && !isMetricLineageMockMetric(item))
      : [];
  } catch {
    return [];
  }
};

const writeRecentMetrics = (metricName: string, tenantId?: string | null): string[] => {
  const next = [metricName, ...readRecentMetrics(tenantId).filter(item => item !== metricName)].slice(0, 6);
  localStorage.setItem(getRecentMetricsStorageKey(tenantId), JSON.stringify(next));
  clearLegacyRecentMetricsStorageKey();
  return next;
};

const SummaryCard = ({ title, value, description }: { title: string; value: string | number; description: string }) => (
  <Card className="border-border/60 shadow-sm">
    <CardContent className="p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{title}</div>
      <div className="mt-2 text-2xl font-semibold tracking-tight">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{description}</div>
    </CardContent>
  </Card>
);

const PathSignalCard = ({
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
);

const GroupSummaryCard = ({
  group,
  nodeMap,
  onSelect,
}: {
  group: LineageGroup;
  nodeMap: Map<string, LineageNode>;
  onSelect: (nodeId: string) => void;
}) => (
  <div className="rounded-2xl border bg-background/80 p-4">
    <div className="flex items-start justify-between gap-3">
      <div>
        <div className="text-sm font-medium">{group.title}</div>
        <div className="mt-1 text-xs text-muted-foreground">
          {group.totalNodes} nodes, {group.activeNodes} active in the rendered routes
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
        <Badge variant="outline">+{group.collapsedNodeCount} more</Badge>
      )}
    </div>
  </div>
);

const RootSummaryCard = ({
  root,
  onSelect,
}: {
  root: LineageRoot;
  onSelect: (nodeId: string) => void;
}) => (
  <button
    type="button"
    onClick={() => onSelect(root.nodeId)}
    className="flex w-full items-center justify-between rounded-xl border p-3 text-left transition-colors hover:bg-muted/30"
  >
    <div>
      <div className="font-medium">{root.label}</div>
      <div className="mt-1 text-xs text-muted-foreground">
          {root.nodeType === 'topic' ? 'Raw topic' : root.nodeType === 'source_table' ? 'Source table' : 'Source field'} · {root.routeIds.length} route{root.routeIds.length === 1 ? '' : 's'}
      </div>
    </div>
    <Badge variant="outline">Hop {root.hopDepth}</Badge>
  </button>
);

const getEdgeKindLabel = (kind: LineageEdge['kind']): string => {
  switch (kind) {
    case 'defines':
      return 'Defines';
    case 'maps_to':
      return 'Maps To';
    case 'reads_from':
      return 'Reads From';
    case 'derived_from':
      return 'Derived From';
    case 'produces':
      return 'Produces';
    default:
      return kind;
  }
};

const getMetricRoleLabel = (node: LineageNode): string | null => {
  if (node.type === 'metric') return 'Requested Metric';
  if (node.type === 'metric_ref') return 'Referenced Metric';
  return null;
};

const getMetricDependencyDiagnostics = (diagnostics?: string[], referencedMetricNames: Set<string> = new Set()) => (
  (diagnostics || []).map(item => {
    const semanticMeasureMatch = item.match(/^Semantic measure\[(.+?)\] was not found in semantic metadata\.$/);
    if (!semanticMeasureMatch) {
      return { item, kind: 'general' as const, metricName: null as string | null };
    }

    const metricName = semanticMeasureMatch[1];
    return {
      item,
      kind: referencedMetricNames.has(metricName) ? 'referenced_metric_missing_semantic' as const : 'general' as const,
      metricName,
    };
  })
);

const MetricLineagePage: React.FC = () => {
  const { collapsed } = useSidebar();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = React.useState(searchParams.get('metric') || '');
  const [data, setData] = React.useState<MetricLineageViewData | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [selectedNodeId, setSelectedNodeId] = React.useState<string | null>(null);
  const [selectedPathId, setSelectedPathId] = React.useState<string | null>(null);
  const [recentMetrics, setRecentMetrics] = React.useState<string[]>([]);
  const [suggestions, setSuggestions] = React.useState<string[]>([]);

  const runTrace = React.useCallback(async (metricName: string) => {
    const trimmed = metricName.trim();
    if (!trimmed) {
      toast({ title: 'Metric name required', description: 'Enter a metric name to trace lineage.' });
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
      setRecentMetrics(isMetricLineageMockData(result) ? readRecentMetrics(user?.tenantId) : writeRecentMetrics(trimmed, user?.tenantId));
    } catch (error) {
      console.error('Failed to load metric lineage:', error);
      toast({
        title: 'Failed to trace lineage',
        description: 'Unable to load lineage data right now.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [setSearchParams, toast, user?.tenantId]);

  React.useEffect(() => {
    if (!user?.tenantId) return;
    clearLegacyRecentMetricsStorageKey();
    setRecentMetrics(readRecentMetrics(user.tenantId));
  }, [user?.tenantId]);

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
    toast({ title: 'Path copied', description: 'The active lineage path has been copied to clipboard.' });
  }, [activePath, data, nodeMap, toast]);

  const handleCopyNodeName = React.useCallback(async () => {
    if (!selectedNode) return;
    await navigator.clipboard.writeText(selectedNode.name);
    toast({ title: 'Node copied', description: 'The selected node name has been copied to clipboard.' });
  }, [selectedNode, toast]);

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
      title: 'Drill-down route pending',
      description: `A dedicated ${STAGE_META[node.stage].title.toLowerCase()} detail page can be linked here once that workspace is available.`,
    });
  }, [navigate, toast]);

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
                  Metric Lineage Explorer
                </Badge>
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tight">Trace from metric definition to source fields</h1>
                  <p className="max-w-3xl text-sm text-muted-foreground">
                    Preview the lineage experience with polished mock data today, then swap in backend-integrated metric,
                    topic, and pipeline data later without changing the UI contract.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" onClick={handleCopyPath} disabled={!activePath}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Path
                </Button>
                <Button variant="outline" onClick={handleExportJson} disabled={!data}>
                  <Route className="mr-2 h-4 w-4" />
                  Export JSON
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
                    placeholder="Enter metric name"
                    className="h-11 pl-10"
                  />
                </div>
                <Button className="h-11 min-w-36" onClick={() => void runTrace(query)} disabled={loading}>
                  <Search className="mr-2 h-4 w-4" />
                  {loading ? 'Tracing...' : 'Trace Lineage'}
                </Button>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Suggested</span>
                {suggestions.map(metric => (
                  <Button key={metric} variant="outline" size="sm" onClick={() => { setQuery(metric); void runTrace(metric); }}>
                    {metric}
                  </Button>
                ))}
              </div>

              {recentMetrics.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Recent</span>
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

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-7">
            <SummaryCard title="Metric Type" value={data?.summary.metricType || '--'} description="Definition shape resolved from the query." />
            <SummaryCard title="Metric Dependencies" value={referencedMetricNodes.length} description="Referenced metrics used in this lineage graph." />
            <SummaryCard title="Routes" value={data?.summary.routeCount || data?.paths.length || 0} description="Distinct lineage routes currently available." />
            <SummaryCard title="Max Hop Depth" value={data?.summary.maxHopDepth || 0} description="Deepest route length from metric to root." />
            <SummaryCard title="Topics" value={data?.summary.topicCount || 0} description="Topics matched from semantic and upstream mappings." />
            <SummaryCard title="Pipelines" value={data?.summary.pipelineCount || 0} description="Pipelines included in the returned lineage graph." />
            <SummaryCard title="Source Roots" value={(data?.summary.sourceTableCount || 0) + (data?.summary.sourceFieldCount || 0)} description="Source tables and fields resolved as route roots." />
            <Card className="border-border/60 shadow-sm">
              <CardContent className="flex h-full flex-col justify-between p-4">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Resolution Status</div>
                <div className="mt-3">
                  <Badge className={cn('gap-1 border', data ? STATUS_META[data.status].className : STATUS_META.unresolved.className)}>
                    {data ? STATUS_META[data.status].icon : STATUS_META.unresolved.icon}
                    {data ? STATUS_META[data.status].label : 'Unresolved'}
                  </Badge>
                </div>
                <div className="mt-3 text-xs text-muted-foreground">
                  {data?.status === 'resolved' && 'The current lineage path resolves through downstream metadata successfully.'}
                  {data?.status === 'partial' && 'Some downstream mappings are missing, but the dependency chain is still visible.'}
                  {data?.status === 'unresolved' && 'The metric could not be resolved into a usable lineage graph.'}
                </div>
              </CardContent>
            </Card>
          </div>

          {referencedMetricNodes.length > 0 && (
            <Card className="border-blue-200/70 bg-blue-50/40 shadow-sm">
              <CardContent className="p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="text-sm font-medium text-blue-900">Metric Dependency Chain Detected</div>
                    <div className="mt-1 max-w-3xl text-sm text-blue-800/80">
                      This metric is computed from other metrics. The lineage view keeps referenced metrics visible before semantic resolution so missing downstream mappings can still be diagnosed.
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <PathSignalCard
                      label="Dependency Depth"
                      value={dependencyDepth}
                      description="Referenced metric hops in the active path."
                    />
                    <PathSignalCard
                      label="Referenced Metrics"
                      value={referencedMetricNodes.length}
                      description="Distinct metric dependencies found in the graph."
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
                    <CardTitle className="text-lg">Lineage Canvas</CardTitle>
                    <CardDescription>
                      Focus on the active route, grouped fan-out, and resolved source roots instead of rendering every topic and pipeline at once.
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="gap-1">
                    <Route className="h-3.5 w-3.5" />
                    {routes.length || 0} Routes
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                {!loading && data && activePath && (
                  <div className="mb-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                    <div className="rounded-3xl border bg-gradient-to-br from-primary/5 via-background to-background p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-medium">Focused Route</div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            Review one compact route first, then expand groups and roots as needed.
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
                              <div className="text-sm font-medium text-blue-900">Metric Dependency Chain</div>
                              <div className="mt-1 text-xs text-blue-800/80">
                                The active path includes metric-on-metric dependencies before semantic resolution.
                              </div>
                            </div>
                            <Badge className="border-blue-200 bg-blue-100 text-blue-700">
                              {dependencyDepth} Hop{dependencyDepth === 1 ? '' : 's'}
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
                                    Derived From
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
                              <div className="text-xs font-medium">{STAGE_META[stage].title}</div>
                              <Badge variant="secondary">{group?.totalNodes || 0}</Badge>
                            </div>
                            <div className="mt-2 text-[11px] text-muted-foreground">
                              {active ? 'Included in active route' : 'Collapsed outside the active route'}
                            </div>
                          </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid gap-3">
                      <PathSignalCard
                        label="Stage Coverage"
                        value={`${STAGE_ORDER.filter(stage => (activePath?.nodeIds || []).some(nodeId => nodeMap.get(nodeId)?.stage === stage)).length}/${STAGE_ORDER.length}`}
                        description="Stages activated by the current route."
                      />
                      <PathSignalCard
                        label="Relations"
                        value={activePathEdges.length}
                        description="Edge transitions available in the selected route."
                      />
                      <PathSignalCard
                        label="Raw Roots"
                        value={roots.length}
                        description="Resolved raw/source roots currently visible in the response."
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
                          <CardTitle className="text-base">Route Groups</CardTitle>
                          <CardDescription>
                            Large topic and pipeline fan-out is collapsed into groups so the first view stays readable.
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
                          <CardTitle className="text-base">Available Routes</CardTitle>
                          <CardDescription>
                            Review each compact route before deciding whether a branch needs deeper expansion.
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
                                  {route.hopDepth} hops · {route.reachesSource ? 'reaches source' : 'source unresolved'} · {route.reachesRawTopic ? 'raw topic reached' : 'raw topic pending'}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {route.isPrimary && <Badge>Primary</Badge>}
                                <Badge variant="outline">{route.nodeIds.length} nodes</Badge>
                              </div>
                            </button>
                          ))}
                        </CardContent>
                      </Card>
                    </div>

                    <Card className="border-border/60 shadow-sm">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">Raw Roots</CardTitle>
                        <CardDescription>
                          Confirm which source tables and fields have actually been reached by the current lineage response.
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
                            No raw/source roots are available in the current lineage response yet.
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
                    <div className="mt-4 text-lg font-medium">No lineage preview available</div>
                    <div className="mt-2 max-w-md text-sm text-muted-foreground">
                      Try one of the suggested metric names to preview the staged lineage design with mock data.
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/60 shadow-sm xl:sticky xl:top-20 xl:h-fit">
              <CardHeader className="border-b bg-muted/20">
                <CardTitle className="text-lg">Node Inspector</CardTitle>
                <CardDescription>Click any lineage node to inspect its current mock definition.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {selectedNode ? (
                  <ScrollArea className="h-[720px]">
                    <div className="space-y-5 p-5">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Badge className={cn('gap-1 border', STAGE_META[selectedNode.stage].className)}>
                            {getNodeIcon(selectedNode)}
                            {selectedNode.stage}
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
                            {selectedNode.stage === 'metric' ? 'Open Metrics' : selectedNode.stage === 'semantic' ? 'Open Semantic Models' : 'Open Workspace'}
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => void handleCopyNodeName()}>
                            <Copy className="mr-2 h-4 w-4" />
                            Copy Node Name
                          </Button>
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-3">
                        <div className="text-sm font-medium">Overview</div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="rounded-xl border p-3">
                            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Stage</div>
                            <div className="mt-1 font-medium">{selectedNode.stage}</div>
                          </div>
                          <div className="rounded-xl border p-3">
                            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Type</div>
                            <div className="mt-1 font-medium">{selectedNode.type}</div>
                          </div>
                          <div className="rounded-xl border p-3">
                            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Role</div>
                            <div className="mt-1 font-medium">{getMetricRoleLabel(selectedNode) || 'Lineage Node'}</div>
                          </div>
                          <div className="rounded-xl border p-3">
                            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Dependency Step</div>
                            <div className="mt-1 font-medium">{activePathStepMap.get(selectedNode.id) || '--'}</div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="text-sm font-medium">Connected Nodes</div>
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
                                  Upstream · {getEdgeKindLabel(edge.kind)}
                                </div>
                                <div className="mt-1 font-medium">{node.label || node.name}</div>
                                <div className="mt-1 text-xs text-muted-foreground">{STAGE_META[node.stage].title}</div>
                              </div>
                              <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                            </button>
                          )) : (
                            <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                              No upstream nodes connected to this selection.
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
                                  Downstream · {getEdgeKindLabel(edge.kind)}
                                </div>
                                <div className="mt-1 font-medium">{node.label || node.name}</div>
                                <div className="mt-1 text-xs text-muted-foreground">{STAGE_META[node.stage].title}</div>
                              </div>
                              <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                            </button>
                          )) : (
                            <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                              No downstream nodes connected to this selection.
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="text-sm font-medium">Path Membership</div>
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
                                  <div className="mt-1 text-xs text-muted-foreground">{path.nodeIds.length} nodes in this path</div>
                                </div>
                                {path.isPrimary && <Badge>Primary</Badge>}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                            This node does not belong to any rendered path.
                          </div>
                        )}
                      </div>

                      <div className="space-y-3">
                        <div className="text-sm font-medium">Metadata</div>
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
                            No metadata available for this node.
                          </div>
                        )}
                      </div>

                      <div className="space-y-3">
                        <div className="text-sm font-medium">Raw JSON</div>
                        <pre className="overflow-x-auto rounded-xl border bg-muted/20 p-3 text-xs">
                          {JSON.stringify(selectedNode, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="flex min-h-[320px] flex-col items-center justify-center p-6 text-center">
                    <div className="rounded-full border bg-background p-4 shadow-sm">
                      <Layers3 className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div className="mt-4 font-medium">Select a node</div>
                    <div className="mt-2 text-sm text-muted-foreground">
                      The inspector will show detailed mock metadata for the currently selected lineage node.
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
                  <TabsTrigger value="paths">Routes</TabsTrigger>
                  <TabsTrigger value="json">Raw JSON</TabsTrigger>
                  <TabsTrigger value="diagnostics">Diagnostics</TabsTrigger>
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
                              {path.nodeIds.length} nodes · {'hopDepth' in path ? `${path.hopDepth} hops` : 'route depth pending'}
                            </div>
                          </div>
                          {path.isPrimary && <Badge>Primary</Badge>}
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
                                {getEdgeKindLabel(edge.kind)}
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
                          Referenced Metric Gaps
                        </div>
                        <div className="mt-2 text-sm text-amber-800/90">
                          The metric dependency chain is known, but one or more referenced metrics could not be mapped to semantic metadata yet.
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
                              <Badge className="border-amber-200 bg-background text-amber-800">Referenced Metric</Badge>
                              <Badge variant="outline" className="border-amber-200 text-amber-800">{item.metricName}</Badge>
                            </div>
                          )}
                          {item.item}
                        </div>
                      ))
                    ) : (
                      <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                        No diagnostics available for the current view.
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Open From Metrics Management</CardTitle>
              <CardDescription>
                This page is ready to be launched directly from your metric list for a selected metric.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => navigate('/metrics/management')}>
                Open Metrics Management
              </Button>
              <Button variant="ghost" onClick={() => navigate('/metrics/lineage')}>
                Use Example Metric
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
