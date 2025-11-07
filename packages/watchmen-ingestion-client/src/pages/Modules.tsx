

import React, { useState, useEffect } from 'react';
import { Plus, Edit, Layers, GitBranch, Loader2, X, BookOpen, HelpCircle } from 'lucide-react';
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
    <div className="p-8 space-y-8">
      {/* Hero header */}
      <Card className="border-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl shadow-md">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-white/20 rounded-xl shadow-md">
                <Layers className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Modules</h1>
                <p className="text-blue-100 mt-1">Manage system modules</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 text-foreground border-white/40">
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
              <Button onClick={handleCreate} size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Create Module
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

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

      {loading && (
        <Card className="p-8">
          <div className="flex items-center justify-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin" />
            <p className="text-lg">Loading modules...</p>
          </div>
        </Card>
      )}

      {!loading && !error && modules.length === 0 && (
        <Card className="p-8">
          <div className="text-center">
            <Layers className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">No Modules Found</h3>
            <p className="text-gray-500 mb-4">Get started by creating your first module.</p>
            <Button onClick={handleCreate} className="gap-2">
              <Plus className="h-4 w-4" />
              Create First Module
            </Button>
          </div>
        </Card>
      )}

      {/* Modules Grid */}
      {!loading && modules.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {modules.map((module) => (
            <Card key={module.moduleId} className="p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">{module.moduleName}</h3>
                  <p className="text-sm text-gray-600 font-mono">ID: {module.moduleId}</p>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleEdit(module)}
                    className="hover:bg-blue-50 hover:border-blue-300"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    Priority: {module.priority}
                  </Badge>
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    v{module.version}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600">
                  Last modified: {new Date(module.lastModifiedAt).toLocaleDateString()}
                </p>
              </div>
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
