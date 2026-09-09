import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Search, X, BarChart3, Table2, Link2, Loader2, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Term, TermEntityAssignment } from "@/model/glossaryV2";
import { businessGlossaryService } from "@/services/businessGlossaryService";
import { metricsService } from "@/services/metricsService";
import type { MetricType } from "@/model/Metric";
import { topicService } from "@/services/topicService";
import type { Topic } from "@/services/topicService";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const selectionKey = (type: string, entityId: string, parentEntityId?: string) =>
  `${type}:${parentEntityId ?? ""}:${entityId}`;

const EntityIcon: React.FC<{ type: string; className?: string }> = ({ type, className }) =>
  type === "metric" ? (
    <BarChart3 className={cn("w-3.5 h-3.5 text-violet-500", className)} />
  ) : type === "factor" ? (
    <Table2 className={cn("w-3.5 h-3.5 text-blue-500", className)} />
  ) : (
    <Link2 className={cn("w-3.5 h-3.5 text-slate-400", className)} />
  );

interface PickerItem {
  key: string;
  entityType: "metric" | "factor";
  entityId: string;
  parentEntityId?: string;
  name: string;
  path?: string;
}

// ---------------------------------------------------------------------------
// EntityLinkDialog
// ---------------------------------------------------------------------------

const EntityLinkDialog: React.FC<{
  term: Term;
  glossaryId: string;
  onClose: () => void;
  onChanged: () => void;
}> = ({ term, glossaryId, onClose, onChanged }) => {
  const [metrics, setMetrics] = useState<MetricType[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loadingSources, setLoadingSources] = useState(true);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerTab, setPickerTab] = useState<"metric" | "factor">("metric");
  const [metricQuery, setMetricQuery] = useState("");
  const [selectedTopicId, setSelectedTopicId] = useState<string>("");
  const [factorQuery, setFactorQuery] = useState("");
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [removingKey, setRemovingKey] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoadingSources(true);
    Promise.all([
      metricsService.getMetrics().catch((err) => {
        console.error("Failed to load metrics:", err);
        return [] as MetricType[];
      }),
      topicService.getDatamartTopics().catch((err) => {
        console.error("Failed to load topics:", err);
        return [] as Topic[];
      }),
    ]).then(([m, t]) => {
      if (cancelled) return;
      setMetrics(m);
      setTopics(t);
      setLoadingSources(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const linkedKeys = useMemo(
    () =>
      new Set(
        (term.assigned_entities || []).map((a) =>
          selectionKey(a.entity_type, a.entity_id, a.parent_entity_id)
        )
      ),
    [term.assigned_entities]
  );

  const topicName = (topicId?: string) => {
    if (!topicId) return "";
    const t = topics.find((x) => x.id === topicId);
    return t?.name || topicId;
  };

  const factorDisplayName = (a: TermEntityAssignment) => a.entity_name || a.entity_id;

  // ---- picker items -------------------------------------------------------
  const metricItems: PickerItem[] = useMemo(() => {
    const q = metricQuery.trim().toLowerCase();
    return metrics
      .filter((m) => !q || m.name.toLowerCase().includes(q) || (m.description || "").toLowerCase().includes(q))
      .map((m) => ({
        key: selectionKey("metric", m.id),
        entityType: "metric" as const,
        entityId: m.id,
        name: m.name,
        path: m.description || undefined,
      }));
  }, [metrics, metricQuery]);

  const selectedTopic = topics.find((t) => t.id === selectedTopicId);

  const factorItems: PickerItem[] = useMemo(() => {
    if (!selectedTopic) return [];
    const q = factorQuery.trim().toLowerCase();
    return (selectedTopic.factors || [])
      .filter((f) => !q || (f.name || "").toLowerCase().includes(q) || (f.label || "").toLowerCase().includes(q))
      .map((f) => ({
        key: selectionKey("factor", f.factorId, selectedTopic.id),
        entityType: "factor" as const,
        entityId: f.factorId,
        parentEntityId: selectedTopic.id,
        name: f.label || f.name || f.factorId,
        path: `${selectedTopic.name} / ${f.name || f.factorId}`,
      }));
  }, [selectedTopic, factorQuery]);

  const items = pickerTab === "metric" ? metricItems : factorItems;
  const selectedItems = items.filter((i) => selectedKeys.has(i.key));
  const newSelected = selectedItems.filter((i) => !linkedKeys.has(i.key));

  const toggleSelect = (key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // ---- actions ------------------------------------------------------------
  const handleConfirm = async () => {
    if (newSelected.length === 0) return;
    setSaving(true);
    let ok = 0;
    for (const item of newSelected) {
      try {
        await businessGlossaryService.assignEntityToTerm(glossaryId, term.id, {
          entity_type: item.entityType,
          entity_id: item.entityId,
          parent_entity_id: item.parentEntityId,
          entity_name: item.name,
          confidence: 1,
        });
        ok += 1;
      } catch (err) {
        toast.error(`Failed to link "${item.name}": ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    setSaving(false);
    if (ok > 0) {
      toast.success(`Linked ${ok} asset${ok > 1 ? "s" : ""}`);
      setSelectedKeys(new Set());
      onChanged();
    }
  };

  const handleRemove = async (a: TermEntityAssignment) => {
    const key = selectionKey(a.entity_type, a.entity_id, a.parent_entity_id);
    setRemovingKey(key);
    try {
      await businessGlossaryService.removeEntityFromTerm(glossaryId, term.id, {
        entity_type: a.entity_type,
        entity_id: a.entity_id,
        parent_entity_id: a.parent_entity_id,
        entity_name: a.entity_name,
        confidence: a.confidence,
      });
      toast.success("Link removed");
      onChanged();
    } catch (err) {
      toast.error(`Failed to remove link: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setRemovingKey(null);
    }
  };

  // ---- render -------------------------------------------------------------
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Linked Assets — <span className="font-normal text-slate-500">{term.name}</span>
          </DialogTitle>
        </DialogHeader>

        {/* Existing links */}
        <div className="max-h-[55vh] overflow-y-auto pr-1">
          <div className="text-sm font-medium mb-2">Linked assets ({term.assigned_entities?.length || 0})</div>
          {(term.assigned_entities?.length || 0) === 0 ? (
            <div className="text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg p-4 text-center">
              No linked assets yet. Click "Add links" to connect this term to metrics or topic fields.
            </div>
          ) : (
            <div className="space-y-1.5">
              {term.assigned_entities.map((a) => {
                const key = selectionKey(a.entity_type, a.entity_id, a.parent_entity_id);
                return (
                  <div
                    key={a.relation_guid || key}
                    className="flex items-center justify-between border border-slate-200 rounded-md px-3 py-2 hover:bg-slate-50"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <EntityIcon type={a.entity_type} />
                      <div className="min-w-0">
                        <div className="text-sm truncate">{factorDisplayName(a)}</div>
                        {a.entity_type === "factor" && a.parent_entity_id && (
                          <div className="text-[11px] text-slate-400 truncate">
                            {topicName(a.parent_entity_id)} / {a.entity_id}
                          </div>
                        )}
                      </div>
                      <Badge variant="outline" className="text-[10px] ml-1 shrink-0">
                        {a.entity_type}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-6 h-6 text-red-500 shrink-0"
                      disabled={removingKey === key}
                      onClick={() => handleRemove(a)}
                    >
                      {removingKey === key ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add links picker */}
          {pickerOpen ? (
            <div className="mt-4 border border-slate-200 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex gap-1">
                  {(["metric", "factor"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => { setPickerTab(t); setSelectedKeys(new Set()); }}
                      className={cn(
                        "px-3 py-1 text-xs rounded-md transition-colors",
                        pickerTab === t ? "bg-blue-50 text-blue-700 border border-blue-200" : "text-slate-500 hover:bg-slate-50 border border-transparent"
                      )}
                    >
                      {t === "metric" ? "Metrics" : "Topic Fields"}
                    </button>
                  ))}
                </div>
                <Button variant="ghost" size="icon" className="w-6 h-6" onClick={() => { setPickerOpen(false); setSelectedKeys(new Set()); }}>
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>

              {pickerTab === "factor" && (
                <div className="mb-2">
                  <select
                    className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                    value={selectedTopicId}
                    onChange={(e) => { setSelectedTopicId(e.target.value); setSelectedKeys(new Set()); setFactorQuery(""); }}
                  >
                    <option value="">{loadingSources ? "Loading topics..." : "-- Select a topic --"}</option>
                    {topics.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.factors?.length || 0} fields)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="relative mb-2">
                <Search className="absolute left-2 top-2.5 w-4 h-4 text-slate-400" />
                <Input
                  className="pl-8"
                  placeholder={pickerTab === "metric" ? "Search metrics..." : "Search fields..."}
                  value={pickerTab === "metric" ? metricQuery : factorQuery}
                  onChange={(e) => (pickerTab === "metric" ? setMetricQuery(e.target.value) : setFactorQuery(e.target.value))}
                />
              </div>

              <div className="max-h-56 overflow-y-auto rounded-md border border-slate-100 divide-y divide-slate-50">
                {loadingSources ? (
                  <div className="flex items-center justify-center gap-2 py-8 text-xs text-slate-400">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading...
                  </div>
                ) : items.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    {pickerTab === "factor" && !selectedTopicId
                      ? "Select a topic to browse its fields."
                      : "No matching items."}
                  </div>
                ) : (
                  items.map((item) => {
                    const linked = linkedKeys.has(item.key);
                    const checked = selectedKeys.has(item.key);
                    return (
                      <button
                        key={item.key}
                        disabled={linked}
                        onClick={() => toggleSelect(item.key)}
                        className={cn(
                          "w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors",
                          linked ? "opacity-45 cursor-not-allowed" : checked ? "bg-blue-50" : "hover:bg-slate-50"
                        )}
                      >
                        <span
                          className={cn(
                            "w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0",
                            checked ? "bg-blue-600 border-blue-600" : "border-slate-300 bg-white"
                          )}
                        >
                          {checked && <span className="w-1.5 h-1.5 bg-white rounded-sm" />}
                        </span>
                        <EntityIcon type={item.entityType} />
                        <span className="text-sm truncate flex-1">{item.name}</span>
                        {linked ? (
                          <span className="text-[10px] text-slate-400 shrink-0">Linked</span>
                        ) : item.path ? (
                          <span className="text-[10px] text-slate-400 truncate max-w-[45%] shrink-0">{item.path}</span>
                        ) : null}
                      </button>
                    );
                  })
                )}
              </div>

              <div className="flex justify-end mt-2">
                <Button size="sm" disabled={newSelected.length === 0 || saving} onClick={handleConfirm}>
                  {saving ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Plus className="w-3.5 h-3.5 mr-1" />}
                  Link {newSelected.length > 0 ? `(${newSelected.length})` : ""}
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => setPickerOpen(true)}>
              <Plus className="w-3.5 h-3.5 mr-1" />Add links
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EntityLinkDialog;
