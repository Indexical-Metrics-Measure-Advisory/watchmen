import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  BarChart3, Database, Layers, Package, HardDrive, Camera, RefreshCw,
  TrendingUp, Trophy, Table2,
} from "lucide-react";
import {
  LineChart as RechartLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, BarChart, Bar,
} from "recharts";
import { useSidebar } from "@/contexts/SidebarContext";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { useTranslation } from "react-i18next";

import type { AssetMapResponse } from "@/model/dataProduct";
import { dataProductService } from "@/services/dataProductService";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

const formatNumber = (n: number) => {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n ?? 0);
};

const StatCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
}> = ({ icon, label, value, sub }) => (
  <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-start gap-3">
    <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
      {icon}
    </div>
    <div className="min-w-0">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-2xl font-bold leading-tight">{value}</div>
      {sub && <div className="text-xs text-slate-400 mt-0.5">{sub}</div>}
    </div>
  </div>
);

const RankingPanel: React.FC<{
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, icon, children }) => (
  <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col">
    <div className="flex items-center gap-2 mb-3">
      {icon}
      <h3 className="font-semibold text-sm">{title}</h3>
    </div>
    <div className="flex-1 min-h-0">{children}</div>
  </div>
);

const AssetMap: React.FC = () => {
  const { collapsed } = useSidebar();
  const { t } = useTranslation("dataAsset");
  const [data, setData] = useState<AssetMapResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [snapshotting, setSnapshotting] = useState(false);

  const loadMap = async () => {
    setLoading(true);
    try {
      const resp = await dataProductService.getAssetMap();
      setData(resp);
    } catch (err) {
      toast.error(t("assetMapPage.loadFailed", { message: err instanceof Error ? err.message : String(err) }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSnapshot = async () => {
    setSnapshotting(true);
    try {
      await dataProductService.takeSnapshot();
      toast.success(t("assetMapPage.snapshotSaved"));
      loadMap();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setSnapshotting(false);
    }
  };

  const trendData = useMemo(
    () =>
      (data?.storage_trend || []).map((s) => ({
        date: s.snapshot_date,
        rows: s.total_rows,
        topics: s.total_topics,
        products: s.product_count,
      })),
    [data]
  );

  const valueData = useMemo(
    () =>
      (data?.value_ranking || []).map((p) => ({
        name: p.display_name || p.name,
        value_score: p.value_score,
        rows: p.rows,
      })),
    [data]
  );

  const storageData = useMemo(
    () =>
      (data?.storage_ranking || []).map((s) => ({
        name: s.topic_name || s.topic_id,
        rows: s.rows,
      })),
    [data]
  );

  const maxInventory = useMemo(() => {
    const list = data?.inventory_ranking || [];
    return Math.max(1, ...list.map((c) => c.product_count));
  }, [data]);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <div className={`flex-1 flex flex-col h-screen transition-all duration-300 ${collapsed ? "ml-20" : "ml-56"}`}>
        <Header />
        <div className="flex-1 min-h-0 overflow-auto p-6 space-y-4">
          {/* header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-600" /> {t("assetMapPage.title")}
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                {t("assetMapPage.subtitle")}
                {data?.generated_at && ` · ${t("assetMapPage.generatedAt", { time: new Date(data.generated_at).toLocaleString() })}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={loadMap} title={t("actions.refresh")}>
                <RefreshCw className="w-4 h-4" />
              </Button>
              <Button onClick={handleSnapshot} disabled={snapshotting}>
                <Camera className="w-4 h-4 mr-1" />
                {snapshotting ? t("assetMapPage.snapshotting") : t("assetMapPage.snapshot")}
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="text-sm text-slate-400 text-center py-16">{t("assetMapPage.loading")}</div>
          ) : !data ? (
            <div className="text-sm text-slate-400 text-center py-16">{t("assetMapPage.noData")}</div>
          ) : (
            <>
              {/* resource statistics */}
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
                <StatCard icon={<Table2 className="w-5 h-5" />} label={t("assetMapPage.statTopics")} value={formatNumber(data.total_topics)} />
                <StatCard icon={<Database className="w-5 h-5" />} label={t("assetMapPage.statRows")} value={formatNumber(data.total_rows)} />
                <StatCard icon={<Layers className="w-5 h-5" />} label={t("assetMapPage.statFactors")} value={formatNumber(data.total_factors)} />
                <StatCard icon={<Package className="w-5 h-5" />} label={t("assetMapPage.statProducts")} value={formatNumber(data.total_products)} />
                <StatCard icon={<HardDrive className="w-5 h-5" />} label={t("assetMapPage.statDatasources")} value={formatNumber(data.total_datasources)} />
                <StatCard icon={<FolderIcon />} label={t("assetMapPage.statCatalogs")} value={formatNumber(data.total_catalogs)} />
              </div>

              {/* storage trend */}
              <RankingPanel title={t("assetMapPage.storageTrend")} icon={<TrendingUp className="w-4 h-4 text-blue-600" />}>
                {trendData.length === 0 ? (
                  <div className="text-sm text-slate-400 text-center py-10">
                    {t("assetMapPage.noSnapshot")}
                  </div>
                ) : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartLineChart data={trendData} margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={formatNumber} />
                        <Tooltip formatter={(v: unknown) => formatNumber(Number(v))} />
                        <Legend />
                        <Line type="monotone" dataKey="rows" name={t("assetMapPage.legendRows")} stroke="#2563eb" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="topics" name={t("assetMapPage.legendTopics")} stroke="#10b981" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="products" name={t("assetMapPage.legendProducts")} stroke="#8b5cf6" strokeWidth={2} dot={false} />
                      </RechartLineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </RankingPanel>

              {/* rankings */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <RankingPanel title={t("assetMapPage.valueRanking")} icon={<Trophy className="w-4 h-4 text-amber-500" />}>
                  {valueData.length === 0 ? (
                    <div className="text-sm text-slate-400 text-center py-10">{t("assetMapPage.noProducts")}</div>
                  ) : (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={valueData} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 8 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis type="number" tick={{ fontSize: 11 }} />
                          <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Bar dataKey="value_score" name={t("assetMapPage.barValueScore")} fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={14} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </RankingPanel>

                <RankingPanel title={t("assetMapPage.storageRanking")} icon={<HardDrive className="w-4 h-4 text-blue-600" />}>
                  {storageData.length === 0 ? (
                    <div className="text-sm text-slate-400 text-center py-10">{t("assetMapPage.noTopicsData")}</div>
                  ) : (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={storageData} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 8 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={formatNumber} />
                          <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} />
                          <Tooltip formatter={(v: unknown) => formatNumber(Number(v))} />
                          <Bar dataKey="rows" name={t("assetMapPage.barRows")} fill="#2563eb" radius={[0, 4, 4, 0]} barSize={14} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </RankingPanel>
              </div>

              {/* inventory ranking */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <RankingPanel title={t("assetMapPage.inventoryRanking")} icon={<Layers className="w-4 h-4 text-purple-600" />}>
                  {(data.inventory_ranking || []).length === 0 ? (
                    <div className="text-sm text-slate-400 text-center py-10">{t("assetMapPage.noCatalogs")}</div>
                  ) : (
                    <div className="space-y-2">
                      {(data.inventory_ranking || []).map((c, i) => (
                        <div key={c.catalog_id || c.name} className="flex items-center gap-2">
                          <span className="text-xs text-slate-400 w-5">{i + 1}</span>
                          <span className="text-sm w-36 truncate">{c.name}</span>
                          <div className="flex-1 h-4 bg-slate-100 rounded overflow-hidden">
                            <div
                              className="h-full bg-purple-500 rounded"
                              style={{ width: `${(c.product_count / maxInventory) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium w-8 text-right">{c.product_count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </RankingPanel>

                <RankingPanel title={t("assetMapPage.domainRanking")} icon={<Package className="w-4 h-4 text-emerald-600" />}>
                  {(data.domain_ranking || []).length === 0 ? (
                    <div className="text-sm text-slate-400 text-center py-10">{t("assetMapPage.noDomains")}</div>
                  ) : (
                    <ScrollArea className="h-full max-h-56">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t("assetMapPage.headerDomain")}</TableHead>
                            <TableHead className="text-right">{t("assetMapPage.headerProductCount")}</TableHead>
                            <TableHead className="text-right">{t("assetMapPage.headerRows")}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(data.domain_ranking || []).map((d) => (
                            <TableRow key={d.domain}>
                              <TableCell>
                                <Badge variant="outline">{d.domain}</Badge>
                              </TableCell>
                              <TableCell className="text-right">{d.product_count}</TableCell>
                              <TableCell className="text-right">{formatNumber(d.rows)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  )}
                </RankingPanel>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const FolderIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
  </svg>
);

export default AssetMap;
