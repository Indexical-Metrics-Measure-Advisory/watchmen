import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Search, BookOpen, Tag, FolderTree, Hash, Plus, Trash2, Edit2, Save, X, ChevronRight, Globe, User } from "lucide-react";
import { useSidebar } from "@/contexts/SidebarContext";
import Sidebar from "@/components/layout/Sidebar";

import type { GlossaryBundle, Glossary, Category, Term, GlossaryUpsert, CategoryUpsert, TermUpsert } from "@/model/glossaryV2";
import { businessGlossaryService } from "@/services/businessGlossaryService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------
const statusColor = (status: string) => {
  switch (status) {
    case "active":
      return "bg-green-100 text-green-800 border-green-200";
    case "draft":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "deprecated":
      return "bg-gray-100 text-gray-800 border-gray-200";
    default:
      return "bg-blue-100 text-blue-800 border-blue-200";
  }
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
const BusinessGlossary: React.FC = () => {
  const { collapsed } = useSidebar();
  const [bundles, setBundles] = useState<GlossaryBundle[]>([]);
  const [activeGlossaryId, setActiveGlossaryId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [termQuery, setTermQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState<"glossary" | "category" | "term" | null>(null);
  const [editingItem, setEditingItem] = useState<any>(null);

  // Load bundles on mount
  useEffect(() => {
    loadBundles();
  }, []);

  const loadBundles = async () => {
    setLoading(true);
    try {
      const data = await businessGlossaryService.listGlossaries();
      setBundles(data);
      if (data.length > 0 && !activeGlossaryId) {
        setActiveGlossaryId(data[0].glossary.id);
      }
    } catch (err: any) {
      toast.error(`Failed to load glossaries: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const activeBundle = useMemo(
    () => bundles.find((b) => b.glossary.id === activeGlossaryId),
    [bundles, activeGlossaryId]
  );

  const filteredTerms = useMemo(() => {
    if (!activeBundle) return [];
    if (!termQuery.trim()) return activeBundle.terms;
    const q = termQuery.toLowerCase();
    return activeBundle.terms.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        (t.display_name && t.display_name.toLowerCase().includes(q)) ||
        (t.description && t.description.toLowerCase().includes(q))
    );
  }, [activeBundle, termQuery]);

  const getCategoryName = (catId: string) => {
    const cat = activeBundle?.categories.find((c) => c.id === catId);
    return cat?.name || catId;
  };

  // -------------------------------------------------------------------------
  // Glossary CRUD
  // -------------------------------------------------------------------------
  const handleCreateGlossary = async (payload: GlossaryUpsert) => {
    try {
      await businessGlossaryService.createGlossary(payload);
      toast.success("Glossary created");
      setDialogOpen(false);
      loadBundles();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleUpdateGlossary = async (payload: GlossaryUpsert) => {
    try {
      await businessGlossaryService.updateGlossary(payload);
      toast.success("Glossary updated");
      setEditMode(null);
      setEditingItem(null);
      loadBundles();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDeleteGlossary = async (id: string) => {
    if (!confirm("Delete this glossary and all its categories/terms?")) return;
    try {
      await businessGlossaryService.deleteGlossary(id);
      toast.success("Glossary deleted");
      if (activeGlossaryId === id) setActiveGlossaryId("");
      loadBundles();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // -------------------------------------------------------------------------
  // Category CRUD
  // -------------------------------------------------------------------------
  const handleCreateCategory = async (payload: CategoryUpsert) => {
    if (!activeGlossaryId) return;
    try {
      await businessGlossaryService.createCategory(activeGlossaryId, payload);
      toast.success("Category created");
      setDialogOpen(false);
      loadBundles();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleUpdateCategory = async (payload: CategoryUpsert) => {
    if (!activeGlossaryId) return;
    try {
      await businessGlossaryService.updateCategory(activeGlossaryId, payload);
      toast.success("Category updated");
      setEditMode(null);
      setEditingItem(null);
      loadBundles();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!activeGlossaryId) return;
    if (!confirm("Delete this category?")) return;
    try {
      await businessGlossaryService.deleteCategory(activeGlossaryId, id);
      toast.success("Category deleted");
      loadBundles();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // -------------------------------------------------------------------------
  // Term CRUD
  // -------------------------------------------------------------------------
  const handleCreateTerm = async (payload: TermUpsert) => {
    if (!activeGlossaryId) return;
    try {
      await businessGlossaryService.createTerm(activeGlossaryId, payload);
      toast.success("Term created");
      setDialogOpen(false);
      loadBundles();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleUpdateTerm = async (payload: TermUpsert) => {
    if (!activeGlossaryId) return;
    try {
      await businessGlossaryService.updateTerm(activeGlossaryId, payload);
      toast.success("Term updated");
      setEditMode(null);
      setEditingItem(null);
      loadBundles();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDeleteTerm = async (id: string) => {
    if (!activeGlossaryId) return;
    if (!confirm("Delete this term?")) return;
    try {
      await businessGlossaryService.deleteTerm(activeGlossaryId, id);
      toast.success("Term deleted");
      loadBundles();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // -------------------------------------------------------------------------
  // Render helpers
  // -------------------------------------------------------------------------
  const renderGlossaryForm = (initial?: Glossary) => (
    <GlossaryForm
      initial={initial}
      onSubmit={(data) =>
        initial ? handleUpdateGlossary({ ...data, id: initial.id }) : handleCreateGlossary(data)
      }
      onCancel={() => {
        setEditMode(null);
        setEditingItem(null);
        setDialogOpen(false);
      }}
    />
  );

  const renderCategoryForm = (initial?: Category) => (
    <CategoryForm
      initial={initial}
      categories={activeBundle?.categories || []}
      onSubmit={(data) =>
        initial ? handleUpdateCategory({ ...data, id: initial.id }) : handleCreateCategory(data)
      }
      onCancel={() => {
        setEditMode(null);
        setEditingItem(null);
        setDialogOpen(false);
      }}
    />
  );

  const renderTermForm = (initial?: Term) => (
    <TermForm
      initial={initial}
      categories={activeBundle?.categories || []}
      onSubmit={(data) =>
        initial ? handleUpdateTerm({ ...data, id: initial.id }) : handleCreateTerm(data)
      }
      onCancel={() => {
        setEditMode(null);
        setEditingItem(null);
        setDialogOpen(false);
      }}
    />
  );

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <div className={`flex-1 transition-all duration-300 ${collapsed ? 'ml-20' : 'ml-56'}`}>
        <div className="flex h-screen">
          {/* Left Sidebar - Glossary List */}
      <div className="w-72 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-600" />
              Glossaries
            </h2>
            <Dialog open={dialogOpen && editMode === "glossary" && !editingItem} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="icon" variant="ghost" onClick={() => { setEditMode("glossary"); setEditingItem(null); }}>
                  <Plus className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Create Glossary</DialogTitle></DialogHeader>
                {renderGlossaryForm()}
              </DialogContent>
            </Dialog>
          </div>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search glossaries..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        <div className="flex-1 overflow-auto p-2 space-y-1">
          {loading ? (
            <div className="text-sm text-slate-400 p-4 text-center">Loading...</div>
          ) : (
            bundles
              .filter((b) => b.glossary.name.toLowerCase().includes(searchQuery.toLowerCase()))
              .map((bundle) => (
                <button
                  key={bundle.glossary.id}
                  onClick={() => setActiveGlossaryId(bundle.glossary.id)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    activeGlossaryId === bundle.glossary.id
                      ? "bg-blue-50 border border-blue-200"
                      : "hover:bg-slate-50 border border-transparent"
                  }`}
                >
                  <div className="font-medium text-sm truncate">{bundle.glossary.display_name || bundle.glossary.name}</div>
                  <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                    <Badge variant="outline" className={`text-[10px] px-1 py-0 ${statusColor(bundle.glossary.status)}`}>
                      {bundle.glossary.status}
                    </Badge>
                    <span>{bundle.categories.length} categories</span>
                    <span>{bundle.terms.length} terms</span>
                  </div>
                </button>
              ))
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {activeBundle ? (
          <>
            {/* Glossary Header */}
            <div className="bg-white border-b border-slate-200 p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-2xl font-bold">{activeBundle.glossary.display_name || activeBundle.glossary.name}</h1>
                    <Badge className={statusColor(activeBundle.glossary.status)}>{activeBundle.glossary.status}</Badge>
                    {activeBundle.glossary.language && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Globe className="w-3 h-3" />{activeBundle.glossary.language}
                      </Badge>
                    )}
                  </div>
                  {activeBundle.glossary.description && (
                    <p className="text-slate-600 text-sm mt-1">{activeBundle.glossary.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-3 text-sm text-slate-500">
                    {activeBundle.glossary.owner && (
                      <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" />{activeBundle.glossary.owner}</span>
                    )}
                    <span className="flex items-center gap-1"><FolderTree className="w-3.5 h-3.5" />{activeBundle.categories.length} categories</span>
                    <span className="flex items-center gap-1"><Hash className="w-3.5 h-3.5" />{activeBundle.terms.length} terms</span>
                  </div>
                  {activeBundle.glossary.tags && activeBundle.glossary.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {activeBundle.glossary.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Dialog open={dialogOpen && editMode === "glossary" && editingItem?.id === activeBundle.glossary.id} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" onClick={() => { setEditMode("glossary"); setEditingItem(activeBundle.glossary); }}>
                        <Edit2 className="w-3.5 h-3.5 mr-1" />Edit
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Edit Glossary</DialogTitle></DialogHeader>
                      {renderGlossaryForm(activeBundle.glossary)}
                    </DialogContent>
                  </Dialog>
                  <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleDeleteGlossary(activeBundle.glossary.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex-1 overflow-auto p-6">
              <Tabs defaultValue="terms">
                <TabsList className="mb-4">
                  <TabsTrigger value="terms" className="flex items-center gap-1.5">
                    <Hash className="w-4 h-4" />Terms ({activeBundle.terms.length})
                  </TabsTrigger>
                  <TabsTrigger value="categories" className="flex items-center gap-1.5">
                    <FolderTree className="w-4 h-4" />Categories ({activeBundle.categories.length})
                  </TabsTrigger>
                </TabsList>

                {/* Terms Tab */}
                <TabsContent value="terms">
                  <div className="flex items-center justify-between mb-4">
                    <div className="relative w-80">
                      <Search className="absolute left-2 top-2.5 w-4 h-4 text-slate-400" />
                      <Input
                        placeholder="Search terms..."
                        value={termQuery}
                        onChange={(e) => setTermQuery(e.target.value)}
                        className="pl-8"
                      />
                    </div>
                    <Dialog open={dialogOpen && editMode === "term" && !editingItem} onOpenChange={setDialogOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" onClick={() => { setEditMode("term"); setEditingItem(null); }}>
                          <Plus className="w-4 h-4 mr-1" />Add Term
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-lg">
                        <DialogHeader><DialogTitle>Create Term</DialogTitle></DialogHeader>
                        {renderTermForm()}
                      </DialogContent>
                    </Dialog>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {filteredTerms.map((term) => (
                      <div key={term.id} className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-sm">{term.name}</h3>
                              <Badge className={`text-[10px] ${statusColor(term.status)}`}>{term.status}</Badge>
                            </div>
                            {term.display_name && term.display_name !== term.name && (
                              <p className="text-xs text-slate-500 mt-0.5">{term.display_name}</p>
                            )}
                            {term.short_description && (
                              <p className="text-sm text-slate-600 mt-1.5">{term.short_description}</p>
                            )}
                            {term.category_ids.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {term.category_ids.map((cid) => (
                                  <Badge key={cid} variant="outline" className="text-[10px]">{getCategoryName(cid)}</Badge>
                                ))}
                              </div>
                            )}
                            {(term.synonyms.length > 0 || term.related_terms.length > 0) && (
                              <div className="flex flex-wrap gap-2 mt-2 text-xs text-slate-500">
                                {term.synonyms.length > 0 && <span>Synonyms: {term.synonyms.length}</span>}
                                {term.related_terms.length > 0 && <span>Related: {term.related_terms.length}</span>}
                              </div>
                            )}
                          </div>
                          <div className="flex gap-1 ml-2">
                            <Dialog open={dialogOpen && editMode === "term" && editingItem?.id === term.id} onOpenChange={setDialogOpen}>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => { setEditMode("term"); setEditingItem(term); }}>
                                  <Edit2 className="w-3 h-3" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-lg">
                                <DialogHeader><DialogTitle>Edit Term</DialogTitle></DialogHeader>
                                {renderTermForm(term)}
                              </DialogContent>
                            </Dialog>
                            <Button variant="ghost" size="icon" className="w-7 h-7 text-red-600" onClick={() => handleDeleteTerm(term.id)}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {filteredTerms.length === 0 && (
                      <div className="col-span-2 text-center py-12 text-slate-400">
                        No terms found. Create your first term.
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* Categories Tab */}
                <TabsContent value="categories">
                  <div className="flex justify-end mb-4">
                    <Dialog open={dialogOpen && editMode === "category" && !editingItem} onOpenChange={setDialogOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" onClick={() => { setEditMode("category"); setEditingItem(null); }}>
                          <Plus className="w-4 h-4 mr-1" />Add Category
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader><DialogTitle>Create Category</DialogTitle></DialogHeader>
                        {renderCategoryForm()}
                      </DialogContent>
                    </Dialog>
                  </div>
                  <div className="space-y-2">
                    {activeBundle.categories.map((cat) => (
                      <div key={cat.id} className="bg-white border border-slate-200 rounded-lg p-4 flex items-center justify-between hover:shadow-sm transition-shadow">
                        <div className="flex items-center gap-3">
                          <FolderTree className="w-4 h-4 text-blue-500" />
                          <div>
                            <div className="font-medium text-sm">{cat.name}</div>
                            {cat.description && <p className="text-xs text-slate-500 mt-0.5">{cat.description}</p>}
                            <p className="text-[10px] text-slate-400 mt-0.5">{cat.qualified_name}</p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Dialog open={dialogOpen && editMode === "category" && editingItem?.id === cat.id} onOpenChange={setDialogOpen}>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => { setEditMode("category"); setEditingItem(cat); }}>
                                <Edit2 className="w-3 h-3" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader><DialogTitle>Edit Category</DialogTitle></DialogHeader>
                              {renderCategoryForm(cat)}
                            </DialogContent>
                          </Dialog>
                          <Button variant="ghost" size="icon" className="w-7 h-7 text-red-600" onClick={() => handleDeleteCategory(cat.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {activeBundle.categories.length === 0 && (
                      <div className="text-center py-12 text-slate-400">
                        No categories found. Create your first category.
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400">
            <div className="text-center">
              <BookOpen className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>Select a glossary from the sidebar or create a new one.</p>
            </div>
          </div>
        )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Forms
// ---------------------------------------------------------------------------

function GlossaryForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: Glossary;
  onSubmit: (data: GlossaryUpsert) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name || "");
  const [displayName, setDisplayName] = useState(initial?.display_name || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [language, setLanguage] = useState(initial?.language || "");
  const [status, setStatus] = useState<GlossaryUpsert["status"]>(initial?.status || "draft");
  const [owner, setOwner] = useState(initial?.owner || "");
  const [tags, setTags] = useState(initial?.tags?.join(", ") || "");

  return (
    <div className="space-y-3 mt-2">
      <div>
        <label className="text-sm font-medium">Name *</label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. EAST" />
      </div>
      <div>
        <label className="text-sm font-medium">Display Name</label>
        <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="e.g. EAST 人身保险公司版" />
      </div>
      <div>
        <label className="text-sm font-medium">Description</label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium">Language</label>
          <Input value={language} onChange={(e) => setLanguage(e.target.value)} placeholder="en / zh" />
        </div>
        <div>
          <label className="text-sm font-medium">Status</label>
          <select className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm" value={status} onChange={(e) => setStatus(e.target.value as any)}>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="deprecated">Deprecated</option>
          </select>
        </div>
      </div>
      <div>
        <label className="text-sm font-medium">Owner</label>
        <Input value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="Owner name or team" />
      </div>
      <div>
        <label className="text-sm font-medium">Tags (comma separated)</label>
        <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="tag1, tag2, tag3" />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => onSubmit({ name, display_name: displayName || undefined, description: description || undefined, language: language || undefined, status, owner: owner || undefined, tags: tags.split(",").map((t) => t.trim()).filter(Boolean) })}>
          <Save className="w-4 h-4 mr-1" />{initial ? "Update" : "Create"}
        </Button>
      </div>
    </div>
  );
}

function CategoryForm({
  initial,
  categories,
  onSubmit,
  onCancel,
}: {
  initial?: Category;
  categories: Category[];
  onSubmit: (data: CategoryUpsert) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [parentId, setParentId] = useState(initial?.parent_category_id || "");
  const [orderIndex, setOrderIndex] = useState(initial?.order_index || 0);

  return (
    <div className="space-y-3 mt-2">
      <div>
        <label className="text-sm font-medium">Name *</label>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <label className="text-sm font-medium">Description</label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
      </div>
      <div>
        <label className="text-sm font-medium">Parent Category</label>
        <select className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm" value={parentId} onChange={(e) => setParentId(e.target.value)}>
          <option value="">-- None --</option>
          {categories.filter((c) => c.id !== initial?.id).map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-sm font-medium">Order Index</label>
        <Input type="number" value={orderIndex} onChange={(e) => setOrderIndex(Number(e.target.value))} />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => onSubmit({ name, description: description || undefined, parent_category_id: parentId || undefined, order_index: orderIndex })}>
          <Save className="w-4 h-4 mr-1" />{initial ? "Update" : "Create"}
        </Button>
      </div>
    </div>
  );
}

function TermForm({
  initial,
  categories,
  onSubmit,
  onCancel,
}: {
  initial?: Term;
  categories: Category[];
  onSubmit: (data: TermUpsert) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name || "");
  const [displayName, setDisplayName] = useState(initial?.display_name || "");
  const [shortDesc, setShortDesc] = useState(initial?.short_description || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [abbreviation, setAbbreviation] = useState(initial?.abbreviation || "");
  const [status, setStatus] = useState<TermUpsert["status"]>(initial?.status || "draft");
  const [selectedCategories, setSelectedCategories] = useState<string[]>(initial?.category_ids || []);
  const [owner, setOwner] = useState(initial?.owner || "");
  const [steward, setSteward] = useState(initial?.steward || "");
  const [sourceUrl, setSourceUrl] = useState(initial?.source_url || "");

  const toggleCategory = (id: string) => {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-3 mt-2 max-h-[60vh] overflow-auto pr-1">
      <div>
        <label className="text-sm font-medium">Name *</label>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <label className="text-sm font-medium">Display Name</label>
        <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
      </div>
      <div>
        <label className="text-sm font-medium">Short Description</label>
        <Input value={shortDesc} onChange={(e) => setShortDesc(e.target.value)} placeholder="One-line summary" />
      </div>
      <div>
        <label className="text-sm font-medium">Full Description</label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium">Abbreviation</label>
          <Input value={abbreviation} onChange={(e) => setAbbreviation(e.target.value)} />
        </div>
        <div>
          <label className="text-sm font-medium">Status</label>
          <select className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm" value={status} onChange={(e) => setStatus(e.target.value as any)}>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="deprecated">Deprecated</option>
          </select>
        </div>
      </div>
      <div>
        <label className="text-sm font-medium">Categories</label>
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {categories.map((cat) => (
            <Badge
              key={cat.id}
              variant={selectedCategories.includes(cat.id) ? "default" : "outline"}
              className="cursor-pointer text-xs"
              onClick={() => toggleCategory(cat.id)}
            >
              {selectedCategories.includes(cat.id) && <ChevronRight className="w-3 h-3 mr-0.5" />}
              {cat.name}
            </Badge>
          ))}
          {categories.length === 0 && <span className="text-xs text-slate-400">No categories available</span>}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium">Owner</label>
          <Input value={owner} onChange={(e) => setOwner(e.target.value)} />
        </div>
        <div>
          <label className="text-sm font-medium">Steward</label>
          <Input value={steward} onChange={(e) => setSteward(e.target.value)} />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium">Source URL</label>
        <Input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://..." />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => onSubmit({ name, display_name: displayName || undefined, description: description || undefined, short_description: shortDesc || undefined, abbreviation: abbreviation || undefined, status, category_ids: selectedCategories, synonyms: [], related_terms: [], antonyms: [], is_a: [], owner: owner || undefined, steward: steward || undefined, source_url: sourceUrl || undefined })}>
          <Save className="w-4 h-4 mr-1" />{initial ? "Update" : "Create"}
        </Button>
      </div>
    </div>
  );
}

export default BusinessGlossary;
