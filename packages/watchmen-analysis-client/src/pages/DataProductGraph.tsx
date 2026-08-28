import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  RefreshCw, Focus, X, Share2, Loader2,
} from "lucide-react";
import {
  ReactFlow, Background, Controls, MiniMap, Handle, Position, MarkerType,
  BaseEdge, EdgeLabelRenderer, useInternalNode,
  type Node, type Edge, type NodeProps, type EdgeProps,
} from "@xyflow/react";
import { useSidebar } from "@/contexts/SidebarContext";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
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
const COL_GAP = 130;
const ROW_GAP = 36;

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

// deterministic accent color per domain value
const DOMAIN_COLORS = ["#2563eb", "#059669", "#d97706", "#7c3aed", "#db2777", "#0891b2", "#65a30d", "#ea580c"];
const domainColor = (domain?: string) => {
  if (!domain) return "#94a3b8";
  let hash = 0;
  for (let i = 0; i < domain.length; i += 1) hash = (hash * 31 + domain.charCodeAt(i)) >>> 0;
  return DOMAIN_COLORS[hash % DOMAIN_COLORS.length];
};

type ProductNodeData = {
  product: ProductGraphNode;
  dimmed: boolean;
  focused: boolean;
};
type ProductFlowNode = Node<ProductNodeData, "productNode">;

const ProductNodeView = React.memo(function ProductNodeView({ data, selected }: NodeProps<ProductFlowNode>) {
  const { product, dimmed, focused } = data;
  const domain = product["x-domain"];
  return (
    <div
      className={cn(
        "rounded-lg border bg-white px-3 py-2 shadow-sm transition-opacity",
        selected && "ring-2 ring-blue-500 ring-offset-1",
        dimmed && "opacity-25",
        focused && "ring-2 ring-amber-500",
      )}
      style={{ width: NODE_WIDTH, borderLeft: `4px solid ${domainColor(domain)}` }}
    >
      <Handle type="target" position={Position.Left} className="!h-2 !w-2 !opacity-0 !pointer-events-none" />
      <div className="truncate text-sm font-medium">{product["x-name"] || product.id}</div>
      <div className="mt-1 flex items-center gap-1 flex-wrap">
        <Badge variant="outline" className={cn("text-[10px] px-1", statusColor(product["x-status"]))}>
          {product["x-status"] || "draft"}
        </Badge>
        {domain && (
          <span className="text-[10px] text-slate-500 truncate max-w-28">{domain}</span>
        )}
        <span className="ml-auto text-[10px] text-amber-600 font-medium">
          {product["x-value-score"] ?? 0}
        </span>
      </div>
      <Handle type="source" position={Position.Right} className="!h-2 !w-2 !opacity-0 !pointer-events-none" />
    </div>
  );
});

const nodeTypes = { productNode: ProductNodeView };

// ---------------------------------------------------------------------------
// Floating edge: attaches to the nearest boundary points of the two node
// rectangles instead of fixed side handles, so arrows always connect "就近".
// ---------------------------------------------------------------------------
const EDGE_HIT_PAD = 6;

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
  const labelX = (start.x + end.x) / 2;
  const labelY = (start.y + end.y) / 2;
  return (
    <>
      <BaseEdge
        id={id}
        path={`M ${start.x},${start.y} L ${end.x},${end.y}`}
        markerEnd={markerEnd}
        style={style}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            fontSize: 9,
            fill: "#64748b",
            color: "#64748b",
            pointerEvents: "none",
          }}
        >
          dependsOn
        </div>
      </EdgeLabelRenderer>
    </>
  );
};

const edgeTypes = { floating: FloatingEdge };

// longest-path layering over dependsOn edges (upstream on the left)
const computeLayout = (
  products: ProductGraphNode[],
  dependsEdges: Array<{ from: string; to: string }>,
): Map<string, { x: number; y: number }> => {
  const adjacency = new Map<string, string[]>();
  products.forEach((p) => adjacency.set(p.id, []));
  dependsEdges.forEach((e) => adjacency.get(e.from)?.push(e.to));

  const levels = new Map<string, number>();
  const visiting = new Set<string>();
  const levelOf = (id: string): number => {
    if (levels.has(id)) return levels.get(id) as number;
    if (visiting.has(id)) return 0;
    visiting.add(id);
    let level = 0;
    for (const target of adjacency.get(id) || []) {
      level = Math.max(level, levelOf(target) + 1);
    }
    visiting.delete(id);
    levels.set(id, level);
    return level;
  };
  products.forEach((p) => levelOf(p.id));

  const positions = new Map<string, { x: number; y: number }>();
  const columns = new Map<number, string[]>();
  products.forEach((p) => {
    const level = levels.get(p.id) ?? 0;
    if (!columns.has(level)) columns.set(level, []);
    columns.get(level)!.push(p.id);
  });
  const maxLevel = Math.max(0, ...Array.from(columns.keys()));
  const totalWidth = maxLevel * (NODE_WIDTH + COL_GAP);
  columns.forEach((ids, level) => {
    const height = ids.length * (NODE_HEIGHT + ROW_GAP);
    const yOffset = -height / 2;
    ids.forEach((id, index) => {
      positions.set(id, {
        x: level * (NODE_WIDTH + COL_GAP) - totalWidth / 2,
        y: yOffset + index * (NODE_HEIGHT + ROW_GAP),
      });
    });
  });
  return positions;
};

const DataProductGraph: React.FC = () => {
  const { collapsed } = useSidebar();
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
      toast.error(err instanceof Error ? err.message : String(err));
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
        return {
          id: `${e.from}->${e.to}`,
          source: e.from,
          target: e.to,
          type: "floating",
          animated: false,
          style: manual
            ? { stroke: "#2563eb", strokeWidth: 2 }
            : { stroke: "#94a3b8", strokeWidth: 1.4, strokeDasharray: "6 4" },
          markerEnd: { type: MarkerType.ArrowClosed, color: manual ? "#2563eb" : "#94a3b8" },
        } satisfies Edge;
      }),
    [dependsEdges]
  );

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
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <div className={`flex-1 flex flex-col h-screen transition-all duration-300 ${collapsed ? "ml-20" : "ml-56"}`}>
        <Header />
        <div className="flex-1 min-h-0 flex flex-col p-4 gap-3">
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
            <Button variant="outline" onClick={onSearch}>{t("productGraphPage.searchPlaceholder")}</Button>
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
            <div className="ml-auto flex items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <span className="inline-block w-6 h-0.5 bg-blue-600" />
                {t("productGraphPage.legendDeclared")}
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-6 border-t-2 border-dashed border-slate-400" />
                {t("productGraphPage.legendInferred")}
              </span>
            </div>
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
                <ReactFlow
                  nodes={flowNodes}
                  edges={flowEdges}
                  nodeTypes={nodeTypes}
                  edgeTypes={edgeTypes}
                  onNodeClick={(_, node) => setSelectedId(node.id as string)}
                  onPaneClick={() => setSelectedId(undefined)}
                  fitView
                  minZoom={0.1}
                  proOptions={{ hideAttribution: true }}
                >
                  <Background gap={18} />
                  <Controls showInteractive={false} />
                  <MiniMap pannable zoomable />
                </ReactFlow>
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
                    <span>{selectedProduct["x-product-type"] || "-"}</span>
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
      </div>
    </div>
  );
};

export default DataProductGraph;
