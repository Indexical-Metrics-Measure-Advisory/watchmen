import React, { useState, useEffect, useRef } from 'react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { Plus, Edit, Trash2, Database, GitBranch, BarChart3, Users, Calendar, X, Tags } from 'lucide-react';
import { SemanticModel, SemanticModelSummary, SemanticModelEntity, SemanticModelMeasure, SemanticModelDimension } from '@/model/semanticModel';
import { getSemanticModels, deleteSemanticModel, createSemanticModel, updateSemanticModel } from '@/services/semanticModelService';
import { topicService, Topic } from '@/services/topicService';
import { useToast } from '@/hooks/use-toast';

const SemanticModelManagement: React.FC = () => {
  const { collapsed } = useSidebar();
  const [models, setModels] = useState<SemanticModel[]>([]);
  const [summary, setSummary] = useState<SemanticModelSummary | null>(null);
  const [selectedModel, setSelectedModel] = useState<SemanticModel | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<SemanticModel | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isTopicsLoading, setIsTopicsLoading] = useState(false);
  const { toast } = useToast();
  const dimensionsEndRef = useRef<HTMLDivElement>(null);
  const measuresEndRef = useRef<HTMLDivElement>(null);

  // Form state for create/edit
  const [formData, setFormData] = useState<SemanticModel>({
    id:'fake',
    name: '',
    description: '',
    defaults: { agg_time_dimension: '' },
    node_relation: {
      alias: '',
      schema_name: '',
      database: '',
      relation_name: ''
    },
    primary_entity: null,
    entities: [],
    measures: [],
    dimensions: [],
    topicId: '',
    sourceType: 'topic',
    label: null,
    metadata: null,
    config: { meta: {} }
  });

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
      
      // Load semantic models and topics in parallel
      const [modelsData, topicsData] = await Promise.all([
        getSemanticModels(),
        topicService.getDatamartTopics()
      ]);
      
      setModels(modelsData);
      setTopics(topicsData);
      
      // Calculate summary information based on loaded data
      const calculatedSummary = calculateSummary(modelsData);
      setSummary(calculatedSummary);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load semantic models or topics",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      setIsTopicsLoading(false);
      setIsInitialLoading(false);
    }
  };

  const handleDeleteModel = async (modelName: string) => {
    try {
      await deleteSemanticModel(modelName);
      toast({
        title: "Success",
        description: "Semantic model deleted successfully"
      });
      loadData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete semantic model",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      id: 'fake',
      name: '',
      description: '',
      defaults: { agg_time_dimension: '' },
      node_relation: {
        alias: '',
        schema_name: '',
        database: '',
        relation_name: ''
      },
      primary_entity: null,
      entities: [],
      measures: [],
      dimensions: [],
      topicId: '',
      sourceType: 'topic',
      label: null,
      metadata: null,
      config: { meta: {} }
    });
  };

  const handleCreateModel = async () => {
    try {
      setIsLoading(true);
      await createSemanticModel(formData);
      toast({
        title: "Success",
        description: "Semantic model created successfully"
      });
      setIsCreateDialogOpen(false);
      resetForm();
      loadData();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create semantic model",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditModel = async () => {
    if (!editingModel) return;
    try {
      setIsLoading(true);
      await updateSemanticModel(editingModel.name, formData);
      toast({
        title: "Success",
        description: "Semantic model updated successfully"
      });
      setIsEditDialogOpen(false);
      setEditingModel(null);
      resetForm();
      loadData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update semantic model",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const openEditDialog = (model: SemanticModel) => {
    setEditingModel(model);
    setFormData({ ...model });
    setIsEditDialogOpen(true);
  };

  const addEntity = () => {
    setFormData(prev => ({
      ...prev,
      entities: [...prev.entities, {
        name: '',
        description: null,
        type: 'primary',
        role: null,
        expr: '',
        metadata: null,
        label: null
      }]
    }));
  };

  const removeEntity = (index: number) => {
    setFormData(prev => ({
      ...prev,
      entities: prev.entities.filter((_, i) => i !== index)
    }));
  };

  const updateEntity = (index: number, field: keyof SemanticModelEntity, value: any) => {
    setFormData(prev => ({
      ...prev,
      entities: prev.entities.map((entity, i) => 
        i === index ? { ...entity, [field]: value } : entity
      )
    }));
  };

  const autoGenerateMeasures = () => {
    if (!formData.topicId) {
      toast({
        title: "Warning",
        description: "Please select a topic first",
        variant: "destructive"
      });
      return;
    }

    const topic = topics.find(t => t.id === formData.topicId);
    if (!topic || !topic.factors) {
      toast({
         title: "Warning",
         description: "Topic not found or has no factors",
         variant: "destructive"
      });
      return;
    }

    const newMeasures: SemanticModelMeasure[] = [];

    topic.factors.forEach(factor => {
      const isNumeric = ['number', 'unsigned', 'integer', 'decimal'].includes(factor.type);
      // Check if it is an ID (ends with 'id' or is 'id', case insensitive)
      const isId = factor.name.toLowerCase() === 'id' || factor.name.toLowerCase().endsWith('id');

      if (isId) {
        newMeasures.push({
          name: `${factor.name}_count`,
          agg: 'count',
          description: `Count of ${factor.label || factor.name}`,
          create_metric: false,
          expr: factor.name,
          agg_params: null,
          metadata: null,
          non_additive_dimension: null,
          agg_time_dimension: null,
          label: factor.label
        });
      } else if (isNumeric) {
        newMeasures.push({
          name: `${factor.name}_sum`,
          agg: 'sum',
          description: `Sum of ${factor.label || factor.name}`,
          create_metric: false,
          expr: factor.name,
          agg_params: null,
          metadata: null,
          non_additive_dimension: null,
          agg_time_dimension: null,
          label: factor.label
        });
      }
    });

    if (newMeasures.length === 0) {
      toast({
        title: "Info",
        description: "No measures could be auto-generated from this topic",
      });
      return;
    }

    setFormData(prev => ({
      ...prev,
      measures: [...prev.measures, ...newMeasures]
    }));
    
    toast({
      title: "Success",
      description: `Auto-generated ${newMeasures.length} measures`,
    });
    
    setTimeout(() => {
      measuresEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const addMeasure = () => {
    setFormData(prev => ({
      ...prev,
      measures: [...prev.measures, {
        name: '',
        agg: 'count',
        description: '',
        create_metric: false,
        expr: '',
        agg_params: null,
        metadata: null,
        non_additive_dimension: null,
        agg_time_dimension: null,
        label: null
      }]
    }));
    setTimeout(() => {
      measuresEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const removeMeasure = (index: number) => {
    setFormData(prev => ({
      ...prev,
      measures: prev.measures.filter((_, i) => i !== index)
    }));
  };

  const updateMeasure = (index: number, field: keyof SemanticModelMeasure, value: any) => {
    setFormData(prev => ({
      ...prev,
      measures: prev.measures.map((measure, i) => 
        i === index ? { ...measure, [field]: value } : measure
      )
    }));
  };

  const autoGenerateDimensions = () => {
    if (!formData.topicId) {
      toast({
        title: "Warning",
        description: "Please select a topic first",
        variant: "destructive"
      });
      return;
    }

    const topic = topics.find(t => t.id === formData.topicId);
    if (!topic || !topic.factors) {
      toast({
         title: "Warning",
         description: "Topic not found or has no factors",
         variant: "destructive"
      });
      return;
    }

    const newDimensions: SemanticModelDimension[] = [];

    topic.factors.forEach(factor => {
      // Skip object and array types
      if (['object', 'array'].includes(factor.type)) return;

      const isTime = ['datetime', 'full-datetime', 'date', 'time', 'year', 'month', 'week', 'day', 'hour', 'minute', 'second'].some(t => factor.type.includes(t));
      
      if (isTime) {
        newDimensions.push({
          name: `${factor.name}`,
          description: factor.label || factor.name,
          type: 'time',
          is_partition: false,
          type_params: {
            time_granularity: 'day',
            validity_params: null
          },
          expr: factor.name,
          metadata: null,
          label: factor.label
        });
      } else {
        const isNumeric = ['number', 'unsigned', 'integer', 'decimal'].includes(factor.type);
        const isId = factor.name.toLowerCase() === 'id' || factor.name.toLowerCase().endsWith('id');
        
        if (isNumeric || isId) return;

        newDimensions.push({
          name: `${factor.name}`,
          description: factor.label || factor.name,
          type: 'categorical',
          is_partition: false,
          type_params: null,
          expr: factor.name,
          metadata: null,
          label: factor.label
        });
      }
    });

    if (newDimensions.length === 0) {
      toast({
        title: "Info",
        description: "No dimensions could be auto-generated from this topic",
      });
      return;
    }

    setFormData(prev => ({
      ...prev,
      dimensions: [...prev.dimensions, ...newDimensions]
    }));
    
    toast({
      title: "Success",
      description: `Auto-generated ${newDimensions.length} dimensions`,
    });
    
    setTimeout(() => {
      dimensionsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const addDimension = () => {
    setFormData(prev => ({
      ...prev,
      dimensions: [...prev.dimensions, {
        name: '',
        description: null,
        type: 'time',
        is_partition: false,
        type_params: {
          time_granularity: 'day',
          validity_params: null
        },
        expr: '',
        metadata: null,
        label: null
      }]
    }));
    setTimeout(() => {
      dimensionsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const removeDimension = (index: number) => {
    setFormData(prev => ({
      ...prev,
      dimensions: prev.dimensions.filter((_, i) => i !== index)
    }));
  };

  const updateDimension = (index: number, field: keyof SemanticModelDimension, value: any) => {
    setFormData(prev => ({
      ...prev,
      dimensions: prev.dimensions.map((dimension, i) => 
        i === index ? { ...dimension, [field]: value } : dimension
      )
    }));
  };

  const filteredModels = models.filter(model =>
    model.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    model.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getAggregationBadgeColor = (agg: string) => {
    switch (agg) {
      case 'count': return 'bg-blue-100 text-blue-800';
      case 'sum': return 'bg-green-100 text-green-800';
      case 'average': return 'bg-yellow-100 text-yellow-800';
      case 'count_distinct': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };



  return (
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
            <h1 className="text-2xl font-bold tracking-tight">Semantic Model Management</h1>
            <p className="text-sm text-muted-foreground">Manage and configure semantic model definitions</p>
          </div>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2" onClick={() => resetForm()}>
              <Plus size={16} />
              Create Model
            </Button>
          </DialogTrigger>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {isInitialLoading ? (
          // Loading skeleton for summary cards
          Array.from({ length: 4 }).map((_, index) => (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))
        ) : summary ? (
          <>
            <Card className="border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Models</CardTitle>
                <div className="p-2 bg-blue-100 rounded-full">
                  <Database className="h-4 w-4 text-blue-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.totalModels}</div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-green-500 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Entities</CardTitle>
                <div className="p-2 bg-green-100 rounded-full">
                  <Users className="h-4 w-4 text-green-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.totalEntities}</div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-purple-500 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Measures</CardTitle>
                <div className="p-2 bg-purple-100 rounded-full">
                  <BarChart3 className="h-4 w-4 text-purple-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.totalMeasures}</div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-orange-500 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Last Updated</CardTitle>
                <div className="p-2 bg-orange-100 rounded-full">
                  <Calendar className="h-4 w-4 text-orange-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm font-medium">
                  {new Date(summary.lastUpdated).toLocaleDateString()}
                </div>
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <Input
          placeholder="Search models..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {/* Models Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {isInitialLoading ? (
          // Loading skeleton for models grid
          Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Skeleton className="h-5 w-5" />
                      <Skeleton className="h-6 w-32" />
                    </div>
                    <Skeleton className="h-4 w-48" />
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-8 w-12" />
                    <Skeleton className="h-8 w-8" />
                    <Skeleton className="h-8 w-8" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-8" />
                  </div>
                  <div className="flex justify-between text-sm">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-8" />
                  </div>
                  <div className="flex justify-between text-sm">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-4 w-24" />
                  </div>
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
                  <CardDescription className="mt-2">
                    {model.description}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedModel(model)}
                      >
                        View
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[80vh]">
                      <DialogHeader>
                        <DialogTitle>{model.name}</DialogTitle>
                        <DialogDescription>{model.description}</DialogDescription>
                      </DialogHeader>
                      <Tabs defaultValue="entities" className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                          <TabsTrigger value="entities">Entities</TabsTrigger>
                          <TabsTrigger value="measures">Measures</TabsTrigger>
                          <TabsTrigger value="dimensions">Dimensions</TabsTrigger>
                        </TabsList>
                        <TabsContent value="entities" className="space-y-4">
                          <ScrollArea className="h-[400px]">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Name</TableHead>
                                  <TableHead>Type</TableHead>
                                  <TableHead>Expression</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {model.entities.map((entity, index) => (
                                  <TableRow key={index}>
                                    <TableCell className="font-medium">{entity.name}</TableCell>
                                    <TableCell>
                                      <Badge variant={entity.type === 'primary' ? 'default' : 'secondary'}>
                                        {entity.type}
                                      </Badge>
                                    </TableCell>
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
                                  <TableHead>Name</TableHead>
                                  <TableHead>Aggregation</TableHead>
                                  <TableHead>Description</TableHead>
                                  <TableHead>Expression</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {model.measures.map((measure, index) => (
                                  <TableRow key={index}>
                                    <TableCell className="font-medium">{measure.name}</TableCell>
                                    <TableCell>
                                      <Badge className={getAggregationBadgeColor(measure.agg)}>
                                        {measure.agg}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>{measure.description}</TableCell>
                                    <TableCell className="font-mono text-sm max-w-xs truncate">
                                      {measure.expr}
                                    </TableCell>
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
                                  <TableHead>Name</TableHead>
                                  <TableHead>Type</TableHead>
                                  <TableHead>Time Granularity</TableHead>
                                  <TableHead>Expression</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {model.dimensions.map((dimension, index) => (
                                  <TableRow key={index}>
                                    <TableCell className="font-medium">{dimension.name}</TableCell>
                                    <TableCell>
                                      <Badge variant={dimension.type === 'time' ? 'default' : 'secondary'}>
                                        {dimension.type}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>
                                      {dimension.type_params?.time_granularity || 'N/A'}
                                    </TableCell>
                                    <TableCell className="font-mono text-sm max-w-xs truncate">
                                      {dimension.expr}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </ScrollArea>
                        </TabsContent>
                      </Tabs>
                    </DialogContent>
                  </Dialog>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => openEditDialog(model)}
                  >
                    <Edit size={14} />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteModel(model.name)}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Entities:</span>
                  <span className="font-medium">{model.entities.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Measures:</span>
                  <span className="font-medium">{model.measures.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Time Dimension:</span>
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
            <h3 className="text-lg font-medium mb-2">No semantic models found</h3>
            <p className="text-muted-foreground text-center mb-4">
              {searchTerm ? 'No models match your search criteria.' : 'Get started by creating your first semantic model.'}
            </p>
            {!searchTerm && (
              <Button>
                <Plus size={16} className="mr-2" />
                Create Your First Model
              </Button>
            )}
          </CardContent>
        </Card>
      )}
        </main>
      </div>

      {/* Create Model Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Semantic Model</DialogTitle>
            <DialogDescription>
              Configure new semantic model definition
            </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="datasource">Data Source</TabsTrigger>
            <TabsTrigger value="entities">Entities</TabsTrigger>
            <TabsTrigger value="measures">Measures</TabsTrigger>
            <TabsTrigger value="dimensions">Dimensions</TabsTrigger>
          </TabsList>
          
          <TabsContent value="basic" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Model Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter model name"
                  />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Enter model description"
                  />
              </div>
            </div>
            
            {/* Source fields moved to Datasource tab */}
            
            <div>
              <Label htmlFor="agg_time_dimension">Default Time Dimension</Label>
                <Input
                  id="agg_time_dimension"
                  value={formData.defaults.agg_time_dimension}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    defaults: { ...prev.defaults, agg_time_dimension: e.target.value }
                  }))}
                  placeholder="Enter default time dimension"
                />
            </div>
            
            {/* DB relation moved to Datasource tab */}
          </TabsContent>

          {/* Datasource Tab */}
          <TabsContent value="datasource" className="space-y-4">
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-medium mb-4">Source Configuration</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="datasource-sourceType">Source Type</Label>
                    <Select 
                      value={formData.sourceType || 'topic'} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, sourceType: value as 'topic' | 'subject' | 'db_source' }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select source type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="topic">Topic</SelectItem>
                        <SelectItem value="subject">Subject</SelectItem>
                        <SelectItem value="db_source">Direct DB Source</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="datasource-topicId">Topic ID</Label>
                    <Select
                      value={formData.topicId || ''}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, topicId: value }))}
                      disabled={formData.sourceType !== 'topic' || isTopicsLoading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={isTopicsLoading ? "Loading topics..." : "Select a topic"}>
                          {formData.topicId && topics.length > 0 ? (
                            <div className="flex items-center gap-2">
                              <span className="truncate">
                                {topics.find(t => t.id === formData.topicId)?.name || formData.topicId}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {topics.find(t => t.id === formData.topicId)?.type}
                              </Badge>
                            </div>
                          ) : null}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="max-w-md max-h-80">
                        {isTopicsLoading ? (
                          <div className="p-4 space-y-3">
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                              <span className="text-sm text-muted-foreground">Loading topics...</span>
                            </div>
                          </div>
                        ) : topics.length === 0 ? (
                          <div className="p-4 text-center">
                            <div className="text-sm text-muted-foreground">
                              No topics available
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              Please check your data source configuration
                            </div>
                          </div>
                        ) : (
                          topics.map((topic) => (
                            <SelectItem key={topic.id} value={topic.id} className="p-0">
                              <div className="w-full p-3 space-y-2 hover:bg-accent/50 transition-colors">
                                {/* 主要信息行 */}
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-semibold text-sm truncate" title={topic.name}>
                                      {topic.name}
                                    </h4>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                      ID: {topic.id}
                                    </p>
                                  </div>
                                  <div className="flex flex-col gap-1 flex-shrink-0">
                                    <Badge 
                                      variant="default" 
                                      className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors"
                                    >
                                      {topic.type}
                                    </Badge>
                                    <Badge 
                                      variant="outline" 
                                      className="text-xs px-2 py-0.5 border-green-200 text-green-700 hover:bg-green-50 transition-colors"
                                    >
                                      {topic.classification}
                                    </Badge>
                                  </div>
                                </div>
                                
                                {/* 描述信息 */}
                                {topic.description && (
                                  <div className="border-t border-border/50 pt-2">
                                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                      {topic.description}
                                    </p>
                                  </div>
                                )}
                                
                                {/* 底部元信息 */}
                                <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border/50 pt-2">
                                  <span className="flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 bg-purple-400 rounded-full"></span>
                                    Kind: {topic.kind}
                                  </span>
                                </div>
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              
              {formData.sourceType === 'db_source' && (
                <div>
                  <h4 className="text-sm font-medium mb-4">Database Connection</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="datasource-database">Database</Label>
                      <Input
                        id="datasource-database"
                        value={formData.node_relation.database}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          node_relation: { ...prev.node_relation, database: e.target.value }
                        }))}
                        placeholder="Enter database name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="datasource-schema">Schema Name</Label>
                      <Input
                        id="datasource-schema"
                        value={formData.node_relation.schema_name}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          node_relation: { ...prev.node_relation, schema_name: e.target.value }
                        }))}
                        placeholder="Enter schema name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="datasource-alias">Table Alias</Label>
                      <Input
                        id="datasource-alias"
                        value={formData.node_relation.alias}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          node_relation: { ...prev.node_relation, alias: e.target.value }
                        }))}
                        placeholder="Enter table alias"
                      />
                    </div>
                    <div>
                      <Label htmlFor="datasource-relation">Relation Name</Label>
                      <Input
                        id="datasource-relation"
                        value={formData.node_relation.relation_name}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          node_relation: { ...prev.node_relation, relation_name: e.target.value }
                        }))}
                        placeholder="Enter full relation name"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="entities" className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-medium">Entity Configuration</h4>
              <Button onClick={addEntity} size="sm">
                <Plus size={16} className="mr-2" />
                Add Entity
              </Button>
            </div>
            <ScrollArea className="h-[400px] pr-4">
              <Accordion type="single" collapsible className="w-full">
                {formData.entities.map((entity, index) => (
                  <AccordionItem key={index} value={`entity-${index}`}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center justify-between w-full pr-4">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{entity.name || `Entity ${index + 1}`}</span>
                          {entity.type === 'primary' && <Badge variant="default" className="text-xs">Primary</Badge>}
                          {entity.type === 'foreign' && <Badge variant="outline" className="text-xs">Foreign</Badge>}
                        </div>
                        <span className="text-xs text-muted-foreground font-mono">{entity.expr}</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-4 pb-2">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2 flex justify-end">
                           <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={(e) => {
                                e.stopPropagation();
                                removeEntity(index);
                              }}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 size={14} className="mr-1" /> Remove Entity
                            </Button>
                        </div>
                        <div>
                          <Label>Name</Label>
                          <Input
                            value={entity.name}
                            onChange={(e) => updateEntity(index, 'name', e.target.value)}
                            placeholder="Entity name"
                          />
                        </div>
                        <div>
                          <Label>Type</Label>
                          <Select 
                            value={entity.type} 
                            onValueChange={(value) => updateEntity(index, 'type', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="primary">Primary</SelectItem>
                              <SelectItem value="foreign">Foreign</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-2">
                          <Label>Expression</Label>
                          <Input
                            value={entity.expr}
                            onChange={(e) => updateEntity(index, 'expr', e.target.value)}
                            placeholder="Enter expression"
                          />
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
              {formData.entities.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No entities configured</p>
                  <Button variant="link" onClick={addEntity}>Add your first entity</Button>
                </div>
              )}
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="measures" className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-medium">Measure Configuration</h4>
              <Button onClick={addMeasure} size="sm">
                <Plus size={16} className="mr-2" />
                Add Measure
              </Button>
            </div>
            <ScrollArea className="h-[400px] pr-4">
              <Accordion type="single" collapsible className="w-full">
                {formData.measures.map((measure, index) => (
                  <AccordionItem key={index} value={`measure-${index}`}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center justify-between w-full pr-4">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{measure.name || `Measure ${index + 1}`}</span>
                          <Badge variant="secondary" className="text-xs uppercase">{measure.agg}</Badge>
                        </div>
                        <span className="text-xs text-muted-foreground font-mono">{measure.expr}</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-4 pb-2">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2 flex justify-end">
                           <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={(e) => {
                                e.stopPropagation();
                                removeMeasure(index);
                              }}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 size={14} className="mr-1" /> Remove Measure
                            </Button>
                        </div>
                        <div>
                          <Label>Name</Label>
                          <Input
                            value={measure.name}
                            onChange={(e) => updateMeasure(index, 'name', e.target.value)}
                            placeholder="Measure name"
                          />
                        </div>
                        <div>
                          <Label>Aggregation Type</Label>
                          <Select 
                            value={measure.agg} 
                            onValueChange={(value) => updateMeasure(index, 'agg', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="count">Count</SelectItem>
                              <SelectItem value="sum">Sum</SelectItem>
                              <SelectItem value="average">Average</SelectItem>
                              <SelectItem value="count_distinct">Count Distinct</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Description</Label>
                          <Input
                            value={measure.description || ''}
                            onChange={(e) => updateMeasure(index, 'description', e.target.value)}
                            placeholder="Measure description"
                          />
                        </div>
                        <div>
                          <Label>Expression</Label>
                          <Input
                            value={measure.expr}
                            onChange={(e) => updateMeasure(index, 'expr', e.target.value)}
                            placeholder="Enter expression"
                          />
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
              {formData.measures.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No measures configured</p>
                  <Button variant="link" onClick={autoGenerateMeasures}>Auto generate measure</Button>
                </div>
              )}
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="dimensions" className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-medium">Dimension Configuration</h4>
              <Button onClick={addDimension} size="sm">
                <Plus size={16} className="mr-2" />
                Add Dimension
              </Button>
            </div>
            <ScrollArea className="h-[400px] pr-4">
              <Accordion type="single" collapsible className="w-full">
                {formData.dimensions.map((dimension, index) => (
                  <AccordionItem key={index} value={`dimension-${index}`}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center justify-between w-full pr-4">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{dimension.name || `Dimension ${index + 1}`}</span>
                          <Badge variant="outline" className="text-xs capitalize">{dimension.type}</Badge>
                        </div>
                        <span className="text-xs text-muted-foreground font-mono">{dimension.expr}</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-4 pb-2">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2 flex justify-end">
                           <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={(e) => {
                                e.stopPropagation();
                                removeDimension(index);
                              }}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 size={14} className="mr-1" /> Remove Dimension
                            </Button>
                        </div>
                        <div>
                          <Label>Name</Label>
                          <Input
                            value={dimension.name}
                            onChange={(e) => updateDimension(index, 'name', e.target.value)}
                            placeholder="Dimension name"
                          />
                        </div>
                        <div>
                          <Label>Type</Label>
                          <Select 
                            value={dimension.type} 
                            onValueChange={(value) => updateDimension(index, 'type', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="time">Time</SelectItem>
                              <SelectItem value="categorical">Categorical</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Expression</Label>
                          <Input
                            value={dimension.expr}
                            onChange={(e) => updateDimension(index, 'expr', e.target.value)}
                            placeholder="Enter expression"
                          />
                        </div>
                        {dimension.type === 'time' && (
                          <div>
                            <Label>Time Granularity</Label>
                            <Select 
                              value={dimension.type_params?.time_granularity || 'day'} 
                              onValueChange={(value) => updateDimension(index, 'type_params', {
                                ...dimension.type_params,
                                time_granularity: value
                              })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="day">Day</SelectItem>
                                <SelectItem value="week">Week</SelectItem>
                                <SelectItem value="month">Month</SelectItem>
                                <SelectItem value="quarter">Quarter</SelectItem>
                                <SelectItem value="year">Year</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
              {formData.dimensions.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Tags className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No dimensions configured</p>
                  <Button variant="link" onClick={autoGenerateDimensions}>Auto generate dimension</Button>
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
        
        <div className="flex justify-end gap-2 mt-6">
          <Button 
              variant="outline" 
              onClick={() => {
                setIsCreateDialogOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateModel} disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Model'}
            </Button>
        </div>
        </DialogContent>
      </Dialog>

      {/* Edit Model Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Semantic Model</DialogTitle>
            <DialogDescription>
              Modify semantic model definition
            </DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="datasource">Data Source</TabsTrigger>
              <TabsTrigger value="entities">Entities</TabsTrigger>
              <TabsTrigger value="measures">Measures</TabsTrigger>
              <TabsTrigger value="dimensions">Dimensions</TabsTrigger>
            </TabsList>
            
            <TabsContent value="basic" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-name">Model Name</Label>
                  <Input
                    id="edit-name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter model name"
                    disabled
                  />
                </div>
                <div>
                  <Label htmlFor="edit-description">Description</Label>
                  <Input
                    id="edit-description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Enter model description"
                  />
                </div>
              </div>
              
              {/* Source Type and Topic ID fields are hidden in edit mode */}
              <div className="hidden">
                <div>
                  <Label htmlFor="edit-sourceType">Source Type</Label>
                  <Select 
                    value={formData.sourceType || 'topic'} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, sourceType: value as 'topic' | 'subject' | 'db_source' }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select source type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="topic">Topic</SelectItem>
                      <SelectItem value="subject">Subject</SelectItem>
                      <SelectItem value="db_source">DB Source</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-topicId">Topic ID</Label>
                  <Select
                    value={formData.topicId || ''}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, topicId: value }))}
                    disabled={formData.sourceType !== 'topic' || isTopicsLoading}
                  >
                    <SelectTrigger>
                        <SelectValue placeholder={isTopicsLoading ? "Loading topics..." : "Select a topic"}>
                          {formData.topicId && topics.length > 0 ? (
                            <div className="flex items-center gap-2">
                              <span className="truncate">
                                {topics.find(t => t.id === formData.topicId)?.name || formData.topicId}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {topics.find(t => t.id === formData.topicId)?.type}
                              </Badge>
                            </div>
                          ) : null}
                        </SelectValue>
                      </SelectTrigger>
                    <SelectContent className="max-w-md max-h-80">
                      {isTopicsLoading ? (
                        <div className="p-4 space-y-3">
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-sm text-muted-foreground">Loading topics...</span>
                          </div>
                        </div>
                      ) : topics.length === 0 ? (
                        <div className="p-4 text-center">
                          <div className="text-sm text-muted-foreground">
                            No topics available
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Please check your data source configuration
                          </div>
                        </div>
                      ) : (
                        topics.map((topic) => (
                          <SelectItem key={topic.id} value={topic.id} className="p-0">
                            <div className="w-full p-3 space-y-2 hover:bg-accent/50 transition-colors">
                              {/* 主要信息行 */}
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-semibold text-sm truncate" title={topic.name}>
                                    {topic.name}
                                  </h4>
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    ID: {topic.id}
                                  </p>
                                </div>
                                <div className="flex flex-col gap-1 flex-shrink-0">
                                  <Badge 
                                    variant="default" 
                                    className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors"
                                  >
                                    {topic.type}
                                  </Badge>
                                  <Badge 
                                    variant="outline" 
                                    className="text-xs px-2 py-0.5 border-green-200 text-green-700 hover:bg-green-50 transition-colors"
                                  >
                                    {topic.classification}
                                  </Badge>
                                </div>
                              </div>
                              
                              {/* 描述信息 */}
                              {topic.description && (
                                <div className="border-t border-border/50 pt-2">
                                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                    {topic.description}
                                  </p>
                                </div>
                              )}
                              
                              {/* 底部元信息 */}
                              <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border/50 pt-2">
                                <span className="flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 bg-purple-400 rounded-full"></span>
                                  Kind: {topic.kind}
                                </span>
                              </div>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="edit-agg_time_dimension">Default Time Dimension</Label>
                <Input
                  id="edit-agg_time_dimension"
                  value={formData.defaults.agg_time_dimension}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    defaults: { ...prev.defaults, agg_time_dimension: e.target.value }
                  }))}
                  placeholder="Enter default time dimension"
                />
              </div>
              
              {/* <div className="space-y-4">
                <h4 className="text-sm font-medium">Database Relation</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-alias">Alias</Label>
                    <Input
                      id="edit-alias"
                      value={formData.node_relation.alias}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        node_relation: { ...prev.node_relation, alias: e.target.value }
                      }))}
                      placeholder="Enter alias"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-schema_name">Schema Name</Label>
                    <Input
                      id="edit-schema_name"
                      value={formData.node_relation.schema_name}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        node_relation: { ...prev.node_relation, schema_name: e.target.value }
                      }))}
                      placeholder="Enter schema name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-database">Database</Label>
                    <Input
                      id="edit-database"
                      value={formData.node_relation.database}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        node_relation: { ...prev.node_relation, database: e.target.value }
                      }))}
                      placeholder="Enter database name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-relation_name">Relation Name</Label>
                    <Input
                      id="edit-relation_name"
                      value={formData.node_relation.relation_name}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        node_relation: { ...prev.node_relation, relation_name: e.target.value }
                      }))}
                      placeholder="Enter full relation name"
                    />
                  </div>
                </div>
              </div> */}
            </TabsContent>
            
            <TabsContent value="datasource" className="space-y-4">
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-medium mb-4">Source Configuration</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="datasource-sourceType">Source Type</Label>
                      <Select 
                        value={formData.sourceType || 'topic'} 
                        onValueChange={(value) => setFormData(prev => ({ ...prev, sourceType: value as 'topic' | 'subject' | 'db_source' }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select source type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="topic">Topic</SelectItem>
                          <SelectItem value="subject">Subject</SelectItem>
                          <SelectItem value="db_source">Direct DB Source</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="datasource-topicId">Topic ID</Label>
                      <Select
                        value={formData.topicId || ''}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, topicId: value }))}
                        disabled={formData.sourceType !== 'topic' || isTopicsLoading}
                      >
                        <SelectTrigger>
                            <SelectValue placeholder={isTopicsLoading ? "Loading topics..." : "Select a topic"}>
                              {formData.topicId && topics.length > 0 ? (
                                <div className="flex items-center gap-2">
                                  <span className="truncate">
                                    {topics.find(t => t.id === formData.topicId)?.name || formData.topicId}
                                  </span>
                                  <Badge variant="outline" className="text-xs">
                                    {topics.find(t => t.id === formData.topicId)?.type}
                                  </Badge>
                                </div>
                              ) : null}
                            </SelectValue>
                          </SelectTrigger>
                        <SelectContent className="max-w-md max-h-80">
                      {isTopicsLoading ? (
                        <div className="p-4 space-y-3">
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-sm text-muted-foreground">Loading topics...</span>
                          </div>
                        </div>
                      ) : topics.length === 0 ? (
                        <div className="p-4 text-center">
                          <div className="text-sm text-muted-foreground">
                            No topics available
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Please check your data source configuration
                          </div>
                        </div>
                      ) : (
                        topics.map((topic) => (
                          <SelectItem key={topic.id} value={topic.id} className="p-0">
                            <div className="w-full p-3 space-y-2 hover:bg-accent/50 transition-colors">
                              {/* 主要信息行 */}
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-semibold text-sm truncate" title={topic.name}>
                                    {topic.name}
                                  </h4>
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    ID: {topic.id}
                                  </p>
                                </div>
                                <div className="flex flex-col gap-1 flex-shrink-0">
                                  <Badge 
                                    variant="default" 
                                    className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors"
                                  >
                                    {topic.type}
                                  </Badge>
                                  <Badge 
                                    variant="outline" 
                                    className="text-xs px-2 py-0.5 border-green-200 text-green-700 hover:bg-green-50 transition-colors"
                                  >
                                    {topic.classification}
                                  </Badge>
                                </div>
                              </div>
                              
                              {/* 描述信息 */}
                              {topic.description && (
                                <div className="border-t border-border/50 pt-2">
                                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                    {topic.description}
                                  </p>
                                </div>
                              )}
                              
                              {/* 底部元信息 */}
                              <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border/50 pt-2">
                                <span className="flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 bg-purple-400 rounded-full"></span>
                                  Kind: {topic.kind}
                                </span>
                              </div>
                            </div>
                          </SelectItem>
                        ))
                      )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                
                {formData.sourceType === 'db_source' && (
                  <div>
                    <h4 className="text-sm font-medium mb-4">Database Connection</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="datasource-database">Database</Label>
                        <Input
                          id="datasource-database"
                          value={formData.node_relation.database}
                          onChange={(e) => setFormData(prev => ({ 
                            ...prev, 
                            node_relation: { ...prev.node_relation, database: e.target.value }
                          }))}
                          placeholder="Enter database name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="datasource-schema">Schema Name</Label>
                        <Input
                          id="datasource-schema"
                          value={formData.node_relation.schema_name}
                          onChange={(e) => setFormData(prev => ({ 
                            ...prev, 
                            node_relation: { ...prev.node_relation, schema_name: e.target.value }
                          }))}
                          placeholder="Enter schema name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="datasource-alias">Table Alias</Label>
                        <Input
                          id="datasource-alias"
                          value={formData.node_relation.alias}
                          onChange={(e) => setFormData(prev => ({ 
                            ...prev, 
                            node_relation: { ...prev.node_relation, alias: e.target.value }
                          }))}
                          placeholder="Enter table alias"
                        />
                      </div>
                      <div>
                        <Label htmlFor="datasource-relation">Relation Name</Label>
                        <Input
                          id="datasource-relation"
                          value={formData.node_relation.relation_name}
                          onChange={(e) => setFormData(prev => ({ 
                            ...prev, 
                            node_relation: { ...prev.node_relation, relation_name: e.target.value }
                          }))}
                          placeholder="Enter full relation name"
                        />
                      </div>
                    </div>
                  </div>
                )}
                
                {/* <div>
                  <h4 className="text-sm font-medium mb-4">Default Settings</h4>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <Label htmlFor="datasource-time-dimension">Default Time Dimension</Label>
                      <Input
                        id="datasource-time-dimension"
                        value={formData.defaults.agg_time_dimension}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          defaults: { ...prev.defaults, agg_time_dimension: e.target.value }
                        }))}
                        placeholder="Enter default time dimension"
                      />
                    </div>
                  </div>
                </div> */}
              </div>
            </TabsContent>
            
            {/* Same entity, measure, and dimension tabs as create dialog */}
            <TabsContent value="entities" className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-medium">Entity Configuration</h4>
                <Button onClick={addEntity} size="sm">
                  <Plus size={16} className="mr-2" />
                  Add Entity
                </Button>
              </div>
              <ScrollArea className="h-[400px] pr-4">
                <Accordion type="single" collapsible className="w-full">
                  {formData.entities.map((entity, index) => (
                    <AccordionItem key={index} value={`entity-${index}`}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center justify-between w-full pr-4">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{entity.name || `Entity ${index + 1}`}</span>
                            {entity.type === 'primary' && <Badge variant="default" className="text-xs">Primary</Badge>}
                            {entity.type === 'foreign' && <Badge variant="outline" className="text-xs">Foreign</Badge>}
                          </div>
                          <span className="text-xs text-muted-foreground font-mono">{entity.expr}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pt-4 pb-2">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="col-span-2 flex justify-end">
                             <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeEntity(index);
                                }}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 size={14} className="mr-1" /> Remove Entity
                              </Button>
                          </div>
                          <div>
                            <Label>Name</Label>
                            <Input
                              value={entity.name}
                              onChange={(e) => updateEntity(index, 'name', e.target.value)}
                              placeholder="Entity name"
                            />
                          </div>
                          <div>
                            <Label>Type</Label>
                            <Select 
                              value={entity.type} 
                              onValueChange={(value) => updateEntity(index, 'type', value)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="primary">Primary</SelectItem>
                                <SelectItem value="foreign">Foreign</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="col-span-2">
                            <Label>Expression</Label>
                            <Input
                              value={entity.expr}
                              onChange={(e) => updateEntity(index, 'expr', e.target.value)}
                              placeholder="Enter expression"
                            />
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
                {formData.entities.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No entities configured</p>
                    <Button variant="link" onClick={addEntity}>Add your first entity</Button>
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="measures" className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-medium">Measure Configuration</h4>
                <Button onClick={addMeasure} size="sm">
                  <Plus size={16} className="mr-2" />
                  Add Measure
                </Button>
              </div>
              <ScrollArea className="h-[400px] pr-4">
                <Accordion type="single" collapsible className="w-full">
                  {formData.measures.map((measure, index) => (
                    <AccordionItem key={index} value={`measure-${index}`}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center justify-between w-full pr-4">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{measure.name || `Measure ${index + 1}`}</span>
                            <Badge variant="secondary" className="text-xs uppercase">{measure.agg}</Badge>
                          </div>
                          <span className="text-xs text-muted-foreground font-mono">{measure.expr}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pt-4 pb-2">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="col-span-2 flex justify-end">
                             <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeMeasure(index);
                                }}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 size={14} className="mr-1" /> Remove Measure
                              </Button>
                          </div>
                          <div>
                            <Label>Name</Label>
                            <Input
                              value={measure.name}
                              onChange={(e) => updateMeasure(index, 'name', e.target.value)}
                              placeholder="Measure name"
                            />
                          </div>
                          <div>
                            <Label>Aggregation Type</Label>
                            <Select 
                              value={measure.agg} 
                              onValueChange={(value) => updateMeasure(index, 'agg', value)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="count">Count</SelectItem>
                                <SelectItem value="sum">Sum</SelectItem>
                                <SelectItem value="average">Average</SelectItem>
                                <SelectItem value="count_distinct">Count Distinct</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Description</Label>
                            <Input
                              value={measure.description || ''}
                              onChange={(e) => updateMeasure(index, 'description', e.target.value)}
                              placeholder="Measure description"
                            />
                          </div>
                          <div>
                            <Label>Expression</Label>
                            <Input
                              value={measure.expr}
                              onChange={(e) => updateMeasure(index, 'expr', e.target.value)}
                              placeholder="Enter expression"
                            />
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
                {formData.measures.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No measures configured</p>
                    <Button variant="link" onClick={addMeasure}>Add your first measure</Button>
                  </div>
                )}
                <div ref={measuresEndRef} />
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="dimensions" className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-medium">Dimension Configuration</h4>
                <Button onClick={addDimension} size="sm">
                  <Plus size={16} className="mr-2" />
                  Add Dimension
                </Button>
              </div>
              <ScrollArea className="h-[400px] pr-4">
                <Accordion type="single" collapsible className="w-full">
                  {formData.dimensions.map((dimension, index) => (
                    <AccordionItem key={index} value={`dimension-${index}`}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center justify-between w-full pr-4">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{dimension.name || `Dimension ${index + 1}`}</span>
                            <Badge variant="outline" className="text-xs capitalize">{dimension.type}</Badge>
                          </div>
                          <span className="text-xs text-muted-foreground font-mono">{dimension.expr}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pt-4 pb-2">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="col-span-2 flex justify-end">
                             <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeDimension(index);
                                }}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 size={14} className="mr-1" /> Remove Dimension
                              </Button>
                          </div>
                          <div>
                            <Label>Name</Label>
                            <Input
                              value={dimension.name}
                              onChange={(e) => updateDimension(index, 'name', e.target.value)}
                              placeholder="Dimension name"
                            />
                          </div>
                          <div>
                            <Label>Type</Label>
                            <Select 
                              value={dimension.type} 
                              onValueChange={(value) => updateDimension(index, 'type', value)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="time">Time</SelectItem>
                                <SelectItem value="categorical">Categorical</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Expression</Label>
                            <Input
                              value={dimension.expr}
                              onChange={(e) => updateDimension(index, 'expr', e.target.value)}
                              placeholder="Enter expression"
                            />
                          </div>
                          {dimension.type === 'time' && (
                            <div>
                              <Label>Time Granularity</Label>
                              <Select 
                                value={dimension.type_params?.time_granularity || 'day'} 
                                onValueChange={(value) => updateDimension(index, 'type_params', {
                                  ...dimension.type_params,
                                  time_granularity: value
                                })}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="day">Day</SelectItem>
                                  <SelectItem value="week">Week</SelectItem>
                                  <SelectItem value="month">Month</SelectItem>
                                  <SelectItem value="quarter">Quarter</SelectItem>
                                  <SelectItem value="year">Year</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
                {formData.dimensions.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Tags className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No dimensions configured</p>
                    <Button variant="link" onClick={autoGenerateDimensions}>Auto generate dimension</Button>
                  </div>
                )}
                <div ref={dimensionsEndRef} />
              </ScrollArea>
            </TabsContent>
          </Tabs>
          
          <div className="flex justify-end gap-2 mt-6">
            <Button 
              variant="outline" 
              onClick={() => {
                setIsEditDialogOpen(false);
                setEditingModel(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleEditModel} disabled={isLoading}>
              {isLoading ? 'Updating...' : 'Update Model'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SemanticModelManagement;