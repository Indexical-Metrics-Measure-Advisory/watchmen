import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Box, Download, Info, Network, RefreshCw, Workflow } from 'lucide-react';
import { Button, Card, PageHeader, SectionHeader } from '@/components/ui';
import { useTaskHub } from '@/context/TaskHubContext';
import { formatRows } from '@/lib/utils';
import type { TaskDefinition, TaskDependency } from '@/model';

const NODE_WIDTH = 170;
const NODE_HEIGHT = 70;
const COLUMN_GAP = 215;
const ROW_GAP = 120;

interface BuildMapNode {
  id: string;
  label: string;
  sub: string;
  detail: string;
  x: number;
  y: number;
  kind: 'asset' | 'task';
}

interface BuildMapEdge {
  id: string;
  sourceId: string;
  targetId: string;
  dependency: boolean;
}

const buildMapGraph = (tasks: TaskDefinition[], dependencies: TaskDependency[]) => {
  const nodeMap = new Map<string, BuildMapNode>();
  tasks.forEach((task) => {
    nodeMap.set(task.id, { id: task.id, label: task.name, sub: task.type.replace(/_/g, ' ').toUpperCase(), detail: task.engine, x: 0, y: 0, kind: 'task' });
    task.refs.forEach((ref) => {
      if (!nodeMap.has(ref.id)) {
        nodeMap.set(ref.id, { id: ref.id, label: ref.name, sub: ref.type.replace(/_/g, ' ').toUpperCase(), detail: ref.role, x: 0, y: 0, kind: 'asset' });
      }
    });
  });

  const edges: BuildMapEdge[] = [];
  const edgeKeys = new Set<string>();
  const addEdge = (sourceId: string, targetId: string, dependency: boolean) => {
    const key = `${sourceId}->${targetId}:${dependency}`;
    if (!nodeMap.has(sourceId) || !nodeMap.has(targetId) || edgeKeys.has(key)) return;
    edgeKeys.add(key);
    edges.push({ id: key, sourceId, targetId, dependency });
  };
  tasks.forEach((task) => task.refs.forEach((ref) => {
    addEdge(ref.role === 'SOURCE' ? ref.id : task.id, ref.role === 'SOURCE' ? task.id : ref.id, false);
  }));
  dependencies
    .filter((dependency) => dependency.status === 'ACCEPTED' && dependency.enabled)
    .forEach((dependency) => addEdge(dependency.upstreamTaskId, dependency.downstreamTaskId, true));

  const nodes = Array.from(nodeMap.values());
  const levels = new Map(nodes.map((node) => [node.id, 0]));
  const indegrees = new Map(nodes.map((node) => [node.id, 0]));
  const dataEdges = edges.filter((edge) => !edge.dependency);
  const outgoing = new Map<string, BuildMapEdge[]>();
  dataEdges.forEach((edge) => {
    indegrees.set(edge.targetId, (indegrees.get(edge.targetId) ?? 0) + 1);
    outgoing.set(edge.sourceId, [...(outgoing.get(edge.sourceId) ?? []), edge]);
  });
  const queue = nodes.filter((node) => indegrees.get(node.id) === 0).map((node) => node.id);
  const visited = new Set<string>();
  for (let index = 0; index < queue.length; index += 1) {
    const sourceId = queue[index];
    visited.add(sourceId);
    (outgoing.get(sourceId) ?? []).forEach((edge) => {
      levels.set(edge.targetId, Math.max(levels.get(edge.targetId) ?? 0, (levels.get(sourceId) ?? 0) + 1));
      const indegree = (indegrees.get(edge.targetId) ?? 0) - 1;
      indegrees.set(edge.targetId, indegree);
      if (indegree === 0) queue.push(edge.targetId);
    });
  }
  const rows = new Map<number, number>();
  nodes.forEach((node) => {
    const level = visited.has(node.id) ? levels.get(node.id) ?? 0 : 0;
    const row = rows.get(level) ?? 0;
    node.x = 25 + level * COLUMN_GAP;
    node.y = 55 + row * ROW_GAP;
    rows.set(level, row + 1);
  });
  const columnCount = Math.max(...Array.from(levels.values()), 0) + 1;
  const rowCount = Math.max(...rows.values(), 0);
  return {
    nodes,
    edges,
    width: Math.max(1080, 50 + columnCount * COLUMN_GAP),
    height: Math.max(490, 110 + rowCount * ROW_GAP)
  };
};

export default function BuildMapPage() {
  const { tasks, assets, dependencies } = useTaskHub();
  const { t } = useTranslation();
  const [selectedId, setSelectedId] = useState<string>();
  const [showDependencies, setShowDependencies] = useState(true);
  const { nodes, edges, width, height } = useMemo(() => buildMapGraph(tasks, dependencies), [tasks, dependencies]);
  const { nodeById, taskById, assetById, refById } = useMemo(() => {
    const tasksById = new Map(tasks.map((task) => [task.id, task]));
    const refsById = new Map<string, TaskDefinition['refs'][number]>();
    tasks.forEach((task) => task.refs.forEach((ref) => { if (!refsById.has(ref.id)) refsById.set(ref.id, ref); }));
    return {
      nodeById: new Map(nodes.map((node) => [node.id, node])),
      taskById: tasksById,
      assetById: new Map(assets.map((asset) => [asset.id, asset])),
      refById: refsById
    };
  }, [nodes, tasks, assets]);
  const visibleEdges = useMemo(() => showDependencies ? edges : edges.filter((edge) => !edge.dependency), [edges, showDependencies]);
  const selectedNodeId = nodes.some((node) => node.id === selectedId) ? selectedId : nodes[0]?.id;
  const selectedAsset = assetById.get(selectedNodeId ?? '');
  const selectedTask = taskById.get(selectedNodeId ?? '');
  const selectedRef = refById.get(selectedNodeId ?? '');

  return (
    <div className="page-container">
      <PageHeader title={t('数据构建地图')} description={t('资产节点与构建任务同图呈现；实线为数据读写，虚线为跨任务编排依赖')}
        actions={<><Button variant={showDependencies ? 'primary' : 'outline'} size="sm" onClick={() => setShowDependencies((value) => !value)}><Network className="h-3.5 w-3.5" />{t('编排依赖')}</Button><Button variant="outline" size="sm"><Download className="h-3.5 w-3.5" />{t('导出 SVG')}</Button><Button variant="outline" size="icon"><RefreshCw className="h-4 w-4" /></Button></>} />
      <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_310px]">
        <Card className="min-w-0 overflow-hidden">
          <SectionHeader title={t('客户与订单构建链路')} description={t('点击节点查看资产卡片或任务详情')} action={<div className="flex gap-3 text-[10px] text-muted-foreground"><span className="flex items-center gap-1"><i className="h-0.5 w-4 bg-blue-400" />{t('数据边')}</span><span className="flex items-center gap-1"><i className="h-0.5 w-4 border-t border-dashed border-violet-400" />{t('编排边')}</span></div>} />
          <div className="graph-grid overflow-auto"><svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height, minWidth: Math.max(1000, width) }} role="img" aria-label="Data asset build map"><defs><marker id="map-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#7fa6c9" /></marker><marker id="map-arrow-violet" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#a78bfa" /></marker></defs>
            {visibleEdges.map((edge) => {
              const source = nodeById.get(edge.sourceId)!;
              const target = nodeById.get(edge.targetId)!;
              const x1 = source.x + NODE_WIDTH; const y1 = source.y + NODE_HEIGHT / 2; const x2 = target.x; const y2 = target.y + NODE_HEIGHT / 2; const mid = (x1 + x2) / 2;
              return <path key={edge.id} d={`M${x1} ${y1} H${mid} V${y2} H${x2 - 4}`} fill="none" stroke={edge.dependency ? '#a78bfa' : '#7fa6c9'} strokeWidth={edge.dependency ? 1.5 : 1.8} strokeDasharray={edge.dependency ? '6 5' : undefined} markerEnd={`url(#${edge.dependency ? 'map-arrow-violet' : 'map-arrow'})`} opacity={edge.dependency ? 0.85 : 0.7} />;
            })}
            {nodes.map((node) => {
              const selected = selectedNodeId === node.id;
              return <g key={node.id} transform={`translate(${node.x},${node.y})`} className="cursor-pointer" onClick={() => setSelectedId(node.id)}><rect width={NODE_WIDTH} height={NODE_HEIGHT} rx="10" fill="#fff" stroke={selected ? '#2492ff' : node.kind === 'task' ? '#c4b5fd' : '#bfdbfe'} strokeWidth={selected ? 2 : 1.2} filter="drop-shadow(0 3px 5px rgba(15,23,42,.05))" /><circle cx="18" cy="20" r="7" fill={node.kind === 'task' ? '#f3e8ff' : '#eff6ff'} /><circle cx="18" cy="20" r="3" fill={node.kind === 'task' ? '#8b5cf6' : '#3b82f6'} /><text x="32" y="24" fontSize="11" fontWeight="600" fill="#1e293b">{node.label.length > 20 ? `${node.label.slice(0, 20)}…` : node.label}</text><text x="16" y="47" fontSize="9" fill="#94a3b8">{node.sub}</text><text x="16" y="61" fontSize="9" fill="#64748b">{node.detail}</text></g>;
            })}
          </svg></div>
        </Card>
        <Card className="h-fit">
          <SectionHeader title={selectedAsset || selectedRef ? t('资产构建卡片') : t('任务节点')} description={selectedNodeId} />
          <div className="p-5">
            {selectedAsset && <><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><Box className="h-5 w-5" /></div><h2 className="mt-3 break-all text-lg font-semibold">{selectedAsset.name}</h2><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{selectedAsset.description}</p><dl className="mt-5 space-y-3 border-y py-4 text-xs"><div className="flex justify-between"><dt className="text-muted-foreground">{t('资产类型')}</dt><dd>{selectedAsset.type}</dd></div><div className="flex justify-between"><dt className="text-muted-foreground">{t('数据行数')}</dt><dd>{formatRows(selectedAsset.rowCount)}</dd></div><div className="flex justify-between"><dt className="text-muted-foreground">{t('责任人')}</dt><dd>{selectedAsset.owner}</dd></div><div className="flex justify-between"><dt className="text-muted-foreground">{t('最近构建')}</dt><dd>{selectedAsset.lastBuiltAt?.slice(11, 16) ?? '—'}</dd></div></dl><div className="mt-4"><div className="mb-2 text-xs font-medium">{t('构建者')}</div>{selectedAsset.builderTaskIds.length === 0 ? <span className="text-xs text-muted-foreground">{t('外部资产，无平台内构建者')}</span> : selectedAsset.builderTaskIds.map((id) => <Link key={id} to={`/tasks/${id}`} className="mb-2 flex items-center gap-2 rounded-lg border p-2.5 text-xs hover:border-primary/40"><Workflow className="h-3.5 w-3.5 text-violet-500" />{taskById.get(id)?.name}</Link>)}</div><Link to="/assets" className="mt-4 block text-center text-xs font-medium text-primary hover:underline">{t('打开完整资产视图 →')}</Link></>}
            {!selectedAsset && selectedRef && <><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><Box className="h-5 w-5" /></div><h2 className="mt-3 break-all text-lg font-semibold">{selectedRef.name}</h2><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{selectedRef.type} · {selectedRef.role}</p><dl className="mt-5 border-y py-4 text-xs"><div className="flex justify-between"><dt className="text-muted-foreground">{t('资产类型')}</dt><dd>{selectedRef.type}</dd></div></dl><Link to="/assets" className="mt-4 block text-center text-xs font-medium text-primary hover:underline">{t('打开完整资产视图 →')}</Link></>}
            {selectedTask && <><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50 text-violet-600"><Workflow className="h-5 w-5" /></div><h2 className="mt-3 text-lg font-semibold">{selectedTask.name}</h2><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{selectedTask.description}</p><div className="mt-4 text-xs font-medium text-slate-600">{selectedTask.engine} · {selectedTask.type}</div><div className="mt-4 space-y-2 text-xs"><div className="flex justify-between"><span className="text-muted-foreground">{t('调度')}</span><span>{selectedTask.schedule.frequency} · {selectedTask.schedule.timeOfDay ?? selectedTask.schedule.cronExpression ?? selectedTask.schedule.intervalMinutes ?? '—'}</span></div><div className="flex justify-between"><span className="text-muted-foreground">{t('责任人')}</span><span>{selectedTask.owner}</span></div></div><Link to={`/tasks/${selectedTask.id}`} className="mt-5 block rounded-md border py-2 text-center text-xs font-medium text-primary hover:bg-blue-50">{t('查看任务详情')}</Link></>}
          </div>
        </Card>
      </div>
      <div className="flex items-start gap-2 text-[11px] leading-relaxed text-muted-foreground"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />{t('资产身份按 tenant + refType + 规范 targetId 匹配；source_table 必须包含数据源、schema 和表名，跨数据源同名表不会自动连边。')}</div>
    </div>
  );
}
