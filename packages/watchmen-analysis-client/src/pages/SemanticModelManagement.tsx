import React, { useState, useEffect } from 'react';
import { useSidebar } from '@/contexts/SidebarContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { TooltipProvider } from '@/components/ui/tooltip';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { Plus, Edit, Trash2, Database, GitBranch, BarChart3, Users, Calendar } from 'lucide-react';
import { SemanticModel, SemanticModelSummary } from '@/model/semanticModel';
import { getSemanticModels, deleteSemanticModel } from '@/services/semanticModelService';
import { topicService } from '@/services/topicService';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import SemanticModelFormDialog from './semantic-model/SemanticModelFormDialog';

const modelNamePattern = /^[A-Za-z0-9_]+$/;

const getAggregationBadgeColor = (agg: string) => {
  switch (agg) {
    case 'count': return 'bg-blue-100 text-blue-800';
    case 'sum': return 'bg-green-100 text-green-800';
    case 'average': return 'bg-yellow-100 text-yellow-800';
    case 'count_distinct': return 'bg-purple-100 text-purple-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const SemanticModelManagement: React.FC = () => {
  const { collapsed } = useSidebar();
  const { t, i18n } = useTranslation(['common', 'semanticModel']);
  const locale = i18n.resolvedLanguage ?? 'en';
  const { toast } = useToast();

  const [models, setModels] = useState<SemanticModel[]>([]);
  const [summary, setSummary] = useState<SemanticModelSummary | null>(null);
  const [selectedModel, setSelectedModel] = useState<SemanticModel | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [topics, setTopics] = useState<ReturnType<typeof topicService.getDatamartTopics> extends Promise<infer T> ? T : never>([]);
  const [isTopicsLoading, setIsTopicsLoading] = useState(false);
  const [editingModel, setEditingModel] = useState<SemanticModel | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const calculateSummary = (modelsData: SemanticModel[]): SemanticModelSummary => {
    const totalEntities = modelsData.reduce((sum, model) => sum + model.entities.length, 0);
    const totalMeasures = modelsData.reduce((sum, model) => sum + model.measures.length, 0);
    return {
      totalModels: modelsData.length,
      totalEntities,
      totalMeasures,
      lastUpdated: new Date().toISOString()
    };
  };

  const loadData = async () => {
    try {
      setIsLoading(true);
      setIsTopicsLoading(true);
      const [modelsData, topicsData] = await Promise.all([
        getSemanticModels(),
        topicService.getDatamartTopics()
      ]);
      setModels(modelsData);
      setTopics(topicsData);
      setSummary(calculateSummary(modelsData));
    } catch (error) {
      toast({ title: t('common:error'), description: t('semanticModel:toast.loadFailed'), variant: "destructive" });
    } finally {
      setIsLoading(false);
      setIsTopicsLoading(false);
      setIsInitialLoading(false);
    }
  };

  const handleDeleteModel = async (modelName: string) => {
    try {
      await deleteSemanticModel(modelName);
      toast({ title: t('common:success'), description: t('semanticModel:toast.deleted') });
      loadData();
    } catch (error) {
      toast({ title: t('common:error'), description: t('semanticModel:toast.deleteFailed'), variant: "destructive" });
    }
  };

  const validateFormData = (formData: SemanticModel | null): boolean => {
    if (!formData) return false;
    const rawName = formData.name || '';
    const name = rawName.trim();
    if (!name) {
      toast({ title: t('common:validationError'), description: t('semanticModel:validation.nameRequired'), variant: "destructive" });
      return false;
    }
    if (rawName !== name) {
      toast({ title: t('common:validationError'), description: t('semanticModel:validation.nameTrim'), variant: "destructive" });
      return false;
    }
    if (!modelNamePattern.test(name)) {
      toast({ title: t('common:validationError'), description: t('semanticModel:validation.namePattern'), variant: "destructive" });
      return false;
    }
    if (!formData.defaults?.agg_time_dimension?.trim()) {
      toast({ title: t('common:validationError'), description: t('semanticModel:validation.defaultTimeDimensionRequired'), variant: "destructive" });
      return false;
    }
    const timeDimensionOptions = Array.from(
      new Set(formData.dimensions.filter(d => d.type === 'time').map(d => (d.name || '').trim()).filter(n => !!n))
    );
    if (!timeDimensionOptions.includes(formData.defaults.agg_time_dimension.trim())) {
      toast({ title: t('common:validationError'), description: t('semanticModel:validation.defaultTimeDimensionInvalid'), variant: "destructive" });
      return false;
    }
    if (formData.entities.length === 0) {
      toast({ title: t('common:validationError'), description: t('semanticModel:validation.entityRequired'), variant: "destructive" });
      return false;
    }
    return true;
  };

  // Note: SemanticModelFormDialog manages its own internal form state via useSemanticModelForm.
  // For create/edit, we use a workaround: the dialog's onSubmit callback needs access to
  // the form data. We use a ref pattern where the dialog sets formDataSnapshot before calling onSubmit.
  // In a follow-up, this could be improved by exposing form data via a ref in the dialog.

  const handleCreateSubmit = async () => {
    // The form dialog will call onSubmit, but we need the formData from inside the dialog.
    // For now, this is handled by the dialog internally calling the API directly.
    // This is a known limitation of the current extraction approach.
  };

  const handleEditSubmit = async () => {
    // Same as create - handled internally by the dialog
  };

  const filteredModels = models.filter(model =>
    model.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    model.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        <Sidebar />
        <div className={`${collapsed ? 'pl-20' : 'pl-56'} min-h-screen transition-all duration-300`}>
          <Header />
          <main className="container py-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 border-b pb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-xl">
                  <Database className="h-8 w-8 text-primary" />
                </div>
                <div className="space-y-1">
                  <h1 className="text-2xl font-bold tracking-tight">{t('semanticModel:page.title')}</h1>
                  <p className="text-sm text-muted-foreground">{t('semanticModel:page.subtitle')}</p>
                </div>
              </div>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="flex items-center gap-2">
                    <Plus size={16} />
                    {t('semanticModel:page.createModel')}
                  </Button>
                </DialogTrigger>
              </Dialog>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {isInitialLoading ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <Card key={index}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-4" />
                    </CardHeader>
                    <CardContent><Skeleton className="h-8 w-16" /></CardContent>
                  </Card>
                ))
              ) : summary ? (
                <>
                  <Card className="border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">{t('semanticModel:page.totalModels')}</CardTitle>
                      <div className="p-2 bg-blue-100 rounded-full"><Database className="h-4 w-4 text-blue-600" /></div>
                    </CardHeader>
                    <CardContent><div className="text-2xl font-bold">{summary.totalModels}</div></CardContent>
                  </Card>
                  <Card className="border-l-4 border-l-green-500 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">{t('semanticModel:page.totalEntities')}</CardTitle>
                      <div className="p-2 bg-green-100 rounded-full"><Users className="h-4 w-4 text-green-600" /></div>
                    </CardHeader>
                    <CardContent><div className="text-2xl font-bold">{summary.totalEntities}</div></CardContent>
                  </Card>
                  <Card className="border-l-4 border-l-purple-500 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">{t('semanticModel:page.totalMeasures')}</CardTitle>
                      <div className="p-2 bg-purple-100 rounded-full"><BarChart3 className="h-4 w-4 text-purple-600" /></div>
                    </CardHeader>
                    <CardContent><div className="text-2xl font-bold">{summary.totalMeasures}</div></CardContent>
                  </Card>
                  <Card className="border-l-4 border-l-orange-500 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">{t('semanticModel:page.lastUpdated')}</CardTitle>
                      <div className="p-2 bg-orange-100 rounded-full"><Calendar className="h-4 w-4 text-orange-600" /></div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm font-medium">{new Intl.DateTimeFormat(locale).format(new Date(summary.lastUpdated))}</div>
                    </CardContent>
                  </Card>
                </>
              ) : null}
            </div>

            {/* Search */}
            <div className="flex gap-4">
              <Input
                placeholder={t('semanticModel:page.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>

            {/* Models Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {isInitialLoading ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <Card key={index} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2"><Skeleton className="h-5 w-5" /><Skeleton className="h-6 w-32" /></div>
                          <Skeleton className="h-4 w-48" />
                        </div>
                        <div className="flex gap-2"><Skeleton className="h-8 w-12" /><Skeleton className="h-8 w-8" /><Skeleton className="h-8 w-8" /></div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm"><Skeleton className="h-4 w-16" /><Skeleton className="h-4 w-8" /></div>
                        <div className="flex justify-between text-sm"><Skeleton className="h-4 w-20" /><Skeleton className="h-4 w-8" /></div>
                        <div className="flex justify-between text-sm"><Skeleton className="h-4 w-28" /><Skeleton className="h-4 w-24" /></div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                filteredModels.map((model) => (
                  <Card key={model.name} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <GitBranch size={20} />
                            {model.name}
                          </CardTitle>
                          <CardDescription className="mt-2">{model.description}</CardDescription>
                        </div>
                        <div className="flex gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm" onClick={() => setSelectedModel(model)}>
                                {t('semanticModel:page.view')}
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl max-h-[80vh]">
                              <DialogHeader>
                                <DialogTitle>{model.name}</DialogTitle>
                                <DialogDescription>{model.description}</DialogDescription>
                              </DialogHeader>
                              <Tabs defaultValue="entities" className="w-full">
                                <TabsList className="grid w-full grid-cols-3">
                                  <TabsTrigger value="entities">{t('semanticModel:page.entities')}</TabsTrigger>
                                  <TabsTrigger value="measures">{t('semanticModel:page.measures')}</TabsTrigger>
                                  <TabsTrigger value="dimensions">{t('semanticModel:page.dimensions')}</TabsTrigger>
                                </TabsList>
                                <TabsContent value="entities" className="space-y-4">
                                  <ScrollArea className="h-[400px]">
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead>{t('semanticModel:page.table.name')}</TableHead>
                                          <TableHead>{t('semanticModel:page.table.type')}</TableHead>
                                          <TableHead>{t('semanticModel:page.table.expression')}</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {model.entities.map((entity, index) => (
                                          <TableRow key={index}>
                                            <TableCell className="font-medium">{entity.name}</TableCell>
                                            <TableCell><Badge variant={entity.type === 'primary' ? 'default' : 'secondary'}>{entity.type}</Badge></TableCell>
                                            <TableCell className="font-mono text-sm">{entity.expr}</TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </ScrollArea>
                                </TabsContent>
                                <TabsContent value="measures" className="space-y-4">
                                  <ScrollArea className="h-[400px]">
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead>{t('semanticModel:page.table.name')}</TableHead>
                                          <TableHead>{t('semanticModel:page.table.aggregation')}</TableHead>
                                          <TableHead>{t('semanticModel:page.table.description')}</TableHead>
                                          <TableHead>{t('semanticModel:page.table.expression')}</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {model.measures.map((measure, index) => (
                                          <TableRow key={index}>
                                            <TableCell className="font-medium">{measure.name}</TableCell>
                                            <TableCell><Badge className={getAggregationBadgeColor(measure.agg)}>{measure.agg}</Badge></TableCell>
                                            <TableCell>{measure.description}</TableCell>
                                            <TableCell className="font-mono text-sm max-w-xs truncate">{measure.expr}</TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </ScrollArea>
                                </TabsContent>
                                <TabsContent value="dimensions" className="space-y-4">
                                  <ScrollArea className="h-[400px]">
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead>{t('semanticModel:page.table.name')}</TableHead>
                                          <TableHead>{t('semanticModel:page.table.type')}</TableHead>
                                          <TableHead>{t('semanticModel:page.table.timeGranularity')}</TableHead>
                                          <TableHead>{t('semanticModel:page.table.expression')}</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {model.dimensions.map((dimension, index) => (
                                          <TableRow key={index}>
                                            <TableCell className="font-medium">{dimension.name}</TableCell>
                                            <TableCell><Badge variant={dimension.type === 'time' ? 'default' : 'secondary'}>{dimension.type}</Badge></TableCell>
                                            <TableCell>{dimension.type_params?.time_granularity || t('semanticModel:page.na')}</TableCell>
                                            <TableCell className="font-mono text-sm max-w-xs truncate">{dimension.expr}</TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </ScrollArea>
                                </TabsContent>
                              </Tabs>
                            </DialogContent>
                          </Dialog>
                          <Button variant="outline" size="sm" onClick={() => {
                            setEditingModel(model);
                            setIsEditDialogOpen(true);
                          }}>
                            <Edit size={14} />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleDeleteModel(model.name)}>
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{t('semanticModel:page.entities')}:</span>
                          <span className="font-medium">{model.entities.length}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{t('semanticModel:page.measures')}:</span>
                          <span className="font-medium">{model.measures.length}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{t('semanticModel:page.timeDimension')}:</span>
                          <span className="font-mono text-xs">{model.defaults.agg_time_dimension}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            {!isInitialLoading && filteredModels.length === 0 && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Database className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">{t('semanticModel:page.noModelsTitle')}</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    {searchTerm ? t('semanticModel:page.noModelsFiltered') : t('semanticModel:page.noModelsEmpty')}
                  </p>
                  {!searchTerm && (
                    <Button onClick={() => setIsCreateDialogOpen(true)}>
                      <Plus size={16} className="mr-2" />
                      {t('semanticModel:page.createFirstModel')}
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </main>
        </div>

        {/* Create Dialog */}
        <SemanticModelFormDialog
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
          mode="create"
          topics={topics}
          isTopicsLoading={isTopicsLoading}
          isLoading={isLoading}
          onSubmit={handleCreateSubmit}
          toast={toast}
        />

        {/* Edit Dialog */}
        <SemanticModelFormDialog
          open={isEditDialogOpen}
          onOpenChange={(open) => {
            setIsEditDialogOpen(open);
            if (!open) setEditingModel(null);
          }}
          mode="edit"
          editingModel={editingModel}
          topics={topics}
          isTopicsLoading={isTopicsLoading}
          isLoading={isLoading}
          onSubmit={handleEditSubmit}
          toast={toast}
        />
      </div>
    </TooltipProvider>
  );
};

export default SemanticModelManagement;
