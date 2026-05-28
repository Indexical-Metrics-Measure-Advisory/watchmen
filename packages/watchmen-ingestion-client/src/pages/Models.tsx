
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit, Database, Loader2, X, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Search, Filter, RefreshCw, Download, FileText } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { Model } from '@/models/model';
import { Module } from '@/models/module';
import { modelService } from '@/services/modelService';
import { moduleService } from '@/services/moduleService';
import dataSourceService from '@/services/dataSourceService';
import { systemService } from '@/services/systemService';
import { useTranslation } from 'react-i18next';
import { formatDate } from '@/i18n/utils/format';

const Models = () => {
  // Auth context
  const { user } = useAuth();
  const { t, i18n } = useTranslation('models');
  
  const [models, setModels] = useState<Model[]>([]);
  const [availableModules, setAvailableModules] = useState<Module[]>([]);
  const [dataSources, setDataSources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewTopicDialogOpen, setViewTopicDialogOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);
  const [selectedTopicData, setSelectedTopicData] = useState<any>(null);
  
  // Form states
  const [createFormData, setCreateFormData] = useState<Partial<Model>>({});
  const [editFormData, setEditFormData] = useState<Partial<Model>>({});
  const [createLoading, setCreateLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [viewTopicLoading, setViewTopicLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [syncingModelId, setSyncingModelId] = useState<string | null>(null);
  const [isRuntimeEnv, setIsRuntimeEnv] = useState(false);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [pageSize, setPageSize] = useState<number>(6); // Number of models displayed per page
  
  // Filters
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedModuleId, setSelectedModuleId] = useState<string>('all');

  // Fetch models and modules on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [fetchedModels, fetchedModules, fetchedDataSources] = await Promise.all([
          modelService.getAllModels(),
          moduleService.getAllModules(),
          dataSourceService.getAllDataSources()
        ]);
        setModels(fetchedModels);
        setAvailableModules(fetchedModules);
        setDataSources(fetchedDataSources);
      } catch (err) {
        setError(err instanceof Error ? err.message : t('messages.createFailed'));
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const fetchSystemEnv = async () => {
      const env = (await systemService.fetchSystemEnv()).trim().toUpperCase();
      setIsRuntimeEnv(env === 'RUNTIME');
    };
    fetchSystemEnv();
  }, []);

  // Apply filters
  const filteredModels = models.filter((model) => {
    const matchesModule = selectedModuleId === 'all' || !selectedModuleId || model.moduleId === selectedModuleId;
    const matchesSearch = searchTerm === '' || 
                          model.modelName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (model.rawTopicCode && model.rawTopicCode.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesModule && matchesSearch;
  });

  // Pagination calculation logic (based on filtered models)
  const totalFilteredCount = filteredModels.length;
  const calculatedTotalPages = Math.ceil(totalFilteredCount / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedModels = filteredModels.slice(startIndex, endIndex);

  // Update pagination state
  React.useEffect(() => {
    setTotalCount(totalFilteredCount);
    setTotalPages(calculatedTotalPages);
    
    // If current page exceeds total pages, reset to first page
    if (currentPage > calculatedTotalPages && calculatedTotalPages > 0) {
      setCurrentPage(1);
    }
  }, [totalFilteredCount, calculatedTotalPages, currentPage, pageSize]);

  // Reset to first page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedModuleId]);

  // Generate UUID with 'f-' prefix for model ID
  const generateModelId = (): string => {
    return `f-${crypto.randomUUID()}`;
  };

  // Pagination control functions
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1); // Reset to first page
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  // Reset create form
  const resetCreateForm = () => {
    setCreateFormData({
      modelId: generateModelId(),
      modelName: '',
      rawTopicCode: '',
      isParalleled: false,
      tenantId: user?.tenantId || '',
      createdBy: user?.id || 'current_user',
      lastModifiedBy: user?.id || 'current_user',
      moduleId: '',
      priority: 1,
      sendType: 'raw-topic'
    });
    setFormErrors({});
    setSuccessMessage(null);
  };

  // Validate form data for create mode
  const validateForm = (formData: Partial<Model>): boolean => {
    const errors: {[key: string]: string} = {};

    if (!formData.modelName?.trim()) {
      errors.modelName = t('validation.nameRequired');
    } else if (formData.modelName.length < 2) {
      errors.modelName = t('validation.nameMin');
    }

    // Model ID validation removed since it's auto-generated

    if (!formData.moduleId?.trim()) {
      errors.moduleId = t('validation.moduleRequired');
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateEditForm = (formData: Partial<Model>): boolean => {
    const errors: {[key: string]: string} = {};

    if (!formData.modelName?.trim()) {
      errors.modelName = t('validation.nameRequired');
    } else if (formData.modelName.length < 2) {
      errors.modelName = t('validation.nameMin');
    }

    if (!formData.moduleId?.trim()) {
      errors.moduleId = t('validation.moduleRequired');
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSyncRawTopic = async (model: Model) => {
    try {
      setSyncingModelId(model.modelId);
      await modelService.syncRawTopicStructure(model.modelName);
      
      toast({
        title: t('toast.syncSuccessTitle'),
        description: t('messages.syncSuccess', { name: model.modelName })
      });
      setSuccessMessage(t('messages.syncSuccess', { name: model.modelName }));
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Failed to sync raw topic:', err);
      toast({
        title: t('toast.syncFailedTitle'),
        description: t('messages.syncFailed', { name: model.modelName }),
        variant: "destructive"
      });
      setError(t('messages.syncFailed', { name: model.modelName }));
    } finally {
      setSyncingModelId(null);
    }
  };

  const handleCreate = () => {
    if (isRuntimeEnv) return;
    setCreateDialogOpen(true);
    resetCreateForm();
  };

  const handleEdit = (model: Model) => {
    if (isRuntimeEnv) return;
    console.log('Edit button clicked for model:', model.modelName);
    setSelectedModel(model);
    setEditFormData(model);
    setEditDialogOpen(true);
    setFormErrors({});
    setSuccessMessage(null);
  };

  const handleCreateModel = async () => {
    if (isRuntimeEnv) return;
    try {
      setCreateLoading(true);
      setError(null);

      if (!validateForm(createFormData)) {
        setCreateLoading(false);
        return;
      }

      // Prepare data for service call (including frontend-generated modelId)
      const createData = {
        modelId: createFormData.modelId!,
        modelName: createFormData.modelName!,
        dependOn: [],
        rawTopicCode: createFormData.rawTopicCode || '',
        isParalleled: createFormData.isParalleled || false,
        version: '1.0.0', // Default version for new models
        tenantId: user?.tenantId || createFormData.tenantId || '',
        createdBy: user?.name || 'current_user',
        lastModifiedBy: user?.name || 'current_user',
        moduleId: createFormData.moduleId!,
        priority: createFormData.priority || 1,
        sendType: createFormData.sendType,
        dataSourceId: createFormData.dataSourceId
      };

      // Call service layer to create model
      const createdModel = await modelService.createModel(createData);
      
      // Update local state with the created model
      setModels(prev => [createdModel, ...prev]);
      setCreateDialogOpen(false);
      resetCreateForm();
      setSuccessMessage(t('messages.created', { name: createdModel.modelName }));
      
      toast({
        title: t('toast.createdTitle'),
        description: t('toast.createdDescription')
      });

      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(t('messages.createFailed'));
      console.error('Failed to create model:', err);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    if (isRuntimeEnv) return;
    // console.log('handleSaveEdit called');
    if (!selectedModel || !editFormData) {
      // console.log('No selected model or edit form data');
      return;
    }

    try {
      // console.log('Starting edit process for model:', selectedModel.modelId);
      setEditLoading(true);
      setError(null);

      if (!validateEditForm(editFormData)) {
        // console.log('Form validation failed');
        setEditLoading(false);
        return;
      }

      // Prepare data for service call (excluding modelId, createdAt, createdBy)
      const updateData = {
        modelName: editFormData.modelName,
        rawTopicCode: editFormData.rawTopicCode,
        isParalleled: editFormData.isParalleled,
        version: editFormData.version,
        tenantId: editFormData.tenantId,
        lastModifiedBy: user?.name || 'current_user',
        moduleId: editFormData.moduleId,
        priority: editFormData.priority,
        sendType: editFormData.sendType,
        dataSourceId: editFormData.dataSourceId
      };

      // console.log('Update data prepared:', updateData);
      // console.log('Calling modelService.updateModel...');
      
      // Call service layer to update model
      const updatedModel = await modelService.updateModel(selectedModel.modelId, updateData);
      
      // console.log('Model updated successfully:', updatedModel);
      
      // Update local state with the updated model
      setModels(prev => prev.map(m => m.modelId === selectedModel.modelId ? updatedModel : m));
      setEditDialogOpen(false);
      setSelectedModel(null);
      setEditFormData({});
      setSuccessMessage(t('messages.updated', { name: updatedModel.modelName }));
      
      toast({
        title: t('toast.updatedTitle'),
        description: t('toast.updatedDescription')
      });

      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error in handleSaveEdit:', err);
      setError(t('messages.updateFailed'));
      console.error('Failed to update model:', err);
    } finally {
      setEditLoading(false);
    }
  };

  const handleViewRawTopic = async (model: Model) => {
    if (!model.rawTopicCode) {
      toast({
        title: t('toast.noRawTopicTitle'),
        description: t('messages.noRawTopic'),
        variant: "destructive"
      });
      return;
    }
    
    try {
      setViewTopicLoading(true);
      // We'll use the model name for the toast/dialog title
      setSelectedModel(model);
      
      const data = await modelService.fetchRawTopic(model.modelName);
      setSelectedTopicData(data);
      setViewTopicDialogOpen(true);
    } catch (err) {
      console.error('Failed to fetch raw topic:', err);
      toast({
        title: t('toast.errorTitle'),
        description: t('messages.fetchRawTopicFailed'),
        variant: "destructive"
      });
    } finally {
      setViewTopicLoading(false);
    }
  };

  const cloudDataSources = dataSources.filter(ds => ['s3', 'azure-blob', 'ali-oss'].includes(ds.type));

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">{t('title')}</h1>
          <p className="text-gray-500 mt-2">{t('subtitle')}</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={handleCreate} className="gap-2 shadow-sm" disabled={isRuntimeEnv}>
            <Plus className="h-4 w-4" />
            {t('createButton')}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-4 bg-white rounded-xl border shadow-sm">
        <div className="flex flex-col md:flex-row items-center gap-4 w-full lg:w-auto flex-1">
          <div className="relative w-full md:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input 
              placeholder={t('searchPlaceholder')} 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="pl-9 bg-gray-50/50"
            />
          </div>
          <div className="w-full md:w-48">
            <Select 
              value={selectedModuleId} 
              onValueChange={(value) => setSelectedModuleId(value)}
            >
              <SelectTrigger className="bg-gray-50/50">
                <div className="flex items-center gap-2">
                  <Filter className="h-3.5 w-3.5 text-gray-500" />
                  <SelectValue placeholder={t('filterByModule')} />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allModules')}</SelectItem>
                {availableModules.map((module) => (
                  <SelectItem key={module.moduleId} value={module.moduleId}>
                    {module.moduleName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex gap-2 w-full sm:w-auto justify-end">
          <Button variant="outline" size="sm" className="gap-2 text-gray-600">
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">{t('export')}</span>
          </Button>
          <Button variant="outline" size="sm" className="gap-2 text-gray-600" onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4" />
            <span className="hidden sm:inline">{t('common:refresh', { ns: 'common' })}</span>
          </Button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <X className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-medium text-red-800">{t('toast.errorTitle')}</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setError(null)}
            className="text-red-600 hover:text-red-800"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Success banner */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
          <div className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-green-800">{t('successTitle')}</h3>
            <p className="text-sm text-green-700 mt-1">{successMessage}</p>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setSuccessMessage(null)}
            className="text-green-600 hover:text-green-800"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-lg text-gray-600">{t('loading')}</p>
          </div>
        </div>
      )}

      {!loading && !error && models.length === 0 && (
        <Card className="p-12 border-dashed">
          <div className="text-center">
            <div className="bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Database className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('noModelsTitle')}</h3>
            <p className="text-gray-500 mb-6 max-w-sm mx-auto">{t('noModelsDescription')}</p>
            <Button onClick={handleCreate} className="gap-2" disabled={isRuntimeEnv}>
              <Plus className="h-4 w-4" />
              {t('createFirst')}
            </Button>
          </div>
        </Card>
      )}

      {/* No results after filtering */}
      {!loading && models.length > 0 && filteredModels.length === 0 && (
        <Card className="p-12 border-dashed">
          <div className="text-center">
            <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('noMatchesTitle')}</h3>
            <p className="text-gray-500 max-w-sm mx-auto">
              {t('noMatchesDescription')}
            </p>
            <Button variant="link" onClick={() => {setSearchTerm(''); setSelectedModuleId('all');}} className="mt-4 text-blue-600">
              {t('clearFilters')}
            </Button>
          </div>
        </Card>
      )}

      {!loading && filteredModels.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {paginatedModels.map((model) => (
          <Card key={model.modelId} className="group hover:shadow-md transition-all duration-200 border-gray-200">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg font-semibold text-gray-900">
                      {model.modelName}
                    </CardTitle>
                    {model.isParalleled && (
                      <Badge variant="secondary" className="bg-purple-50 text-purple-700 border-purple-100 text-[10px] px-1.5 py-0.5 h-5">
                        {t('parallel')}
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="text-xs font-mono text-gray-500 truncate max-w-[200px]" title={model.modelId}>
                    {model.modelId}
                  </CardDescription>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleSyncRawTopic(model)}
                    disabled={syncingModelId === model.modelId}
                    title={t('syncRawTopic')}
                  >
                    <RefreshCw className={`h-4 w-4 text-gray-500 hover:text-green-600 ${syncingModelId === model.modelId ? 'animate-spin' : ''}`} />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8"
                    onClick={() => handleViewRawTopic(model)}
                    disabled={viewTopicLoading && selectedModel?.modelId === model.modelId}
                    title={t('viewRawTopic')}
                  >
                    {viewTopicLoading && selectedModel?.modelId === model.modelId ? (
                      <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                    ) : (
                      <FileText className="h-4 w-4 text-gray-500 hover:text-blue-600" />
                    )}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8"
                    onClick={() => handleEdit(model)}
                    disabled={isRuntimeEnv}
                    title={t('editModel')}
                  >
                    <Edit className="h-4 w-4 text-gray-500 hover:text-blue-600" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div className="space-y-1">
                    <p className="text-xs text-gray-500 font-medium uppercase">{t('priority')}</p>
                    <Badge variant="outline" className="font-normal">
                      Level {model.priority}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-gray-500 font-medium uppercase">{t('topic')}</p>
                    <p className="text-gray-700 truncate" title={model.rawTopicCode || '-'}>
                      {model.rawTopicCode || '-'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-gray-500 font-medium uppercase">{t('sendType')}</p>
                    <div className="flex flex-col gap-1">
                      <Badge variant="outline" className="font-normal bg-blue-50 text-blue-700 border-blue-100 w-fit">
                        {model.sendType || 'raw-topic'}
                      </Badge>
                      {model.sendType === 'cloud-file' && model.dataSourceId && (
                        <span className="text-xs text-gray-500 truncate max-w-[100px]" title={dataSources.find(ds => ds.dataSourceId === model.dataSourceId)?.name}>
                          {t('dataSourceShort')}: {dataSources.find(ds => ds.dataSourceId === model.dataSourceId)?.name || model.dataSourceId}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <Separator className="bg-gray-100" />
                


                <div className="pt-2 flex items-center justify-between text-xs text-gray-500">
                  <span>{t('lastModified')}</span>
                  <span>{formatDate(model.lastModifiedAt, i18n.resolvedLanguage ?? 'en')}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        </div>
      )}

      {/* Pagination Controls */}
      {!loading && models.length > 0 && totalFilteredCount > 0 && (
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 px-2">
          {/* Pagination Info */}
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>
              {t('itemsRange', { start: Math.min(startIndex + 1, totalFilteredCount), end: Math.min(endIndex, totalFilteredCount), total: totalFilteredCount })}
            </span>
            <div className="flex items-center gap-2">
              <span>{t('itemsPerPage')}</span>
              <Select value={pageSize.toString()} onValueChange={(value) => handlePageSizeChange(Number(value))}>
                <SelectTrigger className="w-20 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="6">6</SelectItem>
                  <SelectItem value="12">12</SelectItem>
                  <SelectItem value="24">24</SelectItem>
                  <SelectItem value="48">48</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Pagination Buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1}
              className="h-8 w-8 p-0"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevPage}
              disabled={currentPage === 1}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            {/* Page Number Buttons */}
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNumber;
                if (totalPages <= 5) {
                  pageNumber = i + 1;
                } else if (currentPage <= 3) {
                  pageNumber = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNumber = totalPages - 4 + i;
                } else {
                  pageNumber = currentPage - 2 + i;
                }
                
                return (
                  <Button
                    key={pageNumber}
                    variant={currentPage === pageNumber ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePageChange(pageNumber)}
                    className="h-8 w-8 p-0"
                  >
                    {pageNumber}
                  </Button>
                );
              })}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage === totalPages}
              className="h-8 w-8 p-0"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Create Model Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('createDialogTitle')}</DialogTitle>
            <DialogDescription>
              {t('createDialogDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="create-modelId">{t('fields.modelId')}</Label>
              <Input
                id="create-modelId"
                value={createFormData.modelId || ''}
                readOnly
                className="bg-gray-50 cursor-not-allowed"
                placeholder={t('fields.autoGenerated')}
              />
              <p className="text-xs text-gray-500">{t('fields.autoGeneratedHint')}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-modelName">{t('fields.modelName')}</Label>
              <Input
                id="create-modelName"
                value={createFormData.modelName || ''}
                onChange={(e) => setCreateFormData(prev => ({ ...prev, modelName: e.target.value }))}
                placeholder={t('fields.modelNamePlaceholder')}
                className={formErrors.modelName ? "border-red-500" : ""}
              />
              {formErrors.modelName && <p className="text-sm text-red-600 mt-1">{formErrors.modelName}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-moduleId">{t('fields.moduleId')}</Label>
              <Select
                value={createFormData.moduleId || ''}
                onValueChange={(value) => setCreateFormData(prev => ({ ...prev, moduleId: value }))}
              >
                <SelectTrigger className={formErrors.moduleId ? "border-red-500" : ""}>
                  <SelectValue placeholder={t('fields.selectModule')} />
                </SelectTrigger>
                <SelectContent>
                  {availableModules.map((module) => (
                    <SelectItem key={module.moduleId} value={module.moduleId}>
                      {module.moduleName} ({module.moduleId})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formErrors.moduleId && <p className="text-sm text-red-600 mt-1">{formErrors.moduleId}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-rawTopicCode">{t('fields.rawTopicCode')}</Label>
              <Input
                id="create-rawTopicCode"
                value={createFormData.rawTopicCode || ''}
                onChange={(e) => setCreateFormData(prev => ({ ...prev, rawTopicCode: e.target.value }))}
                placeholder={t('fields.rawTopicCodePlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-priority">{t('fields.priority')}</Label>
              <Input
                id="create-priority"
                type="number"
                value={createFormData.priority || 1}
                onChange={(e) => setCreateFormData(prev => ({ ...prev, priority: parseInt(e.target.value) }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-sendType">{t('fields.sendType')}</Label>
              <Select
                value={createFormData.sendType || 'raw-topic'}
                onValueChange={(value) => setCreateFormData(prev => ({ ...prev, sendType: value, dataSourceId: value === 'raw-topic' ? undefined : prev.dataSourceId }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('fields.selectSendType')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="raw-topic">{t('fields.rawTopic')}</SelectItem>
                  <SelectItem value="cloud-file">{t('fields.cloudFile')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {createFormData.sendType === 'cloud-file' && (
              <div className="space-y-2">
                <Label htmlFor="create-dataSourceId">{t('fields.dataSource')}</Label>
                <Select
                  value={createFormData.dataSourceId || ''}
                  onValueChange={(value) => setCreateFormData(prev => ({ ...prev, dataSourceId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('fields.selectDataSource')} />
                  </SelectTrigger>
                  <SelectContent>
                    {cloudDataSources.map((ds) => (
                      <SelectItem key={ds.dataSourceId} value={ds.dataSourceId}>
                        {ds.name} ({ds.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex items-center space-x-2 md:col-span-2">
              <Checkbox
                id="create-isParalleled"
                checked={createFormData.isParalleled || false}
                onCheckedChange={(checked) => setCreateFormData(prev => ({ ...prev, isParalleled: !!checked }))}
              />
              <Label htmlFor="create-isParalleled">{t('fields.isParalleled')}</Label>
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <Button onClick={handleCreateModel} disabled={createLoading || isRuntimeEnv}>
              {createLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {t('actions.create')}
            </Button>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>{t('actions.cancel')}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Model Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen} key={selectedModel?.modelId || 'edit-dialog'}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('editDialogTitle')}</DialogTitle>
            <DialogDescription>
              {t('editDialogDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-modelName">{t('fields.modelName')}</Label>
              <Input
                id="edit-modelName"
                value={editFormData.modelName || ''}
                onChange={(e) => setEditFormData(prev => ({ ...prev, modelName: e.target.value }))}
                placeholder={t('fields.modelNamePlaceholder')}
                className={formErrors.modelName ? "border-red-500" : ""}
              />
              {formErrors.modelName && <p className="text-sm text-red-600 mt-1">{formErrors.modelName}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-moduleId">{t('fields.moduleId')}</Label>
              <Select
                value={editFormData.moduleId || ''}
                onValueChange={(value) => setEditFormData(prev => ({ ...prev, moduleId: value }))}
              >
                <SelectTrigger className={formErrors.moduleId ? "border-red-500" : ""}>
                  <SelectValue placeholder={t('fields.selectModule')} />
                </SelectTrigger>
                <SelectContent>
                  {availableModules.map((module) => (
                    <SelectItem key={module.moduleId} value={module.moduleId}>
                      {module.moduleName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formErrors.moduleId && <p className="text-sm text-red-600 mt-1">{formErrors.moduleId}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-rawTopicCode">{t('fields.rawTopicCode')}</Label>
              <Input
                id="edit-rawTopicCode"
                value={editFormData.rawTopicCode || ''}
                onChange={(e) => setEditFormData(prev => ({ ...prev, rawTopicCode: e.target.value }))}
                placeholder={t('fields.rawTopicCodePlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-priority">{t('fields.priority')}</Label>
              <Input
                id="edit-priority"
                type="number"
                value={editFormData.priority || 1}
                onChange={(e) => setEditFormData(prev => ({ ...prev, priority: parseInt(e.target.value) }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-sendType">{t('fields.sendType')}</Label>
              <Select
                value={editFormData.sendType || 'raw-topic'}
                onValueChange={(value) => setEditFormData(prev => ({ ...prev, sendType: value, dataSourceId: value === 'raw-topic' ? undefined : prev.dataSourceId }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('fields.selectSendType')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="raw-topic">{t('fields.rawTopic')}</SelectItem>
                  <SelectItem value="cloud-file">{t('fields.cloudFile')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {editFormData.sendType === 'cloud-file' && (
              <div className="space-y-2">
                <Label htmlFor="edit-dataSourceId">{t('fields.dataSource')}</Label>
                <Select
                  value={editFormData.dataSourceId || ''}
                  onValueChange={(value) => setEditFormData(prev => ({ ...prev, dataSourceId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('fields.selectDataSource')} />
                  </SelectTrigger>
                  <SelectContent>
                    {cloudDataSources.map((ds) => (
                      <SelectItem key={ds.dataSourceId} value={ds.dataSourceId}>
                        {ds.name} ({ds.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex items-center space-x-2 md:col-span-2">
              <Checkbox
                id="edit-isParalleled"
                checked={editFormData.isParalleled || false}
                onCheckedChange={(checked) => setEditFormData(prev => ({ ...prev, isParalleled: !!checked }))}
              />
              <Label htmlFor="edit-isParalleled">{t('fields.isParalleled')}</Label>
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <Button onClick={handleSaveEdit} disabled={editLoading || isRuntimeEnv}>
              {editLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {t('actions.saveChanges')}
            </Button>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>{t('actions.cancel')}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Topic Dialog */}
      <Dialog open={viewTopicDialogOpen} onOpenChange={setViewTopicDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('rawTopicDialogTitle', { code: selectedModel?.rawTopicCode })}</DialogTitle>
            <DialogDescription>
              {t('rawTopicDialogDescription', { name: selectedModel?.modelName })}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            {selectedTopicData ? (
              <div className="bg-gray-50 p-4 rounded-md overflow-x-auto border border-gray-200">
                <pre className="text-xs font-mono text-gray-800 whitespace-pre-wrap">
                  {JSON.stringify(selectedTopicData, null, 2)}
                </pre>
              </div>
            ) : (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            )}
          </div>
          <div className="flex justify-end mt-6">
            <Button variant="outline" onClick={() => setViewTopicDialogOpen(false)}>{t('close')}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Models;
