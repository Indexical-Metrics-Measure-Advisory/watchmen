import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSidebar } from '@/contexts/SidebarContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import {
  Plus, Edit, Trash2, BarChart3, GitBranch, Calculator, Search, Filter, Eye, Folder, FolderOpen, Tag, MoreHorizontal, LayoutGrid, List as ListIcon, Clock
} from 'lucide-react';
import {
  MetricDefinition,
  MetricFilter,
  MetricTypeParams, Category
} from '@/model/metricsManagement';
import {
  getMetrics,
  deleteMetric,
  updateMetric,
  createMetric,
  getCategories
} from '@/services/metricsManagementService';
import { getSemanticModels } from '@/services/semanticModelService';
import DerivedMetricParams from '@/components/DerivedMetricParams';
import CategoryManagement from '@/components/metrics/CategoryManagement';
import { useToast } from '@/hooks/use-toast';

const MetricsManagement: React.FC = () => {
  const { collapsed } = useSidebar();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<MetricDefinition[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [availableMeasures, setAvailableMeasures] = useState<{name: string, label: string, modelName: string}[]>([]);

  const [selectedMetric, setSelectedMetric] = useState<MetricDefinition | null>(null);
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [metricToEdit, setMetricToEdit] = useState<MetricDefinition | null>(null);
  const [editForm, setEditForm] = useState<Partial<MetricDefinition>>({});
  const [createForm, setCreateForm] = useState<Partial<MetricDefinition>>({});
  const [showCategoryManagement, setShowCategoryManagement] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  const [filter, setFilter] = useState<MetricFilter>({
    categoryId: 'all',
    type: 'all',
    searchTerm: ''
  });
  const { toast } = useToast();

  const normalizeMeasure = (measure?: MetricTypeParams['measure']) => {
    return {
      name: measure?.name ?? '',
      join_to_timespine: measure?.join_to_timespine ?? false,
      filter: measure?.filter ?? '',
      alias: measure?.alias ?? '',
      fill_nulls_with: measure?.fill_nulls_with ?? ''
    };
  };

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Use filter.categoryId directly
      const filterParams = { ...filter };
      if (filter.categoryId === 'all') {
         delete filterParams.categoryId;
      } else if (filter.categoryId === 'uncategorized') {
         filterParams.categoryId = undefined;
      }
      
      const metricsData = await getMetrics(filterParams);

      // console.log('loadData metrics:', metricsData);

      setMetrics(metricsData || []);
    } catch (error) {
      console.error('Error loading metrics:', error);
      setMetrics([]);
      toast({
        title: "Error",
        description: "Failed to load metrics data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      setIsInitialLoading(false);
    }
  }, [filter, toast]);

  const loadCategories = useCallback(async () => {
    try {
      const categoriesData = await getCategories();
      // console.log('loadCategories result:', categoriesData);
      // Ensure we always set a valid array
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
    } catch (error) {
      console.error('Error loading categories:', error);
      // Always set an empty array on error to prevent undefined issues
      setCategories([]);
    }
  }, []);

  const loadSemanticModels = useCallback(async () => {
    try {
      const models = await getSemanticModels();
      const measures = models.flatMap(model => 
        model.measures.map(measure => ({
          name: measure.name,
          label: measure.label || measure.name,
          modelName: model.name
        }))
      );
      setAvailableMeasures(measures);
    } catch (error) {
      console.error('Error loading semantic models:', error);
      setAvailableMeasures([]);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [filter, loadData]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    loadSemanticModels();
  }, [loadSemanticModels]);



  const handleDeleteMetric = async (metricName: string) => {
    try {
      await deleteMetric(metricName);
      toast({
        title: "Success",
        description: "Metric deleted successfully"
      });
      loadData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete metric",
        variant: "destructive"
      });
    }
  };

  const handleEditMetric = (metric: MetricDefinition) => {
    setMetricToEdit(metric);
    setEditForm({
      id: metric.id,
      name: metric.name,
      label: metric.label,
      description: metric.description,
      type: metric.type,
      unit: metric.unit,
      format: metric.format,
      type_params: metric.type_params
    });
    setIsEditDialogOpen(true);
  };

  const validateForm = (form: Partial<MetricDefinition>, isCreate: boolean = false): string[] => {
    const errors: string[] = [];
    
    if (!form.name?.trim()) {
      errors.push('Metric name cannot be empty');
    }
    
    if (!form.label?.trim()) {
      errors.push('Metric label cannot be empty');
    }
    
    if (!form.description?.trim()) {
      errors.push('Metric description cannot be empty');
    }
    
    if (!form.type) {
      errors.push('Please select a metric type');
    }
    
    // 验证type_params
    if (form.type === 'simple' && !form.type_params?.measure?.name?.trim()) {
      errors.push('Simple metric requires a measure');
    }
    
    if (form.type === 'ratio') {
      if (!form.type_params?.numerator?.name?.trim()) {
        errors.push('Ratio metric requires a numerator');
      }
      if (!form.type_params?.denominator?.name?.trim()) {
        errors.push('Ratio metric requires a denominator');
      }
    }
    
    if (form.type === 'derived') {
      if (!form.type_params?.expr?.trim()) {
        errors.push('Derived metric requires an expression');
      }
      if (!form.type_params?.metrics || form.type_params.metrics.length === 0) {
        errors.push('Derived metric requires at least one metric reference');
      }
    }
    
    return errors;
  };

  const handleSaveEdit = async () => {
    if (!metricToEdit || !editForm.name) return;
    
    const errors = validateForm(editForm);
    if (errors.length > 0) {
      toast({
        title: "Validation Error",
        description: errors.join('; '),
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Handle "none" categoryId by converting it to undefined
      const formDataToSubmit = {
        ...editForm,
        categoryId: editForm.categoryId === 'none' ? undefined : editForm.categoryId
      };
      
      await updateMetric(metricToEdit.name, formDataToSubmit);
      toast({
        title: "Success",
        description: `Metric "${editForm.label || metricToEdit.label}" has been successfully updated.`,
      });
      setIsEditDialogOpen(false);
      setMetricToEdit(null);
      setEditForm({});
      loadData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update metric",
        variant: "destructive",
      });
    }
  };

  const getCategoryName = (categoryId: string | undefined) => {
    if (!categoryId) return 'Uncategorized';
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.name : 'Uncategorized';
  };

  // Helper function to get type color
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'simple':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-200';
      case 'ratio':
        return 'bg-green-100 text-green-800 hover:bg-green-200';
      case 'derived':
        return 'bg-purple-100 text-purple-800 hover:bg-purple-200';
      case 'conversion':
        return 'bg-orange-100 text-orange-800 hover:bg-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
    }
  };

  // Helper function to handle create metric dialog
  const handleCreateMetricDialog = () => {
    setCreateForm({
      name: '',
      label: '',
      description: '',
      type: 'simple',
      unit: '',
      format: 'number',
      type_params: {
        measure: { name: '', join_to_timespine: false, filter: '', alias: '', fill_nulls_with: '' },
        expr: '',
        window: {},
        grain_to_date: {},
        metrics: [],
        conversion_type_params: {},
        cumulative_type_params: {},
        input_measures: []
      }
    });
    setIsCreateDialogOpen(true);
  };

  // Helper function to update create form type params
  const updateCreateFormTypeParams = (params: MetricTypeParams) => {
    setCreateForm({ ...createForm, type_params: params });
  };

  // Helper function to update edit form type params
  const updateEditFormTypeParams = (params: MetricTypeParams) => {
    setEditForm({ ...editForm, type_params: params });
  };

  // Helper function to handle save create
  const handleSaveCreate = async () => {
    try {
      setIsLoading(true);
      // Handle "none" categoryId by converting it to undefined
      const formDataToSubmit = {
        ...createForm,
        categoryId: createForm.categoryId === 'none' ? undefined : createForm.categoryId
      } as Omit<MetricDefinition, 'createdAt' | 'updatedAt'>;
      
      await createMetric(formDataToSubmit);
      setIsCreateDialogOpen(false);
      setCreateForm({
        name: '',
        label: '',
        description: '',
        type: 'simple',
        unit: '',
        format: 'number',
        type_params: {
          measure: { name: '', join_to_timespine: false, filter: '', alias: '', fill_nulls_with: '' },
          expr: '',
          window: {},
          grain_to_date: {},
          metrics: [],
          conversion_type_params: {},
          cumulative_type_params: {},
          input_measures: []
        }
      });
      await loadData();
      toast({
        title: "Success",
        description: "Metric created successfully",
      });
    } catch (error) {
      console.error('Error creating metric:', error);
      toast({
        title: "Error",
        description: "Failed to create metric",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };





  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      
      <div className={`${collapsed ? 'pl-20' : 'pl-56'} min-h-screen transition-all duration-300`}>
        <Header />
        
        <main className="flex-1 p-6 space-y-6 overflow-y-auto">
          {/* Top Header & Actions */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-xl">
                <BarChart3 className="h-8 w-8 text-primary" />
              </div>
              <div className="space-y-1">
                <h1 className="text-2xl font-bold tracking-tight">Metrics Library</h1>
                <p className="text-sm text-muted-foreground">
                  Define, manage, and track your key performance indicators across {categories?.length || 0} categories.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowCategoryManagement(!showCategoryManagement)}
                className={showCategoryManagement ? "bg-accent text-accent-foreground border-accent" : ""}
              >
                <FolderOpen className="mr-2 h-4 w-4" />
                Categories
              </Button>
              <Button onClick={handleCreateMetricDialog}>
                <Plus className="mr-2 h-4 w-4" />
                New Metric
              </Button>
            </div>
          </div>

          {/* Category Management Panel */}
          <Collapsible open={showCategoryManagement} onOpenChange={setShowCategoryManagement} className="space-y-2">
            <CollapsibleContent>
               <Card className="border-dashed shadow-sm bg-muted/30">
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold flex items-center gap-2">
                            <Folder className="h-4 w-4 text-primary" />
                            Category Structure
                        </h3>
                        <Button variant="ghost" size="sm" onClick={() => setShowCategoryManagement(false)}>
                            Close
                        </Button>
                    </div>
                    <CategoryManagement 
                      onCategoriesChanged={() => {
                        loadData();
                        loadCategories();
                      }}
                    /> 
                  </div>
               </Card>
            </CollapsibleContent>
          </Collapsible>

          {/* Toolbar: Search, Filters, View Mode */}
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-card p-4 rounded-lg border shadow-sm sticky top-0 z-10">
            <div className="flex flex-col md:flex-row flex-1 items-center gap-4 w-full md:w-auto">
              <div className="relative w-full md:max-w-xs">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search metrics..."
                  className="pl-9"
                  value={filter.searchTerm || ''}
                  onChange={(e) => setFilter({ ...filter, searchTerm: e.target.value })}
                />
              </div>
              
              <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                 {/* Category Filter */}
                 <Select
                    value={filter.categoryId}
                    onValueChange={(value) => setFilter({ ...filter, categoryId: value })}
                  >
                    <SelectTrigger className="w-[180px]">
                      <div className="flex items-center gap-2 text-sm">
                        <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="truncate">{filter.categoryId === 'all' ? 'All Categories' : getCategoryName(filter.categoryId)}</span>
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="uncategorized">Uncategorized</SelectItem>
                      <DropdownMenuSeparator />
                      {categories?.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Type Filter */}
                  <Select
                    value={filter.type}
                    onValueChange={(value) => setFilter({ ...filter, type: value as MetricFilter['type'] })}
                  >
                    <SelectTrigger className="w-[150px]">
                       <div className="flex items-center gap-2 text-sm">
                        <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{filter.type === 'all' ? 'All Types' : filter.type?.charAt(0).toUpperCase() + filter.type?.slice(1)}</span>
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="simple">Simple Metric</SelectItem>
                      <SelectItem value="ratio">Ratio Metric</SelectItem>
                      <SelectItem value="derived">Derived Metric</SelectItem>
                    </SelectContent>
                  </Select>
              </div>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center border rounded-md bg-muted/50 p-1 shrink-0">
               <Button
                  variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-8 px-3"
                  onClick={() => setViewMode('list')}
                >
                  <ListIcon className="h-4 w-4 mr-2" />
                  List
                </Button>
                <Button
                  variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-8 px-3"
                  onClick={() => setViewMode('grid')}
                >
                  <LayoutGrid className="h-4 w-4 mr-2" />
                  Grid
                </Button>
            </div>
          </div>

          {/* Content Area */}
          <div className="min-h-[400px]">
          {isLoading ? (
             <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Card key={i} className="p-6 space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                      <Skeleton className="h-8 w-8 rounded-full" />
                    </div>
                    <Skeleton className="h-16 w-full" />
                    <div className="flex gap-2">
                      <Skeleton className="h-5 w-16" />
                      <Skeleton className="h-5 w-16" />
                    </div>
                  </Card>
                ))}
             </div>
          ) : metrics.length === 0 ? (
             <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed rounded-xl bg-muted/10">
                <div className="bg-background p-4 rounded-full shadow-sm mb-4">
                  <BarChart3 className="h-10 w-10 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold">No metrics found</h3>
                <p className="text-muted-foreground max-w-sm mt-2 mb-6">
                  {filter.searchTerm || filter.categoryId !== 'all' || filter.type !== 'all' 
                    ? "Try adjusting your filters or search query." 
                    : "Get started by defining your first metric to track performance."}
                </p>
                <Button onClick={handleCreateMetricDialog}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Metric
                </Button>
             </div>
          ) : (
            <>
              {viewMode === 'list' ? (
                <div className="rounded-md border bg-card shadow-sm overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/40">
                      <TableRow>
                        <TableHead className="w-[30%]">Metric Name</TableHead>
                        <TableHead className="w-[15%]">Category</TableHead>
                        <TableHead className="w-[15%]">Type</TableHead>
                        <TableHead className="w-[15%]">Format</TableHead>
                        <TableHead className="w-[15%]">Last Updated</TableHead>
                        <TableHead className="w-[10%] text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {metrics.map((metric) => (
                        <TableRow key={metric.name} className="group hover:bg-muted/50 transition-colors">
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium text-foreground">{metric.label || metric.name}</span>
                              <span className="text-xs text-muted-foreground font-mono truncate max-w-[200px]">{metric.name}</span>
                              {metric.description && (
                                <span className="text-xs text-muted-foreground truncate max-w-[250px] mt-1">{metric.description}</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                             {metric.categoryId ? (
                                <Badge variant="outline" className="font-normal">
                                  {getCategoryName(metric.categoryId)}
                                </Badge>
                             ) : (
                                <span className="text-muted-foreground text-sm">-</span>
                             )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={`${getTypeColor(metric.type)} bg-opacity-10 text-xs font-medium`}>
                              {metric.type === 'simple' && <BarChart3 className="mr-1 h-3 w-3" />}
                              {metric.type === 'ratio' && <Calculator className="mr-1 h-3 w-3" />}
                              {metric.type === 'derived' && <GitBranch className="mr-1 h-3 w-3" />}
                              {metric.type.charAt(0).toUpperCase() + metric.type.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            <div className="flex items-center gap-1">
                               {metric.format === 'currency' && <span className="text-muted-foreground">$</span>}
                               {metric.format === 'percentage' && <span className="text-muted-foreground">%</span>}
                               {metric.format === 'number' && <span className="text-muted-foreground">#</span>}
                               <span className="capitalize">{metric.format || 'Number'}</span>
                            </div>
                            <span className="text-xs text-muted-foreground">{metric.unit || '-'}</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col text-xs text-muted-foreground">
                                <div className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    <span>{metric.updatedAt ? new Date(metric.updatedAt).toLocaleDateString() : 'Unknown'}</span>
                                </div>
                                <span>{metric.updatedBy || 'System'}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <span className="sr-only">Open menu</span>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => setSelectedMetric(metric)}>
                                  <Eye className="mr-2 h-4 w-4" /> View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEditMetric(metric)}>
                                  <Edit className="mr-2 h-4 w-4" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                    className="text-destructive focus:text-destructive"
                                    onClick={() => handleDeleteMetric(metric.name)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                   {metrics.map((metric) => (
                      <Card key={metric.name} className="group hover:shadow-md transition-all duration-200 border-muted/60">
                         <div className="p-5 space-y-4">
                            <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="secondary" className={`${getTypeColor(metric.type)} bg-opacity-10 text-[10px] px-1.5 py-0.5 h-5`}>
                                            {metric.type}
                                        </Badge>
                                        {metric.categoryId && (
                                            <span className="text-[10px] text-muted-foreground border px-1.5 rounded-sm bg-muted/20">
                                                {getCategoryName(metric.categoryId)}
                                            </span>
                                        )}
                                    </div>
                                    <h3 className="font-semibold text-base leading-tight group-hover:text-primary transition-colors">
                                        {metric.label || metric.name}
                                    </h3>
                                </div>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-8 w-8 p-0 -mr-2 -mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => setSelectedMetric(metric)}>View Details</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleEditMetric(metric)}>Edit</DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteMetric(metric.name)}>Delete</DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                            
                            <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">
                                {metric.description || "No description provided."}
                            </p>
                            
                            <Separator />
                            
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                    <span className="text-muted-foreground block">Format</span>
                                    <span className="font-medium capitalize">{metric.format || 'Number'}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground block">Unit</span>
                                    <span className="font-medium">{metric.unit || '-'}</span>
                                </div>
                            </div>
                            
                            <div className="pt-2 flex items-center justify-between">
                                <span className="text-[10px] text-muted-foreground">
                                    Updated {metric.updatedAt ? new Date(metric.updatedAt).toLocaleDateString() : 'Unknown'}
                                </span>
                                <div className="flex gap-1">
                                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setSelectedMetric(metric)}>
                                        <Eye className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEditMetric(metric)}>
                                        <Edit className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </div>
                         </div>
                      </Card>
                   ))}
                </div>
              )}
            </>
          )}
          </div>

 
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Edit Metric</DialogTitle>
            <DialogDescription>
              Modify basic information and configuration parameters of the metric.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Metric Name</label>
                <Input
                  value={editForm.name || ''}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  placeholder="Enter metric name"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Display Label</label>
                <Input
                  value={editForm.label || ''}
                  onChange={(e) => setEditForm({ ...editForm, label: e.target.value })}
                  placeholder="Enter display label"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={editForm.description || ''}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                placeholder="Enter metric description"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Metric Type</label>
                <Select
                  value={editForm.type || ''}
                  onValueChange={(value) => setEditForm({ ...editForm, type: value as 'simple' | 'ratio' | 'derived' })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="simple">Simple Metric</SelectItem>
                    <SelectItem value="ratio">Ratio Metric</SelectItem>
                    <SelectItem value="derived">Derived Metric</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Unit</label>
                <Input
                  value={editForm.unit || ''}
                  onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })}
                  placeholder="Enter unit"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Format</label>
                <Select
                  value={editForm.format || ''}
                  onValueChange={(value) => setEditForm({ ...editForm, format: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="number">Number</SelectItem>
                    <SelectItem value="currency">Currency</SelectItem>
                    <SelectItem value="percentage">Percentage</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <Select
                  value={editForm.categoryId || 'none'}
                  onValueChange={(value) => setEditForm({ ...editForm, categoryId: value === 'none' ? undefined : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Category</SelectItem>
                    {categories && categories.length > 0 && categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

            </div>
            <Separator />
            <p className="text-xs text-muted-foreground">Type-specific parameters vary by metric type.</p>
            
            {/* Type-specific Parameters */}
            {editForm.type === 'derived' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Derived Metric Parameters</label>
                <DerivedMetricParams
                  params={editForm.type_params || {}}
                  onChange={updateEditFormTypeParams}
                />
              </div>
            )}
            
            {editForm.type === 'ratio' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Numerator</label>
                  <Select
                    value={editForm.type_params?.numerator?.name || ''}
                    onValueChange={(value) =>
                      setEditForm({
                        ...editForm,
                        type_params: {
                          ...editForm.type_params,
                          numerator: {
                            name: value,
                            join_to_timespine: editForm.type_params?.numerator?.join_to_timespine || false,
                            filter: editForm.type_params?.numerator?.filter,
                            alias: editForm.type_params?.numerator?.alias,
                            fill_nulls_with: editForm.type_params?.numerator?.fill_nulls_with,
                          },
                        },
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select numerator metric" />
                    </SelectTrigger>
                    <SelectContent>
                      {metrics.map((m) => (
                        <SelectItem key={m.name} value={m.name}>
                          {m.label || m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Denominator</label>
                  <Select
                    value={editForm.type_params?.denominator?.name || ''}
                    onValueChange={(value) =>
                      setEditForm({
                        ...editForm,
                        type_params: {
                          ...editForm.type_params,
                          denominator: {
                            name: value,
                            join_to_timespine: editForm.type_params?.denominator?.join_to_timespine || false,
                            filter: editForm.type_params?.denominator?.filter,
                            alias: editForm.type_params?.denominator?.alias,
                            fill_nulls_with: editForm.type_params?.denominator?.fill_nulls_with,
                          },
                        },
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select denominator metric" />
                    </SelectTrigger>
                    <SelectContent>
                      {metrics.map((m) => (
                        <SelectItem key={m.name} value={m.name}>
                          {m.label || m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            
            {editForm.type === 'simple' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Measure</label>
                <Select
                  value={editForm.type_params?.measure?.name || ''}
                  onValueChange={(value) => setEditForm({ 
                    ...editForm, 
                    type_params: { 
                      ...editForm.type_params, 
                      measure: { 
                        ...normalizeMeasure(editForm.type_params?.measure),
                        name: value
                      }
                    }
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select measure" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMeasures.map((measure, index) => (
                      <SelectItem key={`${measure.modelName}-${measure.name}-${index}`} value={measure.name}>
                        {measure.label} ({measure.modelName})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between rounded-md border px-3 py-2">
                    <span className="text-sm">Join to Timespine</span>
                    <Switch
                      checked={normalizeMeasure(editForm.type_params?.measure).join_to_timespine}
                      onCheckedChange={(checked) =>
                        setEditForm({
                          ...editForm,
                          type_params: {
                            ...editForm.type_params,
                            measure: {
                              ...normalizeMeasure(editForm.type_params?.measure),
                              join_to_timespine: checked
                            }
                          }
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Alias</label>
                    <Input
                      value={normalizeMeasure(editForm.type_params?.measure).alias}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          type_params: {
                            ...editForm.type_params,
                            measure: {
                              ...normalizeMeasure(editForm.type_params?.measure),
                              alias: e.target.value
                            }
                          }
                        })
                      }
                      placeholder="Optional alias"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Fill Nulls With</label>
                    <Input
                      value={String(normalizeMeasure(editForm.type_params?.measure).fill_nulls_with)}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          type_params: {
                            ...editForm.type_params,
                            measure: {
                              ...normalizeMeasure(editForm.type_params?.measure),
                              fill_nulls_with: e.target.value
                            }
                          }
                        })
                      }
                      placeholder="Optional value"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Filter</label>
                    <Textarea
                      value={normalizeMeasure(editForm.type_params?.measure).filter || ''}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          type_params: {
                            ...editForm.type_params,
                            measure: {
                              ...normalizeMeasure(editForm.type_params?.measure),
                              filter: e.target.value
                            }
                          }
                        })
                      }
                      placeholder="Optional filter expression"
                      rows={2}
                    />
                  </div>
                </div>
              </div>
            )}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 创建指标对话框 */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Metric</DialogTitle>
            <DialogDescription>
              Define a new business metric with its configuration parameters.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Metric Name *</label>
                <Input
                  value={createForm.name || ''}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="Enter metric name"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Display Label *</label>
                <Input
                  value={createForm.label || ''}
                  onChange={(e) => setCreateForm({ ...createForm, label: e.target.value })}
                  placeholder="Enter display label"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={createForm.description || ''}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                placeholder="Enter metric description"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Metric Type</label>
                <Select
                  value={createForm.type || ''}
                  onValueChange={(value) => setCreateForm({ ...createForm, type: value as 'simple' | 'ratio' | 'derived' })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="simple">Simple Metric</SelectItem>
                    <SelectItem value="ratio">Ratio Metric</SelectItem>
                    <SelectItem value="derived">Derived Metric</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Unit</label>
                <Input
                  value={createForm.unit || ''}
                  onChange={(e) => setCreateForm({ ...createForm, unit: e.target.value })}
                  placeholder="Enter unit"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Format</label>
                <Select
                  value={createForm.format || ''}
                  onValueChange={(value) => setCreateForm({ ...createForm, format: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="number">Number</SelectItem>
                    <SelectItem value="currency">Currency</SelectItem>
                    <SelectItem value="percentage">Percentage</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <Select
                  value={createForm.categoryId || 'none'}
                  onValueChange={(value) => setCreateForm({ ...createForm, categoryId: value === 'none' ? undefined : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Category</SelectItem>
                    {categories && categories.length > 0 && categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

            </div>
            <Separator />
            <p className="text-xs text-muted-foreground">Configure parameters based on the selected metric type.</p>
            
            {/* Type-specific Parameters */}
            {createForm.type === 'derived' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Derived Metric Parameters</label>
                <DerivedMetricParams
                  params={createForm.type_params || {
                    
                  }}
                  onChange={updateCreateFormTypeParams}
                />
              </div>
            )}
            
            {createForm.type === 'ratio' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Numerator</label>
                  <Select
                    value={createForm.type_params?.numerator?.name || ''}
                    onValueChange={(value) =>
                      setCreateForm({
                        ...createForm,
                        type_params: {
                          ...createForm.type_params,
                          numerator: {
                            name: value,
                            join_to_timespine: createForm.type_params?.numerator?.join_to_timespine || false,
                            filter: createForm.type_params?.numerator?.filter,
                            alias: createForm.type_params?.numerator?.alias,
                            fill_nulls_with: createForm.type_params?.numerator?.fill_nulls_with,
                          },
                        },
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select numerator metric" />
                    </SelectTrigger>
                    <SelectContent>
                      {metrics.map((m) => (
                        <SelectItem key={m.name} value={m.name}>
                          {m.label || m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Denominator</label>
                  <Select
                    value={createForm.type_params?.denominator?.name || ''}
                    onValueChange={(value) =>
                      setCreateForm({
                        ...createForm,
                        type_params: {
                          ...createForm.type_params,
                          denominator: {
                            name: value,
                            join_to_timespine: createForm.type_params?.denominator?.join_to_timespine || false,
                            filter: createForm.type_params?.denominator?.filter,
                            alias: createForm.type_params?.denominator?.alias,
                            fill_nulls_with: createForm.type_params?.denominator?.fill_nulls_with,
                          },
                        },
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select denominator metric" />
                    </SelectTrigger>
                    <SelectContent>
                      {metrics.map((m) => (
                        <SelectItem key={m.name} value={m.name}>
                          {m.label || m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            
            {createForm.type === 'simple' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Measure</label>
                <Select
                  value={createForm.type_params?.measure?.name || ''}
                  onValueChange={(value) => setCreateForm({ 
                    ...createForm, 
                    type_params: { 
                      ...createForm.type_params, 
                      measure: { 
                        ...normalizeMeasure(createForm.type_params?.measure),
                        name: value
                      }
                    }
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select measure" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMeasures.map((measure, index) => (
                      <SelectItem key={`${measure.modelName}-${measure.name}-${index}`} value={measure.name}>
                        {measure.label} ({measure.modelName})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between rounded-md border px-3 py-2">
                    <span className="text-sm">Join to Timespine</span>
                    <Switch
                      checked={normalizeMeasure(createForm.type_params?.measure).join_to_timespine}
                      onCheckedChange={(checked) =>
                        setCreateForm({
                          ...createForm,
                          type_params: {
                            ...createForm.type_params,
                            measure: {
                              ...normalizeMeasure(createForm.type_params?.measure),
                              join_to_timespine: checked
                            }
                          }
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Alias</label>
                    <Input
                      value={normalizeMeasure(createForm.type_params?.measure).alias}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          type_params: {
                            ...createForm.type_params,
                            measure: {
                              ...normalizeMeasure(createForm.type_params?.measure),
                              alias: e.target.value
                            }
                          }
                        })
                      }
                      placeholder="Optional alias"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Fill Nulls With</label>
                    <Input
                      value={String(normalizeMeasure(createForm.type_params?.measure).fill_nulls_with)}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          type_params: {
                            ...createForm.type_params,
                            measure: {
                              ...normalizeMeasure(createForm.type_params?.measure),
                              fill_nulls_with: e.target.value
                            }
                          }
                        })
                      }
                      placeholder="Optional value"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Filter</label>
                    <Textarea
                      value={normalizeMeasure(createForm.type_params?.measure).filter || ''}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          type_params: {
                            ...createForm.type_params,
                            measure: {
                              ...normalizeMeasure(createForm.type_params?.measure),
                              filter: e.target.value
                            }
                          }
                        })
                      }
                      placeholder="Optional filter expression"
                      rows={2}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveCreate}>
              Create Metric
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>



      {/* Metric Details Dialog */}
      {selectedMetric && (
        <Dialog open={!!selectedMetric} onOpenChange={() => setSelectedMetric(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>{selectedMetric.label}</DialogTitle>
              <DialogDescription>{selectedMetric.description}</DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Metric Name</label>
                    <div className="mt-1 p-2 bg-muted rounded font-mono text-sm">
                      {selectedMetric.name}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Type</label>
                    <div className="mt-1">
                      <Badge className={getTypeColor(selectedMetric.type)}>
                        {selectedMetric.type}
                      </Badge>
                    </div>
                  </div>
                </div>
                <Separator />
                <div>
                  <label className="text-sm font-medium">Type Parameters</label>
                  <div className="mt-1 p-3 bg-muted rounded">
                    <pre className="text-sm overflow-x-auto">
                      {JSON.stringify(selectedMetric.type_params, null, 2)}
                    </pre>
                  </div>
                </div>
                {selectedMetric.unit && (
                  <div>
                    <label className="text-sm font-medium">Unit</label>
                    <div className="mt-1 p-2 bg-muted rounded text-sm">
                      {selectedMetric.unit}
                    </div>
                  </div>
                )}
                {selectedMetric.format && (
                  <div>
                    <label className="text-sm font-medium">Format</label>
                    <div className="mt-1 p-2 bg-muted rounded text-sm">
                      {selectedMetric.format}
                    </div>
                  </div>
                )}

              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      )}
        </main>
      </div>
    </div>
  );
};

export default MetricsManagement;
