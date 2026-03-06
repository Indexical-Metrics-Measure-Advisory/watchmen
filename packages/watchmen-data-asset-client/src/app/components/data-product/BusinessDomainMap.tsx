import { useState } from "react";
import { Search, Plus, Layers, Database, Grid3x3, Eye, Edit, Tag, Users, Sparkles, Network } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { CreateCatalogDialog } from "./CreateCatalogDialog";
import { CatalogDetailPanel } from "./CatalogDetailPanel";
import { AIDiscoveryPathDialog } from "./AIDiscoveryPathDialog";
import { CreateTopicDialog } from "./CreateTopicDialog";
import { CreateSpaceDialog } from "./CreateSpaceDialog";
import { DomainGraph } from "./DomainGraph";
import { Topic, Space, Catalog } from "./model/BusinessDomain";
import { INITIAL_CATALOGS } from "./model/DomainData";

export function BusinessDomainMap() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTag, setFilterTag] = useState("all");
  const [viewMode, setViewMode] = useState<'grid' | 'graph'>('graph');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedCatalog, setSelectedCatalog] = useState<Catalog | null>(null);
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [showAIPath, setShowAIPath] = useState(false);
  const [editingCatalog, setEditingCatalog] = useState<Catalog | null>(null);
  
  // Topic management states
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [showCreateTopic, setShowCreateTopic] = useState(false);
  
  // Space management states
  const [editingSpace, setEditingSpace] = useState<Space | null>(null);
  const [showCreateSpace, setShowCreateSpace] = useState(false);

  const [catalogs, setCatalogs] = useState<Catalog[]>(INITIAL_CATALOGS);

  const allTags = Array.from(new Set(catalogs.flatMap(c => c.tags)));

  const filteredCatalogs = catalogs.filter((catalog) => {
    const matchesSearch = catalog.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         catalog.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag = filterTag === 'all' || catalog.tags.includes(filterTag);
    return matchesSearch && matchesTag;
  });

  const handleViewDetail = (catalog: Catalog) => {
    setSelectedCatalog(catalog);
    setShowDetailPanel(true);
  };

  const handleCreateCatalog = (newCatalog: Omit<Catalog, 'id' | 'createdAt' | 'updatedAt'>) => {
    const catalog: Catalog = {
      ...newCatalog,
      id: `cat-${String(catalogs.length + 1).padStart(3, '0')}`,
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
    };
    setCatalogs([...catalogs, catalog]);
  };

  const handleUpdateCatalog = (updatedCatalog: Omit<Catalog, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!editingCatalog) return;
    
    const updated: Catalog = {
      ...updatedCatalog,
      id: editingCatalog.id,
      createdAt: editingCatalog.createdAt,
      updatedAt: new Date().toISOString().split('T')[0],
    };
    
    setCatalogs(catalogs.map(c => c.id === editingCatalog.id ? updated : c));
    setEditingCatalog(null);
  };

  const handleEditClick = (catalog: Catalog) => {
    setEditingCatalog(catalog);
  };

  // Topic management handlers
  const handleCreateTopic = (newTopic: Topic) => {
    if (!selectedCatalog) return;
    
    const updatedCatalog: Catalog = {
      ...selectedCatalog,
      topics: [...selectedCatalog.topics, newTopic],
      updatedAt: new Date().toISOString().split('T')[0],
    };
    
    setCatalogs(catalogs.map(c => c.id === selectedCatalog.id ? updatedCatalog : c));
    setSelectedCatalog(updatedCatalog);
    setShowCreateTopic(false);
  };

  const handleUpdateTopic = (updatedTopic: Topic) => {
    if (!selectedCatalog) return;
    
    const updatedCatalog: Catalog = {
      ...selectedCatalog,
      topics: selectedCatalog.topics.map(t => t.id === updatedTopic.id ? updatedTopic : t),
      updatedAt: new Date().toISOString().split('T')[0],
    };
    
    setCatalogs(catalogs.map(c => c.id === selectedCatalog.id ? updatedCatalog : c));
    setSelectedCatalog(updatedCatalog);
    setEditingTopic(null);
  };

  const handleDeleteTopic = (topicId: string) => {
    if (!selectedCatalog) return;
    
    const updatedCatalog: Catalog = {
      ...selectedCatalog,
      topics: selectedCatalog.topics.filter(t => t.id !== topicId),
      updatedAt: new Date().toISOString().split('T')[0],
    };
    
    setCatalogs(catalogs.map(c => c.id === selectedCatalog.id ? updatedCatalog : c));
    setSelectedCatalog(updatedCatalog);
  };

  const handleEditTopic = (topic: Topic) => {
    setEditingTopic(topic);
  };

  // Space management handlers
  const handleCreateSpace = (newSpace: Space) => {
    if (!selectedCatalog) return;
    
    const updatedCatalog: Catalog = {
      ...selectedCatalog,
      relatedSpaces: [...selectedCatalog.relatedSpaces, newSpace],
      updatedAt: new Date().toISOString().split('T')[0],
    };
    
    setCatalogs(catalogs.map(c => c.id === selectedCatalog.id ? updatedCatalog : c));
    setSelectedCatalog(updatedCatalog);
    setShowCreateSpace(false);
  };

  const handleUpdateSpace = (updatedSpace: Space) => {
    if (!selectedCatalog) return;
    
    const updatedCatalog: Catalog = {
      ...selectedCatalog,
      relatedSpaces: selectedCatalog.relatedSpaces.map(s => s.id === updatedSpace.id ? updatedSpace : s),
      updatedAt: new Date().toISOString().split('T')[0],
    };
    
    setCatalogs(catalogs.map(c => c.id === selectedCatalog.id ? updatedCatalog : c));
    setSelectedCatalog(updatedCatalog);
    setEditingSpace(null);
  };

  const handleDeleteSpace = (spaceId: string) => {
    if (!selectedCatalog) return;
    
    const updatedCatalog: Catalog = {
      ...selectedCatalog,
      relatedSpaces: selectedCatalog.relatedSpaces.filter(s => s.id !== spaceId),
      updatedAt: new Date().toISOString().split('T')[0],
    };
    
    setCatalogs(catalogs.map(c => c.id === selectedCatalog.id ? updatedCatalog : c));
    setSelectedCatalog(updatedCatalog);
  };

  const handleEditSpace = (space: Space) => {
    setEditingSpace(space);
  };

  const sensitivityConfig = {
    public: { label: 'Public', className: 'bg-green-100 text-green-700', icon: '🌍' },
    internal: { label: 'Internal', className: 'bg-blue-100 text-blue-700', icon: '🏢' },
    confidential: { label: 'Confidential', className: 'bg-orange-100 text-orange-700', icon: '🔒' },
    restricted: { label: 'Restricted', className: 'bg-red-100 text-red-700', icon: '🚨' },
  };

  const topicTypeConfig = {
    entity: { label: 'Entity', className: 'bg-blue-100 text-blue-700', icon: '📦' },
    event: { label: 'Event', className: 'bg-purple-100 text-purple-700', icon: '⚡' },
    aggregate: { label: 'Aggregate', className: 'bg-green-100 text-green-700', icon: '📊' },
  };

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Business Domain Map</h2>
          <p className="text-slate-500 mt-2 text-lg">Semantic layer for AI-powered data discovery and Data Mesh architecture</p>
        </div>
        <div className="flex gap-3 items-center">
          <div className="flex bg-slate-100 p-1 rounded-lg mr-2 h-10 border border-slate-200">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                viewMode === 'grid' 
                  ? 'bg-white text-slate-900 shadow-sm ring-1 ring-black/5' 
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Grid3x3 className="w-4 h-4" />
              Grid
            </button>
            <button
              onClick={() => setViewMode('graph')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                viewMode === 'graph' 
                  ? 'bg-white text-slate-900 shadow-sm ring-1 ring-black/5' 
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Network className="w-4 h-4" />
              Graph
            </button>
          </div>
          <Button 
            variant="outline" 
            className="gap-2 h-10 border-slate-200 hover:bg-slate-50 hover:text-slate-900"
            onClick={() => setShowAIPath(true)}
          >
            <Sparkles className="w-4 h-4 text-indigo-500" />
            AI Discovery Path
          </Button>
          <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2 h-10 bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-600/20">
            <Plus className="w-4 h-4" />
            Create Catalog
          </Button>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex gap-4 items-center bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            placeholder="Search catalogs by name, description or owner..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 border-0 shadow-none focus-visible:ring-0 text-base h-11 bg-transparent"
          />
        </div>
        <div className="h-8 w-px bg-slate-200 mx-2" />
        <Select value={filterTag} onValueChange={setFilterTag}>
          <SelectTrigger className="w-56 border-0 shadow-none focus:ring-0 h-11 bg-transparent hover:bg-slate-50 rounded-lg">
            <SelectValue placeholder="Filter by Tag" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tags</SelectItem>
            {allTags.map(tag => (
              <SelectItem key={tag} value={tag}>{tag}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Architecture Overview Card */}
      <Card className="bg-gradient-to-br from-indigo-50/50 via-white to-blue-50/50 border-slate-200 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3 text-xl text-slate-800">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Network className="w-5 h-5 text-indigo-600" />
            </div>
            Three-Layer Architecture
          </CardTitle>
          <CardDescription className="text-base text-slate-500 ml-12">
            AI Agent discovery path: Catalog (Domain) → Topic (Entity) → Space (Data Mart)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Layers className="w-5 h-5 text-blue-600" />
                </div>
                <span className="text-3xl font-bold text-slate-900">{catalogs.length}</span>
              </div>
              <h3 className="font-semibold text-slate-900 mb-1">Catalog (Domain)</h3>
              <p className="text-sm text-slate-500">Business domain nodes for macro discovery</p>
            </div>
            
            <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-purple-50 rounded-lg">
                  <Database className="w-5 h-5 text-purple-600" />
                </div>
                <span className="text-3xl font-bold text-slate-900">
                  {catalogs.reduce((sum, c) => sum + c.topics.length, 0)}
                </span>
              </div>
              <h3 className="font-semibold text-slate-900 mb-1">Topic (Entity)</h3>
              <p className="text-sm text-slate-500">Data entities with relationships</p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-emerald-50 rounded-lg">
                  <Grid3x3 className="w-5 h-5 text-emerald-600" />
                </div>
                <span className="text-3xl font-bold text-slate-900">
                  {catalogs.reduce((sum, c) => sum + c.relatedSpaces.length, 0)}
                </span>
              </div>
              <h3 className="font-semibold text-slate-900 mb-1">Space (Data Mart)</h3>
              <p className="text-sm text-slate-500">Pre-aggregated analytical datasets</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content Area */}
      {viewMode === 'graph' ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm min-h-[600px] overflow-hidden">
          <DomainGraph 
            catalogs={filteredCatalogs} 
            onSelectCatalog={handleViewDetail} 
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredCatalogs.map((catalog) => (
            <Card key={catalog.id} className="group hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition-all duration-300 border-slate-200 bg-white hover:-translate-y-1 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 pr-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 bg-blue-50 rounded-md">
                        <Layers className="w-5 h-5 text-blue-600" />
                      </div>
                      <CardTitle className="text-xl font-bold text-slate-900">{catalog.name}</CardTitle>
                    </div>
                    <CardDescription className="line-clamp-2 text-slate-500 text-sm leading-relaxed">
                      {catalog.description}
                    </CardDescription>
                  </div>
                  <Badge className={`${sensitivityConfig[catalog.sensitivity].className} border-0 shadow-none px-2.5 py-1`}>
                    {sensitivityConfig[catalog.sensitivity].icon} {sensitivityConfig[catalog.sensitivity].label}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Owners */}
                <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 uppercase tracking-wide font-medium">
                      <Users className="w-3.5 h-3.5" />
                      Business Owner
                    </div>
                    <p className="font-semibold text-slate-900 text-sm truncate pl-5">{catalog.owner}</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 uppercase tracking-wide font-medium">
                      <Users className="w-3.5 h-3.5" />
                      Tech Owner
                    </div>
                    <p className="font-semibold text-slate-900 text-sm truncate pl-5">{catalog.technicalOwner}</p>
                  </div>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-2">
                  {catalog.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="text-xs bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200 px-2.5 py-0.5">
                      <Tag className="w-3 h-3 mr-1.5 text-slate-400" />
                      {tag}
                    </Badge>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-6 pt-2">
                  {/* Topics */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                      <Database className="w-4 h-4 text-purple-500" />
                      Topics <span className="text-slate-400 font-normal">({catalog.topics.length})</span>
                    </div>
                    <div className="space-y-2">
                      {catalog.topics.slice(0, 2).map((topic) => (
                        <div key={topic.id} className="flex items-center gap-2 text-sm">
                          <div className={`w-1.5 h-1.5 rounded-full ${
                            topic.type === 'entity' ? 'bg-blue-400' : 
                            topic.type === 'event' ? 'bg-purple-400' : 'bg-green-400'
                          }`} />
                          <span className="font-medium text-slate-700 truncate max-w-[120px]" title={topic.name}>{topic.name}</span>
                          <span className="text-slate-400 text-xs shrink-0">({topic.fields} fields)</span>
                        </div>
                      ))}
                      {catalog.topics.length > 2 && (
                        <div className="text-xs text-slate-500 pl-3.5 hover:text-blue-600 cursor-pointer font-medium">
                          +{catalog.topics.length - 2} more...
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Related Spaces */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                      <Grid3x3 className="w-4 h-4 text-emerald-500" />
                      Spaces <span className="text-slate-400 font-normal">({catalog.relatedSpaces.length})</span>
                    </div>
                    <div className="space-y-2">
                      {catalog.relatedSpaces.slice(0, 2).map((space) => (
                        <div key={space.id} className="flex items-center gap-2 text-sm">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          <span className="font-medium text-slate-700 truncate max-w-[100px]" title={space.name}>{space.name}</span>
                          <Badge variant="outline" className="text-[10px] h-4 px-1 py-0 border-emerald-200 text-emerald-700 bg-emerald-50">
                            {space.type === 'data_mart' ? 'Mart' : 'Link'}
                          </Badge>
                        </div>
                      ))}
                      {catalog.relatedSpaces.length > 2 && (
                        <div className="text-xs text-slate-500 pl-3.5 hover:text-blue-600 cursor-pointer font-medium">
                          +{catalog.relatedSpaces.length - 2} more...
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4 mt-2 border-t border-slate-100 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 gap-2 border-slate-200 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 transition-colors h-9"
                    onClick={() => handleViewDetail(catalog)}
                  >
                    <Eye className="w-4 h-4" />
                    View Details
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="gap-2 border-slate-200 hover:border-slate-300 h-9" 
                    onClick={() => handleEditClick(catalog)}
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {filteredCatalogs.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border">
          <Layers className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No catalogs found</p>
          <p className="text-sm text-gray-400 mt-1">Try adjusting your search or filters</p>
        </div>
      )}

      {/* Dialogs */}
      <CreateCatalogDialog
        open={isCreateDialogOpen || !!editingCatalog}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateDialogOpen(false);
            setEditingCatalog(null);
          }
        }}
        onCreateCatalog={handleCreateCatalog}
        onUpdateCatalog={handleUpdateCatalog}
        editingCatalog={editingCatalog}
        availableCatalogs={catalogs}
      />

      {selectedCatalog && (
        <CatalogDetailPanel
          open={showDetailPanel}
          onOpenChange={setShowDetailPanel}
          catalog={selectedCatalog}
          allCatalogs={catalogs}
          onEditCatalog={() => {
            setShowDetailPanel(false);
            handleEditClick(selectedCatalog);
          }}
          onEditTopic={handleEditTopic}
          onDeleteTopic={handleDeleteTopic}
          onCreateTopic={() => setShowCreateTopic(true)}
          onEditSpace={handleEditSpace}
          onDeleteSpace={handleDeleteSpace}
          onCreateSpace={() => setShowCreateSpace(true)}
        />
      )}

      <CreateTopicDialog
        open={showCreateTopic || !!editingTopic}
        onOpenChange={(open) => {
          if (!open) {
            setShowCreateTopic(false);
            setEditingTopic(null);
          }
        }}
        onCreateTopic={handleCreateTopic}
        onUpdateTopic={handleUpdateTopic}
        editingTopic={editingTopic}
        existingTopics={selectedCatalog?.topics || []}
        availableCatalogs={catalogs}
      />

      <CreateSpaceDialog
        open={showCreateSpace || !!editingSpace}
        onOpenChange={(open) => {
          if (!open) {
            setShowCreateSpace(false);
            setEditingSpace(null);
          }
        }}
        onCreateSpace={handleCreateSpace}
        onUpdateSpace={handleUpdateSpace}
        editingSpace={editingSpace}
        availableTopics={selectedCatalog?.topics || []}
      />

      <AIDiscoveryPathDialog
        open={showAIPath}
        onOpenChange={setShowAIPath}
        catalogs={catalogs}
      />
    </div>
  );
}
