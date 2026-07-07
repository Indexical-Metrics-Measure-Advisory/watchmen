import React from 'react';
import type { LineageStage, LineageNode, LineageEdge } from '@/model/metricLineage';
import {
  BarChart3,
  Binary,
  CheckCircle2,
  Database,
  GitBranch,
  Layers3,
  Network,
  TableProperties,
  TriangleAlert,
  Workflow,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const RECENT_METRICS_KEY = 'watchmen_metric_lineage_recent_metrics';

export const STAGE_ORDER: LineageStage[] = ['metric', 'semantic', 'topic', 'pipeline', 'source'];

// ---------------------------------------------------------------------------
// Storage helpers
// ---------------------------------------------------------------------------

export const getRecentMetricsStorageKey = (tenantId?: string | null): string =>
  tenantId ? `${RECENT_METRICS_KEY}:${tenantId}` : RECENT_METRICS_KEY;

export const clearLegacyRecentMetricsStorageKey = (): void => {
  localStorage.removeItem(RECENT_METRICS_KEY);
};

// ---------------------------------------------------------------------------
// Stage & status metadata builders
// ---------------------------------------------------------------------------

export const buildStageMeta = (t: (key: string, options?: any) => string): Record<LineageStage, { title: string; description: string; icon: React.ReactNode; className: string; accentClass: string }> => ({
  metric: {
    title: t('stage.metric.title'),
    description: t('stage.metric.description'),
    icon: <BarChart3 className="h-4 w-4" />,
    className: 'border-blue-200 bg-blue-50/70 text-blue-700',
    accentClass: 'from-blue-500/20 to-blue-500/5',
  },
  semantic: {
    title: t('stage.semantic.title'),
    description: t('stage.semantic.description'),
    icon: <GitBranch className="h-4 w-4" />,
    className: 'border-violet-200 bg-violet-50/70 text-violet-700',
    accentClass: 'from-violet-500/20 to-violet-500/5',
  },
  topic: {
    title: t('stage.topic.title'),
    description: t('stage.topic.description'),
    icon: <Network className="h-4 w-4" />,
    className: 'border-cyan-200 bg-cyan-50/70 text-cyan-700',
    accentClass: 'from-cyan-500/20 to-cyan-500/5',
  },
  pipeline: {
    title: t('stage.pipeline.title'),
    description: t('stage.pipeline.description'),
    icon: <Workflow className="h-4 w-4" />,
    className: 'border-orange-200 bg-orange-50/70 text-orange-700',
    accentClass: 'from-orange-500/20 to-orange-500/5',
  },
  source: {
    title: t('stage.source.title'),
    description: t('stage.source.description'),
    icon: <Database className="h-4 w-4" />,
    className: 'border-emerald-200 bg-emerald-50/70 text-emerald-700',
    accentClass: 'from-emerald-500/20 to-emerald-500/5',
  },
});

export const buildStatusMeta = (t: (key: string, options?: any) => string) => ({
  resolved: {
    label: t('status.resolved'),
    className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  partial: {
    label: t('status.partial'),
    className: 'border-amber-200 bg-amber-50 text-amber-700',
    icon: <TriangleAlert className="h-3.5 w-3.5" />,
  },
  unresolved: {
    label: t('status.unresolved'),
    className: 'border-muted bg-muted/60 text-muted-foreground',
    icon: <Binary className="h-3.5 w-3.5" />,
  },
} as const);

// ---------------------------------------------------------------------------
// Node / edge display helpers
// ---------------------------------------------------------------------------

export const getNodeIcon = (node: LineageNode) => {
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

export const getEdgeKindLabel = (kind: LineageEdge['kind'], t: (key: string, options?: any) => string): string =>
  t(`edgeKind.${kind}`, kind);

export const getMetricRoleLabel = (node: LineageNode, t: (key: string, options?: any) => string): string | null => {
  if (node.type === 'metric') return t('roles.requestedMetric');
  if (node.type === 'metric_ref') return t('roles.referencedMetric');
  return null;
};

// ---------------------------------------------------------------------------
// Diagnostics helper
// ---------------------------------------------------------------------------

export const getMetricDependencyDiagnostics = (diagnostics?: string[], referencedMetricNames: Set<string> = new Set()) => (
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
