import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Badge } from "../ui/badge";
import { Layers, Plus, Edit, Trash2, Database, Grid3x3, Network } from "lucide-react";
import { Checkbox } from "../ui/checkbox";
import { Catalog, Topic, Space, DomainRelationship } from "./model/BusinessDomain";
import { CreateCatalogDialogProps } from "./model/CreateCatalogDialog";
import { CreateTopicDialog } from "./CreateTopicDialog";
import { CreateSpaceDialog } from "./CreateSpaceDialog";

export function CreateCatalogDialog({ open, onOpenChange, onCreateCatalog, onUpdateCatalog, editingCatalog, availableCatalogs = [] }: CreateCatalogDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    owner: '',
    technicalOwner: '',
    tags: [] as string[],
    status: 'active' as 'active' | 'deprecated',
    sensitivity: 'internal' as 'public' | 'internal' | 'confidential' | 'restricted',
    topics: [] as Topic[],
    relatedSpaces: [] as Space[],
    relatedDomains: [] as DomainRelationship[],
  });

  const [showTopicDialog, setShowTopicDialog] = useState(false);
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [showSpaceDialog, setShowSpaceDialog] = useState(false);
  const [editingSpace, setEditingSpace] = useState<Space | null>(null);

  useEffect(() => {
    if (editingCatalog) {
      setFormData({
        name: editingCatalog.name,
        description: editingCatalog.description,
        owner: editingCatalog.owner,
        technicalOwner: editingCatalog.technicalOwner,
        tags: editingCatalog.tags,
        status: editingCatalog.status,
        sensitivity: editingCatalog.sensitivity,
        topics: editingCatalog.topics,
        relatedSpaces: editingCatalog.relatedSpaces,
        relatedDomains: editingCatalog.relatedDomains || [],
      });
    } else {
      // Reset form when opening in create mode
      setFormData({
        name: '',
        description: '',
        owner: '',
        technicalOwner: '',
        tags: [],
        status: 'active',
        sensitivity: 'internal',
        topics: [],
        relatedSpaces: [],
        relatedDomains: [],
      });
    }
  }, [editingCatalog, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCatalog) {
      onUpdateCatalog?.(formData);
    } else {
      onCreateCatalog(formData);
    }
    setFormData({
      name: '',
      description: '',
      owner: '',
      technicalOwner: '',
      tags: [],
      status: 'active',
      sensitivity: 'internal',
      topics: [],
      relatedSpaces: [],
      relatedDomains: [],
    });
    onOpenChange(false);
  };

  const handleCreateTopic = (newTopic: Topic) => {
    setFormData(prev => ({
      ...prev,
      topics: [...prev.topics, newTopic]
    }));
    setShowTopicDialog(false);
  };

  const handleUpdateTopic = (updatedTopic: Topic) => {
    setFormData(prev => ({
      ...prev,
      topics: prev.topics.map(t => t.id === updatedTopic.id ? updatedTopic : t)
    }));
    setEditingTopic(null);
    setShowTopicDialog(false);
  };

  const handleCreateSpace = (newSpace: Space) => {
    setFormData(prev => ({
      ...prev,
      relatedSpaces: [...prev.relatedSpaces, newSpace]
    }));
    setShowSpaceDialog(false);
  };

  const handleUpdateSpace = (updatedSpace: Space) => {
    setFormData(prev => ({
      ...prev,
      relatedSpaces: prev.relatedSpaces.map(s => s.id === updatedSpace.id ? updatedSpace : s)
    }));
    setEditingSpace(null);
    setShowSpaceDialog(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto p-0 gap-0 bg-white shadow-2xl border-0 sm:rounded-2xl">
        <DialogHeader className="p-8 pb-6 border-b border-slate-100 bg-white sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 rounded-xl">
              <Layers className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold text-slate-900">{editingCatalog ? 'Edit Business Catalog' : 'Create Business Catalog'}</DialogTitle>
              <DialogDescription className="text-slate-500 mt-1">
                {editingCatalog 
                  ? 'Update the business domain catalog information, topics, and spaces' 
                  : 'Create a new business domain catalog with topics and spaces'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="px-8 pb-8">
            <Tabs defaultValue="basic" className="mt-6">
              <TabsList className="w-full justify-start bg-slate-100/50 p-1 rounded-xl gap-1 h-auto mb-6">
                <TabsTrigger 
                  value="basic" 
                  className="px-4 py-2 rounded-lg data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm text-slate-500 font-medium transition-all"
                >
                  Basic Info
                </TabsTrigger>
                <TabsTrigger 
                  value="governance" 
                  className="px-4 py-2 rounded-lg data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm text-slate-500 font-medium transition-all"
                >
                  Governance
                </TabsTrigger>
                <TabsTrigger 
                  value="relationships" 
                  className="px-4 py-2 rounded-lg data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm text-slate-500 font-medium transition-all"
                >
                  Relationships
                </TabsTrigger>
                <TabsTrigger 
                  value="topics" 
                  className="px-4 py-2 rounded-lg data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm text-slate-500 font-medium transition-all"
                >
                  Topics <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-slate-100 text-xs text-slate-600 font-semibold">{formData.topics.length}</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="spaces" 
                  className="px-4 py-2 rounded-lg data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm text-slate-500 font-medium transition-all"
                >
                  Spaces <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-slate-100 text-xs text-slate-600 font-semibold">{formData.relatedSpaces.length}</span>
                </TabsTrigger>
              </TabsList>
            
              <TabsContent value="basic" className="space-y-6 mt-0 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
                <div className="grid gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-semibold text-slate-900">Catalog Name <span className="text-red-500">*</span></Label>
                    <Input
                      id="name"
                      placeholder="e.g., Policy Domain, Claims Domain"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      className="h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                    />
                    <p className="text-xs text-slate-500">
                      Use a business-friendly name that AI agents can understand
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-sm font-semibold text-slate-900">Description <span className="text-red-500">*</span></Label>
                    <Textarea
                      id="description"
                      placeholder="Describe the business domain, what data it contains, and its purpose. This is crucial for AI discovery."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      required
                      rows={4}
                      className="min-h-[120px] border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 resize-none"
                    />
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <span className="inline-block w-4 h-4 bg-yellow-100 text-yellow-700 rounded-full text-[10px] font-bold flex items-center justify-center">💡</span>
                      Tip: Include keywords like "lifecycle", "transaction", "customer", etc. for better AI discoverability
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="tags" className="text-sm font-semibold text-slate-900">Business Tags</Label>
                      <Input
                        id="tags"
                        placeholder="e.g., Core Business, PII Sensitive"
                        value={formData.tags.join(', ')}
                        onChange={(e) => setFormData({ ...formData, tags: e.target.value.split(',').map(t => t.trim()) })}
                        className="h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="sensitivity" className="text-sm font-semibold text-slate-900">Data Sensitivity <span className="text-red-500">*</span></Label>
                      <Select
                        value={formData.sensitivity}
                        onValueChange={(value) => setFormData({ ...formData, sensitivity: value as any })}
                        required
                      >
                        <SelectTrigger className="h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20">
                          <SelectValue placeholder="Select sensitivity level" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="public">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">🌍</span> Public - Open to everyone
                            </div>
                          </SelectItem>
                          <SelectItem value="internal">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">🏢</span> Internal - Company employees only
                            </div>
                          </SelectItem>
                          <SelectItem value="confidential">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">🔒</span> Confidential - Authorized personnel
                            </div>
                          </SelectItem>
                          <SelectItem value="restricted">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">🚨</span> Restricted - Highly sensitive data
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="governance" className="space-y-6 mt-0 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
                <div className="grid gap-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="owner" className="text-sm font-semibold text-slate-900">Business Owner <span className="text-red-500">*</span></Label>
                      <Input
                        id="owner"
                        placeholder="e.g., Insurance Business Team"
                        value={formData.owner}
                        onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                        required
                        className="h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                      />
                      <p className="text-xs text-slate-500">
                        The business unit or team responsible for this domain
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="technicalOwner" className="text-sm font-semibold text-slate-900">Technical Owner <span className="text-red-500">*</span></Label>
                      <Input
                        id="technicalOwner"
                        placeholder="e.g., Data Platform Team"
                        value={formData.technicalOwner}
                        onChange={(e) => setFormData({ ...formData, technicalOwner: e.target.value })}
                        required
                        className="h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                      />
                      <p className="text-xs text-slate-500">
                        The technical team responsible for data quality and operations
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status" className="text-sm font-semibold text-slate-900">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => setFormData({ ...formData, status: value as any })}
                    >
                      <SelectTrigger className="h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">
                          <div className="flex items-center gap-2">
                            <span className="text-emerald-500 text-lg">✅</span> Active
                          </div>
                        </SelectItem>
                        <SelectItem value="deprecated">
                          <div className="flex items-center gap-2">
                            <span className="text-amber-500 text-lg">⚠️</span> Deprecated
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>

            <TabsContent value="relationships" className="space-y-4 mt-0 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-900">Related Domains</Label>
                <div className="text-sm text-slate-500 mb-4">
                  Define relationships with other business domains.
                </div>
                <div className="border border-slate-200 rounded-xl p-4 space-y-4 max-h-[400px] overflow-y-auto bg-slate-50/50">
                  {availableCatalogs.length === 0 ? (
                    <div className="text-center text-slate-500 py-8 flex flex-col items-center gap-2">
                      <Network className="w-8 h-8 text-slate-300" />
                      No other domains available.
                    </div>
                  ) : (
                    availableCatalogs
                      .filter(c => c.id !== editingCatalog?.id)
                      .map((catalog) => {
                        const relationship = formData.relatedDomains.find(r => r.domainId === catalog.id);
                        const isChecked = !!relationship;

                        return (
                          <div key={catalog.id} className={`p-4 border rounded-xl transition-all duration-200 ${isChecked ? 'bg-white border-blue-200 shadow-sm' : 'bg-white border-slate-200 hover:border-blue-200'}`}>
                            <div className="flex items-start space-x-3 mb-2">
                              <Checkbox
                                id={`rel-${catalog.id}`}
                                checked={isChecked}
                                onCheckedChange={(checked) => {
                                  setFormData(prev => ({
                                    ...prev,
                                    relatedDomains: checked
                                      ? [...prev.relatedDomains, { domainId: catalog.id, relationshipType: 'Related to' }]
                                      : prev.relatedDomains.filter(r => r.domainId !== catalog.id)
                                  }));
                                }}
                                className="mt-1 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                              />
                              <div className="grid gap-1.5 leading-none flex-1">
                                <label
                                  htmlFor={`rel-${catalog.id}`}
                                  className="text-sm font-semibold text-slate-900 cursor-pointer"
                                >
                                  {catalog.name}
                                </label>
                                <p className="text-xs text-slate-500 leading-relaxed">
                                  {catalog.description}
                                </p>
                              </div>
                            </div>

                            {isChecked && (
                              <div className="ml-7 grid gap-4 pl-4 border-l-2 border-blue-100 animate-in slide-in-from-top-2 mt-3 pt-1">
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-1.5">
                                    <Label htmlFor={`type-${catalog.id}`} className="text-xs font-medium text-slate-600">Relationship Type</Label>
                                    <Input
                                      id={`type-${catalog.id}`}
                                      value={relationship?.relationshipType || ''}
                                      onChange={(e) => {
                                        setFormData(prev => ({
                                          ...prev,
                                          relatedDomains: prev.relatedDomains.map(r => 
                                            r.domainId === catalog.id 
                                              ? { ...r, relationshipType: e.target.value } 
                                              : r
                                          )
                                        }));
                                      }}
                                      placeholder="e.g. Depends on"
                                      className="h-9 text-sm"
                                    />
                                  </div>
                                  <div className="space-y-1.5">
                                    <Label htmlFor={`desc-${catalog.id}`} className="text-xs font-medium text-slate-600">Description</Label>
                                    <Input
                                      id={`desc-${catalog.id}`}
                                      value={relationship?.description || ''}
                                      onChange={(e) => {
                                        setFormData(prev => ({
                                          ...prev,
                                          relatedDomains: prev.relatedDomains.map(r => 
                                            r.domainId === catalog.id 
                                              ? { ...r, description: e.target.value } 
                                              : r
                                          )
                                        }));
                                      }}
                                      placeholder="Optional details..."
                                      className="h-9 text-sm"
                                    />
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="topics" className="space-y-4 mt-0 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
              <div className="flex justify-between items-center">
                <div className="text-sm text-slate-500">
                  Manage data entities (Topics) for this domain.
                </div>
                <Button type="button" size="sm" onClick={() => setShowTopicDialog(true)} className="gap-2 bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4" /> Add Topic
                </Button>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                {formData.topics.length === 0 ? (
                  <div className="p-12 text-center text-slate-500 bg-slate-50/50 flex flex-col items-center justify-center gap-3">
                    <div className="p-3 bg-white rounded-full shadow-sm border border-slate-100">
                      <Database className="w-6 h-6 text-slate-400" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">No topics added yet</p>
                      <p className="text-xs text-slate-400 mt-1">Add topics to define your data entities</p>
                    </div>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {formData.topics.map((topic) => (
                      <div key={topic.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                        <div className="flex items-center gap-4">
                          <Badge variant="outline" className={`
                            ${topic.type === 'entity' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                              topic.type === 'event' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                              'bg-green-50 text-green-700 border-green-200'}
                            h-8 px-3
                          `}>
                            {topic.type}
                          </Badge>
                          <div>
                            <div className="font-semibold text-slate-900">{topic.name}</div>
                            <div className="text-xs text-slate-500 line-clamp-1 mt-0.5">{topic.description}</div>
                          </div>
                        </div>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 hover:bg-white hover:shadow-sm" 
                            onClick={() => {
                              setEditingTopic(topic);
                              setShowTopicDialog(true);
                            }}
                          >
                            <Edit className="w-4 h-4 text-slate-500" />
                          </Button>
                          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 hover:bg-red-50 hover:text-red-600"
                            onClick={() => {
                              setFormData(prev => ({
                                ...prev,
                                topics: prev.topics.filter(t => t.id !== topic.id)
                              }));
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="spaces" className="space-y-4 mt-0 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
              <div className="flex justify-between items-center">
                <div className="text-sm text-slate-500">
                  Manage data marts (Spaces) for this domain.
                </div>
                <Button type="button" size="sm" onClick={() => setShowSpaceDialog(true)} className="gap-2 bg-green-600 hover:bg-green-700">
                  <Plus className="w-4 h-4" /> Add Space
                </Button>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                {formData.relatedSpaces.length === 0 ? (
                  <div className="p-12 text-center text-slate-500 bg-slate-50/50 flex flex-col items-center justify-center gap-3">
                    <div className="p-3 bg-white rounded-full shadow-sm border border-slate-100">
                      <Grid3x3 className="w-6 h-6 text-slate-400" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">No spaces added yet</p>
                      <p className="text-xs text-slate-400 mt-1">Add spaces to define your data marts</p>
                    </div>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {formData.relatedSpaces.map((space) => (
                      <div key={space.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                        <div className="flex items-center gap-4">
                          <Badge variant="outline" className={`
                            ${space.type === 'data_mart' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-blue-50 text-blue-700 border-blue-200'}
                            h-8 px-3
                          `}>
                            {space.type === 'data_mart' ? 'Mart' : 'Connected'}
                          </Badge>
                          <div>
                            <div className="font-semibold text-slate-900">{space.name}</div>
                            <div className="text-xs text-slate-500 line-clamp-1 mt-0.5">{space.description}</div>
                          </div>
                        </div>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 hover:bg-white hover:shadow-sm"
                            onClick={() => {
                              setEditingSpace(space);
                              setShowSpaceDialog(true);
                            }}
                          >
                            <Edit className="w-4 h-4 text-slate-500" />
                          </Button>
                          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 hover:bg-red-50 hover:text-red-600"
                            onClick={() => {
                              setFormData(prev => ({
                                ...prev,
                                relatedSpaces: prev.relatedSpaces.filter(s => s.id !== space.id)
                              }));
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
          </div>

          <DialogFooter className="p-8 pt-0 bg-white border-t-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{editingCatalog ? 'Save Changes' : 'Create Catalog'}</Button>
          </DialogFooter>
        </form>

        <CreateTopicDialog 
          open={showTopicDialog} 
          onOpenChange={(open) => {
            if (!open) {
              setShowTopicDialog(false);
              setEditingTopic(null);
            }
          }}
          onCreateTopic={handleCreateTopic}
          onUpdateTopic={handleUpdateTopic}
          editingTopic={editingTopic}
          existingTopics={formData.topics}
        />

        <CreateSpaceDialog 
          open={showSpaceDialog}
          onOpenChange={(open) => {
            if (!open) {
              setShowSpaceDialog(false);
              setEditingSpace(null);
            }
          }}
          onCreateSpace={handleCreateSpace}
          onUpdateSpace={handleUpdateSpace}
          editingSpace={editingSpace}
          availableTopics={formData.topics}
        />
      </DialogContent>
    </Dialog>
  );
}