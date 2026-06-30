import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
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

interface DragState {
	nodeId: string | null;
	ontologyId: string | null;
	offsetX: number;
	offsetY: number;
}

interface ViewBox {
	x: number;
	y: number;
	w: number;
	h: number;
}

const NODE_WIDTH = 230;
const NODE_HEIGHT = 138;
const COLUMN_GAP = 260;
const ROW_GAP = 96;
const ONTOLOGY_GAP = 120;
const STORAGE_KEY = 'ontology-graph-positions';
const FULLSCREEN_PADDING = 80;
const MIN_ZOOM_SCALE = 0.2;
const MAX_ZOOM_SCALE = 4;
const clampView = (vb: ViewBox, cw: number, ch: number, pad: number): ViewBox => {
	const minW = cw / MAX_ZOOM_SCALE;
	const minH = ch / MAX_ZOOM_SCALE;
	const w = Math.max(minW, Math.min(cw / MIN_ZOOM_SCALE, vb.w));
	const h = Math.max(minH, Math.min(ch / MIN_ZOOM_SCALE, vb.h));
	const minX = pad - w * 0.5;
	const maxX = cw + pad - w * 0.5;
	const minY = pad - h * 0.5;
	const maxY = ch + pad - h * 0.5;
	return {
		x: Math.max(minX, Math.min(maxX, vb.x)),
		y: Math.max(minY, Math.min(maxY, vb.y)),
		w,
		h,
	};
};

export const VirtualOntologyGraph: React.FC<Props> = ({ ontologies, onSelectOntology }) => {
	const svgRef = useRef<SVGSVGElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const dragRef = useRef<DragState | null>(null);
	const hasMovedRef = useRef(false);
	const panRef = useRef<{ startX: number; startY: number; vbX: number; vbY: number } | null>(null);
	const [positionOverrides, setPositionOverrides] = useState<Record<string, { x: number; y: number }>>({});
	const [fullscreenOntologyId, setFullscreenOntologyId] = useState<string | null>(null);
	const [viewBox, setViewBox] = useState<ViewBox | null>(null);
	const viewBoxRef = useRef(viewBox);
	viewBoxRef.current = viewBox;
	const positionOverridesRef = useRef(positionOverrides);
	positionOverridesRef.current = positionOverrides;

	const isFullscreen = fullscreenOntologyId !== null;

	// Load saved positions from localStorage
	useEffect(() => {
		try {
			const saved = localStorage.getItem(STORAGE_KEY);
			if (saved) setPositionOverrides(JSON.parse(saved));
		} catch { /* ignore corrupt data */ }
	}, []);

	// Escape key to exit fullscreen
	useEffect(() => {
		if (!isFullscreen) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') setFullscreenOntologyId(null);
		};
		document.addEventListener('keydown', handleKeyDown);
		return () => document.removeEventListener('keydown', handleKeyDown);
	}, [isFullscreen]);

	// Compute base layout (topology-driven)
	const { baseNodes, groups, yOffset } = useMemo(() => {
		const baseNodes: GraphNode[] = [];
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
					baseNodes.push({
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

		return { baseNodes, groups, yOffset };
	}, [ontologies]);

	// Apply user overrides to get display positions
	const displayNodes = useMemo(() =>
		baseNodes.map(n => {
			const key = `${n.ontology.id}:${n.id}`;
			const override = positionOverrides[key];
			return override ? { ...n, x: override.x, y: override.y } : n;
		}), [baseNodes, positionOverrides]);

	// Recompute links from overridden positions
	const displayLinks = useMemo(() => {
		const links: GraphLink[] = [];
		ontologies.forEach(ontology => {
			ontology.virtualLinks.forEach(link => {
				const source = displayNodes.find(n => n.id === link.sourceObjectId && n.ontology.id === ontology.id);
				const target = displayNodes.find(n => n.id === link.targetObjectId && n.ontology.id === ontology.id);
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
		return links;
	}, [displayNodes, ontologies]);

	// --- Fullscreen: filter to focused ontology ---
	const visibleGroups = useMemo(() =>
		isFullscreen ? groups.filter(g => g.id === fullscreenOntologyId) : groups,
		[groups, isFullscreen, fullscreenOntologyId]);

	const visibleNodes = useMemo(() =>
		isFullscreen ? displayNodes.filter(n => n.ontology.id === fullscreenOntologyId) : displayNodes,
		[displayNodes, isFullscreen, fullscreenOntologyId]);

	const visibleLinks = useMemo(() => {
		if (!isFullscreen) return displayLinks;
		const ontology = ontologies.find(o => o.id === fullscreenOntologyId);
		if (!ontology) return [];
		const links: GraphLink[] = [];
		ontology.virtualLinks.forEach(link => {
			const source = displayNodes.find(n => n.id === link.sourceObjectId && n.ontology.id === fullscreenOntologyId);
			const target = displayNodes.find(n => n.id === link.targetObjectId && n.ontology.id === fullscreenOntologyId);
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
		return links;
	}, [isFullscreen, fullscreenOntologyId, displayNodes, displayLinks, ontologies]);

	// SVG content dimensions (used for clamping the pan/zoom view)
	const svgWidth = useMemo(() => {
		const base = Math.max(900, ...groups.map(g => g.x + g.width + 32));
		const maxRight = displayNodes.length > 0 ? Math.max(...displayNodes.map(n => n.x + n.width)) : 0;
		return Math.max(base, maxRight + 64);
	}, [groups, displayNodes]);

	const svgHeight = useMemo(() => {
		const base = Math.max(520, yOffset);
		const maxBottom = displayNodes.length > 0 ? Math.max(...displayNodes.map(n => n.y + n.height)) : 0;
		return Math.max(base, maxBottom + 64);
	}, [yOffset, displayNodes]);

	// Compute the "fit-all" viewBox for the currently visible content
	const fitViewBox = useCallback((): ViewBox | null => {
		const nodes = visibleNodes;
		if (nodes.length === 0) return null;
		const minX = Math.min(...nodes.map(n => n.x));
		const minY = Math.min(...nodes.map(n => n.y));
		const maxX = Math.max(...nodes.map(n => n.x + n.width));
		const maxY = Math.max(...nodes.map(n => n.y + n.height));
		return {
			x: minX - FULLSCREEN_PADDING,
			y: minY - FULLSCREEN_PADDING,
			w: maxX - minX + FULLSCREEN_PADDING * 2,
			h: maxY - minY + FULLSCREEN_PADDING * 2,
		};
	}, [visibleNodes]);

	// Reset view to fit whenever the visible content set changes
	// (ontologies load, or entering/exiting fullscreen)
	useEffect(() => {
		setViewBox(fitViewBox());
	}, [fitViewBox]);

	// Wheel zoom centered on cursor
	useEffect(() => {
		const svg = svgRef.current;
		const container = containerRef.current;
		if (!svg || !container) return;
		const onWheel = (e: WheelEvent) => {
			e.preventDefault();
			const vb = viewBoxRef.current;
			if (!vb) return;
			const rect = svg.getBoundingClientRect();
			const px = (e.clientX - rect.left) / rect.width;
			const py = (e.clientY - rect.top) / rect.height;
			const factor = e.deltaY < 0 ? 1 / 1.15 : 1.15;
			const newW = vb.w * factor;
			const newH = vb.h * factor;
			const newX = vb.x + (vb.w - newW) * px;
			const newY = vb.y + (vb.h - newH) * py;
			setViewBox(clampView({ x: newX, y: newY, w: newW, h: newH }, svgWidth, svgHeight, FULLSCREEN_PADDING));
		};
		container.addEventListener('wheel', onWheel, { passive: false });
		return () => container.removeEventListener('wheel', onWheel);
	}, [svgWidth, svgHeight]);

	const zoomBy = useCallback((factor: number) => {
		setViewBox(prev => {
			if (!prev) return prev;
			const newW = prev.w * factor;
			const newH = prev.h * factor;
			const newX = prev.x + (prev.w - newW) / 2;
			const newY = prev.y + (prev.h - newH) / 2;
			return clampView({ x: newX, y: newY, w: newW, h: newH }, svgWidth, svgHeight, FULLSCREEN_PADDING);
		});
	}, [svgWidth, svgHeight]);

	const resetView = useCallback(() => setViewBox(fitViewBox()), [fitViewBox]);

	// Convert screen coordinates to SVG coordinate space
	const getSvgCoords = useCallback((clientX: number, clientY: number) => {
		const svg = svgRef.current;
		if (!svg) return { x: clientX, y: clientY };
		const point = svg.createSVGPoint();
		point.x = clientX;
		point.y = clientY;
		const ctm = svg.getScreenCTM();
		if (!ctm) return { x: clientX, y: clientY };
		const transformed = point.matrixTransform(ctm.inverse());
		return { x: transformed.x, y: transformed.y };
	}, []);

	// --- Drag/pan handlers ---

	const handleNodeMouseDown = useCallback((e: React.MouseEvent, nodeId: string, ontologyId: string) => {
		e.stopPropagation();
		hasMovedRef.current = false;
		const { x, y } = getSvgCoords(e.clientX, e.clientY);
		const node = displayNodes.find(n => n.id === nodeId && n.ontology.id === ontologyId);
		if (!node) return;
		dragRef.current = { nodeId, ontologyId, offsetX: x - node.x, offsetY: y - node.y };
	}, [getSvgCoords, displayNodes]);

	// Background mousedown starts panning
	const handleBackgroundMouseDown = useCallback((e: React.MouseEvent) => {
		// Only start pan on left button
		if (e.button !== 0) return;
		hasMovedRef.current = false;
		const vb = viewBoxRef.current;
		if (!vb) return;
		panRef.current = { startX: e.clientX, startY: e.clientY, vbX: vb.x, vbY: vb.y };
	}, []);

	const handleMouseMove = useCallback((e: React.MouseEvent) => {
		if (dragRef.current && dragRef.current.nodeId) {
			hasMovedRef.current = true;
			const { x, y } = getSvgCoords(e.clientX, e.clientY);
			const key = `${dragRef.current.ontologyId}:${dragRef.current.nodeId}`;
			setPositionOverrides(prev => {
				const next = { ...prev, [key]: { x: x - dragRef.current!.offsetX, y: y - dragRef.current!.offsetY } };
				positionOverridesRef.current = next;
				return next;
			});
			return;
		}
		if (panRef.current) {
			const svg = svgRef.current;
			if (!svg) return;
			hasMovedRef.current = true;
			const rect = svg.getBoundingClientRect();
			const dx = (e.clientX - panRef.current.startX) * (viewBoxRef.current!.w / rect.width);
			const dy = (e.clientY - panRef.current.startY) * (viewBoxRef.current!.h / rect.height);
			setViewBox(prev => prev ? clampView({ ...prev, x: panRef.current!.vbX - dx, y: panRef.current!.vbY - dy }, svgWidth, svgHeight, FULLSCREEN_PADDING) : prev);
		}
	}, [getSvgCoords, svgWidth, svgHeight]);

	const finishDrag = useCallback(() => {
		if (dragRef.current) {
			try {
				localStorage.setItem(STORAGE_KEY, JSON.stringify(positionOverridesRef.current));
			} catch { /* quota exceeded — silently ignore */ }
			dragRef.current = null;
		}
		panRef.current = null;
	}, []);

	// Distinguish click from drag
	const handleNodeClick = useCallback((ontology: VirtualOntology) => {
		if (!hasMovedRef.current) {
			onSelectOntology(ontology);
		}
	}, [onSelectOntology]);

	if (ontologies.length === 0) {
		return <div className="flex items-center justify-center h-64 text-muted-foreground">No ontologies to display</div>;
	}

	const vb = viewBox ?? fitViewBox();
	const vbStr = vb ? `${vb.x} ${vb.y} ${vb.w} ${vb.h}` : undefined;

	return (
		<div
			ref={containerRef}
			className={cn(
				'relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-indigo-50/40',
				isFullscreen ? 'fixed inset-0 z-50' : 'h-[640px] w-full'
			)}
		>
			{/* Exit fullscreen button (only when fullscreened) */}
			{isFullscreen && (
				<button
					onClick={() => setFullscreenOntologyId(null)}
					className="absolute top-3 right-3 z-10 flex items-center gap-1.5 rounded-lg border border-indigo-300 bg-white px-2.5 py-1.5 text-xs font-medium text-indigo-600 shadow-sm transition-colors hover:bg-slate-50"
				>
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
						<polyline points="4 8 4 4 8 4" /><line x1="20" y1="4" x2="14" y2="10" />
						<polyline points="20 16 20 20 16 20" /><line x1="4" y1="20" x2="10" y2="14" />
					</svg>
					Exit fullscreen
				</button>
			)}

			{/* Zoom controls */}
			<div className="absolute bottom-4 right-4 z-10 flex flex-col gap-1.5">
				<ZoomButton onClick={() => zoomBy(1 / 1.3)} label="Zoom in">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
				</ZoomButton>
				<ZoomButton onClick={() => zoomBy(1.3)} label="Zoom out">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12" /></svg>
				</ZoomButton>
				<ZoomButton onClick={resetView} label="Fit to view">
					<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8V5a2 2 0 0 1 2-2h3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M21 16v3a2 2 0 0 1-2 2h-3" /></svg>
				</ZoomButton>
			</div>

			<svg
				ref={svgRef}
				width="100%"
				height="100%"
				viewBox={vbStr}
				preserveAspectRatio="xMidYMid meet"
				className="block select-none"
				style={{ cursor: panRef.current ? 'grabbing' : 'grab' }}
				onMouseDown={handleBackgroundMouseDown}
				onMouseMove={handleMouseMove}
				onMouseUp={finishDrag}
				onMouseLeave={finishDrag}
			>
				<defs>
					<marker id="ontology-arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth">
						<path d="M0,0 L0,6 L9,3 z" className="fill-indigo-400" />
					</marker>
					<filter id="soft-shadow" x="-20%" y="-20%" width="140%" height="140%">
						<feDropShadow dx="0" dy="8" stdDeviation="8" floodOpacity="0.12" />
					</filter>
				</defs>

				{/* Ontology group backgrounds */}
				{visibleGroups.map(group => (
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

						{/* Fullscreen button per ontology */}
						{!isFullscreen && (
							<g
								className="cursor-pointer"
								onClick={e => { e.stopPropagation(); setFullscreenOntologyId(group.id); }}
							>
								<rect
									x={group.x + group.width - 114}
									y={group.y + 16}
									width={90}
									height={26}
									rx={8}
									className="fill-white stroke-slate-200 hover:stroke-indigo-300 transition-colors"
								/>
								<text x={group.x + group.width - 69} y={group.y + 34} textAnchor="middle" className="fill-slate-500 text-[11px] font-medium">
									⛶ Fullscreen
								</text>
							</g>
						)}
					</g>
				))}

				{/* Business links */}
				{visibleLinks.map(link => {
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
				{visibleNodes.map(node => (
					<DraggableNode
						key={`${node.ontology.id}-${node.id}`}
						node={node}
						isDragging={dragRef.current?.nodeId === node.id && dragRef.current?.ontologyId === node.ontology.id}
						onMouseDown={handleNodeMouseDown}
						onClick={() => handleNodeClick(node.ontology)}
					/>
				))}
			</svg>
		</div>
	);
};

const ZoomButton: React.FC<{ onClick: () => void; label: string; children: React.ReactNode }> = ({ onClick, label, children }) => (
	<button
		type="button"
		onClick={onClick}
		title={label}
		aria-label={label}
		className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-indigo-600"
	>
		{children}
	</button>
);

const DraggableNode: React.FC<{
	node: GraphNode;
	isDragging: boolean;
	onMouseDown: (e: React.MouseEvent, nodeId: string, ontologyId: string) => void;
	onClick: () => void;
}> = ({ node, isDragging, onMouseDown, onClick }) => {
	const vo = node.object;
	const primaryTable = vo.physicalTables.find(t => t.kind === 'primary') || vo.physicalTables[0];
	const fieldCount = vo.physicalTables.reduce((sum, table) => sum + table.fields.length, 0);

	return (
		<g
			className={cn('cursor-grab', isDragging && 'cursor-grabbing')}
			onMouseDown={e => onMouseDown(e, node.id, node.ontology.id)}
			onClick={onClick}
		>
			<rect
				x={node.x}
				y={node.y}
				width={node.width}
				height={node.height}
				rx={18}
				className={cn(
					'fill-white stroke-slate-200 hover:stroke-indigo-300 transition-colors',
					isDragging && 'stroke-indigo-400'
				)}
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
	const maxDepth = Math.max(0, ontology.virtualObjects.length - 1);
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
				// Cap depth at node count to break relationship cycles (e.g. A→B→A)
				if (nextDepth <= maxDepth && (depthMap.get(link.targetObjectId) ?? -1) < nextDepth) {
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