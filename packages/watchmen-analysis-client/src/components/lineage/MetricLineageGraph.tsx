import React from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  MarkerType,
  type Node,
  type Edge,
  type NodeProps,
} from '@xyflow/react';
import { ChevronDown, ChevronRight, Search, TriangleAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { LineageNode, MetricLineageViewData } from '@/model/metricLineage';
import { buildStageMeta, getNodeIcon, STAGE_ORDER } from '@/utils/lineageHelpers';
import { cn } from '@/lib/utils';

// Deterministic lane layout: one column per stage, nodes stacked vertically.
const NODE_WIDTH = 220;
const COLUMN_GAP = 140;
const ROW_GAP = 96;
const LANE_HEADER_OFFSET = 72;

// Swimlane order left-to-right: source -> pipeline -> topic -> semantic -> metric
const COLUMN_ORDER = [...STAGE_ORDER].reverse();

type LineageNodeData = {
  lineageNode: LineageNode;
  stageClassName: string;
  dimmed: boolean;
  fieldCount?: number;
  fieldsExpanded?: boolean;
  fieldToggleLabel?: string;
  hiddenFieldsLabel?: string;
  onToggleFields?: () => void;
};
type LineageFlowNode = Node<LineageNodeData, 'lineageNode'>;
type LaneHeaderNode = Node<{ title: string; count: string }, 'laneHeader'>;
type MoreNode = Node<{ label: string; onClick?: () => void }, 'moreNode'>;
type GraphNode = LineageFlowNode | LaneHeaderNode | MoreNode;

const LineageNodeView = React.memo(function LineageNodeView({ data, selected }: NodeProps<LineageFlowNode>) {
  const { lineageNode, stageClassName, dimmed, fieldCount, fieldsExpanded, fieldToggleLabel, hiddenFieldsLabel, onToggleFields } = data;
  return (
    <div
      className={cn(
        'w-[220px] rounded-lg border px-3 py-2 shadow-sm transition-opacity',
        stageClassName,
        selected && 'ring-2 ring-primary ring-offset-1',
        dimmed && 'opacity-30'
      )}
    >
      <Handle type="target" position={Position.Left} className="!h-2 !w-2 !bg-muted-foreground/50" />
      <div className="flex items-center gap-2">
        <span className="shrink-0">{getNodeIcon(lineageNode)}</span>
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">{lineageNode.label || lineageNode.name}</div>
          <div className="truncate text-[11px] opacity-70">{lineageNode.name}</div>
        </div>
      </div>
      {!!fieldCount && fieldCount > 0 && (
        <button
          type="button"
          className="mt-1.5 flex w-full items-center gap-1 rounded border border-dashed px-1.5 py-0.5 text-[11px] opacity-80 transition-opacity hover:opacity-100"
          onClick={event => {
            event.stopPropagation();
            onToggleFields?.();
          }}
        >
          {fieldsExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          {fieldToggleLabel}
        </button>
      )}
      {hiddenFieldsLabel && (
        <div className="mt-1 text-[11px] opacity-70">{hiddenFieldsLabel}</div>
      )}
      <Handle type="source" position={Position.Right} className="!h-2 !w-2 !bg-muted-foreground/50" />
    </div>
  );
});

const LaneHeaderView = React.memo(function LaneHeaderView({ data }: NodeProps<LaneHeaderNode>) {
  return (
    <div className="flex w-[220px] items-center justify-between rounded-md border border-dashed bg-muted/50 px-3 py-1.5 text-xs font-medium">
      <span>{data.title}</span>
      <span className="text-muted-foreground">{data.count}</span>
    </div>
  );
});

// Aggregate chip shown at the bottom of a lane when its non-active-path nodes are collapsed
const MoreNodeView = React.memo(function MoreNodeView({ data }: NodeProps<MoreNode>) {
  return (
    <div className="flex w-[220px] cursor-pointer items-center justify-center rounded-md border border-dashed bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground">
      {data.label}
    </div>
  );
});

const nodeTypes = { lineageNode: LineageNodeView, laneHeader: LaneHeaderView, moreNode: MoreNodeView };

interface MetricLineageGraphProps {
  data: MetricLineageViewData | null;
  loading: boolean;
  activePathId: string | null;
  selectedNodeId: string | null;
  pathLoadingId?: string | null;
  diagnostics: string[];
  onSelectNode: (nodeId: string) => void;
  onSelectPath: (pathId: string) => void;
}

/** Read-only lineage flow graph: 5 stage swimlanes, active path highlighted */
const MetricLineageGraph: React.FC<MetricLineageGraphProps> = ({
  data,
  loading,
  activePathId,
  selectedNodeId,
  pathLoadingId,
  diagnostics,
  onSelectNode,
  onSelectPath,
}) => {
  const { t } = useTranslation('metricLineage');
  const stageMeta = React.useMemo(() => buildStageMeta(t), [t]);
  // Collapsed mode (default): only the active path is rendered, other paths'
  // nodes are folded into per-lane "+N more" chips to keep the graph readable
  // and the DOM small when lineage data is large.
  const [showAll, setShowAll] = React.useState(false);
  // Hierarchical folding: source fields are tucked into their source table node
  // and same-topic pipelines into an aggregate chip until explicitly expanded.
  const [expandedTables, setExpandedTables] = React.useState<ReadonlySet<string>>(new Set());
  const [expandedPipelineGroups, setExpandedPipelineGroups] = React.useState<ReadonlySet<string>>(new Set());
  React.useEffect(() => {
    setShowAll(false);
    setExpandedTables(new Set());
    setExpandedPipelineGroups(new Set());
  }, [data, activePathId]);

  // Table -> fields adjacency built from table-to-field edges.
  const { nodeMap, fieldIdsByTableId, parentTableByFieldId } = React.useMemo(() => {
    const nodeMap = new Map((data?.nodes || []).map(node => [node.id, node]));
    const fieldIdsByTableId = new Map<string, string[]>();
    const parentTableByFieldId = new Map<string, string>();
    (data?.edges || []).forEach(edge => {
      const fromNode = nodeMap.get(edge.from);
      const toNode = nodeMap.get(edge.to);
      if (fromNode?.type === 'source_table' && toNode?.type === 'source_field') {
        const fieldIds = fieldIdsByTableId.get(edge.from) || [];
        if (!fieldIds.includes(edge.to)) {
          fieldIds.push(edge.to);
        }
        fieldIdsByTableId.set(edge.from, fieldIds);
        parentTableByFieldId.set(edge.to, edge.from);
      }
    });
    return { nodeMap, fieldIdsByTableId, parentTableByFieldId };
  }, [data]);

  // Group keys for same-topic pipeline aggregation (all pipeline groups, ignoring path state).
  const allPipelineGroupKeys = React.useMemo(() => {
    if (!data) {
      return [] as string[];
    }
    const upstreamKeyByPipelineId = new Map<string, string>();
    data.edges.forEach(edge => {
      const fromNode = nodeMap.get(edge.from);
      const toNode = nodeMap.get(edge.to);
      if (fromNode?.stage === 'topic' && toNode?.type === 'pipeline') {
        upstreamKeyByPipelineId.set(edge.to, edge.from);
      }
    });
    const memberCountByKey = new Map<string, number>();
    data.nodes
      .filter(node => node.type === 'pipeline')
      .forEach(node => {
        const key = String(node.metadata?.topicId ?? upstreamKeyByPipelineId.get(node.id) ?? node.id);
        memberCountByKey.set(key, (memberCountByKey.get(key) || 0) + 1);
      });
    return Array.from(memberCountByKey.entries())
      .filter(([, count]) => count >= 2)
      .map(([key]) => key);
  }, [data, nodeMap]);

  const toggleSetValue = (set: ReadonlySet<string>, value: string): Set<string> => {
    const next = new Set(set);
    if (next.has(value)) {
      next.delete(value);
    } else {
      next.add(value);
    }
    return next;
  };

  const expandEverything = React.useCallback(() => {
    setShowAll(true);
    setExpandedTables(new Set(fieldIdsByTableId.keys()));
    setExpandedPipelineGroups(new Set(allPipelineGroupKeys));
  }, [fieldIdsByTableId, allPipelineGroupKeys]);

  const collapseToActivePath = React.useCallback(() => {
    setShowAll(false);
    setExpandedTables(new Set());
    setExpandedPipelineGroups(new Set());
  }, []);

  const { nodes, edges, collapsed } = React.useMemo(() => {
    if (!data) {
      return { nodes: [] as GraphNode[], edges: [] as Edge[], collapsed: false };
    }

    const activePath = data.paths.find(path => path.id === activePathId) || null;
    const activeNodeIds = activePath ? new Set(activePath.nodeIds) : null;
    const collapsed = !!activeNodeIds && !showAll;
    // Row index of each node within the active path, used to align the main flow
    const activePathOrder = new Map((activePath?.nodeIds || []).map((nodeId, index) => [nodeId, index]));
    const nodeStageById = new Map(data.nodes.map(node => [node.id, node.stage]));

    // Same-topic pipelines not on the active path collapse into one aggregate chip per topic.
    const pipelineGroupKeyById = new Map<string, string>();
    const pipelineGroupSizeByKey = new Map<string, number>();
    if (!collapsed) {
      const upstreamKeyByPipelineId = new Map<string, string>();
      data.edges.forEach(edge => {
        const fromNode = nodeMap.get(edge.from);
        const toNode = nodeMap.get(edge.to);
        if (fromNode?.stage === 'topic' && toNode?.type === 'pipeline') {
          upstreamKeyByPipelineId.set(edge.to, edge.from);
        }
      });
      const memberIdsByKey = new Map<string, string[]>();
      data.nodes
        .filter(node => node.type === 'pipeline' && !activeNodeIds?.has(node.id))
        .forEach(node => {
          const key = String(node.metadata?.topicId ?? upstreamKeyByPipelineId.get(node.id) ?? node.id);
          const memberIds = memberIdsByKey.get(key) || [];
          memberIds.push(node.id);
          memberIdsByKey.set(key, memberIds);
        });
      memberIdsByKey.forEach((memberIds, key) => {
        if (memberIds.length < 2 || expandedPipelineGroups.has(key)) {
          return;
        }
        pipelineGroupSizeByKey.set(key, memberIds.length);
        memberIds.forEach(id => pipelineGroupKeyById.set(id, key));
      });
    }

    const nodes: GraphNode[] = [];
    COLUMN_ORDER.forEach((stage, columnIndex) => {
      const stageNodes = data.nodes.filter(node => node.stage === stage);
      // Nodes on the active path come first, ordered by their position in the path,
      // so the main flow runs as straight lines with minimal edge crossings.
      const orderedStageNodes = [...stageNodes].sort((a, b) => {
        const aIndex = activePathOrder.get(a.id);
        const bIndex = activePathOrder.get(b.id);
        if (aIndex !== undefined && bIndex !== undefined) return aIndex - bIndex;
        if (aIndex !== undefined) return -1;
        if (bIndex !== undefined) return 1;
        return 0;
      });
      const candidateNodes = collapsed
        ? orderedStageNodes.filter(node => activeNodeIds.has(node.id))
        : orderedStageNodes;
      const candidateNodeIds = new Set(candidateNodes.map(node => node.id));

      // Fold source fields into their table and pipelines into aggregate chips.
      type RenderItem =
        | { kind: 'node'; node: LineageNode }
        | { kind: 'chip'; id: string; label: string; onClick: () => void };
      const renderItems: RenderItem[] = [];
      candidateNodes.forEach(node => {
        if (node.type === 'source_field' && parentTableByFieldId.has(node.id)) {
          // Rendered right after its table when the table is expanded.
          return;
        }
        const pipelineGroupKey = pipelineGroupKeyById.get(node.id);
        if (pipelineGroupKey) {
          const chipId = `pipeline-group-${pipelineGroupKey}`;
          if (!renderItems.some(item => item.kind === 'chip' && item.id === chipId)) {
            renderItems.push({
              kind: 'chip',
              id: chipId,
              label: t('graph.pipelinesCount', { count: pipelineGroupSizeByKey.get(pipelineGroupKey) || 0 }),
              onClick: () => setExpandedPipelineGroups(previous => new Set(previous).add(pipelineGroupKey)),
            });
          }
          return;
        }
        renderItems.push({ kind: 'node', node });
        if (node.type === 'source_table' && expandedTables.has(node.id)) {
          (fieldIdsByTableId.get(node.id) || []).forEach(fieldId => {
            const fieldNode = nodeMap.get(fieldId);
            if (fieldNode && candidateNodeIds.has(fieldId)) {
              renderItems.push({ kind: 'node', node: fieldNode });
            }
          });
        }
      });

      const renderedNodeCount = renderItems.filter(item => item.kind === 'node').length;
      nodes.push({
        id: `lane-${stage}`,
        type: 'laneHeader',
        position: { x: columnIndex * (NODE_WIDTH + COLUMN_GAP), y: -LANE_HEADER_OFFSET },
        data: {
          title: stageMeta[stage].title,
          count: collapsed ? `${renderedNodeCount}/${stageNodes.length}` : `${renderedNodeCount}`,
        },
        draggable: false,
        selectable: false,
      });
      let rowIndex = 0;
      renderItems.forEach(item => {
        if (item.kind === 'chip') {
          nodes.push({
            id: item.id,
            type: 'moreNode',
            position: { x: columnIndex * (NODE_WIDTH + COLUMN_GAP), y: rowIndex * ROW_GAP },
            data: { label: item.label, onClick: item.onClick },
            draggable: false,
            selectable: false,
          });
          rowIndex += 1;
          return;
        }
        const node = item.node;
        const tableFieldIds = node.type === 'source_table'
          ? (fieldIdsByTableId.get(node.id) || []).filter(fieldId => candidateNodeIds.has(fieldId))
          : [];
        const hiddenFieldCount = Number(node.metadata?.hiddenFieldCount ?? 0) || 0;
        nodes.push({
          id: node.id,
          type: 'lineageNode',
          position: { x: columnIndex * (NODE_WIDTH + COLUMN_GAP), y: rowIndex * ROW_GAP },
          data: {
            lineageNode: node,
            stageClassName: stageMeta[node.stage].className,
            dimmed: activeNodeIds ? !activeNodeIds.has(node.id) : false,
            fieldCount: tableFieldIds.length,
            fieldsExpanded: expandedTables.has(node.id),
            fieldToggleLabel: tableFieldIds.length > 0 ? t('graph.fieldsCount', { count: tableFieldIds.length }) : undefined,
            hiddenFieldsLabel: hiddenFieldCount > 0 ? t('graph.moreFields', { count: hiddenFieldCount }) : undefined,
            onToggleFields: tableFieldIds.length > 0
              ? () => setExpandedTables(previous => toggleSetValue(previous, node.id))
              : undefined,
          },
          selected: node.id === selectedNodeId,
        });
        rowIndex += 1;
      });
      const hiddenCount = stageNodes.length - renderedNodeCount;
      if (collapsed && hiddenCount > 0) {
        nodes.push({
          id: `more-${stage}`,
          type: 'moreNode',
          position: {
            x: columnIndex * (NODE_WIDTH + COLUMN_GAP),
            y: rowIndex * ROW_GAP,
          },
          data: { label: t('graph.moreNodes', { count: hiddenCount }), onClick: expandEverything },
          draggable: false,
          selectable: false,
        });
      }
    });

    const renderedNodeIds = new Set(nodes.map(node => node.id));
    const edges: Edge[] = data.edges
      .filter(edge => {
        if (!renderedNodeIds.has(edge.from) || !renderedNodeIds.has(edge.to)) {
          return false;
        }
        // collapsed mode renders the active path's edges only
        return !collapsed || !edge.pathId || edge.pathId === activePath?.id;
      })
      .map(edge => {
        const isActive = !activePath || edge.pathId === activePath.id;
        // Data edges point from the metric towards its sources (right to left in the
        // lane layout). Normalize the visual direction so a line always leaves the
        // right handle of the left-side node and enters the left handle of the
        // right-side node — no looping lines that swing around a node.
        const fromColumn = COLUMN_ORDER.indexOf(nodeStageById.get(edge.from) ?? 'metric');
        const toColumn = COLUMN_ORDER.indexOf(nodeStageById.get(edge.to) ?? 'metric');
        const [source, target] = fromColumn <= toColumn ? [edge.from, edge.to] : [edge.to, edge.from];
        return {
          id: edge.id,
          source,
          target,
          type: 'smoothstep',
          markerEnd: { type: MarkerType.ArrowClosed, color: isActive ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))' },
          style: isActive
            ? { stroke: 'hsl(var(--primary))', strokeWidth: 2 }
            : { stroke: 'hsl(var(--muted-foreground))', opacity: 0.15 },
        };
      });

    return { nodes, edges, collapsed };
  }, [data, activePathId, selectedNodeId, stageMeta, showAll, expandedTables, expandedPipelineGroups, nodeMap, fieldIdsByTableId, parentTableByFieldId, expandEverything, t]);

  return (
    <div className="space-y-3">
      {diagnostics.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-3">
          <div className="flex items-center gap-2 text-sm font-medium text-amber-900">
            <TriangleAlert className="h-4 w-4" />
            {t('graph.diagnosticsTitle')}
          </div>
          <ul className="mt-2 list-disc space-y-1 pl-6 text-xs text-amber-800/90">
            {diagnostics.map(item => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {data && (data.paths.length + (data.pathSummaries?.length || 0)) > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          {data.paths.map(path => (
            <button
              key={path.id}
              type="button"
              onClick={() => {
                collapseToActivePath();
                onSelectPath(path.id);
              }}
              className={cn(
                'rounded-full border px-3 py-1 text-xs transition-colors',
                path.id === activePathId
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border/60 bg-background hover:bg-muted'
              )}
            >
              {path.title}
            </button>
          ))}
          {(data.pathSummaries || []).map(summary => (
            <button
              key={summary.id}
              type="button"
              disabled={pathLoadingId === summary.id}
              onClick={() => {
                collapseToActivePath();
                onSelectPath(summary.id);
              }}
              className={cn(
                'rounded-full border border-dashed px-3 py-1 text-xs transition-colors',
                'border-border/60 bg-background text-muted-foreground hover:bg-muted hover:text-foreground',
                pathLoadingId === summary.id && 'cursor-wait opacity-50'
              )}
            >
              {summary.title} · {t('graph.pathNodeCount', { count: summary.nodeCount })}
            </button>
          ))}
          {activePathId && (
            <button
              type="button"
              onClick={() => (showAll ? collapseToActivePath() : expandEverything())}
              className={cn(
                'rounded-full border border-dashed px-3 py-1 text-xs transition-colors',
                showAll
                  ? 'border-primary/60 text-primary hover:bg-primary/5'
                  : 'border-border/60 text-muted-foreground hover:bg-muted'
              )}
            >
              {showAll ? t('graph.showActivePathOnly') : t('graph.showAll')}
            </button>
          )}
        </div>
      )}

      <div className="relative h-[560px] overflow-hidden rounded-xl border bg-muted/10">
        {loading ? (
          <div className="absolute inset-0 space-y-4 p-6">
            <div className="h-8 w-56 animate-pulse rounded-lg bg-muted" />
            <div className="grid grid-cols-5 gap-8">
              {[0, 1, 2, 3, 4].map(column => (
                <div key={column} className="space-y-4">
                  <div className="h-6 animate-pulse rounded bg-muted/80" />
                  <div className="h-14 animate-pulse rounded-lg bg-muted/60" />
                  <div className="h-14 animate-pulse rounded-lg bg-muted/40" />
                </div>
              ))}
            </div>
          </div>
        ) : !data || data.nodes.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <div className="rounded-full border bg-background p-4 shadow-sm">
              <Search className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="mt-4 text-lg font-medium">{t('empty.title')}</div>
            <div className="mt-2 max-w-md text-sm text-muted-foreground">{t('empty.description')}</div>
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodeClick={(_, node) => {
              if (node.type === 'lineageNode') {
                onSelectNode(node.id);
              } else if (node.type === 'moreNode') {
                const handler = (node.data as { onClick?: () => void }).onClick;
                if (handler) {
                  handler();
                } else {
                  expandEverything();
                }
              }
            }}
            nodesDraggable={false}
            nodesConnectable={false}
            fitView
            fitViewOptions={collapsed ? { padding: 0.2, maxZoom: 1 } : { padding: 0.1 }}
            minZoom={0.2}
            onlyRenderVisibleElements
            attributionPosition="bottom-right"
          >
            <Background gap={16} />
            <Controls showInteractive={false} />
          </ReactFlow>
        )}
      </div>
    </div>
  );
};

export default MetricLineageGraph;
