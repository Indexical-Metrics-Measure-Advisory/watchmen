import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
	ReactFlow,
	Background,
	Controls,
	MiniMap,
	Node,
	Edge,
	Handle,
	Position,
	useNodesState,
	useEdgesState,
	MarkerType
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select';
import {
	Loader2,
	Play,
	RefreshCw,
	Workflow
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import type { FlowGraph, MaterializationFlow, MaterializationRunStatus } from '@/model/materialization';
import { materializationService } from '@/services/materializationService';

// Deterministic rank layout for the flow DAG (same approach as MetricDependencyTree)
const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
	const nodeWidth = 280;
	const nodeHeight = 140;
	const rankSep = 100;
	const nodeSep = 50;

	const incomingCount: Record<string, number> = {};
	const childrenMap: Record<string, string[]> = {};

	nodes.forEach((n) => {
		incomingCount[n.id] = 0;
		childrenMap[n.id] = [];
	});

	edges.forEach((e) => {
		if (incomingCount[e.target] !== undefined) {
			incomingCount[e.target]++;
		}
		if (childrenMap[e.source]) {
			childrenMap[e.source].push(e.target);
		}
	});

	const roots = nodes.filter((n) => incomingCount[n.id] === 0).map((n) => n.id);
	if (roots.length === 0 && nodes.length > 0) {
		roots.push(nodes[0].id);
	}

	const levels: string[][] = [];
	const visited = new Set<string>();

	let currentLevel = [...roots];
	while (currentLevel.length > 0) {
		levels.push(currentLevel);
		currentLevel.forEach((id) => visited.add(id));

		const nextLevel = new Set<string>();
		currentLevel.forEach((id) => {
			childrenMap[id].forEach((childId) => {
				if (!visited.has(childId)) {
					nextLevel.add(childId);
				}
			});
		});
		currentLevel = Array.from(nextLevel);
	}

	// any unvisited (disconnected) nodes go on a final level
	const leftovers = nodes.map((n) => n.id).filter((id) => !visited.has(id));
	if (leftovers.length > 0) {
		levels.push(leftovers);
	}

	const layoutedNodes = nodes.map((node) => {
		let levelIndex = levels.findIndex((level) => level.includes(node.id));
		if (levelIndex === -1) {
			levelIndex = 0;
		}
		const levelNodes = levels[levelIndex];
		const indexInLevel = levelNodes.indexOf(node.id);
		const levelWidth = levelNodes.length * nodeWidth + (levelNodes.length - 1) * nodeSep;
		const x = indexInLevel * (nodeWidth + nodeSep) - levelWidth / 2;
		const y = levelIndex * (nodeHeight + rankSep);
		return { ...node, position: { x, y } };
	});

	return { nodes: layoutedNodes, edges };
};

interface FlowNodeData {
	label: string;
	metricName: string;
	targetTopicName?: string;
	status?: MaterializationRunStatus;
	t: (key: string, options?: Record<string, unknown>) => string;
}

const statusBadgeClass: Record<MaterializationRunStatus, string> = {
	PENDING: 'bg-slate-100 text-slate-700 border-slate-300',
	RUNNING: 'bg-amber-100 text-amber-800 border-amber-300',
	SUCCESS: 'bg-emerald-100 text-emerald-800 border-emerald-300',
	FAILED: 'bg-rose-100 text-rose-800 border-rose-300'
};

const MaterializationNode = ({ data }: { data: FlowNodeData }) => (
	<div className="relative group">
		<Handle type="target" position={Position.Top} className="w-3 h-3 bg-muted-foreground !-top-1.5" />
		<Card className="w-[280px] shadow-md border-border bg-card hover:border-primary/50 transition-colors">
			<CardHeader className="p-4 pb-1">
				<div className="flex items-start justify-between gap-2">
					<CardTitle className="text-sm font-medium truncate" title={data.label}>
						{data.label}
					</CardTitle>
					{data.status && (
						<Badge
							variant="outline"
							className={`text-[10px] h-5 shrink-0 ${statusBadgeClass[data.status]}`}
						>
							{data.t(`materialization:runStatus.${data.status}`)}
						</Badge>
					)}
				</div>
			</CardHeader>
			<CardContent className="p-4 pt-0 space-y-1">
				<div className="text-xs font-mono text-muted-foreground truncate" title={data.metricName}>
					{data.metricName}
				</div>
				{data.targetTopicName && (
					<div className="text-xs text-muted-foreground truncate">
						<span className="mr-1">→</span>
						<span className="font-mono">{data.targetTopicName}</span>
					</div>
				)}
			</CardContent>
		</Card>
		<Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-muted-foreground !-bottom-1.5" />
	</div>
);

const nodeTypes = { materializationNode: MaterializationNode };

const edgeKindColor: Record<string, string> = {
	data: '#3b82f6',
	metricRef: '#8b5cf6',
	manual: '#94a3b8'
};

const ComputeFlow: React.FC = () => {
	const { t } = useTranslation(['common', 'materialization']);
	const { toast } = useToast();

	const [flows, setFlows] = useState<MaterializationFlow[]>([]);
	const [selectedFlowId, setSelectedFlowId] = useState<string>('');
	const [graph, setGraph] = useState<FlowGraph | null>(null);
	const [loading, setLoading] = useState(true);
	const [running, setRunning] = useState(false);
	const [nodes, setNodes, onNodesChange] = useNodesState([]);
	const [edges, setEdges, onEdgesChange] = useEdgesState([]);

	useEffect(() => {
		let alive = true;
		materializationService
			.listFlows()
			.then((list) => {
				if (!alive) {
					return;
				}
				setFlows(list);
				if (list.length > 0) {
					setSelectedFlowId(list[0].flowId);
				}
			})
			.catch((error) => {
				toast({
					title: t('materialization:flow.loadFailed'),
					description: error instanceof Error ? error.message : String(error),
					variant: 'destructive'
				});
			})
			.finally(() => {
				if (alive) {
					setLoading(false);
				}
			});
		return () => {
			alive = false;
		};
	}, [toast, t]);

	const loadGraph = useCallback(
		async (flowId: string) => {
			if (!flowId) {
				return;
			}
			setLoading(true);
			try {
				const g = await materializationService.getFlowGraph(flowId);
				setGraph(g);

				const newNodes: Node[] = g.nodes.map((n) => ({
					id: n.id,
					type: 'materializationNode',
					data: {
						label: n.label,
						metricName: n.metricName,
						targetTopicName: n.targetTopicName,
						status: n.status,
						t
					},
					position: { x: 0, y: 0 }
				}));
				const newEdges: Edge[] = g.edges.map((e) => ({
					id: e.id,
					source: e.source,
					target: e.target,
					label: e.label,
					animated: e.edgeKind !== 'manual',
					style: {
						stroke: edgeKindColor[e.edgeKind] ?? '#94a3b8',
						strokeWidth: 2,
						...(e.edgeKind === 'manual' ? { strokeDasharray: '5,5' } : {})
					},
					markerEnd: {
						type: MarkerType.ArrowClosed,
						color: edgeKindColor[e.edgeKind] ?? '#94a3b8'
					}
				}));

				const layouted = getLayoutedElements(newNodes, newEdges);
				setNodes(layouted.nodes);
				setEdges(layouted.edges);
			} catch (error) {
				toast({
					title: t('materialization:flow.loadFailed'),
					description: error instanceof Error ? error.message : String(error),
					variant: 'destructive'
				});
				setGraph(null);
				setNodes([]);
				setEdges([]);
			} finally {
				setLoading(false);
			}
		},
		[setNodes, setEdges, toast, t]
	);

	useEffect(() => {
		void loadGraph(selectedFlowId);
	}, [selectedFlowId, loadGraph]);

	const handleRunFlow = async () => {
		if (!selectedFlowId) {
			return;
		}
		setRunning(true);
		try {
			await materializationService.runFlow(selectedFlowId);
			toast({ title: t('materialization:flow.runStarted') });
			// reload to pick up new PENDING statuses
			await loadGraph(selectedFlowId);
		} catch (error) {
			toast({
				title: t('materialization:flow.runFailed'),
				description: error instanceof Error ? error.message : String(error),
				variant: 'destructive'
			});
		} finally {
			setRunning(false);
		}
	};

	const legendItems = useMemo(
		() => [
			{ kind: 'data', label: t('materialization:flow.edgeData') },
			{ kind: 'metricRef', label: t('materialization:flow.edgeMetricRef') },
			{ kind: 'manual', label: t('materialization:flow.edgeManual') }
		],
		[t]
	);

	return (
		<div className="min-h-screen bg-background flex flex-col">
			<div className="flex-1 flex flex-col transition-[padding] duration-300">
				<main className="flex-1 flex flex-col p-6 h-[calc(100vh-64px)]">
					<div className="flex flex-wrap items-center gap-4 mb-4 shrink-0">
						<div className="p-3 bg-primary/10 rounded-xl">
							<Workflow className="h-8 w-8 text-primary" />
						</div>
						<div className="min-w-0">
							<h1 className="text-2xl font-bold tracking-tight">{t('materialization:flow.title')}</h1>
							<p className="text-sm text-muted-foreground">{t('materialization:flow.subtitle')}</p>
						</div>
						<div className="ml-auto flex flex-wrap items-center gap-2">
							<Select value={selectedFlowId} onValueChange={setSelectedFlowId}>
								<SelectTrigger className="w-64">
									<SelectValue placeholder={t('materialization:flow.selectFlow')} />
								</SelectTrigger>
								<SelectContent>
									{flows.map((f) => (
										<SelectItem key={f.flowId} value={f.flowId}>
											{f.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<Button
								variant="outline"
								size="sm"
								onClick={() => void loadGraph(selectedFlowId)}
								disabled={loading || !selectedFlowId}
							>
								{loading ? (
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								) : (
									<RefreshCw className="mr-2 h-4 w-4" />
								)}
								{t('common:refresh')}
							</Button>
							<Button
								size="sm"
								onClick={() => void handleRunFlow()}
								disabled={running || !selectedFlowId}
							>
								{running ? (
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								) : (
									<Play className="mr-2 h-4 w-4" />
								)}
								{t('materialization:flow.runFlow')}
							</Button>
							<Button variant="outline" size="sm" asChild>
								<Link to="/metrics/materialization">
									{t('materialization:flow.backToList')}
								</Link>
							</Button>
						</div>
					</div>

					<div className="flex flex-wrap items-center gap-4 mb-3 shrink-0 text-xs text-muted-foreground">
						<span className="font-medium">{t('materialization:flow.legend')}:</span>
						{legendItems.map((item) => (
							<span key={item.kind} className="flex items-center gap-1.5">
								<span
									className="inline-block h-0.5 w-6 rounded"
									style={{
										backgroundColor: edgeKindColor[item.kind],
										...(item.kind === 'manual'
											? { backgroundImage: 'repeating-linear-gradient(90deg, currentColor 0 4px, transparent 4px 8px)' }
											: {})
									}}
								/>
								{item.label}
							</span>
						))}
						{graph && (
							<span className="ml-auto">
								{t('materialization:flow.nodeCount', { count: graph.nodes.length })} ·{' '}
								{t('materialization:flow.edgeCount', { count: graph.edges.length })}
							</span>
						)}
					</div>

					<div className="flex-1 w-full h-full border rounded-xl overflow-hidden bg-muted/10 relative min-h-[400px]">
						{loading && !graph ? (
							<div className="absolute inset-0 flex items-center justify-center">
								<div className="flex items-center gap-3 text-sm text-muted-foreground">
									<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
									<span>{t('common:loading')}</span>
								</div>
							</div>
						) : !selectedFlowId || nodes.length === 0 ? (
							<div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
								{flows.length === 0
									? t('materialization:flow.emptyFlows')
									: t('materialization:flow.selectFlow')}
							</div>
						) : (
							<div className="absolute inset-0" style={{ width: '100%', height: '100%' }}>
								<ReactFlow
									nodes={nodes}
									edges={edges}
									onNodesChange={onNodesChange}
									onEdgesChange={onEdgesChange}
									nodeTypes={nodeTypes}
									fitView
									attributionPosition="bottom-right"
								>
									<Background color="#ccc" gap={16} />
									<Controls />
									<MiniMap
										nodeColor={() => '#e2e8f0'}
										maskColor="rgba(0, 0, 0, 0.1)"
									/>
								</ReactFlow>
							</div>
						)}
					</div>
				</main>
			</div>
		</div>
	);
};

export default ComputeFlow;
