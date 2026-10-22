import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "@/components/ui/use-toast";
import {
  RefreshCw, Focus, X, Share2, Loader2, ArrowRight,
  Database, LayoutGrid, BarChart3, Workflow, Shapes,
  type LucideIcon,
} from "lucide-react";
import {
  ReactFlow, Background, Controls, MiniMap, Handle, Position, MarkerType,
  BaseEdge, useInternalNode,
  type Node, type Edge, type NodeProps, type EdgeProps,
} from "@xyflow/react";
import { useTranslation } from "react-i18next";
import type { ProductGraph, ProductGraphNode } from "@/model/dataProduct";
import { dataProductService } from "@/services/dataProductService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const NODE_WIDTH = 210;
const NODE_HEIGHT = 78;

const statusColor = (status?: string) => {
  switch (status) {
    case "production":
      return "bg-green-100 text-green-800 border-green-200";
    case "development":
    case "testing":
    case "acceptance":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "sunset":
    case "retired":
      return "bg-gray-100 text-gray-800 border-gray-200";
    default:
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
  }
};

// one accent color + icon per data product type; unknown types fall back to "other"
const TYPE_META: Record<string, { color: string; icon: LucideIcon }> = {
  "topics": { color: "#0891b2", icon: Database },
  "subject": { color: "#059669", icon: LayoutGrid },
  "metrics": { color: "#2563eb", icon: BarChart3 },
  "semantic model": { color: "#7c3aed", icon: Workflow },
  "other": { color: "#94a3b8", icon: Shapes },
};
const typeMeta = (type?: string) =>
  TYPE_META[(type || "other").toLowerCase()] ?? TYPE_META.other;

type ProductNodeData = {
  product: ProductGraphNode;
  dimmed: boolean;
  focused: boolean;
};
type ProductFlowNode = Node<ProductNodeData, "productNode">;

const ProductNodeView = React.memo(function ProductNodeView({ data, selected }: NodeProps<ProductFlowNode>) {
  const { product, dimmed, focused } = data;
  const meta = typeMeta(product["x-product-type"]);
  const TypeIcon = meta.icon;
  const domain = product["x-domain"];
  return (
    <div
      className={cn(
        "rounded-lg border bg-white px-3 py-2 shadow-sm transition-opacity",
        dimmed && "opacity-25",
        focused && "ring-2 ring-amber-500",
      )}
      style={{
        width: NODE_WIDTH,
        borderLeft: `4px solid ${meta.color}`,
        ...(selected ? { outline: `2px solid ${meta.color}`, outlineOffset: 2 } : {}),
      }}
    >
      <Handle type="target" position={Position.Left} className="!h-2 !w-2 !opacity-0 !pointer-events-none" />
      <div className="flex items-center gap-1.5">
        <TypeIcon className="h-3.5 w-3.5 shrink-0" style={{ color: meta.color }} />
        <span className="flex-1 truncate text-sm font-medium">{product["x-name"] || product.id}</span>
        <span className="shrink-0 text-[10px] font-semibold text-amber-600">
          {product["x-value-score"] ?? 0}
        </span>
      </div>
      <div className="mt-1 flex items-center gap-1.5">
        <Badge variant="outline" className={cn("shrink-0 text-[10px] px-1", statusColor(product["x-status"]))}>
          {product["x-status"] || "draft"}
        </Badge>
        <span className="shrink-0 text-[10px] font-medium" style={{ color: meta.color }}>
          {product["x-product-type"] || "other"}
        </span>
        {domain && (
          <span className="ml-auto max-w-24 truncate text-[10px] text-slate-400" title={domain}>
            {domain}
          </span>
        )}
      </div>
      <Handle type="source" position={Position.Right} className="!h-2 !w-2 !opacity-0 !pointer-events-none" />
    </div>
  );
});

const nodeTypes = { productNode: ProductNodeView };

// ---------------------------------------------------------------------------
// Orthogonal floating edge: attaches to the nearest boundary points of the two
// node rectangles, then routes with right-angle elbows only (no diagonals).
// ---------------------------------------------------------------------------
const EDGE_HIT_PAD = 6;
const ELBOW_STUB = 12;

const nodeBox = (node: NonNullable<ReturnType<typeof useInternalNode>>) => ({
  x: node.internals.positionAbsolute.x,
  y: node.internals.positionAbsolute.y,
  w: node.measured?.width ?? NODE_WIDTH,
  h: node.measured?.height ?? NODE_HEIGHT,
});

const nearestBoundaryPoint = (
  box: { x: number; y: number; w: number; h: number },
  toward: { x: number; y: number },
) => {
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  const dx = toward.x - cx;
  const dy = toward.y - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy };
  const halfW = box.w / 2 + EDGE_HIT_PAD;
  const halfH = box.h / 2 + EDGE_HIT_PAD;
  const scale = Math.min(
    dx !== 0 ? halfW / Math.abs(dx) : Number.POSITIVE_INFINITY,
    dy !== 0 ? halfH / Math.abs(dy) : Number.POSITIVE_INFINITY,
  );
  return { x: cx + dx * scale, y: cy + dy * scale };
};

type Side = "left" | "right" | "top" | "bottom";

const sideOf = (
  point: { x: number; y: number },
  box: { x: number; y: number; w: number; h: number },
): Side => {
  const relX = (point.x - box.x) / box.w;
  const relY = (point.y - box.y) / box.h;
  const minH = Math.min(relX, 1 - relX);
  const minV = Math.min(relY, 1 - relY);
  // ties resolve to the horizontal side: the left-to-right flow is horizontal
  if (minH <= minV) return relX < 0.5 ? "left" : "right";
  return relY < 0.5 ? "top" : "bottom";
};

const orthogonalPath = (
  start: { x: number; y: number }, startSide: Side,
  end: { x: number; y: number }, endSide: Side,
) => {
  const outHorizontal = startSide === "left" || startSide === "right";
  const inHorizontal = endSide === "left" || endSide === "right";
  const sStub = {
    x: start.x + (startSide === "right" ? ELBOW_STUB : startSide === "left" ? -ELBOW_STUB : 0),
    y: start.y + (startSide === "bottom" ? ELBOW_STUB : startSide === "top" ? -ELBOW_STUB : 0),
  };
  const eStub = {
    x: end.x + (endSide === "right" ? ELBOW_STUB : endSide === "left" ? -ELBOW_STUB : 0),
    y: end.y + (endSide === "bottom" ? ELBOW_STUB : endSide === "top" ? -ELBOW_STUB : 0),
  };
  if (outHorizontal && inHorizontal) {
    const midX = (sStub.x + eStub.x) / 2;
    return `M ${start.x},${start.y} L ${sStub.x},${start.y} L ${midX},${start.y} L ${midX},${end.y} L ${eStub.x},${end.y} L ${end.x},${end.y}`;
  }
  if (!outHorizontal && !inHorizontal) {
    const midY = (sStub.y + eStub.y) / 2;
    return `M ${start.x},${start.y} L ${start.x},${sStub.y} L ${start.x},${midY} L ${end.x},${midY} L ${end.x},${eStub.y} L ${end.x},${end.y}`;
  }
  if (outHorizontal) {
    // horizontal exit, vertical entry: corner once away from both rectangles
    return `M ${start.x},${start.y} L ${sStub.x},${start.y} L ${sStub.x},${eStub.y} L ${end.x},${end.y}`;
  }
  return `M ${start.x},${start.y} L ${start.x},${sStub.y} L ${eStub.x},${sStub.y} L ${end.x},${end.y}`;
};

const FloatingEdge = ({ id, source, target, markerEnd, style }: EdgeProps) => {
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);
  if (!sourceNode || !targetNode) return null;
  const sBox = nodeBox(sourceNode);
  const tBox = nodeBox(targetNode);
  const sCenter = { x: sBox.x + sBox.w / 2, y: sBox.y + sBox.h / 2 };
  const tCenter = { x: tBox.x + tBox.w / 2, y: tBox.y + tBox.h / 2 };
  const start = nearestBoundaryPoint(sBox, tCenter);
  const end = nearestBoundaryPoint(tBox, sCenter);
  return (
    <BaseEdge
      id={id}
      path={orthogonalPath(start, sideOf(start, sBox), end, sideOf(end, tBox))}
      markerEnd={markerEnd}
      style={style}
    />
  );
};

const edgeTypes = { floating: FloatingEdge };

// ---------------------------------------------------------------------------
// Left-to-right layered layout: upstream products on the left, arrows follow
// data flow. Longest-path layering, barycenter sweeps to reduce edge
// crossings, then median alignment so neighbors sit across from each other.
// ---------------------------------------------------------------------------
const COL_GAP = 140;
const ROW_GAP = 28;

const computeLayout = (
  products: ProductGraphNode[],
  dependsEdges: Array<{ from: string; to: string }>,
): Map<string, { x: number; y: number }> => {
  const upstreamOf = new Map<string, string[]>();
  const downstreamOf = new Map<string, string[]>();
  products.forEach((p) => {
    upstreamOf.set(p.id, []);
    downstreamOf.set(p.id, []);
  });
  dependsEdges.forEach((e) => {
    downstreamOf.get(e.from)?.push(e.to);
    upstreamOf.get(e.to)?.push(e.from);
  });

  // level = longest chain of upstreams; cycles collapse gracefully
  const levels = new Map<string, number>();
  const visiting = new Set<string>();
  const levelOf = (id: string): number => {
    if (levels.has(id)) return levels.get(id) as number;
    if (visiting.has(id)) return 0;
    visiting.add(id);
    let level = 0;
    for (const up of upstreamOf.get(id) || []) {
      level = Math.max(level, levelOf(up) + 1);
    }
    visiting.delete(id);
    levels.set(id, level);
    return level;
  };
  products.forEach((p) => levelOf(p.id));

  const columns: string[][] = [];
  products
    .slice()
    .sort((a, b) => (a["x-name"] || a.id).localeCompare(b["x-name"] || b.id))
    .forEach((p) => {
      const level = levels.get(p.id) ?? 0;
      while (columns.length <= level) columns.push([]);
      columns[level].push(p.id);
    });

  const positions = new Map<string, { x: number; y: number }>();
  const placeColumns = () => {
    columns.forEach((ids, level) => {
      const height = (ids.length - 1) * (NODE_HEIGHT + ROW_GAP);
      ids.forEach((id, index) => {
        positions.set(id, {
          x: level * (NODE_WIDTH + COL_GAP),
          y: -height / 2 + index * (NODE_HEIGHT + ROW_GAP),
        });
      });
    });
  };
  placeColumns();

  // barycenter reordering: sort each column by the mean row of its neighbors
  // in the adjacent column; alternates downstream/upstream for a few sweeps
  const rowOf = new Map<string, number>();
  const refreshRows = () => {
    columns.forEach((ids) => ids.forEach((id, index) => rowOf.set(id, index)));
  };
  refreshRows();
  const barycenter = (id: string, neighbors: string[]) => {
    const rows = neighbors.map((n) => rowOf.get(n)).filter((r) => r != null) as number[];
    if (rows.length === 0) return rowOf.get(id) as number;
    return rows.reduce((sum, r) => sum + r, 0) / rows.length;
  };
  for (let sweep = 0; sweep < 4; sweep += 1) {
    const downstream = sweep % 2 === 0;
    const order = downstream
      ? columns.map((_, level) => level)
      : columns.map((_, level) => level).reverse();
    order.forEach((level) => {
      if (downstream && level === 0) return;
      if (!downstream && level === columns.length - 1) return;
      columns[level] = columns[level]
        .slice()
        .sort(
          (a, b) =>
            barycenter(a, downstream ? upstreamOf.get(a) || [] : downstreamOf.get(a) || []) -
            barycenter(b, downstream ? upstreamOf.get(b) || [] : downstreamOf.get(b) || []),
        );
      refreshRows();
    });
  }
  placeColumns();

  // median alignment: pull each node toward the median y of its neighbors,
  // then restore the min row gap within the column
  const enforceGaps = (ids: string[]) => {
    for (let i = 1; i < ids.length; i += 1) {
      const prev = positions.get(ids[i - 1])!;
      const cur = positions.get(ids[i])!;
      if (cur.y < prev.y + NODE_HEIGHT + ROW_GAP) {
        cur.y = prev.y + NODE_HEIGHT + ROW_GAP;
      }
    }
    for (let i = ids.length - 2; i >= 0; i -= 1) {
      const next = positions.get(ids[i + 1])!;
      const cur = positions.get(ids[i])!;
      if (cur.y > next.y - NODE_HEIGHT - ROW_GAP) {
        cur.y = next.y - NODE_HEIGHT - ROW_GAP;
      }
    }
  };
  const medianOf = (ids: string[]) => {
    const ys = ids.map((id) => positions.get(id)?.y).filter((y) => y != null) as number[];
    if (ys.length === 0) return null;
    ys.sort((a, b) => a - b);
    const mid = Math.floor(ys.length / 2);
    return ys.length % 2 === 1 ? ys[mid] : (ys[mid - 1] + ys[mid]) / 2;
  };
  for (let sweep = 0; sweep < 2; sweep += 1) {
    columns.forEach((ids, level) => {
      if (level > 0) {
        ids.forEach((id) => {
          const target = medianOf(upstreamOf.get(id) || []);
          if (target != null) positions.get(id)!.y = target;
        });
        enforceGaps(ids);
      }
    });
    columns
      .map((_, level) => level)
      .reverse()
      .forEach((level) => {
        if (level < columns.length - 1) {
          columns[level].forEach((id) => {
            const target = medianOf(downstreamOf.get(id) || []);
            if (target != null) positions.get(id)!.y = target;
          });
          enforceGaps(columns[level]);
        }
      });
  }

  return positions;
};

const DataProductGraph: React.FC = () => {
  const { t } = useTranslation("dataAsset");
  const [graph, setGraph] = useState<ProductGraph | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [domainFilter, setDomainFilter] = useState<string>("all");
  const [focusId, setFocusId] = useState<string | undefined>(undefined);
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);

  const loadGraph = useCallback(async (params: { q?: string; domain?: string; focus?: string }) => {
    setLoading(true);
    try {
      const resp = await dataProductService.getProductGraph({
        q: params.q || undefined,
        domain: params.domain && params.domain !== "all" ? params.domain : undefined,
        focus: params.focus,
        depth: params.focus ? 1 : undefined,
      });
      setGraph(resp);
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : String(err), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGraph({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const productNodes = useMemo(
    () => (graph?.graph.nodes || []).filter((n) => n.type === "DataProduct"),
    [graph]
  );
  const domainValues = useMemo(() => {
    const values = new Set<string>();
    (graph?.graph.nodes || []).forEach((n) => {
      if (n["x-domain"]) values.add(n["x-domain"]);
    });
    return Array.from(values).sort();
  }, [graph]);

  const dependsEdges = useMemo(
    () => (graph?.graph.edges || []).filter((e) => e.type === "dependsOn"),
    [graph]
  );

  // edges point from upstream to downstream (backend contract), so the dagre
  // LR layout puts upstream products on the left and arrows follow data flow
  const neighborsOfSelected = useMemo(() => {
    if (!selectedId) return null;
    const neighbors = new Set<string>([selectedId]);
    dependsEdges.forEach((e) => {
      if (e.from === selectedId) neighbors.add(e.to);
      if (e.to === selectedId) neighbors.add(e.from);
    });
    return neighbors;
  }, [selectedId, dependsEdges]);

  const flowNodes: Node[] = useMemo(() => {
    const positions = computeLayout(productNodes, dependsEdges);
    return productNodes.map((p) => {
      const position = positions.get(p.id) || { x: 0, y: 0 };
      return {
        id: p.id,
        type: "productNode",
        position,
        selected: p.id === selectedId,
        data: {
          product: p,
          dimmed: neighborsOfSelected != null && !neighborsOfSelected.has(p.id),
          focused: focusId === p.id,
        },
      } satisfies ProductFlowNode;
    });
  }, [productNodes, dependsEdges, selectedId, focusId, neighborsOfSelected]);

  const flowEdges: Edge[] = useMemo(
    () =>
      dependsEdges.map((e) => {
        // human-declared dependencies render solid and blue; pipeline-derived dashed and gray
        const manual = e.confidence === "high" || e["x-origin"] === "manual";
        const incident = !selectedId || e.from === selectedId || e.to === selectedId;
        const stroke = manual ? "#2563eb" : "#94a3b8";
        return {
          id: `${e.from}->${e.to}`,
          source: e.from,
          target: e.to,
          type: "floating",
          animated: false,
          style: manual
            ? { stroke, strokeWidth: 2, ...(incident ? {} : { opacity: 0.15 }) }
            : { stroke, strokeWidth: 1.4, strokeDasharray: "6 4", ...(incident ? {} : { opacity: 0.15 }) },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: incident ? stroke : manual ? "#bfdbfe" : "#e2e8f0",
          },
        } satisfies Edge;
      }),
    [dependsEdges, selectedId]
  );

  const presentTypes = useMemo(() => {
    const present = new Set(productNodes.map((p) => (p["x-product-type"] || "other").toLowerCase()));
    return Object.keys(TYPE_META).filter((type) => present.has(type));
  }, [productNodes]);

  const selectedProduct = useMemo(
    () => productNodes.find((p) => p.id === selectedId) || null,
    [productNodes, selectedId]
  );

  const upstreamCount = useMemo(
    () => (selectedId ? dependsEdges.filter((e) => e.to === selectedId).length : 0),
    [dependsEdges, selectedId]
  );
  const downstreamCount = useMemo(
    () => (selectedId ? dependsEdges.filter((e) => e.from === selectedId).length : 0),
    [dependsEdges, selectedId]
  );

  const onSearch = () => {
    setSelectedId(undefined);
    loadGraph({ q: searchText, domain: domainFilter });
  };
  const onDomainChange = (value: string) => {
    setDomainFilter(value);
    setSelectedId(undefined);
    loadGraph({ q: searchText, domain: value });
  };
  const onFocus = () => {
    if (!selectedId) return;
    setFocusId(selectedId);
    loadGraph({ q: searchText, domain: domainFilter, focus: selectedId });
  };
  const onClearFocus = () => {
    setFocusId(undefined);
    loadGraph({ q: searchText, domain: domainFilter });
  };

  const focusedName = focusId
    ? productNodes.find((p) => p.id === focusId)?.["x-name"] || focusId
    : undefined;

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col gap-3 bg-slate-50 p-4">
      {/* toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <h1 className="text-xl font-bold flex items-center gap-2 mr-2">
          <Share2 className="w-5 h-5 text-blue-600" /> {t("productGraphPage.title")}
        </h1>
        <Input
          className="w-56"
          placeholder={t("productGraphPage.searchPlaceholder")}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSearch()}
        />
        <Button variant="outline" onClick={onSearch}>{t("productGraphPage.searchAction")}</Button>
        <Select value={domainFilter} onValueChange={onDomainChange}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("productGraphPage.domainAll")}</SelectItem>
            {domainValues.map((d) => (
              <SelectItem key={d} value={d}>{d}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => loadGraph({ q: searchText, domain: domainFilter })}>
          <RefreshCw className="w-4 h-4" />
        </Button>
        {focusId && (
          <Badge variant="outline" className="text-xs gap-1 py-1">
            {t("productGraphPage.focusedHint", { name: focusedName, depth: 1 })}
            <button onClick={onClearFocus} className="ml-1 hover:text-red-500">
              <X className="w-3 h-3" />
            </button>
          </Badge>
        )}
      </div>

      {/* canvas + side panel */}
      <div className="flex-1 min-h-0 flex gap-3">
        <div className="flex-1 min-w-0 relative border rounded-xl bg-white overflow-hidden">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center text-slate-400 gap-2">
              <Loader2 className="w-5 h-5 animate-spin" /> {t("productGraphPage.loading")}
            </div>
          ) : productNodes.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center text-slate-400">
              {t("productGraphPage.noData")}
            </div>
          ) : (
            <>
              <ReactFlow
                nodes={flowNodes}
                edges={flowEdges}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                onNodeClick={(_, node) => setSelectedId(node.id as string)}
                onPaneClick={() => setSelectedId(undefined)}
                fitView
                fitViewOptions={{ padding: 0.15 }}
                minZoom={0.1}
                proOptions={{ hideAttribution: true }}
              >
                <Background gap={22} />
                <Controls showInteractive={false} />
                <MiniMap
                  pannable
                  zoomable
                  nodeColor={(n) =>
                    typeMeta((n.data as ProductNodeData | undefined)?.product?.["x-product-type"]).color
                  }
                />
              </ReactFlow>
              {/* legend overlay */}
              <div className="pointer-events-none absolute left-3 top-3 z-10 rounded-lg border bg-white/95 px-3 py-2 shadow-sm">
                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                  <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                  {t("productGraphPage.flowDirection")}
                </div>
                <div className="mt-1.5 text-[10px] font-medium uppercase tracking-wide text-slate-400">
                  {t("productGraphPage.legendTypes")}
                </div>
                <div className="mt-1 flex max-w-md flex-wrap gap-x-3 gap-y-1">
                  {presentTypes.map((type) => (
                    <span key={type} className="flex items-center gap-1 text-xs text-slate-600">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-sm"
                        style={{ backgroundColor: typeMeta(type).color }}
                      />
                      {type}
                    </span>
                  ))}
                </div>
                <div className="mt-1.5 flex flex-col gap-1 border-t pt-1.5 text-xs text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-0.5 w-6 bg-blue-600" />
                    {t("productGraphPage.legendDeclared")}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-6 border-t-2 border-dashed border-slate-400" />
                    {t("productGraphPage.legendInferred")}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        {selectedProduct && (
          <div className="w-72 shrink-0 border rounded-xl bg-white p-4 space-y-3 overflow-auto">
            <div className="flex items-start justify-between gap-2">
              <div className="font-semibold leading-snug">{selectedProduct["x-name"]}</div>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSelectedId(undefined)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between gap-2">
                <span className="text-slate-400">{t("productGraphPage.panelStatus")}</span>
                <Badge variant="outline" className={cn("text-[10px]", statusColor(selectedProduct["x-status"]))}>
                  {selectedProduct["x-status"] || "draft"}
                </Badge>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-400">{t("productGraphPage.panelType")}</span>
                <span className="flex items-center gap-1.5">
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: typeMeta(selectedProduct["x-product-type"]).color }}
                  />
                  {selectedProduct["x-product-type"] || "other"}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-400">{t("productGraphPage.panelDomain")}</span>
                <span>{selectedProduct["x-domain"] || "-"}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-400">{t("productGraphPage.panelValue")}</span>
                <span className="font-medium text-amber-600">{selectedProduct["x-value-score"] ?? 0}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-400">{t("productGraphPage.panelTopics")}</span>
                <span>{selectedProduct["x-topic-count"] ?? 0}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-400">{t("productGraphPage.panelUpstream")}</span>
                <span>{upstreamCount}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-400">{t("productGraphPage.panelDownstream")}</span>
                <span>{downstreamCount}</span>
              </div>
            </div>
            <div className="pt-2 border-t flex gap-2">
              {focusId === selectedProduct.id ? (
                <Button variant="outline" className="flex-1" onClick={onClearFocus}>
                  {t("productGraphPage.clearFocus")}
                </Button>
              ) : (
                <Button className="flex-1" onClick={onFocus}>
                  <Focus className="w-4 h-4 mr-1" /> {t("productGraphPage.focusOn")}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DataProductGraph;
