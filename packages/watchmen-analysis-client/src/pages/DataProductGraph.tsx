import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Focus, Loader2, RefreshCw, Share2, X } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { ProductGraph } from "@/model/dataProduct";
import { dataProductService } from "@/services/dataProductService";
import ProductDependencyGraph from "@/components/data-product/ProductDependencyGraph";
import { computeProductLayout } from "@/components/data-product/graphLayout";

const TYPE_COLORS: Record<string, string> = {
  topics: "#0891b2",
  subject: "#059669",
  metrics: "#2563eb",
  "semantic model": "#7c3aed",
  other: "#94a3b8",
};

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

const typeColor = (type?: string) => TYPE_COLORS[(type || "other").toLowerCase()] ?? TYPE_COLORS.other;

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
      const response = await dataProductService.getProductGraph({
        q: params.q || undefined,
        domain: params.domain && params.domain !== "all" ? params.domain : undefined,
        focus: params.focus,
        depth: params.focus ? 1 : undefined,
      });
      setGraph(response);
    } catch (error) {
      toast({ title: error instanceof Error ? error.message : String(error), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGraph({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const productNodes = useMemo(
    () => (graph?.graph.nodes || []).filter((node) => node.type === "DataProduct"),
    [graph],
  );
  const domainValues = useMemo(() => {
    const values = new Set<string>();
    (graph?.graph.nodes || []).forEach((node) => {
      if (node["x-domain"]) values.add(node["x-domain"]);
    });
    return Array.from(values).sort();
  }, [graph]);
  const dependsEdges = useMemo(
    () => (graph?.graph.edges || []).filter((edge) => edge.type === "dependsOn"),
    [graph],
  );
  const neighborsOfSelected = useMemo(() => {
    if (!selectedId) return null;
    const neighbors = new Set<string>([selectedId]);
    dependsEdges.forEach((edge) => {
      if (edge.from === selectedId) neighbors.add(edge.to);
      if (edge.to === selectedId) neighbors.add(edge.from);
    });
    return neighbors;
  }, [selectedId, dependsEdges]);
  const positions = useMemo(
    () => computeProductLayout(productNodes, dependsEdges),
    [productNodes, dependsEdges],
  );
  const selectedProduct = useMemo(
    () => productNodes.find((product) => product.id === selectedId) || null,
    [productNodes, selectedId],
  );
  const upstreamCount = useMemo(
    () => selectedId ? dependsEdges.filter((edge) => edge.to === selectedId).length : 0,
    [dependsEdges, selectedId],
  );
  const downstreamCount = useMemo(
    () => selectedId ? dependsEdges.filter((edge) => edge.from === selectedId).length : 0,
    [dependsEdges, selectedId],
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
    ? productNodes.find((product) => product.id === focusId)?.["x-name"] || focusId
    : undefined;

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col gap-3 bg-slate-50 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="mr-2 flex items-center gap-2 text-xl font-bold">
          <Share2 className="h-5 w-5 text-blue-600" /> {t("productGraphPage.title")}
        </h1>
        <Input
          className="w-56"
          placeholder={t("productGraphPage.searchPlaceholder")}
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && onSearch()}
        />
        <Button variant="outline" onClick={onSearch}>{t("productGraphPage.searchAction")}</Button>
        <Select value={domainFilter} onValueChange={onDomainChange}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("productGraphPage.domainAll")}</SelectItem>
            {domainValues.map((domain) => <SelectItem key={domain} value={domain}>{domain}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => loadGraph({ q: searchText, domain: domainFilter })}>
          <RefreshCw className="h-4 w-4" />
        </Button>
        {focusId && (
          <Badge variant="outline" className="gap-1 py-1 text-xs">
            {t("productGraphPage.focusedHint", { name: focusedName, depth: 1 })}
            <button onClick={onClearFocus} className="ml-1 hover:text-red-500"><X className="h-3 w-3" /></button>
          </Badge>
        )}
      </div>

      <div className="flex min-h-0 flex-1 gap-3">
        <div className="relative min-w-0 flex-1 overflow-hidden rounded-xl border bg-white">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center gap-2 text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin" /> {t("productGraphPage.loading")}
            </div>
          ) : productNodes.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center text-slate-400">
              {t("productGraphPage.noData")}
            </div>
          ) : (
            <ProductDependencyGraph
              products={productNodes}
              edges={dependsEdges}
              positions={positions}
              selectedId={selectedId}
              focusId={focusId}
              neighbors={neighborsOfSelected}
              onSelect={setSelectedId}
            />
          )}
        </div>

        {selectedProduct && (
          <div className="w-72 shrink-0 space-y-3 overflow-auto rounded-xl border bg-white p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="font-semibold leading-snug">{selectedProduct["x-name"]}</div>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSelectedId(undefined)}>
                <X className="h-4 w-4" />
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
                  <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: typeColor(selectedProduct["x-product-type"]) }} />
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
            <div className="flex gap-2 border-t pt-2">
              {focusId === selectedProduct.id ? (
                <Button variant="outline" className="flex-1" onClick={onClearFocus}>{t("productGraphPage.clearFocus")}</Button>
              ) : (
                <Button className="flex-1" onClick={onFocus}><Focus className="mr-1 h-4 w-4" /> {t("productGraphPage.focusOn")}</Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DataProductGraph;
