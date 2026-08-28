import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Search, Plus, Trash2, Edit2, Save, Package, FolderTree, Table2, Layers,
  ChevronRight, ChevronDown, Upload, FileJson, RefreshCw,
} from "lucide-react";
import { useSidebar } from "@/contexts/SidebarContext";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { useTranslation } from "react-i18next";

import type {
  DataAssetCatalog, DataAssetCatalogUpsert, DataProduct, DataProductUpsert,
  DataProductStatus, DataProductType, DataProductVisibility, TopicDetails,
} from "@/model/dataProduct";
import { dataProductService } from "@/services/dataProductService";
import { topicService, type Topic } from "@/services/topicService";
import { metricsService } from "@/services/metricsService";
import { getCategories } from "@/services/metricsManagementService";
import { listAnalyses } from "@/services/biAnalysisService";
import { ontologyService } from "@/services/ontologyService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------
const statusColor = (status: string) => {
  switch (status) {
    case "production":
      return "bg-green-100 text-green-800 border-green-200";
    case "draft":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "development":
    case "testing":
    case "acceptance":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "sunset":
    case "retired":
      return "bg-gray-100 text-gray-800 border-gray-200";
    default:
      return "bg-purple-100 text-purple-800 border-purple-200";
  }
};

interface CatalogNode extends DataAssetCatalog {
  children: CatalogNode[];
}

const buildCatalogTree = (catalogs: DataAssetCatalog[]): CatalogNode[] => {
  const map = new Map<string, CatalogNode>();
  catalogs
    .slice()
    .sort((a, b) => (a.order_index || 0) - (b.order_index || 0) || a.name.localeCompare(b.name))
    .forEach((c) => map.set(c.id, { ...c, children: [] }));
  const roots: CatalogNode[] = [];
  map.forEach((node) => {
    if (node.parent_id && map.has(node.parent_id)) {
      map.get(node.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
};

// ---------------------------------------------------------------------------
// Catalog form dialog
// ---------------------------------------------------------------------------
const CatalogFormDialog: React.FC<{
  open: boolean;
  initial?: DataAssetCatalog | null;
  parentId?: string | null;
  catalogs: DataAssetCatalog[];
  onClose: () => void;
  onSubmit: (payload: DataAssetCatalogUpsert) => void;
}> = ({ open, initial, parentId, catalogs, onClose, onSubmit }) => {
  const { t } = useTranslation("dataAsset");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [pid, setPid] = useState<string>("");

  useEffect(() => {
    if (open) {
      setName(initial?.name || "");
      setDescription(initial?.description || "");
      setPid(initial?.parent_id || parentId || "");
    }
  }, [open, initial, parentId]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? t("catalogPanel.editTitle") : t("catalogPanel.createTitle")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>{t("catalogPanel.name")}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("catalogPanel.namePlaceholder")} />
          </div>
          <div>
            <Label>{t("catalogPanel.parent")}</Label>
            <Select value={pid || "root"} onValueChange={(v) => setPid(v === "root" ? "" : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="root">{t("catalogPanel.root")}</SelectItem>
                {catalogs
                  .filter((c) => c.id !== initial?.id)
                  .map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t("catalogPanel.description")}</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>{t("actions.cancel")}</Button>
            <Button
              disabled={!name.trim()}
              onClick={() =>
                onSubmit({
                  id: initial?.id,
                  name: name.trim(),
                  description: description.trim() || undefined,
                  parent_id: pid || undefined,
                  order_index: initial?.order_index || 0,
                })
              }
            >
              <Save className="w-4 h-4 mr-1" /> {t("actions.save")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ---------------------------------------------------------------------------
// Batch add dialog: pick topics and create products into a catalog
// ---------------------------------------------------------------------------
const BatchAddDialog: React.FC<{
  open: boolean;
  catalogId?: string;
  topics: Topic[];
  onClose: () => void;
  onSubmit: (topicIds: string[]) => void;
}> = ({ open, catalogId, topics, onClose, onSubmit }) => {
  const { t } = useTranslation("dataAsset");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (open) {
      setSelected(new Set());
      setQuery("");
    }
  }, [open]);

  const filtered = useMemo(() => {
    if (!query.trim()) return topics;
    const q = query.toLowerCase();
    return topics.filter(
      (t) => t.name.toLowerCase().includes(q) || (t.description || "").toLowerCase().includes(q)
    );
  }, [topics, query]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("batchAdd.title")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 w-4 h-4 text-slate-400" />
            <Input
              placeholder={t("batchAdd.searchPlaceholder")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-8"
            />
          </div>
          <ScrollArea className="h-72 border rounded-md">
            <div className="p-2 space-y-1">
              {filtered.map((t) => (
                <label
                  key={t.id}
                  className="flex items-center gap-2 p-2 rounded hover:bg-slate-50 cursor-pointer"
                >
                  <Checkbox
                    checked={selected.has(t.id)}
                    onCheckedChange={() => toggle(t.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{t.name}</div>
                    <div className="text-xs text-slate-500 truncate">
                      {t.description || `${t.factors?.length || 0} fields`}
                    </div>
                  </div>
                </label>
              ))}
              {filtered.length === 0 && (
                <div className="text-sm text-slate-400 text-center p-6">{t("batchAdd.noMatch")}</div>
              )}
            </div>
          </ScrollArea>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">{t("batchAdd.selected", { count: selected.size })}</span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>{t("actions.cancel")}</Button>
              <Button
                disabled={selected.size === 0}
                onClick={() => onSubmit(Array.from(selected))}
              >
                <Upload className="w-4 h-4 mr-1" /> {t("actions.add")}
              </Button>
            </div>
          </div>
          {!catalogId && (
            <p className="text-xs text-amber-600">{t("batchAdd.noCatalogHint")}</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ---------------------------------------------------------------------------
// Topic (table) details dialog
// ---------------------------------------------------------------------------
const TopicDetailsDialog: React.FC<{
  topicId: string | null;
  onClose: () => void;
}> = ({ topicId, onClose }) => {
  const { t } = useTranslation("dataAsset");
  const [details, setDetails] = useState<TopicDetails | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!topicId) {
      setDetails(null);
      return;
    }
    setLoading(true);
    dataProductService
      .getTopicDetails(topicId)
      .then(setDetails)
      .catch((err) => toast.error(t("details.loadFailed", { message: err instanceof Error ? err.message : String(err) })))
      .finally(() => setLoading(false));
  }, [topicId, t]);

  return (
    <Dialog open={!!topicId} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Table2 className="w-5 h-5 text-blue-600" /> {t("details.title")}
          </DialogTitle>
        </DialogHeader>
        {loading || !details ? (
          <div className="text-sm text-slate-400 p-6 text-center">{t("actions.loading")}</div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-50 rounded-lg">
                <div className="text-xs text-slate-500">{t("details.rows")}</div>
                <div className="text-xl font-bold">{details.rows.toLocaleString()}</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <div className="text-xs text-slate-500">{t("details.fields")}</div>
                <div className="text-xl font-bold">{details.factorCount}</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <div className="text-xs text-slate-500">{t("details.type")}</div>
                <div className="text-sm font-medium pt-1">{details.type}</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <div className="text-xs text-slate-500">{t("details.datasource")}</div>
                <div className="text-sm font-medium pt-1 truncate">{details.dataSourceId || "-"}</div>
              </div>
            </div>
            {details.description && (
              <p className="text-sm text-slate-600">{details.description}</p>
            )}
            <ScrollArea className="h-64 border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("details.field")}</TableHead>
                    <TableHead>{t("details.label")}</TableHead>
                    <TableHead>{t("details.type")}</TableHead>
                    <TableHead>{t("details.fieldDesc")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {details.factors.map((f) => (
                    <TableRow key={f.name}>
                      <TableCell className="font-medium">{f.name}</TableCell>
                      <TableCell>{f.label || "-"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">{f.type}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">{f.description || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

// ---------------------------------------------------------------------------
// Product form dialog: common fields + full ODPS JSON editor
// ---------------------------------------------------------------------------
const emptyProductForm = (): DataProductUpsert => ({
  name: "",
  display_name: "",
  status: "draft",
  product_type: "dataset",
  visibility: "private",
  domain: "",
  owner: "",
  description: "",
  value_proposition: "",
  tags: [],
  product_version: "1.0.0",
  value_score: 0,
  catalog_id: undefined,
  topic_ids: [],
  metric_names: [],
  metric_category_ids: [],
  board_ids: [],
  subject_ids: [],
  ontology_ids: [],
  upstream_product_ids: [],
});

interface AssociationOption {
  id: string;
  name: string;
}

type AssocField = "topic_ids" | "metric_names" | "metric_category_ids" | "board_ids" | "subject_ids" | "ontology_ids";

// coarse mapping from ODPS product type to associable contents:
// data types (raw data/derived data/dataset) -> tables, metrics, categories, subjects
// analytic types (reports/analytic view) -> metrics, categories, boards, subjects, ontologies
// application/other -> everything
const DATA_PRODUCT_TYPES = ["raw data", "derived data", "dataset"];
const ANALYTIC_PRODUCT_TYPES = ["reports", "analytic view"];
const ALL_ASSOC_FIELDS: AssocField[] = [
  "topic_ids", "metric_names", "metric_category_ids", "board_ids", "subject_ids", "ontology_ids",
];

const visibleAssocFields = (productType: string | undefined, form: DataProductUpsert): Set<AssocField> => {
  // a group carrying saved selections always stays visible, so nothing gets lost
  const hasSaved = (field: AssocField) => ((form[field] as string[]) || []).length > 0;
  if (!productType || productType === "application" || productType === "other") {
    return new Set(ALL_ASSOC_FIELDS);
  }
  const allowed: AssocField[] = DATA_PRODUCT_TYPES.includes(productType)
    ? ["topic_ids", "metric_names", "metric_category_ids", "subject_ids"]
    : ANALYTIC_PRODUCT_TYPES.includes(productType)
      ? ["metric_names", "metric_category_ids", "board_ids", "subject_ids", "ontology_ids"]
      : ALL_ASSOC_FIELDS;
  return new Set([...allowed, ...ALL_ASSOC_FIELDS.filter(hasSaved)]);
};

interface AssociationOptions {
  metrics: AssociationOption[];
  categories: AssociationOption[];
  boards: AssociationOption[];
  subjects: AssociationOption[];
  ontologies: AssociationOption[];
}

const emptyAssociationOptions = (): AssociationOptions => ({
  metrics: [], categories: [], boards: [], subjects: [], ontologies: [],
});

// one multi-select checkbox group for an associated content type
const AssociationPicker: React.FC<{
  label: string;
  options: AssociationOption[];
  selected: string[];
  onToggle: (id: string) => void;
  searchPlaceholder: string;
  emptyText: string;
}> = ({ label, options, selected, onToggle, searchPlaceholder, emptyText }) => {
  const [filter, setFilter] = useState("");
  const visible = options.filter((o) => !filter || o.name.toLowerCase().includes(filter.toLowerCase()));
  return (
    <div>
      <Label>{label}{selected.length > 0 ? ` (${selected.length})` : ""}</Label>
      <Input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder={searchPlaceholder}
        className="h-8 mt-1"
      />
      <ScrollArea className="h-32 border rounded-md mt-1">
        <div className="p-2 space-y-1">
          {visible.map((o) => (
            <label key={o.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-slate-50 cursor-pointer">
              <Checkbox checked={selected.includes(o.id)} onCheckedChange={() => onToggle(o.id)} />
              <span className="text-sm truncate">{o.name}</span>
            </label>
          ))}
          {visible.length === 0 && (
            <div className="text-sm text-slate-400 text-center p-3">{emptyText}</div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

const ProductFormDialog: React.FC<{
  open: boolean;
  initial?: DataProduct | null;
  defaultCatalogId?: string;
  catalogs: DataAssetCatalog[];
  topics: Topic[];
  products: DataProduct[];
  onClose: () => void;
  onSubmit: (payload: DataProductUpsert) => void;
}> = ({ open, initial, defaultCatalogId, catalogs, topics, products, onClose, onSubmit }) => {
  const { t } = useTranslation("dataAsset");
  const [form, setForm] = useState<DataProductUpsert>(emptyProductForm());
  const [tagsText, setTagsText] = useState("");
  const [jsonText, setJsonText] = useState("");
  const [assocOptions, setAssocOptions] = useState<AssociationOptions>(emptyAssociationOptions());

  useEffect(() => {
    if (!open) return;
    // load association candidates once per dialog open; failures stay silent
    // (the matching picker simply shows no options)
    (async () => {
      const [metrics, categories, boards, subjects, ontologies] = await Promise.allSettled([
        metricsService.getMetrics(),
        getCategories(),
        listAnalyses(),
        dataProductService.listSubjects(),
        ontologyService.list(),
      ]);
      const asOptions = (list: unknown, idKey: string, nameKeys: Array<string>): AssociationOption[] =>
        (Array.isArray(list) ? list : []).map((item: any) => ({
          id: String(item?.[idKey] ?? ""),
          name: String(nameKeys.map((k) => item?.[k]).find((v) => v) ?? item?.[idKey] ?? ""),
        })).filter((o) => o.id);
      setAssocOptions({
        metrics: metrics.status === "fulfilled"
          ? asOptions(metrics.value, "name", ["label", "name"])
          : [],
        categories: categories.status === "fulfilled" ? asOptions(categories.value, "id", ["name"]) : [],
        boards: boards.status === "fulfilled" ? asOptions(boards.value, "id", ["name"]) : [],
        subjects: subjects.status === "fulfilled" ? asOptions(subjects.value, "subjectId", ["name"]) : [],
        ontologies: ontologies.status === "fulfilled" ? asOptions(ontologies.value, "id", ["name"]) : [],
      });
    })();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      const { id, ...rest } = initial;
      setForm({ ...rest, id });
      setTagsText((initial.tags || []).join(", "));
      setJsonText(JSON.stringify(initial, null, 2));
    } else {
      setForm({ ...emptyProductForm(), catalog_id: defaultCatalogId });
      setTagsText("");
      setJsonText("");
    }
  }, [open, initial, defaultCatalogId]);

  const set = (patch: Partial<DataProductUpsert>) => setForm((prev) => ({ ...prev, ...patch }));

  const toggleTopic = (tid: string) => {
    const ids = form.topic_ids || [];
    set({ topic_ids: ids.includes(tid) ? ids.filter((x) => x !== tid) : [...ids, tid] });
  };

  const toggleId = (field: AssocField, id: string) => {
    const ids = (form[field] as string[]) || [];
    set({ [field]: ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id] } as Partial<DataProductUpsert>);
  };
  const assocVisible = visibleAssocFields(form.product_type, form);

  const handleSubmit = () => {
    const tags = tagsText.split(/[,，]/).map((t) => t.trim()).filter(Boolean);
    let payload: DataProductUpsert = { ...form, name: (form.name || "").trim(), tags };
    if (!payload.name) {
      toast.error(t("form.nameRequired"));
      return;
    }
    // merge the full ODPS structure from the JSON editor (edit mode only)
    if (initial && jsonText.trim()) {
      try {
        const parsed = JSON.parse(jsonText);
        const { id: _omit, name: _n, tenantId: _t, createdAt: _c, createdBy: _cb,
          lastModifiedAt: _lm, lastModifiedBy: _lmb, version: _v, ...odps } = parsed;
        payload = { ...odps, ...payload, id: initial.id };
      } catch {
        toast.error(t("form.jsonInvalid"));
        return;
      }
    }
    onSubmit(payload);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{initial ? t("form.editTitle") : t("form.createTitle")}</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="basic" className="flex-1 overflow-hidden flex flex-col">
          <TabsList>
            <TabsTrigger value="basic">{t("form.basicTab")}</TabsTrigger>
            <TabsTrigger value="structure">{t("form.structureTab")}</TabsTrigger>
            <TabsTrigger value="advanced">{t("form.advancedTab")}</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-auto pt-3">
            <TabsContent value="basic" className="mt-0 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{t("form.name")} *</Label>
                  <Input value={form.name || ""} onChange={(e) => set({ name: e.target.value })} />
                </div>
                <div>
                  <Label>{t("form.displayName")}</Label>
                  <Input value={form.display_name || ""} onChange={(e) => set({ display_name: e.target.value })} />
                </div>
                <div>
                  <Label>{t("form.status")}</Label>
                  <Select value={form.status} onValueChange={(v) => set({ status: v as DataProductStatus })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["announcement", "draft", "development", "testing", "acceptance", "production", "sunset", "retired"].map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t("form.productType")}</Label>
                  <Select value={form.product_type} onValueChange={(v) => set({ product_type: v as DataProductType })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["raw data", "derived data", "dataset", "reports", "analytic view", "application", "other"].map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t("form.visibility")}</Label>
                  <Select value={form.visibility} onValueChange={(v) => set({ visibility: v as DataProductVisibility })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["private", "invitation", "organisation", "dataspace", "public"].map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t("form.catalog")}</Label>
                  <Select value={form.catalog_id || "none"} onValueChange={(v) => set({ catalog_id: v === "none" ? undefined : v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t("productTable.uncategorized")}</SelectItem>
                      {catalogs.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t("form.domain")}</Label>
                  <Input value={form.domain || ""} onChange={(e) => set({ domain: e.target.value })} />
                </div>
                <div>
                  <Label>{t("form.owner")}</Label>
                  <Input value={form.owner || ""} onChange={(e) => set({ owner: e.target.value })} />
                </div>
                <div>
                  <Label>{t("form.version")}</Label>
                  <Input value={form.product_version || ""} onChange={(e) => set({ product_version: e.target.value })} />
                </div>
                <div>
                  <Label>{t("form.valueScore")}</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={form.value_score ?? 0}
                    onChange={(e) => set({ value_score: Number(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div>
                <Label>{t("form.tags")}</Label>
                <Input value={tagsText} onChange={(e) => setTagsText(e.target.value)} />
              </div>
              <div>
                <Label>{t("form.description")}</Label>
                <Textarea rows={2} value={form.description || ""} onChange={(e) => set({ description: e.target.value })} />
              </div>
              <div>
                <Label>{t("form.valueProposition")}</Label>
                <Textarea rows={2} value={form.value_proposition || ""} onChange={(e) => set({ value_proposition: e.target.value })} />
              </div>
            </TabsContent>

            <TabsContent value="structure" className="mt-0 space-y-3">
              <div>
                <Label className="font-semibold">{t("form.dependenciesTitle")}</Label>
                <p className="text-xs text-slate-400 mt-0.5">{t("form.dependenciesHint")}</p>
                <AssociationPicker
                  label={t("form.assocUpstreamProducts")}
                  options={products
                    .filter((p) => p.id !== initial?.id)
                    .map((p) => ({ id: p.id, name: p.display_name || p.name }))}
                  selected={form.upstream_product_ids || []}
                  onToggle={(id) => toggleId("upstream_product_ids", id)}
                  searchPlaceholder={t("form.assocSearch")}
                  emptyText={t("form.assocEmpty")}
                />
              </div>
              <div className="pt-1 border-t" />
              {assocVisible.has("topic_ids") && (
                <div>
                  <Label>{t("form.bindTables")}</Label>
                  <ScrollArea className="h-48 border rounded-md mt-1">
                    <div className="p-2 space-y-1">
                      {topics.map((t2) => (
                        <label key={t2.id} className="flex items-center gap-2 p-2 rounded hover:bg-slate-50 cursor-pointer">
                          <Checkbox
                            checked={(form.topic_ids || []).includes(t2.id)}
                            onCheckedChange={() => toggleTopic(t2.id)}
                          />
                          <span className="text-sm">{t2.name}</span>
                        </label>
                      ))}
                      {topics.length === 0 && (
                        <div className="text-sm text-slate-400 text-center p-4">{t("form.noTopics")}</div>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              )}
              {(["metric_names", "metric_category_ids", "board_ids", "subject_ids", "ontology_ids"] as AssocField[])
                .some((f) => assocVisible.has(f)) && (
                <div className={assocVisible.has("topic_ids") ? "pt-1 border-t" : ""}>
                  <Label className="font-semibold">{t("form.associationsTitle")}</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
                    {assocVisible.has("metric_names") && (
                      <AssociationPicker
                        label={t("form.assocMetrics")}
                        options={assocOptions.metrics}
                        selected={form.metric_names || []}
                        onToggle={(id) => toggleId("metric_names", id)}
                        searchPlaceholder={t("form.assocSearch")}
                        emptyText={t("form.assocEmpty")}
                      />
                    )}
                    {assocVisible.has("metric_category_ids") && (
                      <AssociationPicker
                        label={t("form.assocCategories")}
                        options={assocOptions.categories}
                        selected={form.metric_category_ids || []}
                        onToggle={(id) => toggleId("metric_category_ids", id)}
                        searchPlaceholder={t("form.assocSearch")}
                        emptyText={t("form.assocEmpty")}
                      />
                    )}
                    {assocVisible.has("board_ids") && (
                      <AssociationPicker
                        label={t("form.assocBoards")}
                        options={assocOptions.boards}
                        selected={form.board_ids || []}
                        onToggle={(id) => toggleId("board_ids", id)}
                        searchPlaceholder={t("form.assocSearch")}
                        emptyText={t("form.assocEmpty")}
                      />
                    )}
                    {assocVisible.has("subject_ids") && (
                      <AssociationPicker
                        label={t("form.assocSubjects")}
                        options={assocOptions.subjects}
                        selected={form.subject_ids || []}
                        onToggle={(id) => toggleId("subject_ids", id)}
                        searchPlaceholder={t("form.assocSearch")}
                        emptyText={t("form.assocEmpty")}
                      />
                    )}
                    {assocVisible.has("ontology_ids") && (
                      <AssociationPicker
                        label={t("form.assocOntologies")}
                        options={assocOptions.ontologies}
                        selected={form.ontology_ids || []}
                        onToggle={(id) => toggleId("ontology_ids", id)}
                        searchPlaceholder={t("form.assocSearch")}
                        emptyText={t("form.assocEmpty")}
                      />
                    )}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="advanced" className="mt-0 space-y-2">
              <div className="flex items-center justify-between">
                <Label>{t("form.advancedLabel")}</Label>
                <Badge variant="outline" className="text-[10px]">
                  <FileJson className="w-3 h-3 mr-1" /> ODPS v4.1
                </Badge>
              </div>
              <Textarea
                rows={14}
                className="font-mono text-xs"
                value={initial ? jsonText : JSON.stringify(form, null, 2)}
                onChange={(e) => setJsonText(e.target.value)}
                readOnly={!initial}
              />
              <p className="text-xs text-slate-400">
                {t("form.advancedHint")}
              </p>
            </TabsContent>
          </div>
        </Tabs>

        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="outline" onClick={onClose}>{t("actions.cancel")}</Button>
          <Button onClick={handleSubmit}><Save className="w-4 h-4 mr-1" /> {t("actions.save")}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ---------------------------------------------------------------------------
// Catalog tree item
// ---------------------------------------------------------------------------
const CatalogTreeItem: React.FC<{
  node: CatalogNode;
  depth: number;
  selectedId?: string;
  productCounts: Record<string, number>;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
  onEdit: (node: CatalogNode) => void;
  onDelete: (node: CatalogNode) => void;
  onAddChild: (node: CatalogNode) => void;
}> = ({ node, depth, selectedId, productCounts, expandedIds, onToggle, onSelect, onEdit, onDelete, onAddChild }) => {
  const { t } = useTranslation("dataAsset");
  const hasChildren = node.children.length > 0;
  const expanded = expandedIds.has(node.id);
  const count = productCounts[node.id] || 0;

  return (
    <div>
      <div
        className={`group flex items-center gap-1 px-2 py-1.5 rounded-md cursor-pointer text-sm ${
          selectedId === node.id ? "bg-blue-50 text-blue-700" : "hover:bg-slate-100"
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => onSelect(node.id)}
      >
        <button
          className="w-4 h-4 flex items-center justify-center shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) onToggle(node.id);
          }}
        >
          {hasChildren ? (
            expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />
          ) : null}
        </button>
        <FolderTree className="w-4 h-4 text-slate-400 shrink-0" />
        <span className="flex-1 truncate">{node.name}</span>
        <span className="text-xs text-slate-400">{count}</span>
        <div className="hidden group-hover:flex items-center gap-0.5">
          <button className="p-1 rounded hover:bg-slate-200" title={t("actions.addSubCatalog")}
            onClick={(e) => { e.stopPropagation(); onAddChild(node); }}>
            <Plus className="w-3 h-3" />
          </button>
          <button className="p-1 rounded hover:bg-slate-200" title={t("actions.edit")}
            onClick={(e) => { e.stopPropagation(); onEdit(node); }}>
            <Edit2 className="w-3 h-3" />
          </button>
          <button className="p-1 rounded hover:bg-slate-200 text-red-500" title={t("actions.delete")}
            onClick={(e) => { e.stopPropagation(); onDelete(node); }}>
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
      {hasChildren && expanded && node.children.map((child) => (
        <CatalogTreeItem
          key={child.id}
          node={child}
          depth={depth + 1}
          selectedId={selectedId}
          productCounts={productCounts}
          expandedIds={expandedIds}
          onToggle={onToggle}
          onSelect={onSelect}
          onEdit={onEdit}
          onDelete={onDelete}
          onAddChild={onAddChild}
        />
      ))}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
const DataProductCatalog: React.FC = () => {
  const { collapsed } = useSidebar();
  const { t } = useTranslation("dataAsset");
  const [catalogs, setCatalogs] = useState<DataAssetCatalog[]>([]);
  const [products, setProducts] = useState<DataProduct[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCatalogId, setSelectedCatalogId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // dialogs
  const [catalogDialogOpen, setCatalogDialogOpen] = useState(false);
  const [editingCatalog, setEditingCatalog] = useState<DataAssetCatalog | null>(null);
  const [newCatalogParentId, setNewCatalogParentId] = useState<string | null>(null);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<DataProduct | null>(null);
  const [batchAddOpen, setBatchAddOpen] = useState(false);
  const [detailsTopicId, setDetailsTopicId] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [cats, prods] = await Promise.all([
        dataProductService.listCatalogs(),
        dataProductService.listProducts(),
      ]);
      setCatalogs(cats);
      setProducts(prods);
    } catch (err) {
      toast.error(t("form.loadFailed", { message: err instanceof Error ? err.message : String(err) }));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadAll();
    topicService
      .getDatamartTopics()
      .then(setTopics)
      .catch(() => setTopics([]));
  }, [loadAll]);

  const tree = useMemo(() => buildCatalogTree(catalogs), [catalogs]);

  const productCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach((p) => {
      if (p.catalog_id) counts[p.catalog_id] = (counts[p.catalog_id] || 0) + 1;
    });
    return counts;
  }, [products]);

  const uncategorizedCount = useMemo(
    () => products.filter((p) => !p.catalog_id).length,
    [products]
  );

  const filteredProducts = useMemo(() => {
    let list = products;
    if (selectedCatalogId) {
      list = list.filter((p) => p.catalog_id === selectedCatalogId);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.display_name && p.display_name.toLowerCase().includes(q)) ||
          (p.description && p.description.toLowerCase().includes(q)) ||
          (p.domain && p.domain.toLowerCase().includes(q)) ||
          (p.tags || []).some((t) => t.toLowerCase().includes(q))
      );
    }
    return list;
  }, [products, selectedCatalogId, searchQuery]);

  const catalogName = (id?: string) => catalogs.find((c) => c.id === id)?.name;

  // ---- catalog CRUD ----
  const handleCatalogSubmit = async (payload: DataAssetCatalogUpsert) => {
    try {
      if (payload.id) {
        await dataProductService.updateCatalog(payload);
        toast.success(t("catalogPanel.updated"));
      } else {
        await dataProductService.createCatalog(payload);
        toast.success(t("catalogPanel.created"));
      }
      setCatalogDialogOpen(false);
      setEditingCatalog(null);
      setNewCatalogParentId(null);
      loadAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  const handleCatalogDelete = async (node: DataAssetCatalog) => {
    if (!confirm(t("catalogPanel.deleteConfirm", { name: node.name }))) return;
    try {
      await dataProductService.deleteCatalog(node.id);
      toast.success(t("catalogPanel.deleted"));
      if (selectedCatalogId === node.id) setSelectedCatalogId("");
      loadAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  // ---- product CRUD ----
  const handleProductSubmit = async (payload: DataProductUpsert) => {
    try {
      if (payload.id) {
        await dataProductService.updateProduct(payload);
        toast.success(t("form.updated"));
      } else {
        await dataProductService.createProduct(payload);
        toast.success(t("form.created"));
      }
      setProductDialogOpen(false);
      setEditingProduct(null);
      loadAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  const handleProductDelete = async (id: string) => {
    if (!confirm(t("form.deleteConfirm"))) return;
    try {
      await dataProductService.deleteProduct(id);
      toast.success(t("form.deleted"));
      loadAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  const handleBatchAdd = async (topicIds: string[]) => {
    try {
      const created = await dataProductService.batchCreateProducts({
        topic_ids: topicIds,
        catalog_id: selectedCatalogId || undefined,
        status: "draft",
      });
      toast.success(t("batchAdd.created", { count: created.length }));
      setBatchAddOpen(false);
      loadAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const topicName = (tid: string) => topics.find((t) => t.id === tid)?.name || tid;

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <div className={`flex-1 flex flex-col h-screen transition-all duration-300 ${collapsed ? "ml-20" : "ml-56"}`}>
        <Header />
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Left: catalog tree */}
          <div className="w-72 bg-white border-r border-slate-200 flex flex-col">
            <div className="p-4 border-b border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <FolderTree className="w-5 h-5 text-blue-600" /> {t("catalogPanel.title")}
                </h2>
                <Button
                  size="icon"
                  variant="ghost"
                  title={t("actions.createRoot")}
                  onClick={() => {
                    setEditingCatalog(null);
                    setNewCatalogParentId(null);
                    setCatalogDialogOpen(true);
                  }}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <button
                className={`w-full text-left px-2 py-1.5 rounded-md text-sm flex items-center gap-2 ${
                  !selectedCatalogId ? "bg-blue-50 text-blue-700" : "hover:bg-slate-100"
                }`}
                onClick={() => setSelectedCatalogId("")}
              >
                <Layers className="w-4 h-4" /> {t("catalogPanel.allAssets")}
                <span className="ml-auto text-xs text-slate-400">{products.length}</span>
              </button>
            </div>
            <ScrollArea className="flex-1 p-2">
              {loading ? (
                <div className="text-sm text-slate-400 p-4 text-center">{t("actions.loading")}</div>
              ) : (
                <>
                  {tree.map((node) => (
                    <CatalogTreeItem
                      key={node.id}
                      node={node}
                      depth={0}
                      selectedId={selectedCatalogId}
                      productCounts={productCounts}
                      expandedIds={expandedIds}
                      onToggle={toggleExpand}
                      onSelect={setSelectedCatalogId}
                      onEdit={(n) => {
                        setEditingCatalog(n);
                        setNewCatalogParentId(null);
                        setCatalogDialogOpen(true);
                      }}
                      onDelete={handleCatalogDelete}
                      onAddChild={(n) => {
                        setEditingCatalog(null);
                        setNewCatalogParentId(n.id);
                        setCatalogDialogOpen(true);
                      }}
                    />
                  ))}
                  <button
                    className={`w-full text-left px-2 py-1.5 rounded-md text-sm flex items-center gap-2 mt-1 ${
                      selectedCatalogId === "__uncategorized__" ? "bg-blue-50 text-blue-700" : "hover:bg-slate-100"
                    }`}
                    onClick={() =>
                      setSelectedCatalogId(selectedCatalogId === "__uncategorized__" ? "" : "__uncategorized__")
                    }
                  >
                    <Package className="w-4 h-4 text-slate-400" /> {t("catalogPanel.uncategorized")}
                    <span className="ml-auto text-xs text-slate-400">{uncategorizedCount}</span>
                  </button>
                </>
              )}
            </ScrollArea>
          </div>

          {/* Right: product table */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="bg-white border-b border-slate-200 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h1 className="text-xl font-bold flex items-center gap-2">
                    <Package className="w-5 h-5 text-blue-600" /> {t("productPage.title")}
                  </h1>
                  <p className="text-xs text-slate-500 mt-1">
                    {t("productPage.subtitle")}
                    {selectedCatalogId && selectedCatalogId !== "__uncategorized__" &&
                      ` · ${t("productPage.inCatalog", { name: catalogName(selectedCatalogId) || "" })}`}
                    {selectedCatalogId === "__uncategorized__" && ` · ${t("productPage.inUncategorized")}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative w-64">
                    <Search className="absolute left-2 top-2.5 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder={t("productTable.searchPlaceholder")}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                  <Button variant="outline" onClick={loadAll} title={t("actions.refresh")}>
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" onClick={() => setBatchAddOpen(true)}>
                    <Upload className="w-4 h-4 mr-1" /> {t("actions.batchAdd")}
                  </Button>
                  <Button
                    onClick={() => {
                      setEditingProduct(null);
                      setProductDialogOpen(true);
                    }}
                  >
                    <Plus className="w-4 h-4 mr-1" /> {t("actions.create")}
                  </Button>
                </div>
              </div>
            </div>

            <ScrollArea className="flex-1">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("productTable.name")}</TableHead>
                    <TableHead>{t("productTable.status")}</TableHead>
                    <TableHead>{t("productTable.type")}</TableHead>
                    <TableHead>{t("productTable.catalog")}</TableHead>
                    <TableHead>{t("productTable.domain")}</TableHead>
                    <TableHead>{t("productTable.tables")}</TableHead>
                    <TableHead className="text-right">{t("productTable.valueScore")}</TableHead>
                    <TableHead className="text-right">{t("productTable.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-slate-400 py-8">{t("actions.loading")}</TableCell>
                    </TableRow>
                  ) : filteredProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-slate-400 py-8">
                        {t("productTable.empty")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProducts.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>
                          <div className="font-medium">{p.display_name || p.name}</div>
                          <div className="text-xs text-slate-400 truncate max-w-64">{p.description || p.name}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] ${statusColor(p.status)}`}>
                            {p.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">{p.product_type}</TableCell>
                        <TableCell className="text-xs">{catalogName(p.catalog_id) || t("productTable.uncategorized")}</TableCell>
                        <TableCell className="text-xs">{p.domain || "-"}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1 items-center">
                            {(p.topic_ids || []).length === 0 && (p.metric_names || []).length === 0
                              && (p.metric_category_ids || []).length === 0 && (p.board_ids || []).length === 0
                              && (p.subject_ids || []).length === 0 && (p.ontology_ids || []).length === 0
                              && <span className="text-xs text-slate-400">-</span>}
                            {(p.topic_ids || []).map((tid) => (
                              <button
                                key={tid}
                                className="text-xs text-blue-600 hover:underline flex items-center gap-0.5"
                                onClick={() => setDetailsTopicId(tid)}
                                title={t("actions.viewDetails")}
                              >
                                <Table2 className="w-3 h-3" />
                                {topicName(tid)}
                              </button>
                            ))}
                            {(p.metric_names || []).length > 0 && (
                              <Badge variant="outline" className="text-[10px]">
                                {t("productTable.shortMetrics")} {p.metric_names.length}
                              </Badge>
                            )}
                            {(p.metric_category_ids || []).length > 0 && (
                              <Badge variant="outline" className="text-[10px]">
                                {t("productTable.shortCategories")} {p.metric_category_ids.length}
                              </Badge>
                            )}
                            {(p.board_ids || []).length > 0 && (
                              <Badge variant="outline" className="text-[10px]">
                                {t("productTable.shortBoards")} {p.board_ids.length}
                              </Badge>
                            )}
                            {(p.subject_ids || []).length > 0 && (
                              <Badge variant="outline" className="text-[10px]">
                                {t("productTable.shortSubjects")} {p.subject_ids.length}
                              </Badge>
                            )}
                            {(p.ontology_ids || []).length > 0 && (
                              <Badge variant="outline" className="text-[10px]">
                                {t("productTable.shortOntologies")} {p.ontology_ids.length}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">{p.value_score}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              title={t("actions.edit")}
                              onClick={() => {
                                setEditingProduct(p);
                                setProductDialogOpen(true);
                              }}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-red-500"
                              title={t("actions.delete")}
                              onClick={() => handleProductDelete(p.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        </div>
      </div>

      {/* dialogs */}
      <CatalogFormDialog
        open={catalogDialogOpen}
        initial={editingCatalog}
        parentId={newCatalogParentId}
        catalogs={catalogs}
        onClose={() => {
          setCatalogDialogOpen(false);
          setEditingCatalog(null);
          setNewCatalogParentId(null);
        }}
        onSubmit={handleCatalogSubmit}
      />
      <ProductFormDialog
        open={productDialogOpen}
        initial={editingProduct}
        defaultCatalogId={selectedCatalogId && selectedCatalogId !== "__uncategorized__" ? selectedCatalogId : undefined}
        catalogs={catalogs}
        topics={topics}
        products={products}
        onClose={() => {
          setProductDialogOpen(false);
          setEditingProduct(null);
        }}
        onSubmit={handleProductSubmit}
      />
      <BatchAddDialog
        open={batchAddOpen}
        catalogId={selectedCatalogId && selectedCatalogId !== "__uncategorized__" ? selectedCatalogId : undefined}
        topics={topics}
        onClose={() => setBatchAddOpen(false)}
        onSubmit={handleBatchAdd}
      />
      <TopicDetailsDialog topicId={detailsTopicId} onClose={() => setDetailsTopicId(null)} />
    </div>
  );
};

export default DataProductCatalog;
