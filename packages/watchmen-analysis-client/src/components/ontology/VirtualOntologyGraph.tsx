import React, { useMemo } from 'react';
import { VirtualOntology, VirtualObject, joinTypeConfig } from '@/model/ontology';
import { cn } from '@/lib/utils';

interface Props {
	ontologies: VirtualOntology[];
	onSelectOntology: (ontology: VirtualOntology) => void;
}

interface GraphNode {
	id: string;
	object: VirtualObject;
	ontology: VirtualOntology;
	x: number;
	y: number;
	width: number;
	height: number;
}

interface GraphLink {
	id: string;
	x1: number;
	y1: number;
	x2: number;
	y2: number;
	name: string;
	label: string;
	joinType: string;
	conditionCount: number;
}

const NODE_WIDTH = 230;
const NODE_HEIGHT = 138;
const COLUMN_GAP = 260;
const ROW_GAP = 96;
const ONTOLOGY_GAP = 120;

export const VirtualOntologyGraph: React.FC<Props> = ({ ontologies, onSelectOntology }) => {
	const { nodes, links, groups, width, height } = useMemo(() => {
		const nodes: GraphNode[] = [];
		const links: GraphLink[] = [];
		const groups: { id: string; name: string; x: number; y: number; width: number; height: number; ontology: VirtualOntology }[] = [];

		let yOffset = 36;
		ontologies.forEach(ontology => {
			const depthMap = buildDepthMap(ontology);
			const columns = Array.from(new Set(ontology.virtualObjects.map(vo => depthMap.get(vo.id) ?? 0))).sort((a, b) => a - b);
			const objectByColumn = columns.map(col => ontology.virtualObjects.filter(vo => (depthMap.get(vo.id) ?? 0) === col));
			const maxRows = Math.max(1, ...objectByColumn.map(list => list.length));
			const groupWidth = Math.max(1, columns.length) * NODE_WIDTH + Math.max(0, columns.length - 1) * COLUMN_GAP + 64;
			const groupHeight = maxRows * NODE_HEIGHT + Math.max(0, maxRows - 1) * ROW_GAP + 116;
			const groupX = 32;
			const groupY = yOffset;

			groups.push({ id: ontology.id, name: ontology.name, x: groupX, y: groupY, width: groupWidth, height: groupHeight, ontology });

			objectByColumn.forEach((list, columnIndex) => {
				const x = groupX + 32 + columnIndex * (NODE_WIDTH + COLUMN_GAP);
				const columnHeight = list.length * NODE_HEIGHT + Math.max(0, list.length - 1) * ROW_GAP;
				const startY = groupY + 76 + Math.max(0, (groupHeight - 116 - columnHeight) / 2);

				list.forEach((vo, rowIndex) => {
					nodes.push({
						id: vo.id,
						object: vo,
						ontology,
						x,
						y: startY + rowIndex * (NODE_HEIGHT + ROW_GAP),
						width: NODE_WIDTH,
						height: NODE_HEIGHT,
					});
				});
			});

			yOffset += groupHeight + ONTOLOGY_GAP;
		});

		ontologies.forEach(ontology => {
			ontology.virtualLinks.forEach(link => {
				const source = nodes.find(n => n.id === link.sourceObjectId && n.ontology.id === ontology.id);
				const target = nodes.find(n => n.id === link.targetObjectId && n.ontology.id === ontology.id);
				if (source && target) {
					const sourceIsLeft = source.x <= target.x;
					links.push({
						id: link.id,
						x1: sourceIsLeft ? source.x + source.width : source.x,
						y1: source.y + source.height / 2,
						x2: sourceIsLeft ? target.x : target.x + target.width,
						y2: target.y + target.height / 2,
						name: link.name,
						label: joinTypeConfig[link.joinType].label,
						joinType: link.joinType,
						conditionCount: link.joinConditions.length,
					});
				}
			});
		});

		const width = Math.max(900, ...groups.map(g => g.x + g.width + 32));
		const height = Math.max(520, yOffset);
		return { nodes, links, groups, width, height };
	}, [ontologies]);

	if (ontologies.length === 0) {
		return <div className="flex items-center justify-center h-64 text-muted-foreground">No ontologies to display</div>;
	}

	return (
		<div className="relative overflow-auto bg-gradient-to-br from-slate-50 via-white to-indigo-50/40 p-4" style={{ minHeight: 520 }}>
			<svg width={width} height={height} className="mx-auto block">
				<defs>
					<marker id="ontology-arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth">
						<path d="M0,0 L0,6 L9,3 z" className="fill-indigo-400" />
					</marker>
					<filter id="soft-shadow" x="-20%" y="-20%" width="140%" height="140%">
						<feDropShadow dx="0" dy="8" stdDeviation="8" floodOpacity="0.12" />
					</filter>
				</defs>

				{/* Ontology group backgrounds */}
				{groups.map(group => (
					<g key={group.id}>
						<rect
							x={group.x}
							y={group.y}
							width={group.width}
							height={group.height}
							rx={24}
							className="fill-white/80 stroke-slate-200"
							filter="url(#soft-shadow)"
						/>
						<text x={group.x + 28} y={group.y + 34} className="fill-slate-900 text-[18px] font-semibold">
							{group.name}
						</text>
						<text x={group.x + 28} y={group.y + 56} className="fill-slate-500 text-[12px]">
							Business object graph · {group.ontology.virtualObjects.length} objects · {group.ontology.virtualLinks.length} links
						</text>
					</g>
				))}

				{/* Business links */}
				{links.map(link => {
					const midX = (link.x1 + link.x2) / 2;
					const midY = (link.y1 + link.y2) / 2;
					const curve = Math.min(80, Math.abs(link.x2 - link.x1) / 3);
					const path = `M ${link.x1} ${link.y1} C ${link.x1 + curve} ${link.y1}, ${link.x2 - curve} ${link.y2}, ${link.x2} ${link.y2}`;
					return (
						<g key={link.id}>
							<path
								d={path}
								fill="none"
								strokeWidth={2.5}
								strokeDasharray={link.joinType === 'left' ? '8 5' : undefined}
								className="stroke-indigo-300"
								markerEnd="url(#ontology-arrow)"
							/>
							<rect
								x={midX - 72}
								y={midY - 26}
								width={144}
								height={52}
								rx={12}
								className="fill-white stroke-indigo-100"
								filter="url(#soft-shadow)"
							/>
							<text x={midX} y={midY - 7} textAnchor="middle" className="fill-slate-900 text-[12px] font-semibold">
								{link.name || 'Business Link'}
							</text>
							<text x={midX} y={midY + 10} textAnchor="middle" className="fill-indigo-600 text-[10px] font-medium">
								{link.label} · {link.conditionCount} condition{link.conditionCount > 1 ? 's' : ''}
							</text>
						</g>
					);
				})}

				{/* Business object cards */}
				{nodes.map(node => (
					<BusinessObjectNode
						key={`${node.ontology.id}-${node.id}`}
						node={node}
						onClick={() => onSelectOntology(node.ontology)}
					/>
				))}
			</svg>
		</div>
	);
};

const BusinessObjectNode: React.FC<{ node: GraphNode; onClick: () => void }> = ({ node, onClick }) => {
	const vo = node.object;
	const primaryTable = vo.physicalTables.find(t => t.kind === 'primary') || vo.physicalTables[0];
	const fieldCount = vo.physicalTables.reduce((sum, table) => sum + table.fields.length, 0);

	return (
		<g className="cursor-pointer" onClick={onClick}>
			<rect
				x={node.x}
				y={node.y}
				width={node.width}
				height={node.height}
				rx={18}
				className="fill-white stroke-slate-200 hover:stroke-indigo-300 transition-colors"
				filter="url(#soft-shadow)"
			/>
			<rect
				x={node.x}
				y={node.y}
				width={node.width}
				height={6}
				rx={3}
				className={toFillClass(vo.color)}
			/>

			<circle cx={node.x + 34} cy={node.y + 42} r={22} className={cn(toFillClass(vo.color), 'opacity-15')} />
			<text x={node.x + 34} y={node.y + 49} textAnchor="middle" className="text-[22px]">
				{vo.icon || '📦'}
			</text>

			<text x={node.x + 68} y={node.y + 34} className="fill-slate-900 text-[15px] font-semibold">
				{truncate(vo.name, 22)}
			</text>
			<text x={node.x + 68} y={node.y + 52} className="fill-slate-500 text-[11px]">
				{primaryTable ? truncate(primaryTable.topicName, 24) : 'No physical table mapped'}
			</text>

			<g transform={`translate(${node.x + 16}, ${node.y + 76})`}>
				<MetricPill icon="▦" label={`${vo.physicalTables.length} tables`} x={0} />
				<MetricPill icon="ƒ" label={`${fieldCount} fields`} x={76} />
				<MetricPill icon="Σ" label={`${vo.derivedAttributes.length} derived`} x={144} />
			</g>

			<line x1={node.x + 16} y1={node.y + 112} x2={node.x + node.width - 16} y2={node.y + 112} className="stroke-slate-100" />
			<text x={node.x + 16} y={node.y + 130} className="fill-slate-400 text-[10px]">
				Business projection of physical data
			</text>
		</g>
	);
};

const MetricPill: React.FC<{ icon: string; label: string; x: number }> = ({ icon, label, x }) => (
	<g transform={`translate(${x}, 0)`}>
		<rect width={62} height={22} rx={11} className="fill-slate-50 stroke-slate-100" />
		<text x={8} y={15} className="fill-indigo-500 text-[10px] font-semibold">{icon}</text>
		<text x={20} y={15} className="fill-slate-600 text-[10px]">{label}</text>
	</g>
);

const buildDepthMap = (ontology: VirtualOntology): Map<string, number> => {
	const depthMap = new Map<string, number>();
	const incoming = new Map<string, number>();
	ontologySafeObjects(ontology).forEach(vo => incoming.set(vo.id, 0));
	ontology.virtualLinks.forEach(link => incoming.set(link.targetObjectId, (incoming.get(link.targetObjectId) || 0) + 1));

	const roots = ontology.virtualObjects.filter(vo => (incoming.get(vo.id) || 0) === 0);
	const queue = (roots.length > 0 ? roots : ontology.virtualObjects).map(vo => ({ id: vo.id, depth: 0 }));
	queue.forEach(item => depthMap.set(item.id, 0));

	while (queue.length > 0) {
		const current = queue.shift()!;
		ontology.virtualLinks
			.filter(link => link.sourceObjectId === current.id)
			.forEach(link => {
				const nextDepth = current.depth + 1;
				if ((depthMap.get(link.targetObjectId) ?? -1) < nextDepth) {
					depthMap.set(link.targetObjectId, nextDepth);
					queue.push({ id: link.targetObjectId, depth: nextDepth });
				}
			});
	}

	ontology.virtualObjects.forEach((vo, index) => {
		if (!depthMap.has(vo.id)) depthMap.set(vo.id, index);
	});
	return depthMap;
};

const ontologySafeObjects = (ontology: VirtualOntology): VirtualObject[] => ontology.virtualObjects || [];

const toFillClass = (bgClass?: string) => (bgClass || 'bg-indigo-500').replace('bg-', 'fill-');

const truncate = (text: string, max: number) => {
	if (!text) return '';
	return text.length > max ? `${text.slice(0, max - 1)}…` : text;
};
