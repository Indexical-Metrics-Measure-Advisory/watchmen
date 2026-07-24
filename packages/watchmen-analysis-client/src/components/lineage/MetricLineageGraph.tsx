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
import { Search, TriangleAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { LineageNode, LineagePath, MetricLineageViewData } from '@/model/metricLineage';
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
};
type LineageFlowNode = Node<LineageNodeData, 'lineageNode'>;
type LaneHeaderNode = Node<{ title: string; count: number }, 'laneHeader'>;
type GraphNode = LineageFlowNode | LaneHeaderNode;

const LineageNodeView = ({ data, selected }: NodeProps<LineageFlowNode>) => {
  const { lineageNode, stageClassName, dimmed } = data;
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
      <Handle type="source" position={Position.Right} className="!h-2 !w-2 !bg-muted-foreground/50" />
    </div>
  );
};

const LaneHeaderView = ({ data }: NodeProps<LaneHeaderNode>) => (
  <div className="flex w-[220px] items-center justify-between rounded-md border border-dashed bg-muted/50 px-3 py-1.5 text-xs font-medium">
    <span>{data.title}</span>
    <span className="text-muted-foreground">{data.count}</span>
  </div>
);

const nodeTypes = { lineageNode: LineageNodeView, laneHeader: LaneHeaderView };

interface MetricLineageGraphProps {
  data: MetricLineageViewData | null;
  loading: boolean;
  activePathId: string | null;
  selectedNodeId: string | null;
  diagnostics: string[];
  onSelectNode: (nodeId: string) => void;
  onSelectPath: (path: LineagePath) => void;
}

/** Read-only lineage flow graph: 5 stage swimlanes, active path highlighted */
const MetricLineageGraph: React.FC<MetricLineageGraphProps> = ({
  data,
  loading,
  activePathId,
  selectedNodeId,
  diagnostics,
  onSelectNode,
  onSelectPath,
}) => {
  const { t } = useTranslation('metricLineage');
  const stageMeta = React.useMemo(() => buildStageMeta(t), [t]);

  const { nodes, edges } = React.useMemo(() => {
    if (!data) {
      return { nodes: [] as GraphNode[], edges: [] as Edge[] };
    }

    const activePath = data.paths.find(path => path.id === activePathId) || null;
    const activeNodeIds = activePath ? new Set(activePath.nodeIds) : null;
    // Row index of each node within the active path, used to align the main flow
    const activePathOrder = new Map((activePath?.nodeIds || []).map((nodeId, index) => [nodeId, index]));
    const nodeStageById = new Map(data.nodes.map(node => [node.id, node.stage]));

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
      nodes.push({
        id: `lane-${stage}`,
        type: 'laneHeader',
        position: { x: columnIndex * (NODE_WIDTH + COLUMN_GAP), y: -LANE_HEADER_OFFSET },
        data: { title: stageMeta[stage].title, count: stageNodes.length },
        draggable: false,
        selectable: false,
      });
      orderedStageNodes.forEach((node, rowIndex) => {
        nodes.push({
          id: node.id,
          type: 'lineageNode',
          position: { x: columnIndex * (NODE_WIDTH + COLUMN_GAP), y: rowIndex * ROW_GAP },
          data: {
            lineageNode: node,
            stageClassName: stageMeta[node.stage].className,
            dimmed: activeNodeIds ? !activeNodeIds.has(node.id) : false,
          },
          selected: node.id === selectedNodeId,
        });
      });
    });

    const edges: Edge[] = data.edges.map(edge => {
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

    return { nodes, edges };
  }, [data, activePathId, selectedNodeId, stageMeta]);

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

      {data && data.paths.length > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          {data.paths.map(path => (
            <button
              key={path.id}
              type="button"
              onClick={() => onSelectPath(path)}
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
              }
            }}
            nodesDraggable={false}
            nodesConnectable={false}
            fitView
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
