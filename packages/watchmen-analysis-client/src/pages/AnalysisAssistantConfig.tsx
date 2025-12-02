import React, { useEffect, useState, useMemo } from 'react';
import { useSidebar } from '@/contexts/SidebarContext';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { AnalysisPurpose, AssistantConfig, AssistantQuestion, AssistantTerm, AssistantProfile } from '@/model/analysisAssistant';
import { getAssistants, createAssistant, updateAssistantConfig, deleteAssistant, duplicateAssistant, getQuestionTemplates } from '@/services/analysisAssistantService';
import { getMetrics } from '@/services/metricsManagementService';
import { metricsService } from '@/services/metricsService';
import type { MetricDefinition } from '@/model/metricsManagement';
import {
  Plus,
  Trash2,
  Edit,
  Copy,
  Save,
  X,
  Search,
  Download,
  Upload,
  Languages,
  Target,
  MessageSquare,
  BookOpen,
  Settings,
  MoreVertical
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const languageOptions = [
  { value: 'zh-CN', label: 'Chinese' },
  { value: 'en', label: 'English' },
  { value: 'ja', label: 'Japanese' },
  { value: 'es', label: 'Spanish' },
];

const AnalysisAssistantConfigPage: React.FC = () => {
  const { collapsed } = useSidebar();
  const { toast } = useToast();

  const [assistants, setAssistants] = useState<AssistantProfile[]>([]);
  const [metrics, setMetrics] = useState<MetricDefinition[]>([]);
  const [editingAssistant, setEditingAssistant] = useState<AssistantProfile | null>(null);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [metricSearchById, setMetricSearchById] = useState<Record<string, string>>({});
  const [questionSearchById, setQuestionSearchById] = useState<Record<string, string>>({});
  const [questionCategoryById, setQuestionCategoryById] = useState<Record<string, string>>({});
  const [newQuestionTextById, setNewQuestionTextById] = useState<Record<string, string>>({});
  const [newQuestionCategoryById, setNewQuestionCategoryById] = useState<Record<string, string>>({});

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [creatingName, setCreatingName] = useState('');

  const [isTermDialogOpen, setIsTermDialogOpen] = useState(false);
  const [activeAssistantId, setActiveAssistantId] = useState<string | null>(null);
  const [editingTerm, setEditingTerm] = useState<AssistantTerm | null>(null);
  const [termForm, setTermForm] = useState<{ term: string; definition: string; scenarios: string; metricIds: string[] }>({ term: '', definition: '', scenarios: '', metricIds: [] });

  useEffect(() => {
    (async () => {
      try {
        const list = await getAssistants();
        setAssistants(list);
        const metricsData = await getMetrics();
        let resolved: MetricDefinition[] = metricsData || [];
        if (!resolved.length) {
          try {
            const alt = await metricsService.getMetrics();
            resolved = alt.map(m => ({ name: m.name, label: m.name, description: m.description || '', type: 'simple', type_params: {}, unit: m.unit } as MetricDefinition));
          } catch {
            resolved = [];
          }
        }
        setMetrics(resolved);
      } catch {
        toast({ title: 'Failed to load', description: 'Unable to load assistant list', variant: 'destructive' });
      }
    })();
  }, [toast]);

  const toggleExpand = (id: string) => {
    const isOpening = !expanded[id];
    setExpanded(prev => ({ ...prev, [id]: isOpening }));

    if (isOpening) {
      const assistant = assistants.find(a => a.id === id);
      if (assistant) {
        setEditingAssistant({ ...assistant });
      }
    } else {
      setEditingAssistant(null);
    }
  };

  const handleCancelEdit = (id: string) => {
    setEditingAssistant(null);
    setExpanded(prev => ({ ...prev, [id]: false }));
  };

  const updateLocalConfig = (id: string, partialConfig: Partial<AssistantConfig>) => {
    if (editingAssistant && editingAssistant.id === id) {
      setEditingAssistant(prev => {
        if (!prev) return null;
        return { ...prev, config: { ...prev.config, ...partialConfig } };
      });
    }
  };

  const saveAssistant = async (id: string) => {
    if (!editingAssistant) return;
    try {
      const updated = await updateAssistantConfig(id, editingAssistant.config);
      setAssistants(prev => prev.map(a => (a.id === id ? updated : a)));
      setEditingAssistant(null);
      setExpanded(prev => ({ ...prev, [id]: false }));
      toast({ title: 'Saved', description: `${updated.name}'s configuration has been saved` });
    } catch {
      toast({ title: 'Save failed', description: 'Could not save the assistant configuration.', variant: 'destructive' });
    }
  };

  const resetAssistantsFromService = async () => {
    const list = await getAssistants();
    setAssistants(list);
    setEditingAssistant(null);
    toast({ title: 'Reset', description: 'Restored to the last saved state' });
  };

  const handleCreateAssistant = async () => {
    const name = creatingName.trim() || 'Unnamed Assistant';
    const created = await createAssistant(name);
    setAssistants(prev => [...prev, created]);
    setCreatingName('');
    setIsCreateDialogOpen(false);
    toast({ title: 'Created', description: `New assistant: ${created.name}` });
  };

  const handleDeleteAssistant = async (id: string) => {
    await deleteAssistant(id);
    setAssistants(prev => prev.filter(a => a.id !== id));
    toast({ title: 'Deleted', description: 'Assistant has been deleted' });
  };

  const handleDuplicateAssistant = async (id: string) => {
    const copy = await duplicateAssistant(id);
    if (copy) {
      setAssistants(prev => [...prev, copy]);
      toast({ title: 'Duplicated', description: `Created copy: ${copy.name}` });
    }
  };

  const openEditTerm = (assistantId: string, term?: AssistantTerm) => {
    setActiveAssistantId(assistantId);
    if (term) {
      setEditingTerm(term);
      setTermForm({ term: term.term, definition: term.definition, scenarios: term.scenarios, metricIds: term.metricIds });
    } else {
      setEditingTerm(null);
      setTermForm({ term: '', definition: '', scenarios: '', metricIds: [] });
    }
    setIsTermDialogOpen(true);
  };

  const saveTerm = async () => {
    if (!activeAssistantId) return;
    const { term, definition, scenarios, metricIds } = termForm;
    if (!term.trim() || !definition.trim()) {
      toast({ title: 'Validation Failed', description: 'Term and definition are required', variant: 'destructive' });
      return;
    }
    const target = assistants.find(a => a.id === activeAssistantId);
    if (!target) return;
    let nextTerms: AssistantTerm[];
    if (editingTerm) {
      nextTerms = target.config.terms.map(t => (t.id === editingTerm.id ? { ...t, term, definition, scenarios, metricIds } : t));
    } else {
      const created: AssistantTerm = { id: `t_${Date.now()}`, term, definition, scenarios, metricIds };
      nextTerms = [...target.config.terms, created];
    }
    const nextCfg = { ...target.config, terms: nextTerms };
    const updated = await updateAssistantConfig(activeAssistantId, nextCfg);
    setAssistants(prev => prev.map(a => (a.id === activeAssistantId ? updated : a)));
    setIsTermDialogOpen(false);
  };

  const removeTerm = async (assistantId: string, id: string) => {
    const target = assistants.find(a => a.id === assistantId);
    if (!target) return;
    const nextCfg = { ...target.config, terms: target.config.terms.filter(t => t.id !== id) };
    const updated = await updateAssistantConfig(assistantId, nextCfg);
    setAssistants(prev => prev.map(a => (a.id === assistantId ? updated : a)));
  };

  const handleExportTerms = async (assistantId: string) => {
    const target = assistants.find(a => a.id === assistantId);
    const json = JSON.stringify(target?.config.terms || [], null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'assistant-terms.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportTerms = async (assistantId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    try {
      const parsed = JSON.parse(text) as AssistantTerm[];
      if (editingAssistant) {
        const merged = [...editingAssistant.config.terms];
        parsed.forEach(item => {
          const idx = merged.findIndex(t => t.id === item.id || t.term === item.term);
          if (idx >= 0) merged[idx] = { ...merged[idx], ...item };
          else merged.push({ ...item, id: item.id || `t_${Date.now()}_${Math.random().toString(36).slice(2, 6)}` });
        });
        setEditingAssistant({ ...editingAssistant, config: { ...editingAssistant.config, terms: merged } });
      }
      toast({ title: 'Import successful', description: `Imported ${parsed.length} terms` });
    } catch {
      toast({ title: 'Import failed', description: 'Incorrect file format', variant: 'destructive' });
    }
    e.target.value = '';
  };

  const addPurpose = (assistantId: string) => {
    if (editingAssistant) {
      const next = [...editingAssistant.config.purposes, { language: 'en', text: '' }];
      setEditingAssistant({ ...editingAssistant, config: { ...editingAssistant.config, purposes: next } });
    }
  };

  const savePurposes = async (assistantId: string) => {
    if (!editingAssistant) return;
    const target = assistants.find(a => a.id === assistantId);
    if (!target) return;
    const updated = await updateAssistantConfig(assistantId, editingAssistant.config);
    setAssistants(prev => prev.map(a => (a.id === assistantId ? updated : a)));
    toast({ title: 'Saved', description: 'Analysis purpose configuration has been saved' });
  };

  const addQuestion = async (assistantId: string, newText: string, newCategory: string) => {
    const text = newText.trim();
    if (!text) {
      toast({ title: 'Please enter a question', variant: 'destructive' });
      return;
    }
    if (editingAssistant && editingAssistant.id === assistantId) {
      const newQ: AssistantQuestion = { id: `q_${Date.now()}`, text, category: newCategory || 'Default', isTemplate: false };
      const updatedQuestions = [...editingAssistant.config.questions, newQ];
      updateLocalConfig(assistantId, { questions: updatedQuestions });
    }
    setNewQuestionTextById(prev => ({ ...prev, [assistantId]: '' }));
    setNewQuestionCategoryById(prev => ({ ...prev, [assistantId]: '' }));
  };

  const removeQuestion = (assistantId: string, questionId: string) => {
    if (editingAssistant && editingAssistant.id === assistantId) {
      const updatedQuestions = editingAssistant.config.questions.filter(q => q.id !== questionId);
      updateLocalConfig(assistantId, { questions: updatedQuestions });
    }
  };

  const filteredQuestions = useMemo(() => {
    if (!editingAssistant) return [];
    const search = (questionSearchById[editingAssistant.id] || '').toLowerCase();
    const category = questionCategoryById[editingAssistant.id] || 'all';
    return editingAssistant.config.questions.filter(q => {
      const matchSearch = q.text.toLowerCase().includes(search) || q.category.toLowerCase().includes(search);
      const matchCategory = category === 'all' || q.category === category;
      return matchSearch && matchCategory;
    });
  }, [editingAssistant, questionSearchById, questionCategoryById]);

  const questionCategories = useMemo(() => {
    if (!editingAssistant) return ['all'];
    const cats = new Set(editingAssistant.config.questions.map(q => q.category));
    return ['all', ...Array.from(cats)];
  }, [editingAssistant]);

  const filteredMetrics = useMemo(() => {
    if (!editingAssistant) return [];
    const search = (metricSearchById[editingAssistant.id] || '').toLowerCase();
    return metrics.filter(m => m.label.toLowerCase().includes(search) || m.name.toLowerCase().includes(search));
  }, [editingAssistant, metrics, metricSearchById]);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className={`${collapsed ? 'pl-20' : 'pl-56'} min-h-screen transition-all duration-300`}>
        <Header />
        <main className="container py-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-xl font-semibold">Analysis Assistant Configuration</div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={resetAssistantsFromService}>Reset</Button>
              <Button onClick={() => setIsCreateDialogOpen(true)}>New Assistant</Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {assistants.map(a => {
              const isEditing = editingAssistant?.id === a.id;

              return (
                <Card key={a.id} className={`transition-all duration-200 border-l-4 ${isEditing ? 'border-l-primary shadow-md' : 'border-l-transparent hover:border-l-primary/50'}`}>
                  <CardHeader className="flex flex-row items-center justify-between gap-3 pb-2">
                    <div className="space-y-1">
                      <CardTitle className="text-xl flex items-center gap-2">
                        {a.name}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-4 text-xs">
                        <span className="flex items-center gap-1"><Languages size={12} /> {a.config.purposes.length} Languages</span>
                        <span className="flex items-center gap-1"><Target size={12} /> {a.config.selectedMetricIds.length} Metrics</span>
                        <span className="flex items-center gap-1"><MessageSquare size={12} /> {a.config.questions.length} Questions</span>
                        <span className="flex items-center gap-1"><BookOpen size={12} /> {a.config.terms.length} Terms</span>
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {isEditing ? (
                        <>
                          <Button size="sm" onClick={() => saveAssistant(a.id)} className="gap-1">
                            <Save size={14} /> Save
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleCancelEdit(a.id)} className="gap-1">
                            <X size={14} /> Cancel
                          </Button>
                        </>
                      ) : (
                        <>
                           <Button size="sm" variant="outline" onClick={() => toggleExpand(a.id)} className="gap-1">
                            <Edit size={14} /> Edit
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical size={16} />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleDuplicateAssistant(a.id)}>
                                <Copy className="mr-2 h-4 w-4" /> Duplicate
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDeleteAssistant(a.id)}>
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </>
                      )}
                    </div>
                  </CardHeader>
                  {expanded[a.id] && editingAssistant && editingAssistant.id === a.id && (
                    <CardContent className="pt-2">
                      <Tabs defaultValue="purpose" className="w-full">
                        <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent mb-6">
                          <TabsTrigger value="purpose" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-4 py-2 border-b-2 border-transparent transition-none">
                            <Languages className="mr-2 h-4 w-4" /> Purpose
                          </TabsTrigger>
                          <TabsTrigger value="metrics" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-4 py-2 border-b-2 border-transparent transition-none">
                            <Target className="mr-2 h-4 w-4" /> Metrics
                          </TabsTrigger>
                          <TabsTrigger value="questions" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-4 py-2 border-b-2 border-transparent transition-none">
                            <MessageSquare className="mr-2 h-4 w-4" /> Questions
                          </TabsTrigger>
                          <TabsTrigger value="terms" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-4 py-2 border-b-2 border-transparent transition-none">
                            <BookOpen className="mr-2 h-4 w-4" /> Glossary
                          </TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="purpose" className="space-y-4 animate-in fade-in-50">
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <h4 className="text-sm font-medium">Analysis Purpose & Language</h4>
                              <p className="text-sm text-muted-foreground">Define how the assistant should analyze data in different languages.</p>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => addPurpose(a.id)} className="gap-1">
                              <Plus size={14} /> Add Language
                            </Button>
                          </div>
                          
                          <div className="grid gap-4">
                            {editingAssistant.config.purposes.map((p, idx) => (
                              <Card key={`${a.id}-purpose-${idx}`} className="bg-muted/30">
                                <CardContent className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                                  <div className="md:col-span-1 space-y-2">
                                    <Label>Language</Label>
                                    <Select value={p.language} onValueChange={(val) => {
                                      const next = [...editingAssistant.config.purposes];
                                      next[idx] = { ...next[idx], language: val };
                                      updateLocalConfig(a.id, { purposes: next });
                                    }}>
                                      <SelectTrigger className="bg-background">
                                        <SelectValue placeholder="Select Language" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {languageOptions.map(opt => (
                                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="md:col-span-3 space-y-2 relative">
                                     <div className="flex justify-between items-center">
                                       <Label>Purpose Description</Label>
                                       {editingAssistant.config.purposes.length > 1 && (
                                          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => {
                                             const next = editingAssistant.config.purposes.filter((_, i) => i !== idx);
                                             updateLocalConfig(a.id, { purposes: next });
                                          }}>
                                            <X size={14} />
                                          </Button>
                                       )}
                                     </div>
                                    <Textarea 
                                      className="min-h-[100px] bg-background resize-none"
                                      value={p.text} 
                                      onChange={(e) => {
                                        const next = [...editingAssistant.config.purposes];
                                        next[idx] = { ...next[idx], text: e.target.value };
                                        updateLocalConfig(a.id, { purposes: next });
                                      }} 
                                      placeholder="Describe the analysis goal and persona for this assistant..." 
                                    />
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </TabsContent>

                        <TabsContent value="metrics" className="space-y-4 animate-in fade-in-50">
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <h4 className="text-sm font-medium">Associated Metrics</h4>
                              <p className="text-sm text-muted-foreground">Select metrics that this assistant is allowed to access and analyze.</p>
                            </div>
                            <div className="flex items-center gap-2">
                               <div className="relative">
                                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                  <Input 
                                    placeholder="Search metrics..." 
                                    className="pl-8 w-[200px]"
                                    value={metricSearchById[a.id] || ''} 
                                    onChange={(e) => setMetricSearchById(prev => ({ ...prev, [a.id]: e.target.value }))} 
                                  />
                               </div>
                            </div>
                          </div>

                          <ScrollArea className="h-[400px] border rounded-md p-4 bg-muted/10">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                              {filteredMetrics.map(m => {
                                const isSelected = editingAssistant.config.selectedMetricIds.includes(m.name);
                                return (
                                  <div 
                                    key={m.name} 
                                    className={`
                                      flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all
                                      ${isSelected ? 'bg-primary/5 border-primary shadow-sm' : 'bg-background hover:bg-muted/50'}
                                    `}
                                    onClick={() => {
                                      const nextIds = isSelected 
                                        ? editingAssistant.config.selectedMetricIds.filter(x => x !== m.name) 
                                        : [...editingAssistant.config.selectedMetricIds, m.name];
                                      updateLocalConfig(a.id, { selectedMetricIds: nextIds });
                                    }}
                                  >
                                    <div className={`mt-0.5 h-4 w-4 rounded border flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground'}`}>
                                       {isSelected && <span className="text-[10px]">✓</span>}
                                    </div>
                                    <div className="space-y-1 overflow-hidden">
                                      <p className="font-medium text-sm truncate" title={m.label}>{m.label}</p>
                                      <p className="text-xs text-muted-foreground truncate font-mono" title={m.name}>{m.name}</p>
                                      {m.description && <p className="text-xs text-muted-foreground line-clamp-2">{m.description}</p>}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </ScrollArea>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                             <Target size={14} />
                             <span>{editingAssistant.config.selectedMetricIds.length} metrics selected</span>
                          </div>
                        </TabsContent>

                        <TabsContent value="questions" className="space-y-4 animate-in fade-in-50">
                           <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                              <div className="space-y-1">
                                <h4 className="text-sm font-medium">Suggested Questions</h4>
                                <p className="text-sm text-muted-foreground">Configure questions to guide users during analysis.</p>
                              </div>
                              <div className="flex gap-2 w-full md:w-auto">
                                <Input
                                  placeholder="Search..."
                                  className="w-full md:w-[200px]"
                                  value={questionSearchById[a.id] || ''}
                                  onChange={e => setQuestionSearchById(prev => ({ ...prev, [a.id]: e.target.value }))}
                                />
                                <Select
                                  value={questionCategoryById[a.id] || 'all'}
                                  onValueChange={val => setQuestionCategoryById(prev => ({ ...prev, [a.id]: val }))}
                                >
                                  <SelectTrigger className="w-[150px]">
                                    <SelectValue placeholder="Category" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {questionCategories.map(cat => (
                                      <SelectItem key={cat} value={cat}>{cat === 'all' ? 'All Categories' : cat}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                           </div>

                           <Card className="border-dashed bg-muted/20">
                              <CardContent className="p-3 flex gap-2 items-center">
                                 <Input
                                    className="flex-1 bg-background"
                                    placeholder="Type a new question here..."
                                    value={newQuestionTextById[a.id] || ''}
                                    onChange={e => setNewQuestionTextById(prev => ({ ...prev, [a.id]: e.target.value }))}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        addQuestion(a.id, newQuestionTextById[a.id] || '', newQuestionCategoryById[a.id] || '');
                                      }
                                    }}
                                  />
                                  <Input
                                    className="w-[180px] bg-background"
                                    placeholder="Category (e.g. Trends)"
                                    value={newQuestionCategoryById[a.id] || ''}
                                    onChange={e => setNewQuestionCategoryById(prev => ({ ...prev, [a.id]: e.target.value }))}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        addQuestion(a.id, newQuestionTextById[a.id] || '', newQuestionCategoryById[a.id] || '');
                                      }
                                    }}
                                  />
                                  <Button onClick={() => addQuestion(a.id, newQuestionTextById[a.id] || '', newQuestionCategoryById[a.id] || '')}>
                                     <Plus size={16} className="mr-2" /> Add
                                  </Button>
                              </CardContent>
                           </Card>

                           <ScrollArea className="h-[350px] border rounded-md">
                             {filteredQuestions.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
                                   <MessageSquare className="h-8 w-8 mb-2 opacity-20" />
                                   <p>No questions found matching your criteria</p>
                                </div>
                             ) : (
                               <div className="divide-y">
                                 {filteredQuestions.map(q => (
                                   <div key={q.id} className="flex items-center justify-between p-3 hover:bg-muted/30 group">
                                     <div className="flex items-start gap-3">
                                       <div className="mt-1 h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">?</div>
                                       <div>
                                         <p className="text-sm font-medium">{q.text}</p>
                                         <Badge variant="secondary" className="text-[10px] h-5 mt-1">{q.category}</Badge>
                                       </div>
                                     </div>
                                     <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => removeQuestion(a.id, q.id)}>
                                       <Trash2 size={14} />
                                     </Button>
                                   </div>
                                 ))}
                               </div>
                             )}
                           </ScrollArea>
                        </TabsContent>

                        <TabsContent value="terms" className="space-y-4 animate-in fade-in-50">
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                               <h4 className="text-sm font-medium">Domain Glossary</h4>
                               <p className="text-sm text-muted-foreground">Define specific terms to improve the assistant's context.</p>
                            </div>
                            <div className="flex gap-2">
                              <Input type="file" accept=".json" className="hidden" id={`import-terms-${a.id}`} onChange={(e) => handleImportTerms(a.id, e)} />
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                   <Button variant="outline" size="sm" className="gap-1">
                                     <Settings size={14} /> Actions
                                   </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                   <DropdownMenuItem onClick={() => document.getElementById(`import-terms-${a.id}`)?.click()}>
                                      <Upload className="mr-2 h-4 w-4" /> Import JSON
                                   </DropdownMenuItem>
                                   <DropdownMenuItem onClick={() => handleExportTerms(a.id)}>
                                      <Download className="mr-2 h-4 w-4" /> Export JSON
                                   </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                              <Button size="sm" onClick={() => openEditTerm(a.id)} className="gap-1">
                                 <Plus size={14} /> New Term
                              </Button>
                            </div>
                          </div>

                          <ScrollArea className="h-[400px] border rounded-md">
                             {a.config.terms.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
                                   <BookOpen className="h-8 w-8 mb-2 opacity-20" />
                                   <p>No terms defined</p>
                                   <Button variant="link" onClick={() => openEditTerm(a.id)}>Add your first term</Button>
                                </div>
                             ) : (
                               <div className="divide-y">
                                 {a.config.terms.map(t => (
                                   <div key={t.id} className="p-4 hover:bg-muted/30 group">
                                     <div className="flex items-start justify-between mb-2">
                                       <div className="flex items-center gap-2">
                                         <span className="font-semibold text-sm">{t.term}</span>
                                         {t.metricIds && t.metricIds.length > 0 && (
                                            <Badge variant="outline" className="text-[10px]">{t.metricIds.length} Metrics</Badge>
                                         )}
                                       </div>
                                       <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                         <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditTerm(a.id, t)}>
                                           <Edit size={12} />
                                         </Button>
                                         <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => removeTerm(a.id, t.id)}>
                                           <Trash2 size={12} />
                                         </Button>
                                       </div>
                                     </div>
                                     <p className="text-sm text-muted-foreground line-clamp-2">{t.definition}</p>
                                     {t.scenarios && (
                                        <p className="text-xs text-muted-foreground/70 mt-1 italic">Scenario: {t.scenarios}</p>
                                     )}
                                   </div>
                                 ))}
                               </div>
                             )}
                          </ScrollArea>
                        </TabsContent>
                      </Tabs>
                    </CardContent>
                  )}
                </Card>
              )
            })}
          </div>
        </main>
      </div>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Analysis Assistant</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Label htmlFor="assistant-name">Assistant Name</Label>
            <Input id="assistant-name" value={creatingName} onChange={(e) => setCreatingName(e.target.value)} placeholder="Please enter a name" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateAssistant}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isTermDialogOpen} onOpenChange={setIsTermDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingTerm ? 'Edit Term' : 'New Term'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>Term</Label>
              <Input value={termForm.term} onChange={(e) => setTermForm({ ...termForm, term: e.target.value })} />
            </div>
            <div>
              <Label>Scenarios</Label>
              <Input value={termForm.scenarios} onChange={(e) => setTermForm({ ...termForm, scenarios: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <Label>Definition</Label>
              <Textarea value={termForm.definition} onChange={(e) => setTermForm({ ...termForm, definition: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <Label>Metrics</Label>
              <ScrollArea className="h-[180px] border rounded-md p-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {metrics.map(m => (
                    <label key={m.name} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/40 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={termForm.metricIds.includes(m.name)}
                        onChange={() => {
                          const has = termForm.metricIds.includes(m.name);
                          setTermForm({
                            ...termForm,
                            metricIds: has ? termForm.metricIds.filter(x => x !== m.name) : [...termForm.metricIds, m.name]
                          });
                        }}
                      />
                      <div className="flex flex-col">
                        <span className="font-medium">{m.label}</span>
                        <span className="text-xs text-muted-foreground">{m.name}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTermDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveTerm}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AnalysisAssistantConfigPage;