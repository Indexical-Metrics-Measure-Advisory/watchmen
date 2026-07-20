import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { useAuth } from '@/contexts/AuthContext';
import { useSidebar } from '@/contexts/SidebarContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import type {
  MetricLineageViewData, LineageNode, LineageEdge, LineagePath, LineageRoute,
} from '@/model/metricLineage';
import {
  getMetricLineage,
  getMetricLineageSuggestions,
  isMetricLineageMockData,
} from '@/services/metricLineageService';
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  CheckCircle2,
  Copy,
  Database,
  ExternalLink,
  GitBranch,
  Info,
  Layers3,
  Loader2,
  Route,
  Search,
  TriangleAlert,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getRecentMetricsStorageKey, buildStageMeta, getNodeIcon, getEdgeKindLabel, getMetricDependencyDiagnostics, STAGE_ORDER } from '@/utils/lineageHelpers';
import { useRecentMetrics } from '@/hooks/useRecentMetrics';

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

  const routes = React.useMemo<LineageRoute[]>(() => data?.routes || [], [data?.routes]);

  const referencedMetricNodes = React.useMemo(
    () => (data?.nodes || []).filter(node => node.type === 'metric_ref'),
    [data?.nodes]
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
      <div className={`${collapsed ? 'pl-20' : 'pl-56'} min-h-screen transition-[padding] duration-300 flex flex-col`}>
        <Header />

        <main className="flex-1 overflow-y-auto p-6">
          {/* ── Page Header ── */}
          <div className="flex items-start justify-between mb-5">
            <div>
              <h1 className="text-2xl font-bold leading-tight flex items-center gap-2">
                <GitBranch className="w-6 h-6 text-primary" />
                {t('pageTitle')}
              </h1>
              <p className="text-[13px] text-muted-foreground mt-1">{t('pageSubtitle')}</p>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={handleExportJson} disabled={!data}>
                <Route className="w-3.5 h-3.5" />
                {t('exportJson')}
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={handleCopyPath} disabled={!activePath}>
                <Copy className="w-3.5 h-3.5" />
                {t('copyPath')}
              </Button>
            </div>
          </div>

          {/* ── Search Bar ── */}
          <div className="bg-card border border-border rounded-lg p-4 mb-5">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-muted-foreground/70" />
                <Input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') void runTrace(query); }}
                  placeholder={t('searchPlaceholder')}
                  className="h-9 pl-10 text-[13px] border-0 shadow-none focus-visible:ring-1 focus-visible:ring-primary"
                />
              </div>
              <Button className="h-9 text-[13px] font-semibold gap-1.5" onClick={() => void runTrace(query)} disabled={loading}>
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                {loading ? t('tracing') : t('traceLineage')}
              </Button>
            </div>
            {recentMetrics.length > 0 && (
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{t('recent')}</span>
                {recentMetrics.map(metric => (
                  <button key={metric} onClick={() => { setQuery(metric); void runTrace(metric); }}
                    className="text-xs font-mono px-2.5 py-1 rounded-full bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors inline-flex items-center gap-1">
                    {metric}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Summary Cards ── */}
          {data && (
            <div className="grid grid-cols-4 gap-3 mb-5">
              <div className="bg-card border border-border rounded-lg p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><Layers3 className="w-5 h-5 text-primary" /></div>
                <div>
                  <div className="text-xl font-bold tabular-nums leading-tight">{STAGE_ORDER.filter(s => data.nodes.some(n => n.stage === s)).length}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{t('summary.metricType.title')}</div>
                </div>
              </div>
              <div className="bg-card border border-border rounded-lg p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0"><Route className="w-5 h-5 text-emerald-600" /></div>
                <div>
                  <div className="text-xl font-bold tabular-nums leading-tight">{data.paths.length}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{t('summary.routes.title')}</div>
                </div>
              </div>
              <div className="bg-card border border-border rounded-lg p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-violet-50 flex items-center justify-center shrink-0"><Database className="w-5 h-5 text-violet-600" /></div>
                <div>
                  <div className="text-xl font-bold tabular-nums leading-tight">{data.summary.sourceTableCount || 0}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{t('summary.sourceRoots.title')}</div>
                </div>
              </div>
              <div className="bg-card border border-border rounded-lg p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0"><CheckCircle2 className="w-5 h-5 text-blue-600" /></div>
                <div>
                  <div className="text-xl font-bold tabular-nums leading-tight">{data.summary.maxHopDepth || 0}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{t('summary.maxHopDepth.title')}</div>
                </div>
              </div>
            </div>
          )}

          {/* ── Main Content: Lineage + Right Panel ── */}
          <div className="flex gap-6 items-start">
            {/* Left: Lineage Visualization */}
            <div className="flex-1 min-w-0">
              {loading ? (
                <div className="bg-card border border-border rounded-lg p-6 space-y-4">
                  <div className="h-8 rounded bg-muted animate-pulse" />
                  <div className="h-32 rounded bg-muted/70 animate-pulse" />
                  <div className="h-32 rounded bg-muted/50 animate-pulse" />
                </div>
              ) : data && data.nodes.length > 0 ? (
                <div className="bg-card border border-border rounded-lg overflow-hidden">
                  {/* Toolbar */}
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-semibold">{t('canvas.title')}</span>
                      <Badge variant="outline" className="text-[11px] gap-1">
                        <Route className="w-3 h-3" />
                        {t('canvas.routesCount', { count: routes.length })}
                      </Badge>
                    </div>
                    <span className="text-[11px] font-mono text-muted-foreground px-2 py-0.5 bg-muted rounded">Zoom: 100%</span>
                  </div>

                  {/* Stage Pipeline — dot grid background */}
                  <div className="p-6" style={{ backgroundImage: 'radial-gradient(circle, hsl(var(--border)) 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
                    <div className="flex gap-4 overflow-x-auto pb-2">
                      {STAGE_ORDER.map(stage => {
                        const stageNodes = data.nodes.filter(n => n.stage === stage);
                        if (stageNodes.length === 0) return null;
                        const isActive = activePath?.nodeIds.some(id => nodeMap.get(id)?.stage === stage);
                        return (
                          <div key={stage} className="min-w-[200px] flex-1">
                            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-2">
                              {stageMeta[stage].title}
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{stageNodes.length}</span>
                            </div>
                            <div className="space-y-2">
                              {stageNodes.map(node => {
                                const isSelected = node.id === selectedNodeId;
                                const isInPath = activePath?.nodeIds.includes(node.id);
                                return (
                                  <button key={node.id} onClick={() => selectNodeAndSyncPath(node.id)}
                                    className={cn(
                                      'w-full text-left rounded-lg border p-3 transition-all',
                                      isSelected ? 'border-primary bg-primary/10 shadow-[0_0_0_3px_rgba(67,56,202,0.1)]'
                                        : isInPath ? 'border-primary/30 bg-primary/5'
                                        : 'border-border bg-card hover:border-border-strong hover:shadow-sm'
                                    )}>
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-muted-foreground">{getNodeIcon(node)}</span>
                                      <span className={cn('text-[13px] font-medium truncate', isSelected && 'text-primary')}>{node.label || node.name}</span>
                                    </div>
                                    <div className="font-mono text-[11px] text-muted-foreground truncate">{node.name}</div>
                                    {node.badge && (
                                      <span className="inline-block mt-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">{node.badge}</span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Route Paths — compact horizontal flows */}
                  {data.paths.length > 0 && (
                    <div className="border-t border-border p-4 space-y-2">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">{t('routesPanel.title')}</div>
                      {data.paths.map(path => (
                        <button key={path.id}
                          onClick={() => selectPath({id: path.id, title: path.title, nodeIds: path.nodeIds, isPrimary: path.isPrimary})}
                          className={cn(
                            'w-full text-left rounded-lg border p-3 transition-all',
                            path.id === selectedPathId ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/30'
                          )}>
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="text-[13px] font-medium">{path.title}</span>
                            <div className="flex items-center gap-1.5">
                              {path.isPrimary && <Badge className="text-[10px] h-5">{t('routesPanel.primary')}</Badge>}
                              <Badge variant="outline" className="text-[10px] h-5">{t('routesPanel.hops', { count: 'hopDepth' in path ? path.hopDepth : path.nodeIds.length })}</Badge>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {path.nodeIds.map((id, i) => {
                              const node = nodeMap.get(id);
                              return (
                                <React.Fragment key={id}>
                                  <span className={cn('text-[11px] font-mono px-1.5 py-0.5 rounded',
                                    id === selectedNodeId ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground')}>
                                    {node?.label || node?.name || id}
                                  </span>
                                  {i < path.nodeIds.length - 1 && <ArrowRight className="w-3 h-3 text-muted-foreground/50" />}
                                </React.Fragment>
                              );
                            })}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-card border border-dashed border-border rounded-lg flex flex-col items-center justify-center py-16">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Search className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <div className="text-lg font-medium mb-1">{t('empty.title')}</div>
                  <div className="text-sm text-muted-foreground text-center max-w-sm">{t('empty.description')}</div>
                </div>
              )}
            </div>

            {/* Right: Inspector Panel */}
            <div className="w-[320px] min-w-[320px] space-y-4 sticky top-6">
              {selectedNode ? (
                <>
                  {/* Card 1: Node Info */}
                  <div className="bg-card border border-border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={cn('gap-1 border text-[10px]', stageMeta[selectedNode.stage].className)}>
                        {stageMeta[selectedNode.stage].title}
                      </Badge>
                      {selectedNode.badge && <Badge variant="outline" className="text-[10px]">{selectedNode.badge}</Badge>}
                    </div>
                    <div className="text-base font-semibold tracking-tight">{selectedNode.label || selectedNode.name}</div>
                    <div className="font-mono text-xs text-muted-foreground mt-0.5">{selectedNode.name}</div>
                    {selectedNode.description && (
                      <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{selectedNode.description}</p>
                    )}
                    {selectedNode.type && (
                      <div className="mt-3 rounded-lg overflow-hidden border border-border">
                        <div className="flex items-center px-2 py-1 border-b border-border bg-muted/60">
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-t bg-zinc-900 text-indigo-300">Type</span>
                        </div>
                        <pre className="font-mono text-[12px] bg-zinc-900 text-slate-200 p-2 overflow-auto">{selectedNode.type}</pre>
                      </div>
                    )}
                    <div className="flex gap-2 mt-3">
                      <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => handleOpenNodeWorkspace(selectedNode)}>
                        <ExternalLink className="w-3 h-3" />
                        {selectedNode.stage === 'metric' ? t('inspector.openMetrics') : t('inspector.openWorkspace')}
                      </Button>
                      <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => void handleCopyNodeName()}>
                        <Copy className="w-3 h-3" />
                        {t('inspector.copyNodeName')}
                      </Button>
                    </div>
                  </div>

                  {/* Card 2: Connected Nodes */}
                  <div className="bg-card border border-border rounded-lg p-4">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-3">{t('inspector.connectedNodes')}</div>
                    {/* Upstream */}
                    {selectedNodeRelations.upstream.length > 0 && (
                      <div className="mb-3">
                        <div className="text-[11px] text-muted-foreground mb-1.5 flex items-center gap-1">
                          <ArrowDown className="w-3 h-3" /> {t('inspector.upstream')}
                        </div>
                        <div className="space-y-1">
                          {selectedNodeRelations.upstream.map(({ edge, node }) => (
                            <button key={`${edge.id}-up`} onClick={() => selectNodeAndSyncPath(node.id)}
                              className="w-full flex items-center justify-between rounded-md border border-border px-2.5 py-1.5 hover:bg-muted/30 transition-colors text-left">
                              <div>
                                <div className="text-[12px] font-medium">{node.label || node.name}</div>
                                <div className="text-[10px] text-muted-foreground">{getEdgeKindLabel(edge.kind, t)}</div>
                              </div>
                              <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Downstream */}
                    {selectedNodeRelations.downstream.length > 0 && (
                      <div>
                        <div className="text-[11px] text-muted-foreground mb-1.5 flex items-center gap-1">
                          <ArrowUp className="w-3 h-3" /> {t('inspector.downstream')}
                        </div>
                        <div className="space-y-1">
                          {selectedNodeRelations.downstream.map(({ edge, node }) => (
                            <button key={`${edge.id}-down`} onClick={() => selectNodeAndSyncPath(node.id)}
                              className="w-full flex items-center justify-between rounded-md border border-border px-2.5 py-1.5 hover:bg-muted/30 transition-colors text-left">
                              <div>
                                <div className="text-[12px] font-medium">{node.label || node.name}</div>
                                <div className="text-[10px] text-muted-foreground">{getEdgeKindLabel(edge.kind, t)}</div>
                              </div>
                              <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {selectedNodeRelations.upstream.length === 0 && selectedNodeRelations.downstream.length === 0 && (
                      <div className="text-xs text-muted-foreground py-2">{t('inspector.noUpstream')}</div>
                    )}
                  </div>

                  {/* Card 3: Diagnostics */}
                  <div className="bg-card border border-border rounded-lg p-4">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-3">{t('tabs.diagnostics')}</div>
                    {dependencyDiagnostics.length === 0 ? (
                      <div className="flex items-center gap-2 text-xs">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span className="text-muted-foreground">{t('diagnostics.none')}</span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {dependencyDiagnostics.map(item => (
                          <div key={item.item} className={cn(
                            'flex items-start gap-2 text-xs rounded-md border p-2',
                            item.kind === 'referenced_metric_missing_semantic' ? 'border-amber-200 bg-amber-50/50 text-amber-800' : 'border-border text-muted-foreground'
                          )}>
                            {item.kind === 'referenced_metric_missing_semantic'
                              ? <TriangleAlert className="w-3.5 h-3.5 mt-0.5 text-amber-600 shrink-0" />
                              : <Info className="w-3.5 h-3.5 mt-0.5 text-muted-foreground shrink-0" />}
                            <span>{item.item}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="bg-card border border-dashed border-border rounded-lg flex flex-col items-center justify-center py-12">
                  <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-3">
                    <Layers3 className="w-7 h-7 text-muted-foreground" />
                  </div>
                  <div className="text-sm font-medium">{t('inspector.selectNode')}</div>
                  <div className="text-xs text-muted-foreground text-center mt-1 max-w-[200px]">{t('inspector.selectNodeDescription')}</div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default MetricLineagePage;
