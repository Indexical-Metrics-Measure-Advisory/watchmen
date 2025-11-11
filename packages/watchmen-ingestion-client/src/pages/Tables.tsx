
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Database, Plus, Download, RefreshCw, Info, Eye, Edit, X, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Minus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  CollectorTableConfig, Condition, Dependence,
  JsonColumn
} from '@/models/table';
import { tableService, TableServiceError } from '@/services/tableService';
import dataSourceService from '@/services/dataSourceService';

// Helper components for complex data structures
const ConditionEditor = ({ 
  conditions, 
  onChange 
}: { 
  conditions: Condition[], 
  onChange: (conditions: Condition[]) => void 
}) => {
  const addCondition = () => {
    onChange([...conditions, { field: '', operator: '', value: '', type: '' }]);
  };

  const updateCondition = (index: number, field: keyof Condition, value: any) => {
    const updated = [...conditions];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const removeCondition = (index: number) => {
    onChange(conditions.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      {conditions.map((condition, index) => (
        <div key={index} className="flex gap-2 items-end">
          <div className="flex-1">
            <Input
              placeholder="Field"
              value={condition.field || ''}
              onChange={(e) => updateCondition(index, 'field', e.target.value)}
            />
          </div>
          <div className="flex-1">
            <Select
              value={condition.operator || ''}
              onValueChange={(value) => updateCondition(index, 'operator', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Operator" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="=">=</SelectItem>
                <SelectItem value="!=">!=</SelectItem>
                <SelectItem value=">">&gt;</SelectItem>
                <SelectItem value="<">&lt;</SelectItem>
                <SelectItem value=">=">&gt;=</SelectItem>
                <SelectItem value="<=">&lt;=</SelectItem>
                <SelectItem value="LIKE">LIKE</SelectItem>
                <SelectItem value="IN">IN</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <Input
              placeholder="Value"
              value={condition.value || ''}
              onChange={(e) => updateCondition(index, 'value', e.target.value)}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => removeCondition(index)}
          >
            <Minus className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={addCondition}>
        <Plus className="h-4 w-4 mr-2" />
        Add Condition
      </Button>
    </div>
  );
};

const DependenceEditor = ({ 
  dependencies, 
  onChange 
}: { 
  dependencies: Dependence[], 
  onChange: (dependencies: Dependence[]) => void 
}) => {
  const addDependence = () => {
    onChange([...dependencies, { modelName: '', objectKey: '' }]);
  };

  const updateDependence = (index: number, field: keyof Dependence, value: string) => {
    const updated = [...dependencies];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const removeDependence = (index: number) => {
    onChange(dependencies.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      {dependencies.map((dep, index) => (
        <div key={index} className="flex gap-2 items-end">
          <div className="flex-1">
            <Input
              placeholder="Model Name"
              value={dep.modelName || ''}
              onChange={(e) => updateDependence(index, 'modelName', e.target.value)}
            />
          </div>
          <div className="flex-1">
            <Input
              placeholder="Object Key"
              value={dep.objectKey || ''}
              onChange={(e) => updateDependence(index, 'objectKey', e.target.value)}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => removeDependence(index)}
          >
            <Minus className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={addDependence}>
        <Plus className="h-4 w-4 mr-2" />
        Add Dependence
      </Button>
    </div>
  );
};

const JsonColumnEditor = ({ 
  jsonColumns, 
  onChange 
}: { 
  jsonColumns: JsonColumn[], 
  onChange: (jsonColumns: JsonColumn[]) => void 
}) => {
  const addJsonColumn = () => {
    onChange([...jsonColumns, { 
      columnName: '', 
      ignoredPath: [], 
      needFlatten: false, 
      flattenPath: [], 
      jsonPath: [] 
    }]);
  };

  const updateJsonColumn = (index: number, field: keyof JsonColumn, value: any) => {
    const updated = [...jsonColumns];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const removeJsonColumn = (index: number) => {
    onChange(jsonColumns.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      {jsonColumns.map((jsonCol, index) => (
        <div key={index} className="border rounded-lg p-4 space-y-3">
          <div className="flex justify-between items-center">
            <h4 className="font-medium">JSON Column {index + 1}</h4>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => removeJsonColumn(index)}
            >
              <Minus className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>Column Name</Label>
              <Input
                placeholder="Column Name"
                value={jsonCol.columnName || ''}
                onChange={(e) => updateJsonColumn(index, 'columnName', e.target.value)}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id={`needFlatten-${index}`}
                checked={jsonCol.needFlatten || false}
                onCheckedChange={(checked) => updateJsonColumn(index, 'needFlatten', checked)}
              />
              <Label htmlFor={`needFlatten-${index}`}>Need Flatten</Label>
            </div>
            <div>
              <Label>Ignored Paths (comma separated)</Label>
              <Input
                placeholder="path1, path2, path3"
                value={jsonCol.ignoredPath?.join(', ') || ''}
                onChange={(e) => updateJsonColumn(index, 'ignoredPath', 
                  e.target.value.split(',').map(p => p.trim()).filter(p => p))}
              />
            </div>
            <div>
              <Label>Flatten Paths (comma separated)</Label>
              <Input
                placeholder="path1, path2, path3"
                value={jsonCol.flattenPath?.join(', ') || ''}
                onChange={(e) => updateJsonColumn(index, 'flattenPath', 
                  e.target.value.split(',').map(p => p.trim()).filter(p => p))}
              />
            </div>
            <div className="md:col-span-2">
              <Label>JSON Paths (comma separated)</Label>
              <Input
                placeholder="$.path1, $.path2, $.path3"
                value={jsonCol.jsonPath?.join(', ') || ''}
                onChange={(e) => updateJsonColumn(index, 'jsonPath', 
                  e.target.value.split(',').map(p => p.trim()).filter(p => p))}
              />
            </div>
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={addJsonColumn}>
        <Plus className="h-4 w-4 mr-2" />
        Add JSON Column
      </Button>
    </div>
  );
};

const Tables = () => {
  const [tables, setTables] = useState<CollectorTableConfig[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [viewDialogOpen, setViewDialogOpen] = useState<boolean>(false);
  const [editDialogOpen, setEditDialogOpen] = useState<boolean>(false);
  const [selectedTable, setSelectedTable] = useState<CollectorTableConfig | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<CollectorTableConfig>>({});
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [pageSize, setPageSize] = useState<number>(6); // Number of tables displayed per page
  const [selectedModelName, setSelectedModelName] = useState<string>('all');
  
  // New table related states
  const [createDialogOpen, setCreateDialogOpen] = useState<boolean>(false);
  const [createFormData, setCreateFormData] = useState<CollectorTableConfig>({
    configId: '',
    name: '',
    tableName: '',
    primaryKey: [],
    objectKey: '',
    sequenceKey: '',
    modelName: '',
    parentName: '',
    label: '',
    joinKeys: [],
    dependOn: [],
    conditions: [],
    jsonColumns: [],
    auditColumn: '',
    ignoredColumns: [],
    dataSourceId: '',
    isList: false,
    triggered: false,
    createdBy: '',
    lastModifiedBy: ''
  });
  const [createLoading, setCreateLoading] = useState<boolean>(false);
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});
  const [editFormErrors, setEditFormErrors] = useState<{[key: string]: string}>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Data sources for dropdown
  const [dataSources, setDataSources] = useState<any[]>([]);
  const [dataSourcesLoading, setDataSourcesLoading] = useState<boolean>(false);
  const [dataSourcesError, setDataSourcesError] = useState<string | null>(null);

  // Unique model names for filter options
  const modelNames = React.useMemo(() => {
    const names = (tables || [])
      .map(t => t.modelName)
      .filter((n): n is string => !!n);
    return Array.from(new Set(names));
  }, [tables]);

  // Function to fetch table data
  const fetchTables = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const tables = await tableService.getAllTables();

      setTables(tables);
      // setTotalPages(response.totalPages);
      // setTotalCount(response.total);
    } catch (error) {
      console.error('Error fetching tables:', error);
      if (error instanceof TableServiceError) {
        setError(error.message);
      } else {
        setError('Failed to fetch tables. Please try again.');
      }
      // In case of error, use mock data as fallback
      const mockTables: CollectorTableConfig[] = [
        {
          configId: '1',
          name: 'Customers',
          label: 'Customer master data including contact information',
          modelName: 'Customer',
          tableName: 'customers',
          primaryKey: ['customer_id'],
          objectKey: 'customer_id',
          tenantId: 'tenant_001',
          createdAt: '2023-01-15',
          createdBy: 'admin',
          lastModifiedAt: '2023-06-15',
          lastModifiedBy: 'system'
        },
        {
          configId: '2',
          name: 'Orders',
          label: 'Order transactions with customer references',
          modelName: 'Order',
          tableName: 'orders',
          primaryKey: ['order_id'],
          objectKey: 'order_id',
          tenantId: 'tenant_001',
          createdAt: '2023-02-10',
          createdBy: 'admin',
          lastModifiedAt: '2023-06-18',
          lastModifiedBy: 'system'
        },
        {
          configId: '3',
          name: 'Products',
          label: 'Product catalog with pricing information',
          modelName: 'Product',
          tableName: 'products',
          primaryKey: ['product_id'],
          objectKey: 'product_id',
          tenantId: 'tenant_001',
          createdAt: '2023-01-20',
          createdBy: 'admin',
          lastModifiedAt: '2023-05-30',
          lastModifiedBy: 'system'
        },
        {
          configId: '4',
          name: 'Suppliers',
          label: 'Supplier information and contact details',
          modelName: 'Supplier',
          tableName: 'suppliers',
          primaryKey: ['supplier_id'],
          objectKey: 'supplier_id',
          tenantId: 'tenant_001',
          createdAt: '2023-03-01',
          createdBy: 'admin',
          lastModifiedAt: '2023-06-10',
          lastModifiedBy: 'system'
        },
      ];
      setTables(mockTables);
      setTotalCount(mockTables.length);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  // Function to fetch data sources
  const fetchDataSources = async () => {
    try {
      setDataSourcesLoading(true);
      setDataSourcesError(null);
      const list = await dataSourceService.getAllDataSources();
      setDataSources(list || []);
    } catch (error) {
      console.error('Error fetching data sources:', error);
      setDataSourcesError('Failed to load data sources');
      setDataSources([]);
    } finally {
      setDataSourcesLoading(false);
    }
  };

  useEffect(() => {
    fetchTables();
  }, [currentPage, searchTerm, selectedStatus]);

  useEffect(() => {
    fetchDataSources();
  }, []);

  // Filter tables based on search term and status
  const filteredTables = (tables || []).filter((table) => {
    const matchesSearch = table.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (table.label && table.label.toLowerCase().includes(searchTerm.toLowerCase()));
    // Model name filter
    const matchesModel = selectedModelName === 'all' || (
      table.modelName && table.modelName.toLowerCase() === selectedModelName.toLowerCase()
    );
    // Note: CollectorTableConfig doesn't have status field, so we'll remove status filtering for now
    return matchesSearch && matchesModel;
  });

  // Pagination calculation logic
  const totalFilteredCount = filteredTables.length;
  const calculatedTotalPages = Math.ceil(totalFilteredCount / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedTables = filteredTables.slice(startIndex, endIndex);

  // Update pagination state
  React.useEffect(() => {
    setTotalCount(totalFilteredCount);
    setTotalPages(calculatedTotalPages);
    
    // If current page exceeds total pages, reset to first page
    if (currentPage > calculatedTotalPages && calculatedTotalPages > 0) {
      setCurrentPage(1);
    }
  }, [totalFilteredCount, calculatedTotalPages, currentPage, pageSize]);

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

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'secondary';
      case 'pending':
        return 'warning';
      default:
        return 'default';
    }
  };

  const handleViewTable = (table: CollectorTableConfig) => {
    setSelectedTable(table);
    setViewDialogOpen(true);
  };

  const handleEditTable = (table: CollectorTableConfig) => {
    setSelectedTable(table);
    setEditFormData({
      configId: table.configId,
      name: table.name,
      label: table.label,
      modelName: table.modelName,
      tableName: table.tableName,
      primaryKey: table.primaryKey,
      objectKey: table.objectKey,
      sequenceKey: table.sequenceKey,
      parentName: table.parentName,
      joinKeys: table.joinKeys,
      dependOn: table.dependOn,
      conditions: table.conditions,
      jsonColumns: table.jsonColumns,
      auditColumn: table.auditColumn,
      ignoredColumns: table.ignoredColumns,
      dataSourceId: table.dataSourceId,
      isList: table.isList,
      triggered: table.triggered,
      createdAt: table.createdAt,
      createdBy: table.createdBy,
      lastModifiedAt: table.lastModifiedAt,
      lastModifiedBy: table.lastModifiedBy,
      version: table.version
    });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
      
    if (!selectedTable || !editFormData) return;


    try {
      setLoading(true);
      setError(null);

      // Form validation
      if (!validateForm(editFormData, true)) {
  
        setLoading(false);
        return;
      }

    


      // Call TableService to update table
      const updatedTable = await tableService.updateTable(selectedTable.configId!, editFormData);
      
      // Update local state
      const updatedTables = tables.map(table => 
        table.configId === selectedTable.configId ? updatedTable : table
      );
      setTables(updatedTables);
      
      // Close dialog and reset state
      setEditDialogOpen(false);
      setSelectedTable(null);
      setEditFormData({});
      setSuccessMessage(`Table "${editFormData.name}" updated successfully!`);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Error updating table:', error);
      if (error instanceof TableServiceError) {
        setError(`Failed to update table: ${error.message}`);
      } else {
        setError('Failed to update table. Please try again.');
      }
      
      // In case of error, still perform local update as fallback
      const updatedTables = tables.map(table => 
        table.configId === selectedTable.configId 
          ? { ...table, ...editFormData, lastModifiedAt: new Date().toISOString() }
          : table
      );
      setTables(updatedTables);
      setEditDialogOpen(false);
      setSelectedTable(null);
      setEditFormData({});
    } finally {
      setLoading(false);
    }
  };

  // const handleDeleteTable = async (tableId: string) => {
  //   if (!confirm('Are you sure you want to delete this table? This action cannot be undone.')) {
  //     return;
  //   }

  //   try {
  //     setLoading(true);
  //     setError(null);

  //     // Call TableService to delete table
  //     await tableService.deleteTable(tableId);
      
  //     // Update local state, remove deleted table
  //     const updatedTables = tables.filter(table => table.configId !== tableId);
  //     setTables(updatedTables);
      
  //     // If currently selected table is deleted, clear selection state
  //     if (selectedTable?.configId === tableId) {
  //       setSelectedTable(null);
  //       setViewDialogOpen(false);
  //       setEditDialogOpen(false);
  //     }
  //   } catch (error) {
  //     console.error('Error deleting table:', error);
  //     if (error instanceof TableServiceError) {
  //       setError(`Failed to delete table: ${error.message}`);
  //     } else {
  //       setError('Failed to delete table. Please try again.');
  //     }
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  // Reset create table form
  const resetCreateForm = () => {
    setCreateFormData({
      configId: '',
      name: '',
      label: '',
      modelName: '',
      tableName: '',
      createdBy: '',
      lastModifiedBy: '',
      primaryKey: [],
      objectKey: '',
      sequenceKey: '',
      parentName: '',
      joinKeys: [],
      dependOn: [],
      conditions: [],
      jsonColumns: [],
      auditColumn: '',
      ignoredColumns: [],
      dataSourceId: '',
      isList: false,
      triggered: false
    });
    setFormErrors({});
    setSuccessMessage(null);
  };

  // Validate form data
  const validateForm = (formData: any, isEdit: boolean = false): boolean => {
    const errors: {[key: string]: string} = {};

    // Validate required fields
    if (!formData.name?.trim()) {
      errors.name = 'Name cannot be empty';
    } else if (formData.name.length < 2) {
      errors.name = 'Name must be at least 2 characters';
    } else if (!/^[a-zA-Z0-9_\s-]+$/.test(formData.name)) {
      errors.name = 'Name can only contain letters, numbers, spaces, underscores and hyphens';
    }

    // tableName is optional but if provided should be valid
    if (formData.tableName && !/^[a-zA-Z0-9_]+$/.test(formData.tableName)) {
      errors.tableName = 'Table name can only contain letters, numbers and underscores';
    }

    if (!formData.modelName?.trim()) {
      errors.modelName = 'Model name cannot be empty';
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.modelName)) {
      errors.modelName = 'Model name can only contain letters, numbers and underscores';
    }

    // Validate primary key format if provided
    if (formData.primaryKey && Array.isArray(formData.primaryKey) && formData.primaryKey.length > 0) {
      const invalidKeys = formData.primaryKey.filter((key: string) => !key.trim() || !/^[a-zA-Z0-9_]+$/.test(key));
      if (invalidKeys.length > 0) {
        errors.primaryKey = 'Primary keys can only contain letters, numbers and underscores';
      }
    }

    // Validate object key format if provided
    if (formData.objectKey && !/^[a-zA-Z0-9_]+$/.test(formData.objectKey)) {
      errors.objectKey = 'Object key can only contain letters, numbers and underscores';
    }

    // Validate sequence key format if provided
    if (formData.sequenceKey && !/^[a-zA-Z0-9_]+$/.test(formData.sequenceKey)) {
      errors.sequenceKey = 'Sequence key can only contain letters, numbers and underscores';
    }

    // Validate audit column format if provided
    if (formData.auditColumn && !/^[a-zA-Z0-9_]+$/.test(formData.auditColumn)) {
      errors.auditColumn = 'Audit column can only contain letters, numbers and underscores';
    }

    // Validate ignored columns format if provided
    if (formData.ignoredColumns && Array.isArray(formData.ignoredColumns) && formData.ignoredColumns.length > 0) {
      const invalidColumns = formData.ignoredColumns.filter((col: string) => !col.trim() || !/^[a-zA-Z0-9_]+$/.test(col));
      if (invalidColumns.length > 0) {
        errors.ignoredColumns = 'Ignored columns can only contain letters, numbers and underscores';
      }
    }

    // Validate parent name format if provided
    if (formData.parentName && !/^[a-zA-Z0-9_]+$/.test(formData.parentName)) {
      errors.parentName = 'Parent name can only contain letters, numbers and underscores';
    }

    // Validate data source ID format if provided
    if (formData.dataSourceId && !/^[a-zA-Z0-9_-]+$/.test(formData.dataSourceId)) {
      errors.dataSourceId = 'Data source ID can only contain letters, numbers, underscores and hyphens';
    }

    // Validate complex structures
    if (formData.conditions && Array.isArray(formData.conditions)) {
      formData.conditions.forEach((condition: any, index: number) => {
        if (!condition.field?.trim()) {
          errors[`condition_${index}_field`] = `Condition ${index + 1}: Field is required`;
        }
        if (!condition.operator?.trim()) {
          errors[`condition_${index}_operator`] = `Condition ${index + 1}: Operator is required`;
        }
        if (condition.value === undefined || condition.value === null || condition.value === '') {
          errors[`condition_${index}_value`] = `Condition ${index + 1}: Value is required`;
        }
      });
    }

    if (formData.dependOn && Array.isArray(formData.dependOn)) {
      formData.dependOn.forEach((dep: any, index: number) => {
        if (!dep.table?.trim()) {
          errors[`dependency_${index}_table`] = `Dependency ${index + 1}: Table is required`;
        }
        if (!dep.field?.trim()) {
          errors[`dependency_${index}_field`] = `Dependency ${index + 1}: Field is required`;
        }
      });
    }

    if (formData.jsonColumns && Array.isArray(formData.jsonColumns)) {
      formData.jsonColumns.forEach((col: any, index: number) => {
        if (!col.name?.trim()) {
          errors[`json_column_${index}_name`] = `JSON Column ${index + 1}: Name is required`;
        }
        if (!col.path?.trim()) {
          errors[`json_column_${index}_path`] = `JSON Column ${index + 1}: Path is required`;
        }
      });
    }

    console.log(errors)

    if (isEdit) {
      setEditFormErrors(errors);
    } else {
      setFormErrors(errors);
    }
    
    return Object.keys(errors).length === 0;
  };

  // Handle create table
  const handleCreateTable = async () => {
    try {
      setCreateLoading(true);
      setError(null);

      // Form validation
      if (!validateForm(createFormData, false)) {
        setCreateLoading(false);
        return;
      }

      await tableService.createTable(createFormData);
      
      // Close dialog and refresh data after successful creation
      setCreateDialogOpen(false);
      resetCreateForm();
      setSuccessMessage(`Table "${createFormData.name}" created successfully!`);
      await fetchTables();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      if (err instanceof TableServiceError) {
        setError(`Failed to create table: ${err.message}`);
      } else {
        setError('Unknown error occurred while creating table');
      }
      console.error('Failed to create table:', err);
    } finally {
      setCreateLoading(false);
    }
  };

  // Note: Field management functions removed as CollectorTableConfig doesn't have fields property

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Hero header */}
      <Card className="border-0 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl shadow-md">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-white/20 rounded-xl shadow-md">
                <Database className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Tables</h1>
                <p className="text-indigo-100 mt-1">Manage and configure your data tables</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button 
                className="gap-2 self-start md:self-auto"
                onClick={() => setCreateDialogOpen(true)}
                size="sm"
              >
                <Plus className="h-4 w-4" />
                Add New Table
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info banner */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 flex items-start gap-3">
        <Info className="h-5 w-5 text-indigo-600 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-medium text-indigo-800">Table Management</h3>
          <p className="text-sm text-indigo-700 mt-1">
            Tables represent your data sources that can be configured for extraction. 
            Active tables are currently being used in configurations.
          </p>
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

      <Separator />

      {/* Filters and actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Input 
            placeholder="Search tables..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            className="w-full sm:w-80"
          />
          <Select value={selectedModelName} onValueChange={setSelectedModelName}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filter by model" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Models</SelectItem>
              {modelNames.map((name) => (
                <SelectItem key={name} value={name}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Button 
              variant={selectedStatus === 'all' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => setSelectedStatus('all')}
            >
              All
            </Button>
            <Button 
              variant={selectedStatus === 'active' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => setSelectedStatus('active')}
            >
              Active
            </Button>
            <Button 
              variant={selectedStatus === 'inactive' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => setSelectedStatus('inactive')}
            >
              Inactive
            </Button>
            <Button 
              variant={selectedStatus === 'pending' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => setSelectedStatus('pending')}
            >
              Pending
            </Button>
          </div>
        </div>
        <div className="flex gap-2 w-full sm:w-auto justify-end">
          <Button variant="outline" size="sm" className="gap-1">
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button variant="outline" size="sm" className="gap-1" onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Table list */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="border border-gray-200 shadow-sm rounded-xl overflow-hidden">
              <div className="p-5 animate-pulse">
                <div className="h-5 bg-gray-200 rounded w-1/2 mb-3"></div>
                <div className="h-3 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-full"></div>
                  <div className="h-3 bg-gray-200 rounded w-full"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedTables.length > 0 ? (
            paginatedTables.map((table) => (
              <Card key={table.configId} className="border border-gray-200 shadow-sm rounded-xl overflow-hidden hover:shadow-md transition-shadow duration-200">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-lg font-semibold text-gray-900">{table.name}</CardTitle>
                      {table.label && (
                        <CardDescription className="mt-1 text-sm text-gray-600 line-clamp-2">
                          {table.label}
                        </CardDescription>
                      )}
                    </div>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800 ml-3 flex-shrink-0">
                      {table.triggered ? 'Triggered' : 'Manual'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3 mb-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Model</span>
                      <span className="text-sm font-medium text-gray-900">{table.modelName || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Table</span>
                      <span className="text-sm font-medium text-gray-900">{table.tableName || 'N/A'}</span>
                    </div>
                    {table.primaryKey && table.primaryKey.length > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">Primary Key</span>
                        <span className="text-sm font-medium text-gray-900 truncate ml-2">
                          {table.primaryKey.join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="gap-1"
                      onClick={() => handleViewTable(table)}
                    >
                      <Eye className="h-4 w-4" />
                      View
                    </Button>
                    <Button 
                      variant="default" 
                      size="sm" 
                      className="gap-1"
                      onClick={() => handleEditTable(table)}
                    >
                      <Edit className="h-4 w-4" />
                      Configure
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="col-span-full bg-gray-50 rounded-lg p-8 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <Database className="h-6 w-6 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">No tables found</h3>
              <p className="text-gray-500 mb-4">No tables match your current search criteria.</p>
              <Button onClick={() => { setSearchTerm(''); setSelectedStatus('all'); }}>
                Clear Filters
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Pagination Controls */}
      {totalFilteredCount > 0 && (
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 px-2">
          {/* Pagination Info */}
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>
              Showing {Math.min(startIndex + 1, totalFilteredCount)} - {Math.min(endIndex, totalFilteredCount)} of {totalFilteredCount} items
            </span>
            <div className="flex items-center gap-2">
              <span>Items per page:</span>
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

      {/* View Table Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              View Table Details - {selectedTable?.name}
            </DialogTitle>
            <DialogDescription>
              Inspect the selected table’s configuration, keys, and related settings.
            </DialogDescription>
          </DialogHeader>
          {selectedTable && (
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Table Name</Label>
                  <p className="text-lg font-semibold">{selectedTable.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Config ID</Label>
                  <p className="font-medium text-sm text-gray-600">{selectedTable.configId || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Table Name (DB)</Label>
                  <p className="font-medium">{selectedTable.tableName || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Triggered</Label>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    {selectedTable.triggered ? 'Triggered' : 'Manual'}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Model Name</Label>
                  <p className="font-medium">{selectedTable.modelName || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Parent Name</Label>
                  <p className="font-medium">{selectedTable.parentName || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Version</Label>
                  <p className="font-medium">{selectedTable.version || '1.0'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Type</Label>
                  <p className="font-medium">{selectedTable.isList ? 'List' : 'Single'}</p>
                </div>
              </div>
              
              <div>
                <Label className="text-sm font-medium text-gray-500">Label</Label>
                <p className="mt-1">{selectedTable.label || 'N/A'}</p>
              </div>

              {/* Audit Information */}
              <div>
                <Label className="text-sm font-medium text-gray-500 mb-3 block">Audit Information</Label>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Created At</p>
                    <p className="font-medium">{selectedTable.createdAt || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Created By</p>
                    <p className="font-medium">{selectedTable.createdBy || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Last Modified</p>
                    <p className="font-medium">{selectedTable.lastModifiedAt || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Modified By</p>
                    <p className="font-medium">{selectedTable.lastModifiedBy || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Configuration Details */}
              <div>
                <Label className="text-sm font-medium text-gray-500 mb-3 block">Configuration Details</Label>
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-50 grid grid-cols-3 gap-4 p-3 text-sm font-medium text-gray-700">
                    <div>Property</div>
                    <div>Value</div>
                    <div>Description</div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 p-3 border-t text-sm">
                    <div className="font-medium">Primary Key</div>
                    <div className="text-gray-600">{selectedTable.primaryKey?.join(', ') || 'None'}</div>
                    <div className="text-gray-600">Primary key columns</div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 p-3 border-t text-sm">
                    <div className="font-medium">Object Key</div>
                    <div className="text-gray-600">{selectedTable.objectKey || 'None'}</div>
                    <div className="text-gray-600">Object identifier key</div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 p-3 border-t text-sm">
                    <div className="font-medium">Sequence Key</div>
                    <div className="text-gray-600">{selectedTable.sequenceKey || 'None'}</div>
                    <div className="text-gray-600">Sequence identifier key</div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 p-3 border-t text-sm">
                    <div className="font-medium">Data Source</div>
                    <div className="text-gray-600">{selectedTable.dataSourceId || 'Default'}</div>
                    <div className="text-gray-600">Data source identifier</div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 p-3 border-t text-sm">
                    <div className="font-medium">Audit Column</div>
                    <div className="text-gray-600">{selectedTable.auditColumn || 'None'}</div>
                    <div className="text-gray-600">Column for audit tracking</div>
                  </div>
                  {selectedTable.ignoredColumns && selectedTable.ignoredColumns.length > 0 && (
                    <div className="grid grid-cols-3 gap-4 p-3 border-t text-sm">
                      <div className="font-medium">Ignored Columns</div>
                      <div className="text-gray-600">{selectedTable.ignoredColumns.join(', ')}</div>
                      <div className="text-gray-600">Columns to ignore during processing</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Complex Configurations */}
              {(selectedTable.joinKeys && selectedTable.joinKeys.length > 0) && (
                <div>
                  <Label className="text-sm font-medium text-gray-500 mb-3 block">Join Conditions</Label>
                  <div className="border rounded-lg p-3 bg-gray-50">
                    <p className="text-sm text-gray-600">{selectedTable.joinKeys.length} join condition(s) configured</p>
                  </div>
                </div>
              )}

              {(selectedTable.dependOn && selectedTable.dependOn.length > 0) && (
                <div>
                  <Label className="text-sm font-medium text-gray-500 mb-3 block">Dependencies</Label>
                  <div className="border rounded-lg p-3 bg-gray-50">
                    <p className="text-sm text-gray-600">{selectedTable.dependOn.length} dependenc(y/ies) configured</p>
                  </div>
                </div>
              )}

              {(selectedTable.conditions && selectedTable.conditions.length > 0) && (
                <div>
                  <Label className="text-sm font-medium text-gray-500 mb-3 block">Conditions</Label>
                  <div className="border rounded-lg p-3 bg-gray-50">
                    <p className="text-sm text-gray-600">{selectedTable.conditions.length} condition(s) configured</p>
                  </div>
                </div>
              )}

              {(selectedTable.jsonColumns && selectedTable.jsonColumns.length > 0) && (
                <div>
                  <Label className="text-sm font-medium text-gray-500 mb-3 block">JSON Columns</Label>
                  <div className="border rounded-lg p-3 bg-gray-50">
                    <p className="text-sm text-gray-600">{selectedTable.jsonColumns.length} JSON column(s) configured</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Table Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Edit Table - {selectedTable?.name}
            </DialogTitle>
            <DialogDescription>
              Update table properties and configuration fields, then save changes.
            </DialogDescription>
          </DialogHeader>
          {selectedTable && (
            <div className="space-y-6">
              {/* Basic Information */}
              <div>
                <h3 className="text-lg font-medium mb-4">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-name">Name</Label>
                    <Input
                      id="edit-name"
                      value={editFormData.name || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                      placeholder="Enter display name"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="edit-table-name">Table Name</Label>
                    <Input
                      id="edit-table-name"
                      value={editFormData.tableName || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, tableName: e.target.value })}
                      placeholder="Enter database table name"
                    />
                  </div>

                  <div>
                    <Label htmlFor="edit-model-name">Model Name</Label>
                    <Input
                      id="edit-model-name"
                      value={editFormData.modelName || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, modelName: e.target.value })}
                      placeholder="Enter model name"
                    />
                  </div>

                  <div>
                    <Label htmlFor="edit-parent-name">Parent Name</Label>
                    <Input
                      id="edit-parent-name"
                      value={editFormData.parentName || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, parentName: e.target.value })}
                      placeholder="Enter parent table name"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Label htmlFor="edit-label">Label</Label>
                    <Textarea
                      id="edit-label"
                      value={editFormData.label || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, label: e.target.value })}
                      placeholder="Enter table description"
                      rows={3}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Key Configuration */}
              <div>
                <h3 className="text-lg font-medium mb-4">Key Configuration</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-primary-key">Primary Key</Label>
                    <Input
                      id="edit-primary-key"
                      value={editFormData.primaryKey?.join(', ') || ''}
                      onChange={(e) => setEditFormData({ 
                        ...editFormData, 
                        primaryKey: e.target.value.split(',').map(k => k.trim()).filter(k => k) 
                      })}
                      placeholder="Enter primary keys (comma separated)"
                    />
                  </div>

                  <div>
                    <Label htmlFor="edit-object-key">Object Key</Label>
                    <Input
                      id="edit-object-key"
                      value={editFormData.objectKey || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, objectKey: e.target.value })}
                      placeholder="Enter object key"
                    />
                  </div>

                  <div>
                    <Label htmlFor="edit-sequence-key">Sequence Key</Label>
                    <Input
                      id="edit-sequence-key"
                      value={editFormData.sequenceKey || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, sequenceKey: e.target.value })}
                      placeholder="Enter sequence key"
                    />
                  </div>

                  <div>
                    <Label htmlFor="edit-audit-column">Audit Column</Label>
                    <Input
                      id="edit-audit-column"
                      value={editFormData.auditColumn || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, auditColumn: e.target.value })}
                      placeholder="Enter audit column"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Complex Configuration */}
              <div>
                <h3 className="text-lg font-medium mb-4">Complex Configuration</h3>
                
                {/* Join Keys */}
                <div className="mb-6">
                  <Label className="text-sm font-medium mb-2 block">Join Keys</Label>
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <p className="text-sm text-gray-600 mb-2">Configure join conditions for this table</p>
                    {/* TODO: Add JoinConditionEditor component */}
                    <Textarea
                      placeholder="Enter join keys as JSON (e.g., [{&quot;parentKey&quot;: {&quot;field&quot;: &quot;id&quot;}, &quot;childKey&quot;: {&quot;field&quot;: &quot;parent_id&quot;}}])"
                      value={editFormData.joinKeys ? JSON.stringify(editFormData.joinKeys, null, 2) : ''}
                      onChange={(e) => {
                        try {
                          const parsed = e.target.value ? JSON.parse(e.target.value) : [];
                          setEditFormData(prev => ({ ...prev, joinKeys: parsed }));
                        } catch {
                          // Keep the text value for editing, will validate on save
                        }
                      }}
                      className="min-h-[100px]"
                    />
                  </div>
                </div>

                {/* Dependencies */}
                <div className="mb-6">
                  <Label className="text-sm font-medium mb-2 block">Dependencies</Label>
                  <DependenceEditor
                    dependencies={editFormData.dependOn || []}
                    onChange={(dependencies) => setEditFormData({ ...editFormData, dependOn: dependencies })}
                  />
                </div>

                {/* Conditions */}
                <div className="mb-6">
                  <Label className="text-sm font-medium mb-2 block">Conditions</Label>
                  <ConditionEditor
                    conditions={editFormData.conditions || []}
                    onChange={(conditions) => setEditFormData({ ...editFormData, conditions })}
                  />
                </div>

                {/* JSON Columns */}
                <div className="mb-6">
                  <Label className="text-sm font-medium mb-2 block">JSON Columns</Label>
                  <JsonColumnEditor
                    jsonColumns={editFormData.jsonColumns || []}
                    onChange={(jsonColumns) => setEditFormData({ ...editFormData, jsonColumns })}
                  />
                </div>
              </div>

              <Separator />

              {/* Flags and Data Source */}
              <div>
                <h3 className="text-lg font-medium mb-4">Flags and Data Source</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-data-source-id">Data Source</Label>
                    <Select
                      value={editFormData.dataSourceId || ''}
                      onValueChange={(value) => setEditFormData({ ...editFormData, dataSourceId: value })}
                    >
                      <SelectTrigger id="edit-data-source-id">
                        <SelectValue placeholder="Select data source" />
                      </SelectTrigger>
                      <SelectContent>
                        {dataSources.map((ds) => {
                          const id = ds.dataSourceId ?? ds.id ?? ds.name;
                          const label = ds.name ?? id;
                          return (
                            <SelectItem key={id} value={String(id)}>
                              {label}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="edit-ignored-columns">Ignored Columns</Label>
                    <Input
                      id="edit-ignored-columns"
                      value={editFormData.ignoredColumns?.join(', ') || ''}
                      onChange={(e) => setEditFormData({ 
                        ...editFormData, 
                        ignoredColumns: e.target.value.split(',').map(c => c.trim()).filter(c => c) 
                      })}
                      placeholder="Enter ignored columns (comma separated)"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="edit-is-list"
                      checked={editFormData.isList || false}
                      onCheckedChange={(checked) => setEditFormData({ ...editFormData, isList: checked as boolean })}
                    />
                    <Label htmlFor="edit-is-list">Is List</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="edit-triggered"
                      checked={editFormData.triggered || false}
                      onCheckedChange={(checked) => setEditFormData({ ...editFormData, triggered: checked as boolean })}
                    />
                    <Label htmlFor="edit-triggered">Triggered</Label>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveEdit}>
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {((currentPage - 1) * 10) + 1} to {Math.min(currentPage * 10, totalCount)} of {totalCount} tables
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1 || loading}
            >
              Previous
            </Button>
            <span className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages || loading}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Create Table Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Table</DialogTitle>
            <DialogDescription>
              Provide required information and settings to create a new table.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium border-b pb-2">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={createFormData.name}
                    onChange={(e) => setCreateFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter table name"
                    className={formErrors.name ? "border-red-500" : ""}
                  />
                  {formErrors.name && (
                    <p className="text-sm text-red-600">{formErrors.name}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tableName">Table Name *</Label>
                  <Input
                    id="tableName"
                    value={createFormData.tableName}
                    onChange={(e) => setCreateFormData(prev => ({ ...prev, tableName: e.target.value }))}
                    placeholder="Enter database table name"
                    className={formErrors.tableName ? "border-red-500" : ""}
                  />
                  {formErrors.tableName && (
                    <p className="text-sm text-red-600">{formErrors.tableName}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="modelName">Model Name *</Label>
                  <Input
                    id="modelName"
                    value={createFormData.modelName}
                    onChange={(e) => setCreateFormData(prev => ({ ...prev, modelName: e.target.value }))}
                    placeholder="Enter model name"
                    className={formErrors.modelName ? "border-red-500" : ""}
                  />
                  {formErrors.modelName && (
                    <p className="text-sm text-red-600">{formErrors.modelName}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="parentName">Parent Name</Label>
                  <Input
                    id="parentName"
                    value={createFormData.parentName}
                    onChange={(e) => setCreateFormData(prev => ({ ...prev, parentName: e.target.value }))}
                    placeholder="Enter parent name"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="label">Label</Label>
                <Textarea
                  id="label"
                  value={createFormData.label}
                  onChange={(e) => setCreateFormData(prev => ({ ...prev, label: e.target.value }))}
                  placeholder="Enter table description/label"
                  rows={3}
                />
              </div>
            </div>

            <Separator />

            {/* Key Configuration */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium border-b pb-2">Key Configuration</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="primaryKey">Primary Key</Label>
                  <Input
                    id="primaryKey"
                    value={createFormData.primaryKey?.join(', ') || ''}
                    onChange={(e) => setCreateFormData(prev => ({ 
                      ...prev, 
                      primaryKey: e.target.value.split(',').map(k => k.trim()).filter(k => k) 
                    }))}
                    placeholder="Enter primary keys (comma separated)"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="objectKey">Object Key</Label>
                  <Input
                    id="objectKey"
                    value={createFormData.objectKey}
                    onChange={(e) => setCreateFormData(prev => ({ ...prev, objectKey: e.target.value }))}
                    placeholder="Enter object key"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sequenceKey">Sequence Key</Label>
                  <Input
                    id="sequenceKey"
                    value={createFormData.sequenceKey}
                    onChange={(e) => setCreateFormData(prev => ({ ...prev, sequenceKey: e.target.value }))}
                    placeholder="Enter sequence key"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="auditColumn">Audit Column</Label>
                  <Input
                    id="auditColumn"
                    value={createFormData.auditColumn}
                    onChange={(e) => setCreateFormData(prev => ({ ...prev, auditColumn: e.target.value }))}
                    placeholder="Enter audit column"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Complex Fields */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium border-b pb-2">Complex Configuration</h3>
              
              {/* Join Keys */}
              <div className="space-y-2">
                <Label>Join Keys</Label>
                <Textarea
                  placeholder="Enter join keys as JSON (e.g., [{&quot;parentKey&quot;: {&quot;field&quot;: &quot;id&quot;}, &quot;childKey&quot;: {&quot;field&quot;: &quot;parent_id&quot;}}])"
                  value={createFormData.joinKeys ? JSON.stringify(createFormData.joinKeys, null, 2) : ''}
                  onChange={(e) => {
                    try {
                      const parsed = e.target.value ? JSON.parse(e.target.value) : [];
                      setCreateFormData(prev => ({ ...prev, joinKeys: parsed }));
                    } catch {
                      // Keep the text value for editing, will validate on save
                    }
                  }}
                  className="min-h-[100px]"
                />
              </div>

              {/* Dependencies */}
              <div className="space-y-2">
                <Label>Dependencies</Label>
                <DependenceEditor
                  dependencies={createFormData.dependOn || []}
                  onChange={(dependencies) => setCreateFormData(prev => ({ ...prev, dependOn: dependencies }))}
                />
              </div>

              {/* Conditions */}
              <div className="space-y-2">
                <Label>Conditions</Label>
                <ConditionEditor
                  conditions={createFormData.conditions || []}
                  onChange={(conditions) => setCreateFormData(prev => ({ ...prev, conditions }))}
                />
              </div>

              {/* JSON Columns */}
              <div className="space-y-2">
                <Label>JSON Columns</Label>
                <JsonColumnEditor
                  jsonColumns={createFormData.jsonColumns || []}
                  onChange={(jsonColumns) => setCreateFormData(prev => ({ ...prev, jsonColumns }))}
                />
              </div>
            </div>

            <Separator />

            {/* Flags and Data Source */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium border-b pb-2">Flags and Data Source</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dataSourceId">Data Source</Label>
                  <Select
                    value={createFormData.dataSourceId || ''}
                    onValueChange={(value) => setCreateFormData(prev => ({ ...prev, dataSourceId: value }))}
                  >
                    <SelectTrigger id="dataSourceId">
                      <SelectValue placeholder="Select data source" />
                    </SelectTrigger>
                    <SelectContent>
                      {dataSources.map((ds) => {
                        const id = ds.dataSourceId ?? ds.id ?? ds.name;
                        const label = ds.name ?? id;
                        return (
                          <SelectItem key={id} value={String(id)}>
                            {label}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ignoredColumns">Ignored Columns</Label>
                  <Input
                    id="ignoredColumns"
                    value={createFormData.ignoredColumns?.join(', ') || ''}
                    onChange={(e) => setCreateFormData(prev => ({ 
                      ...prev, 
                      ignoredColumns: e.target.value.split(',').map(c => c.trim()).filter(c => c) 
                    }))}
                    placeholder="Enter ignored columns (comma separated)"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isList"
                    checked={createFormData.isList || false}
                    onCheckedChange={(checked) => setCreateFormData(prev => ({ ...prev, isList: !!checked }))}
                  />
                  <Label htmlFor="isList">Is List</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="triggered"
                    checked={createFormData.triggered || false}
                    onCheckedChange={(checked) => setCreateFormData(prev => ({ ...prev, triggered: !!checked }))}
                  />
                  <Label htmlFor="triggered">Triggered</Label>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setCreateDialogOpen(false);
                  resetCreateForm();
                }}
                disabled={createLoading}
              >
                Cancel
              </Button>
              <Button 
                type="button" 
                onClick={handleCreateTable}
                disabled={createLoading}
              >
                {createLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Table
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Help section */}
      <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Need Help?</h3>
        <p className="text-gray-600 mb-4">
          Learn how to connect and configure tables for optimal data extraction.
        </p>
        
      </div>
    </div>
  );
};

export default Tables;
