import React, { useState, useEffect } from 'react';
import { useSidebar } from '@/contexts/SidebarContext';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Database, 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Upload, 
  Edit, 
  Trash2, 
  Eye, 
  CheckCircle, 
  XCircle, 
  Clock, 
  FileText,
  Tag,
  Calendar,
  User,
  BarChart3,
  RefreshCw,
  Settings
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import {
  EvaluationDataset,
  DatasetFilter,
  DatasetSummary,
  getDatasets,
  getDatasetSummary,
  getDataset,
  createDataset,
  updateDataset,
  deleteDataset,
  validateDataset,
  getAvailableTags,
  getAvailableDomains,
  uploadDatasetFile
} from '@/services/evaluationDatasetService';

const EvaluationDatasetManagement = () => {
  const { collapsed } = useSidebar();
  const [datasets, setDatasets] = useState<EvaluationDataset[]>([]);
  const [summary, setSummary] = useState<DatasetSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [selectedDataset, setSelectedDataset] = useState<EvaluationDataset | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [availableDomains, setAvailableDomains] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [validationResults, setValidationResults] = useState<{ [key: string]: { valid: boolean; errors: string[] } }>({});

  // Filter state
  const [filter, setFilter] = useState<DatasetFilter>({
    search: '',
    type: 'all',
    format: 'all',
    status: 'all',
    domain: '',
    quality: '',
    tags: []
  });

  // Form state for create/edit
  const [formData, setFormData] = useState<Partial<EvaluationDataset>>({
    name: '',
    description: '',
    type: 'training',
    format: 'jsonl',
    tags: [],
    metadata: {
      domain: '',
      language: 'en',
      version: '1.0',
      source: 'internal',
      quality: 'high'
    },
    schema: {
      inputFields: [],
      outputFields: [],
      requiredFields: []
    },
    status: 'active',
    createdBy: 'current-user@company.com'
  });

  // Load data on component mount
  useEffect(() => {
    loadData();
    loadMetadata();
  }, []);

  // Load datasets when filter changes
  useEffect(() => {
    loadDatasets();
  }, [filter]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      await Promise.all([
        loadDatasets(),
        loadSummary()
      ]);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load datasets',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
      setIsInitialLoading(false);
    }
  };

  const loadDatasets = async () => {
    try {
      const data = await getDatasets(filter);
      setDatasets(data);
    } catch (error) {
      console.error('Failed to load datasets:', error);
    }
  };

  const loadSummary = async () => {
    try {
      const data = await getDatasetSummary();
      setSummary(data);
    } catch (error) {
      console.error('Failed to load summary:', error);
    }
  };

  const loadMetadata = async () => {
    try {
      const [tags, domains] = await Promise.all([
        getAvailableTags(),
        getAvailableDomains()
      ]);
      setAvailableTags(tags);
      setAvailableDomains(domains);
    } catch (error) {
      console.error('Failed to load metadata:', error);
    }
  };

  const handleCreateDataset = async () => {
    try {
      if (!formData.name || !formData.description) {
        toast({
          title: 'Validation Error',
          description: 'Name and description are required',
          variant: 'destructive'
        });
        return;
      }

      await createDataset(formData as Omit<EvaluationDataset, 'id' | 'createdAt' | 'updatedAt'>);
      
      toast({
        title: 'Success',
        description: 'Dataset created successfully'
      });
      
      setIsCreateDialogOpen(false);
      resetForm();
      loadData();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create dataset',
        variant: 'destructive'
      });
    }
  };

  const handleUpdateDataset = async () => {
    try {
      if (!selectedDataset) return;

      await updateDataset(selectedDataset.id, formData);
      
      toast({
        title: 'Success',
        description: 'Dataset updated successfully'
      });
      
      setIsEditDialogOpen(false);
      setSelectedDataset(null);
      resetForm();
      loadData();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update dataset',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteDataset = async (id: string) => {
    try {
      await deleteDataset(id);
      
      toast({
        title: 'Success',
        description: 'Dataset deleted successfully'
      });
      
      loadData();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete dataset',
        variant: 'destructive'
      });
    }
  };

  const handleValidateDataset = async (id: string) => {
    try {
      const result = await validateDataset(id);
      setValidationResults(prev => ({ ...prev, [id]: result }));
      
      toast({
        title: result.valid ? 'Validation Passed' : 'Validation Failed',
        description: result.valid ? 'Dataset is valid' : `Found ${result.errors.length} errors`,
        variant: result.valid ? 'default' : 'destructive'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to validate dataset',
        variant: 'destructive'
      });
    }
  };

  const handleFileUpload = async (file: File, datasetId: string) => {
    try {
      setUploadProgress(0);
      
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 200);

      const result = await uploadDatasetFile(file, datasetId);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      if (result.success) {
        toast({
          title: 'Success',
          description: 'File uploaded successfully'
        });
        setIsUploadDialogOpen(false);
        loadData();
      } else {
        toast({
          title: 'Upload Failed',
          description: result.error || 'Unknown error occurred',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to upload file',
        variant: 'destructive'
      });
    } finally {
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      type: 'training',
      format: 'jsonl',
      tags: [],
      metadata: {
        domain: '',
        language: 'en',
        version: '1.0',
        source: 'internal',
        quality: 'high'
      },
      schema: {
        inputFields: [],
        outputFields: [],
        requiredFields: []
      },
      status: 'active',
      createdBy: 'current-user@company.com'
    });
  };

  const openEditDialog = (dataset: EvaluationDataset) => {
    setSelectedDataset(dataset);
    setFormData(dataset);
    setIsEditDialogOpen(true);
  };

  const openViewDialog = (dataset: EvaluationDataset) => {
    setSelectedDataset(dataset);
    setIsViewDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      active: 'default',
      archived: 'secondary',
      processing: 'outline',
      error: 'destructive'
    } as const;
    
    return (
      <Badge variant={variants[status as keyof typeof variants] || 'default'}>
        {status}
      </Badge>
    );
  };

  const getTypeBadge = (type: string) => {
    const colors = {
      training: 'bg-blue-100 text-blue-800',
      validation: 'bg-green-100 text-green-800',
      test: 'bg-orange-100 text-orange-800',
      benchmark: 'bg-purple-100 text-purple-800'
    } as const;
    
    return (
      <Badge className={colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800'}>
        {type}
      </Badge>
    );
  };

  const getQualityBadge = (quality: string) => {
    const variants = {
      high: 'default',
      medium: 'secondary',
      low: 'outline'
    } as const;
    
    return (
      <Badge variant={variants[quality as keyof typeof variants] || 'default'}>
        {quality}
      </Badge>
    );
  };



  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className={`flex-1 flex flex-col transition-all duration-300 ${collapsed ? 'ml-16' : 'ml-64'}`}>
        <Header />
        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Evaluation Dataset Management</h1>
                <p className="text-gray-600 mt-1">Manage LLM evaluation datasets for training, testing, and benchmarking</p>
              </div>
              <div className="flex space-x-3">
                <Button onClick={() => setIsUploadDialogOpen(true)} variant="outline">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload
                </Button>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Dataset
                </Button>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {isInitialLoading ? (
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
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Datasets</CardTitle>
                      <Database className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{summary.total}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Records</CardTitle>
                      <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{summary.totalSize.toLocaleString()}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Active Datasets</CardTitle>
                      <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{summary.byStatus.active || 0}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Last Updated</CardTitle>
                      <Calendar className="h-4 w-4 text-muted-foreground" />
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

            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Filter className="h-5 w-5 mr-2" />
                  Filters
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="search">Search</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="search"
                        placeholder="Search datasets..."
                        value={filter.search || ''}
                        onChange={(e) => setFilter(prev => ({ ...prev, search: e.target.value }))}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="type">Type</Label>
                    <Select value={filter.type || 'all'} onValueChange={(value) => setFilter(prev => ({ ...prev, type: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="All types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All types</SelectItem>
                        <SelectItem value="training">Training</SelectItem>
                        <SelectItem value="validation">Validation</SelectItem>
                        <SelectItem value="test">Test</SelectItem>
                        <SelectItem value="benchmark">Benchmark</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="format">Format</Label>
                    <Select value={filter.format || 'all'} onValueChange={(value) => setFilter(prev => ({ ...prev, format: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="All formats" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All formats</SelectItem>
                        <SelectItem value="json">JSON</SelectItem>
                        <SelectItem value="csv">CSV</SelectItem>
                        <SelectItem value="jsonl">JSONL</SelectItem>
                        <SelectItem value="parquet">Parquet</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select value={filter.status || 'all'} onValueChange={(value) => setFilter(prev => ({ ...prev, status: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="All statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All statuses</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                        <SelectItem value="processing">Processing</SelectItem>
                        <SelectItem value="error">Error</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Datasets Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  Datasets
                  {isLoading && (
                    <RefreshCw className="ml-2 h-4 w-4 animate-spin" />
                  )}
                </CardTitle>
                <CardDescription>
                  {datasets.length} dataset{datasets.length !== 1 ? 's' : ''} found
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Format</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>Quality</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Updated</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isInitialLoading ? (
                        Array.from({ length: 5 }).map((_, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <div>
                                <Skeleton className="h-4 w-32 mb-2" />
                                <Skeleton className="h-3 w-48 mb-2" />
                                <div className="flex gap-1">
                                  <Skeleton className="h-5 w-12" />
                                  <Skeleton className="h-5 w-16" />
                                </div>
                              </div>
                            </TableCell>
                            <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                            <TableCell><Skeleton className="h-6 w-12" /></TableCell>
                            <TableCell>
                              <div>
                                <Skeleton className="h-4 w-16 mb-1" />
                                <Skeleton className="h-3 w-12" />
                              </div>
                            </TableCell>
                            <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                            <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Skeleton className="h-8 w-8" />
                                <Skeleton className="h-8 w-8" />
                                <Skeleton className="h-8 w-8" />
                                <Skeleton className="h-8 w-8" />
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        datasets.map((dataset) => (
                        <TableRow key={dataset.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{dataset.name}</div>
                              <div className="text-sm text-gray-500 truncate max-w-xs">
                                {dataset.description}
                              </div>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {dataset.tags.slice(0, 3).map((tag) => (
                                  <Badge key={tag} variant="outline" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                                {dataset.tags.length > 3 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{dataset.tags.length - 3}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{getTypeBadge(dataset.type)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{dataset.format.toUpperCase()}</Badge>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{dataset.size.toLocaleString()}</div>
                              <div className="text-sm text-gray-500">{dataset.fileSize}</div>
                            </div>
                          </TableCell>
                          <TableCell>{getQualityBadge(dataset.metadata.quality)}</TableCell>
                          <TableCell>{getStatusBadge(dataset.status)}</TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {new Date(dataset.updatedAt).toLocaleDateString()}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openViewDialog(dataset)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditDialog(dataset)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleValidateDataset(dataset.id)}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              {dataset.downloadUrl && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => window.open(dataset.downloadUrl, '_blank')}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              )}
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Dataset</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete "{dataset.name}"? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteDataset(dataset.id)}>
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Create Dataset Dialog */}
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Dataset</DialogTitle>
                <DialogDescription>
                  Create a new evaluation dataset for LLM training or testing.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={formData.name || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Dataset name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="type">Type</Label>
                    <Select value={formData.type} onValueChange={(value) => setFormData(prev => ({ ...prev, type: value as any }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="training">Training</SelectItem>
                        <SelectItem value="validation">Validation</SelectItem>
                        <SelectItem value="test">Test</SelectItem>
                        <SelectItem value="benchmark">Benchmark</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    value={formData.description || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Dataset description"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="format">Format</Label>
                    <Select value={formData.format} onValueChange={(value) => setFormData(prev => ({ ...prev, format: value as any }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="json">JSON</SelectItem>
                        <SelectItem value="csv">CSV</SelectItem>
                        <SelectItem value="jsonl">JSONL</SelectItem>
                        <SelectItem value="parquet">Parquet</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="domain">Domain</Label>
                    <Select 
                      value={formData.metadata?.domain || ''} 
                      onValueChange={(value) => setFormData(prev => ({ 
                        ...prev, 
                        metadata: { ...prev.metadata!, domain: value } 
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select domain" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableDomains.map((domain) => (
                          <SelectItem key={domain} value={domain}>{domain}</SelectItem>
                        ))}
                        <SelectItem value="insurance">Insurance</SelectItem>
                        <SelectItem value="customer-service">Customer Service</SelectItem>
                        <SelectItem value="finance">Finance</SelectItem>
                        <SelectItem value="healthcare">Healthcare</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="quality">Quality</Label>
                    <Select 
                      value={formData.metadata?.quality || 'high'} 
                      onValueChange={(value) => setFormData(prev => ({ 
                        ...prev, 
                        metadata: { ...prev.metadata!, quality: value as any } 
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="source">Source</Label>
                    <Select 
                      value={formData.metadata?.source || 'internal'} 
                      onValueChange={(value) => setFormData(prev => ({ 
                        ...prev, 
                        metadata: { ...prev.metadata!, source: value } 
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="internal">Internal</SelectItem>
                        <SelectItem value="external">External</SelectItem>
                        <SelectItem value="synthetic">Synthetic</SelectItem>
                        <SelectItem value="curated">Curated</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="version">Version</Label>
                    <Input
                      id="version"
                      value={formData.metadata?.version || '1.0'}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        metadata: { ...prev.metadata!, version: e.target.value } 
                      }))}
                      placeholder="1.0"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="tags">Tags (comma-separated)</Label>
                  <Input
                    id="tags"
                    value={formData.tags?.join(', ') || ''}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean) 
                    }))}
                    placeholder="insurance, qa, training"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateDataset}>
                  Create Dataset
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Edit Dataset Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Dataset</DialogTitle>
                <DialogDescription>
                  Update dataset information and metadata.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-name">Name *</Label>
                    <Input
                      id="edit-name"
                      value={formData.name || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Dataset name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-status">Status</Label>
                    <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value as any }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                        <SelectItem value="processing">Processing</SelectItem>
                        <SelectItem value="error">Error</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="edit-description">Description *</Label>
                  <Textarea
                    id="edit-description"
                    value={formData.description || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Dataset description"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-quality">Quality</Label>
                    <Select 
                      value={formData.metadata?.quality || 'high'} 
                      onValueChange={(value) => setFormData(prev => ({ 
                        ...prev, 
                        metadata: { ...prev.metadata!, quality: value as any } 
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="edit-version">Version</Label>
                    <Input
                      id="edit-version"
                      value={formData.metadata?.version || ''}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        metadata: { ...prev.metadata!, version: e.target.value } 
                      }))}
                      placeholder="1.0"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="edit-tags">Tags (comma-separated)</Label>
                  <Input
                    id="edit-tags"
                    value={formData.tags?.join(', ') || ''}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean) 
                    }))}
                    placeholder="insurance, qa, training"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleUpdateDataset}>
                  Update Dataset
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* View Dataset Dialog */}
          <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Dataset Details</DialogTitle>
                <DialogDescription>
                  Detailed information about the selected dataset.
                </DialogDescription>
              </DialogHeader>
              {selectedDataset && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Name</Label>
                      <p className="text-sm">{selectedDataset.name}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Type</Label>
                      <p className="text-sm">{getTypeBadge(selectedDataset.type)}</p>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Description</Label>
                    <p className="text-sm">{selectedDataset.description}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Format</Label>
                      <p className="text-sm">{selectedDataset.format.toUpperCase()}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Size</Label>
                      <p className="text-sm">{selectedDataset.size.toLocaleString()} records</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">File Size</Label>
                      <p className="text-sm">{selectedDataset.fileSize}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Domain</Label>
                      <p className="text-sm">{selectedDataset.metadata.domain}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Quality</Label>
                      <p className="text-sm">{getQualityBadge(selectedDataset.metadata.quality)}</p>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Tags</Label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {selectedDataset.tags.map((tag) => (
                        <Badge key={tag} variant="outline">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Schema</Label>
                    <div className="bg-gray-50 p-3 rounded-md text-sm">
                      <div><strong>Input Fields:</strong> {selectedDataset.schema.inputFields.join(', ')}</div>
                      <div><strong>Output Fields:</strong> {selectedDataset.schema.outputFields.join(', ')}</div>
                      <div><strong>Required Fields:</strong> {selectedDataset.schema.requiredFields.join(', ')}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Created</Label>
                      <p className="text-sm">{new Date(selectedDataset.createdAt).toLocaleString()}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Updated</Label>
                      <p className="text-sm">{new Date(selectedDataset.updatedAt).toLocaleString()}</p>
                    </div>
                  </div>
                  {validationResults[selectedDataset.id] && (
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Validation Results</Label>
                      <div className={`p-3 rounded-md text-sm ${
                        validationResults[selectedDataset.id].valid 
                          ? 'bg-green-50 text-green-800' 
                          : 'bg-red-50 text-red-800'
                      }`}>
                        {validationResults[selectedDataset.id].valid ? (
                          <div className="flex items-center">
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Dataset is valid
                          </div>
                        ) : (
                          <div>
                            <div className="flex items-center mb-2">
                              <XCircle className="h-4 w-4 mr-2" />
                              Validation failed
                            </div>
                            <ul className="list-disc list-inside space-y-1">
                              {validationResults[selectedDataset.id].errors.map((error, index) => (
                                <li key={index}>{error}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                  Close
                </Button>
                {selectedDataset && (
                  <Button onClick={() => {
                    setIsViewDialogOpen(false);
                    openEditDialog(selectedDataset);
                  }}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Upload Dialog */}
          <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload Dataset File</DialogTitle>
                <DialogDescription>
                  Upload a dataset file to an existing dataset.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="upload-dataset">Select Dataset</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose dataset" />
                    </SelectTrigger>
                    <SelectContent>
                      {datasets.filter(d => d.status === 'active').map((dataset) => (
                        <SelectItem key={dataset.id} value={dataset.id}>
                          {dataset.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="upload-file">File</Label>
                  <Input
                    id="upload-file"
                    type="file"
                    accept=".json,.csv,.jsonl,.parquet"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        // Handle file selection
                        console.log('Selected file:', file.name);
                      }
                    }}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Supported formats: JSON, CSV, JSONL, Parquet (max 100MB)
                  </p>
                </div>
                {uploadProgress > 0 && (
                  <div>
                    <Label>Upload Progress</Label>
                    <Progress value={uploadProgress} className="mt-2" />
                    <p className="text-sm text-gray-500 mt-1">{uploadProgress}% complete</p>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>
                  Cancel
                </Button>
                <Button disabled={uploadProgress > 0 && uploadProgress < 100}>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </div>
  );
};

export default EvaluationDatasetManagement;