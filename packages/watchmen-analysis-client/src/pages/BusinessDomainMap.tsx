import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Search, Plus, Layers, Database, Grid3x3, Eye, Tag, Users, Sparkles, Network, Pencil, X, Keyboard } from 'lucide-react';
import { useSidebar } from '@/contexts/SidebarContext';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { OntologyDomainDetailDialog } from '@/components/ontology/OntologyDomainDetailDialog';
import { OntologyDomainEditorDialog } from '@/components/ontology/OntologyDomainEditorDialog';
import { OntologyDomainGraph } from '@/components/ontology/OntologyDomainGraph';
import {
  INITIAL_ONTOLOGY_DOMAINS,
  OntologyDomain,
  conceptTypeConfig,
  sensitivityConfig
} from '@/model/ontology';

const BusinessDomainMap: React.FC = () => {
  const { collapsed } = useSidebar();
  const [domains, setDomains] = useState<OntologyDomain[]>(INITIAL_ONTOLOGY_DOMAINS);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTag, setFilterTag] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'graph'>('graph');
  const [selectedDomain, setSelectedDomain] = useState<OntologyDomain | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<'create' | 'edit'>('create');
  const [editingDomain, setEditingDomain] = useState<OntologyDomain | null>(null);
  const [aiPathOpen, setAiPathOpen] = useState(false);
  const [keyboardShortcutsOpen, setKeyboardShortcutsOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const allTags = useMemo(() => Array.from(new Set(domains.flatMap(domain => domain.tags))).sort(), [domains]);

  const filteredDomains = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return domains.filter(domain => {
      const matchesSearch = q.length === 0 || domain.name.toLowerCase().includes(q) || domain.description.toLowerCase().includes(q);
      const matchesTag = filterTag === 'all' || domain.tags.includes(filterTag);
      return matchesSearch && matchesTag;
    });
  }, [domains, filterTag, searchQuery]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('domain-search')?.focus();
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'n') {
        e.preventDefault();
        openCreateDomain();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('ontologyViewMode');
    if (saved === 'grid' || saved === 'graph') setViewMode(saved);
  }, []);

  useEffect(() => {
    localStorage.setItem('ontologyViewMode', viewMode);
  }, [viewMode]);

  const openDomainDetail = (domain: OntologyDomain) => {
    setSelectedDomain(domain);
    setDetailOpen(true);
  };

  const openCreateDomain = () => {
    setEditorMode('create');
    setEditingDomain(null);
    setEditorOpen(true);
  };

  const openEditDomain = (domain: OntologyDomain) => {
    setEditorMode('edit');
    setEditingDomain(domain);
    setEditorOpen(true);
  };

  const handleSaveDomain = (savedDomain: OntologyDomain) => {
    setDomains(prev => {
      const exists = prev.some(domain => domain.id === savedDomain.id);
      return exists ? prev.map(domain => (domain.id === savedDomain.id ? savedDomain : domain)) : [...prev, savedDomain];
    });
    setSelectedDomain(savedDomain);
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className={`${collapsed ? 'pl-20' : 'pl-56'} min-h-screen transition-all duration-300`}>
        <Header />

        <main className="container py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-semibold">Business Ontology</h1>
              <p className="text-muted-foreground mt-1">Semantic layer for AI-powered discovery and data mesh navigation</p>
            </div>
            <div className="flex flex-wrap gap-3 items-center">
              <div className="flex bg-muted/60 p-1 rounded-lg mr-1 h-10 border">
                <button
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2',
                    viewMode === 'grid'
                      ? 'bg-background text-foreground shadow-sm ring-1 ring-black/5'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Grid3x3 className="w-4 h-4" />
                  Grid
                </button>
                <button
                  onClick={() => setViewMode('graph')}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2',
                    viewMode === 'graph'
                      ? 'bg-background text-foreground shadow-sm ring-1 ring-black/5'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Network className="w-4 h-4" />
                  Graph
                </button>
              </div>
              <Button variant="outline" className="gap-2 h-10" onClick={() => setAiPathOpen(true)}>
                <Sparkles className="w-4 h-4 text-indigo-500" />
                AI Discovery Path
              </Button>
              <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => setKeyboardShortcutsOpen(true)} title="Keyboard shortcuts">
                <Keyboard className="w-4 h-4" />
              </Button>
              <Button className="gap-2 h-10" onClick={openCreateDomain}>
                <Plus className="w-4 h-4" />
                Create Ontology Domain
              </Button>
            </div>
          </div>

          <div className="glass-card p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="domain-search"
                  placeholder="Search ontology domains by name or description..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setIsSearchFocused(false)}
                  className="pl-9 pr-20"
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="p-1 hover:bg-muted rounded transition-colors"
                    >
                      <X className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  )}
                  {!isSearchFocused && !searchQuery && (
                    <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 text-xs text-muted-foreground bg-muted rounded border">
                      <span className="text-[10px]">⌘</span>K
                    </kbd>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {(searchQuery || filterTag !== 'all') && (
                  <div className="text-sm text-muted-foreground whitespace-nowrap">
                    <span className="font-medium text-foreground">{filteredDomains.length}</span> of {domains.length} domains
                  </div>
                )}
                <div className="w-full md:w-64">
                  <Select value={filterTag} onValueChange={setFilterTag}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by tag" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Tags</SelectItem>
                      {allTags.map(tag => (
                        <SelectItem key={tag} value={tag}>
                          {tag}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          <Card className="mb-6">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <Network className="w-5 h-5 text-indigo-600" />
                </div>
                Ontology Architecture
              </CardTitle>
              <CardDescription>AI Agent discovery path: Ontology Domain → Concept → Semantic View</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => { setFilterTag('all'); setSearchQuery(''); }}
                  className="bg-muted/30 p-5 rounded-xl border text-left hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <Layers className="w-5 h-5 text-blue-600" />
                    </div>
                    <span className="text-2xl font-bold">{domains.length}</span>
                  </div>
                  <div className="font-semibold">Ontology Domains</div>
                  <div className="text-sm text-muted-foreground">Top-level business ontology contexts</div>
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className="bg-muted/30 p-5 rounded-xl border text-left hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2 bg-purple-50 rounded-lg">
                      <Database className="w-5 h-5 text-purple-600" />
                    </div>
                    <span className="text-2xl font-bold">{domains.reduce((sum, domain) => sum + domain.concepts.length, 0)}</span>
                  </div>
                  <div className="font-semibold">Ontology Concepts</div>
                  <div className="text-sm text-muted-foreground">Classes, events, and aggregate concepts</div>
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className="bg-muted/30 p-5 rounded-xl border text-left hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2 bg-emerald-50 rounded-lg">
                      <Grid3x3 className="w-5 h-5 text-emerald-600" />
                    </div>
                    <span className="text-2xl font-bold">{domains.reduce((sum, domain) => sum + domain.semanticViews.length, 0)}</span>
                  </div>
                  <div className="font-semibold">Semantic Views</div>
                  <div className="text-sm text-muted-foreground">Linked analytical views and marts</div>
                </button>
              </div>
            </CardContent>
          </Card>

          {viewMode === 'graph' ? (
            <div className="bg-background rounded-xl border shadow-sm overflow-hidden">
              <OntologyDomainGraph domains={filteredDomains} onSelectDomain={openDomainDetail} />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredDomains.map(domain => (
                <Card key={domain.id} className="group hover:shadow-md transition-all border">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="p-1.5 bg-blue-50 rounded-md">
                            <Layers className="w-5 h-5 text-blue-600" />
                          </div>
                          <CardTitle className="text-lg">{domain.name}</CardTitle>
                        </div>
                        <CardDescription className="line-clamp-2">{domain.description}</CardDescription>
                      </div>
                      <Badge className={`${sensitivityConfig[domain.sensitivity].className} border-0`}>
                        {sensitivityConfig[domain.sensitivity].icon} {sensitivityConfig[domain.sensitivity].label}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="grid grid-cols-2 gap-4 p-3 bg-muted/30 rounded-lg border">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-wide font-medium">
                          <Users className="w-3.5 h-3.5" />
                          Business Owner
                        </div>
                        <p className="font-semibold text-sm truncate pl-5">{domain.owner}</p>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-wide font-medium">
                          <Users className="w-3.5 h-3.5" />
                          Tech Owner
                        </div>
                        <p className="font-semibold text-sm truncate pl-5">{domain.technicalOwner}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {domain.tags.map(tag => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          <Tag className="w-3 h-3 mr-1.5" />
                          {tag}
                        </Badge>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-semibold">
                          <Database className="w-4 h-4 text-purple-500" />
                          Concepts <span className="text-muted-foreground font-normal">({domain.concepts.length})</span>
                        </div>
                        <div className="space-y-2">
                          {domain.concepts.slice(0, 3).map(concept => (
                            <div key={concept.id} className="flex items-center gap-2 text-sm">
                              <span className={cn('text-[10px] px-1.5 py-0.5 rounded', conceptTypeConfig[concept.type].className)}>
                                {conceptTypeConfig[concept.type].icon} {conceptTypeConfig[concept.type].label}
                              </span>
                              <span className="font-medium truncate" title={concept.name}>
                                {concept.name}
                              </span>
                            </div>
                          ))}
                          {domain.concepts.length > 3 && (
                            <div className="text-xs text-muted-foreground font-medium">+{domain.concepts.length - 3} more...</div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-semibold">
                          <Grid3x3 className="w-4 h-4 text-emerald-500" />
                          Semantic Views <span className="text-muted-foreground font-normal">({domain.semanticViews.length})</span>
                        </div>
                        <div className="space-y-2">
                          {domain.semanticViews.slice(0, 3).map(view => (
                            <div key={view.id} className="flex items-center gap-2 text-sm">
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">
                                {view.type === 'data_mart' ? 'Mart' : 'Connected'}
                              </span>
                              <span className="font-medium truncate" title={view.name}>
                                {view.name}
                              </span>
                            </div>
                          ))}
                          {domain.semanticViews.length > 3 && (
                            <div className="text-xs text-muted-foreground font-medium">+{domain.semanticViews.length - 3} more...</div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex pt-3 border-t gap-2 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                      <Button variant="outline" size="sm" className="flex-1 gap-2" onClick={() => openDomainDetail(domain)}>
                        <Eye className="w-4 h-4" />
                        View
                      </Button>
                      <Button variant="secondary" size="sm" className="flex-1 gap-2" onClick={() => openEditDomain(domain)}>
                        <Pencil className="w-4 h-4" />
                        Edit
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {filteredDomains.length === 0 && (
            <Card className="mt-6">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Layers className="w-8 h-8 text-muted-foreground" />
                </div>
                <div className="text-lg font-medium mb-1">No ontology domains found</div>
                <div className="text-sm text-muted-foreground text-center max-w-sm mb-4">
                  {searchQuery || filterTag !== 'all'
                    ? 'Try adjusting your search or filters to find what you\'re looking for.'
                    : 'Get started by creating your first ontology domain to organize your business concepts.'}
                </div>
                {(searchQuery || filterTag !== 'all') ? (
                  <Button
                    variant="outline"
                    onClick={() => { setSearchQuery(''); setFilterTag('all'); }}
                    className="gap-2"
                  >
                    <X className="w-4 h-4" />
                    Clear filters
                  </Button>
                ) : (
                  <Button onClick={openCreateDomain} className="gap-2">
                    <Plus className="w-4 h-4" />
                    Create Ontology Domain
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </main>
      </div>

      <OntologyDomainDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        domain={selectedDomain}
        onEdit={openEditDomain}
      />

      <OntologyDomainEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        mode={editorMode}
        domain={editingDomain}
        existingDomains={domains}
        onSave={handleSaveDomain}
      />

      <Dialog open={aiPathOpen} onOpenChange={setAiPathOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>AI Discovery Path</DialogTitle>
            <DialogDescription>Browse a step-by-step discovery path from ontology domain to semantic view.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="w-full">
              <Select
                value={selectedDomain?.id ?? ''}
                onValueChange={value => {
                  const found = domains.find(domain => domain.id === value) ?? null;
                  setSelectedDomain(found);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an ontology domain" />
                </SelectTrigger>
                <SelectContent>
                  {domains.map(domain => (
                    <SelectItem key={domain.id} value={domain.id}>
                      {domain.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Ontology Domain</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  {selectedDomain ? (
                    <>
                      <div className="font-semibold">{selectedDomain.name}</div>
                      <div className="text-muted-foreground">{selectedDomain.description}</div>
                      <div className="pt-2 flex flex-wrap gap-2">
                        {selectedDomain.tags.map(tag => (
                          <Badge key={tag} variant="secondary">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="text-muted-foreground">Select an ontology domain to start.</div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Concepts</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[44vh] pr-3">
                    <div className="space-y-2">
                      {(selectedDomain?.concepts ?? []).map(concept => (
                        <div key={concept.id} className="p-3 rounded-lg border bg-muted/20">
                          <div className="flex items-center justify-between gap-2">
                            <div className="font-medium truncate">{concept.name}</div>
                            <Badge className={cn('border-0', conceptTypeConfig[concept.type].className)}>
                              {conceptTypeConfig[concept.type].label}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{concept.description}</div>
                        </div>
                      ))}
                      {(selectedDomain?.concepts ?? []).length === 0 && <div className="text-muted-foreground text-sm">-</div>}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Semantic Views</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[44vh] pr-3">
                    <div className="space-y-2">
                      {(selectedDomain?.semanticViews ?? []).map(view => (
                        <div key={view.id} className="p-3 rounded-lg border bg-muted/20">
                          <div className="flex items-center justify-between gap-2">
                            <div className="font-medium truncate">{view.name}</div>
                            <Badge variant="outline">{view.type === 'data_mart' ? 'Mart' : 'Connected'}</Badge>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{view.description}</div>
                        </div>
                      ))}
                      {(selectedDomain?.semanticViews ?? []).length === 0 && <div className="text-muted-foreground text-sm">-</div>}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={keyboardShortcutsOpen} onOpenChange={setKeyboardShortcutsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Keyboard className="w-5 h-5" />
              Keyboard Shortcuts
            </DialogTitle>
            <DialogDescription>Quick keyboard shortcuts to navigate faster.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-sm">Focus search</span>
              <div className="flex items-center gap-1">
                <kbd className="px-2 py-1 text-xs bg-muted rounded border">⌘</kbd>
                <span className="text-muted-foreground">+</span>
                <kbd className="px-2 py-1 text-xs bg-muted rounded border">K</kbd>
              </div>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-sm">Create new domain</span>
              <div className="flex items-center gap-1">
                <kbd className="px-2 py-1 text-xs bg-muted rounded border">⌘</kbd>
                <span className="text-muted-foreground">+</span>
                <kbd className="px-2 py-1 text-xs bg-muted rounded border">⇧</kbd>
                <span className="text-muted-foreground">+</span>
                <kbd className="px-2 py-1 text-xs bg-muted rounded border">N</kbd>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BusinessDomainMap;
