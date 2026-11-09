import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { ProductGraphEdge, ProductGraphNode } from "@/model/dataProduct";
import { PRODUCT_NODE_HEIGHT, PRODUCT_NODE_WIDTH } from "./graphLayout";

const TYPE_COLORS: Record<string, string> = {
  topics: "#0891b2",
  subject: "#059669",
  metrics: "#2563eb",
  "semantic model": "#7c3aed",
  other: "#94a3b8",
};

const STATUS_COLORS: Record<string, string> = {
  production: "#10b981",
  development: "#2492ff",
  testing: "#2492ff",
  acceptance: "#2492ff",
  sunset: "#94a3b8",
  retired: "#94a3b8",
  announcement: "#f59e0b",
  draft: "#f59e0b",
};

const typeColor = (type?: string) => TYPE_COLORS[(type || "other").toLowerCase()] ?? TYPE_COLORS.other;
const statusColor = (status?: string) => STATUS_COLORS[status || "draft"] ?? STATUS_COLORS.draft;

export default function ProductDependencyGraph({
  products,
  edges,
  positions,
  selectedId,
  focusId,
  neighbors,
  onSelect,
}: {
  products: ProductGraphNode[];
  edges: ProductGraphEdge[];
  positions: Map<string, { x: number; y: number }>;
  selectedId?: string;
  focusId?: string;
  neighbors: Set<string> | null;
  onSelect: (id?: string) => void;
}) {
  const { t } = useTranslation("dataAsset");
  const bounds = useMemo(() => {
    const points = products.map((product) => positions.get(product.id) ?? { x: 0, y: 0 });
    const minX = Math.min(...points.map((point) => point.x), 0) - 45;
    const minY = Math.min(...points.map((point) => point.y), 0) - 45;
    const maxX = Math.max(...points.map((point) => point.x), PRODUCT_NODE_WIDTH) + PRODUCT_NODE_WIDTH + 45;
    const maxY = Math.max(...points.map((point) => point.y), PRODUCT_NODE_HEIGHT) + PRODUCT_NODE_HEIGHT + 85;
    return { minX, minY, width: Math.max(maxX - minX, 900), height: Math.max(maxY - minY, 460) };
  }, [products, positions]);

  return (
    <div className="graph-grid relative h-full min-h-[460px] overflow-auto rounded-b-xl">
      <svg
        viewBox={`${bounds.minX} ${bounds.minY} ${bounds.width} ${bounds.height}`}
        className="block"
        style={{ width: Math.max(bounds.width, 900), height: Math.max(bounds.height, 460) }}
        role="img"
        aria-label={t("productGraphPage.title")}
      >
        <defs>
          <marker id="product-dag-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill="#8aa4bf" />
          </marker>
          <marker id="product-dag-arrow-manual" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill="#64748b" />
          </marker>
        </defs>
        {edges.map((edge) => {
          const source = positions.get(edge.from);
          const target = positions.get(edge.to);
          if (!source || !target) return null;
          const x1 = source.x + PRODUCT_NODE_WIDTH;
          const y1 = source.y + PRODUCT_NODE_HEIGHT / 2;
          const x2 = target.x;
          const y2 = target.y + PRODUCT_NODE_HEIGHT / 2;
          const middle = x1 + Math.max(35, (x2 - x1) / 2);
          const path = `M ${x1} ${y1} H ${middle} V ${y2} H ${x2 - 4}`;
          const manual = edge.confidence === "high" || edge["x-origin"] === "manual";
          const incident = !selectedId || edge.from === selectedId || edge.to === selectedId;
          return (
            <path
              key={`${edge.from}->${edge.to}`}
              d={path}
              fill="none"
              stroke={manual ? "#64748b" : "#8aa4bf"}
              strokeWidth={manual ? 1.8 : 1.5}
              strokeDasharray={manual ? "7 4" : undefined}
              markerEnd={`url(#${manual ? "product-dag-arrow-manual" : "product-dag-arrow"})`}
              opacity={incident ? 0.85 : 0.15}
            />
          );
        })}
        {products.map((product) => {
          const position = positions.get(product.id) ?? { x: 0, y: 0 };
          const active = selectedId === product.id;
          const focused = focusId === product.id;
          const dimmed = neighbors != null && !neighbors.has(product.id);
          const name = product["x-name"] || product.id;
          const type = product["x-product-type"] || "other";
          const domain = product["x-domain"] || "-";
          return (
            <g
              key={product.id}
              transform={`translate(${position.x},${position.y})`}
              className="cursor-pointer"
              role="button"
              tabIndex={0}
              opacity={dimmed ? 0.25 : 1}
              onClick={() => onSelect(product.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelect(product.id);
                }
              }}
            >
              <rect
                width={PRODUCT_NODE_WIDTH}
                height={PRODUCT_NODE_HEIGHT}
                rx="10"
                fill="#fff"
                stroke={active ? "#2492ff" : focused ? "#f59e0b" : "#dce6f0"}
                strokeWidth={active || focused ? 2 : 1}
                filter="drop-shadow(0 3px 5px rgba(15,23,42,.06))"
              />
              <rect width="4" height={PRODUCT_NODE_HEIGHT} rx="2" fill={typeColor(type)} />
              <circle cx="17" cy="18" r="4" fill={statusColor(product["x-status"])} />
              <text x="29" y="22" fontSize="12" fontWeight="600" fill="#1e293b">
                {name.length > 17 ? `${name.slice(0, 17)}…` : name}
              </text>
              <text x="16" y="43" fontSize="10" fill="#94a3b8">
                {type} · {product["x-status"] || "draft"}
              </text>
              <text x="16" y="58" fontSize="9" fill="#64748b">
                {domain} · {product["x-value-score"] ?? 0}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="absolute left-3 top-3 flex flex-wrap gap-3 rounded-lg border bg-white/90 px-3 py-2 text-[10px] text-slate-500 shadow-sm backdrop-blur">
        <span className="flex items-center gap-1.5"><i className="h-0.5 w-5 bg-slate-400" />{t("productGraphPage.legendDeclared")}</span>
        <span className="flex items-center gap-1.5"><i className="h-0.5 w-5 bg-blue-300" />{t("productGraphPage.legendInferred")}</span>
        <span>{t("productGraphPage.selectNodeHint")}</span>
      </div>
    </div>
  );
}
