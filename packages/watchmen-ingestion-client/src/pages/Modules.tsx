

import React, { useState, useEffect } from 'react';
import { Plus, Edit, Layers, GitBranch, Loader2, X, BookOpen, HelpCircle, Search, RefreshCw, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Module, CreateModuleRequest, UpdateModuleRequest } from '../models/module';
import { moduleService } from '../services/moduleService';
import { toast } from '@/hooks/use-toast';
import { ExecutionFlowDiagram } from '../components/flow/ExecutionFlowDiagram';
import { useAuth } from '@/context/AuthContext';



const Modules: React.FC = () => {
  // Auth context
  const { user } = useAuth();
  
  // State management
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  
  // Form states
  const [createFormData, setCreateFormData] = useState<Partial<Module>>({});
  const [editFormData, setEditFormData] = useState<Partial<Module>>({});
  const [createLoading, setCreateLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});
  const [searchTerm, setSearchTerm] = useState<string>('');


  // Disable mock data mode to use remote service
  useEffect(() => {
    moduleService.setMockDataMode(false);
  }, []);

  // Fetch modules data
  const fetchModules = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await moduleService.getAllModules();
      setModules(data);
      setSuccessMessage('Modules loaded successfully');
    } catch (err) {
      console.error('Failed to fetch modules:', err);
      setError('Failed to load modules. Please try again.');
      // Fallback to empty array on error
      setModules([]);
    } finally {
      setLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchModules();
  }, []);

  // Clear messages after 3 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Generate UUID with 'f-' prefix for module ID
  const generateModuleId = (): string => {
    return `f-${crypto.randomUUID()}`;
  };

  // Reset create form
  const resetCreateForm = () => {
    setCreateFormData({
      moduleId: generateModuleId(),
      moduleName: '',
      priority: 1,
      tenantId: user?.tenantId || '',
      createdBy: user?.name || 'current_user',
      lastModifiedBy: user?.name || 'current_user'
    });
    setFormErrors({});
    setSuccessMessage(null);
  };

  // Validate form data
  const validateForm = (formData: Partial<Module>): boolean => {
    const errors: {[key: string]: string} = {};

    if (!formData.moduleName?.trim()) {
      errors.moduleName = 'Module name cannot be empty';
    } else if (formData.moduleName.length < 2) {
      errors.moduleName = 'Module name must be at least 2 characters';
    }

    // Module ID validation removed since it's auto-generated

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // CRUD handlers
  const handleCreate = () => {
    setCreateDialogOpen(true);
    resetCreateForm();
  };

  const handleEdit = (module: Module) => {
    setSelectedModule(module);
    setEditFormData(module);
    setEditDialogOpen(true);
    setFormErrors({});
    setSuccessMessage(null);
  };

  const handleCreateModule = async () => {
    try {
      setCreateLoading(true);
      setError(null);
      setFormErrors({});

      if (!validateForm(createFormData)) {
        setCreateLoading(false);
        return;
      }

      const now = new Date().toISOString();
      const createRequest: CreateModuleRequest = {
        moduleName: createFormData.moduleName!,
        priority: createFormData.priority!,
        version: createFormData.version!,
        tenantId: createFormData.tenantId!,
        createdBy: user?.name || 'current_user'
      };

      const newModule = await moduleService.createModule(createRequest);
      setModules(prev => [...prev, newModule]);
      setCreateDialogOpen(false);
      resetCreateForm();
      setSuccessMessage(`Module "${createFormData.moduleName}" created successfully!`);
      
      toast({
        title: "Module Created",
        description: "New module has been created successfully."
      });

      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError('Failed to create module. Please try again.');
      console.error('Failed to create module:', err);
      toast({
        title: "Error",
        description: "Failed to create module. Please try again.",
        variant: "destructive"
      });
    } finally {
      setCreateLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedModule || !editFormData) return;

    try {
      setEditLoading(true);
      setError(null);

      if (!validateForm(editFormData)) {
        setEditLoading(false);
        return;
      }

      const now = new Date().toISOString();
      const moduleData = {
        ...editFormData,
        lastModifiedAt: now,
        lastModifiedBy: user?.name || 'current_user'
      } as Module;

      const updatedModule = await moduleService.updateModule(selectedModule.moduleId, moduleData);
      setModules(prev => prev.map(m => m.moduleId === selectedModule.moduleId ? updatedModule : m));
      setEditDialogOpen(false);
      setSelectedModule(null);
      setEditFormData({});
      setFormErrors({});
      setSuccessMessage(`Module "${editFormData.moduleName}" updated successfully!`);
      
      toast({
        title: "Module Updated",
        description: "Module has been updated successfully."
      });

      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError('Failed to update module. Please try again.');
      console.error('Failed to update module:', err);
      toast({
        title: "Error",
        description: "Failed to update module. Please try again.",
        variant: "destructive"
      });
    } finally {
      setEditLoading(false);
    }
  };

  const filteredModules = modules.filter((module) => {
    return searchTerm === '' || module.moduleName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading modules...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Modules</h1>
          <p className="text-gray-500 mt-2">Manage your system modules and execution flows.</p>
        </div>
        <div className="flex gap-3">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2 shadow-sm">
                <GitBranch className="h-4 w-4" />
                Execution Flow 
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-none max-h-none w-screen h-screen p-0 m-0 border-0">
              <DialogHeader className="p-6 pb-2">
                <DialogTitle>Flow Diagram</DialogTitle>
                <DialogDescription>
                  Explore the execution flow. Hover edges for details and click nodes to inspect.
                </DialogDescription>
              </DialogHeader>
              <div className="flex-1 h-[calc(100vh-80px)] p-6 pt-2">
                <ExecutionFlowDiagram 
                  height="100%"
                  width="100%"
                  autoFetch={true}
                  onNodeClick={(node) => {
                    toast({
                      title: `${node.data.type} `,
                      description: `name: ${node.data.label}${node.data.priority ? ` | priority : ${node.data.priority}` : ''}`,
                    });
                  }}
                />
              </div>
            </DialogContent>
          </Dialog>
          <Button onClick={handleCreate} className="gap-2 shadow-sm">
            <Plus className="h-4 w-4" />
            Create Module
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-4 bg-white rounded-xl border shadow-sm">
        <div className="flex flex-col md:flex-row items-center gap-4 w-full lg:w-auto flex-1">
          <div className="relative w-full md:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input 
              placeholder="Search modules..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="pl-9 bg-gray-50/50"
            />
          </div>
        </div>
        <div className="flex gap-2 w-full sm:w-auto justify-end">
          <Button variant="outline" size="sm" className="gap-2 text-gray-600">
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export</span>
          </Button>
          <Button variant="outline" size="sm" className="gap-2 text-gray-600" onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <X className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-medium text-red-800">Error</h3>
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
            <h3 className="font-medium text-green-800">Success</h3>
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

      {!loading && !error && modules.length === 0 && (
        <Card className="p-12 border-dashed">
          <div className="text-center">
            <div className="bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Layers className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Modules Found</h3>
            <p className="text-gray-500 mb-6 max-w-sm mx-auto">Get started by creating your first module to organize your system.</p>
            <Button onClick={handleCreate} className="gap-2">
              <Plus className="h-4 w-4" />
              Create First Module
            </Button>
          </div>
        </Card>
      )}

      {/* No results after filtering */}
      {!loading && modules.length > 0 && filteredModules.length === 0 && (
        <Card className="p-12 border-dashed">
          <div className="text-center">
            <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Matches Found</h3>
            <p className="text-gray-500 max-w-sm mx-auto">
              We couldn't find any modules matching your current search.
            </p>
            <Button variant="link" onClick={() => setSearchTerm('')} className="mt-4 text-blue-600">
              Clear search
            </Button>
          </div>
        </Card>
      )}

      {/* Modules Grid */}
      {!loading && filteredModules.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredModules.map((module) => (
            <Card key={module.moduleId} className="group hover:shadow-md transition-all duration-200 border-gray-200">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg font-semibold text-gray-900">
                      {module.moduleName}
                    </CardTitle>
                    <CardDescription className="text-xs font-mono text-gray-500 truncate max-w-[200px]" title={module.moduleId}>
                      {module.moduleId}
                    </CardDescription>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleEdit(module)}
                  >
                    <Edit className="h-4 w-4 text-gray-500 hover:text-blue-600" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="space-y-1">
                      <p className="text-xs text-gray-500 font-medium uppercase">Priority</p>
                      <Badge variant="outline" className="font-normal">
                        Level {module.priority}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-gray-500 font-medium uppercase">Version</p>
                      <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-100 font-normal">
                        v{module.version}
                      </Badge>
                    </div>
                  </div>

                  <Separator className="bg-gray-100" />

                  <div className="pt-2 flex items-center justify-between text-xs text-gray-500">
                    <span>Last modified</span>
                    <span>{new Date(module.lastModifiedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Module Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={(open) => {
        setCreateDialogOpen(open);
        if (!open) {
          resetCreateForm();
        }
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Module</DialogTitle>
            <DialogDescription>
              Provide module details. The Module ID is auto-generated and cannot be edited.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="create-moduleId">Module ID (Auto-generated)</Label>
              <Input
                id="create-moduleId"
                value={createFormData.moduleId}
                readOnly
                className="bg-gray-50 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500">Module ID is automatically generated with 'f-' prefix</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-moduleName">Module Name *</Label>
              <Input
                id="create-moduleName"
                value={createFormData.moduleName}
                onChange={(e) => setCreateFormData(prev => ({ ...prev, moduleName: e.target.value }))}
                placeholder="e.g., User Management"
                className={formErrors.moduleName ? "border-red-500" : ""}
              />
              {formErrors.moduleName && (
                <p className="text-sm text-red-600">{formErrors.moduleName}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-priority">Priority</Label>
              <Input
                id="create-priority"
                type="number"
                value={createFormData.priority}
                onChange={(e) => setCreateFormData(prev => ({ ...prev, priority: parseInt(e.target.value) || 1 }))}
                min="1"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => {
              setCreateDialogOpen(false);
              resetCreateForm();
            }}>
              Cancel
            </Button>
            <Button onClick={handleCreateModule} disabled={createLoading}>
              {createLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Module
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Module Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={(open) => {
        setEditDialogOpen(open);
        if (!open) {
          setSelectedModule(null);
          setEditFormData({});
          setFormErrors({});
        }
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Module</DialogTitle>
            <DialogDescription>
              Update module details. The Module ID is fixed and cannot be changed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-moduleId">Module ID</Label>
              <Input
                id="edit-moduleId"
                value={editFormData.moduleId}
                disabled
                className="bg-gray-50"
              />
              <p className="text-xs text-gray-500">Module ID cannot be changed</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-moduleName">Module Name *</Label>
              <Input
                id="edit-moduleName"
                value={editFormData.moduleName}
                onChange={(e) => setEditFormData(prev => ({ ...prev, moduleName: e.target.value }))}
                className={formErrors.moduleName ? "border-red-500" : ""}
              />
              {formErrors.moduleName && (
                <p className="text-sm text-red-600">{formErrors.moduleName}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-priority">Priority</Label>
              <Input
                id="edit-priority"
                type="number"
                value={editFormData.priority}
                onChange={(e) => setEditFormData(prev => ({ ...prev, priority: parseInt(e.target.value) || 1 }))}
                min="1"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => {
              setEditDialogOpen(false);
              setSelectedModule(null);
              setEditFormData({});
              setFormErrors({});
            }}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={editLoading}>
              {editLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Modules;
