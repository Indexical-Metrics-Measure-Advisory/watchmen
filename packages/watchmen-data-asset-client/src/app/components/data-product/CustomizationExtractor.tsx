import { useState } from "react";
import { Download, Upload, FileJson, Code, GitCompare, Search, Filter, Package } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Checkbox } from "../ui/checkbox";
import { CustomizationDetailDialog } from "./CustomizationDetailDialog";

interface Customization {
  id: string;
  name: string;
  type: 'schema' | 'config' | 'transformation' | 'validation';
  tenant: string;
  dataProduct: string;
  lastModified: string;
  author: string;
  description: string;
  diff: {
    added: number;
    modified: number;
    deleted: number;
  };
  selected?: boolean;
}

export function CustomizationExtractor() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTenant, setSelectedTenant] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedCustomization, setSelectedCustomization] = useState<Customization | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  
  const [customizations, setCustomizations] = useState<Customization[]>([
    {
      id: 'cust-001',
      name: 'User Data Schema Extension',
      type: 'schema',
      tenant: 'China Production',
      dataProduct: 'User Behavior Data Product',
      lastModified: '2024-12-15',
      author: 'John Doe',
      description: 'Add WeChat ID and Alipay ID fields',
      diff: { added: 2, modified: 1, deleted: 0 },
      selected: false,
    },
    {
      id: 'cust-002',
      name: 'Order Amount Localization',
      type: 'transformation',
      tenant: 'China Production',
      dataProduct: 'Sales Analytics Data Product',
      lastModified: '2024-12-14',
      author: 'Jane Smith',
      description: 'CNY currency conversion and formatting',
      diff: { added: 1, modified: 3, deleted: 0 },
      selected: false,
    },
    {
      id: 'cust-003',
      name: 'GDPR Compliance Validation',
      type: 'validation',
      tenant: 'Europe Production',
      dataProduct: 'User Behavior Data Product',
      lastModified: '2024-12-13',
      author: 'John Smith',
      description: 'Add GDPR data protection validation rules',
      diff: { added: 5, modified: 2, deleted: 1 },
      selected: false,
    },
    {
      id: 'cust-004',
      name: 'Data Retention Policy',
      type: 'config',
      tenant: 'US Production',
      dataProduct: 'Customer Profile Data Product',
      lastModified: '2024-12-12',
      author: 'Sarah Johnson',
      description: 'Set 90-day data retention period',
      diff: { added: 1, modified: 1, deleted: 0 },
      selected: false,
    },
    {
      id: 'cust-005',
      name: 'Japanese Field Mapping',
      type: 'transformation',
      tenant: 'Japan Production',
      dataProduct: 'Marketing Campaign Data Product',
      lastModified: '2024-12-10',
      author: 'Taro Tanaka',
      description: 'Japanese localization field mapping',
      diff: { added: 8, modified: 0, deleted: 0 },
      selected: false,
    },
  ]);

  const typeConfig = {
    schema: { label: 'Schema', className: 'bg-blue-100 text-blue-700', icon: Code },
    config: { label: 'Config', className: 'bg-green-100 text-green-700', icon: FileJson },
    transformation: { label: 'Transformation', className: 'bg-purple-100 text-purple-700', icon: GitCompare },
    validation: { label: 'Validation', className: 'bg-orange-100 text-orange-700', icon: Filter },
  };

  const tenants = ['all', 'China Production', 'US Production', 'Europe Production', 'Japan Production'];

  const filteredCustomizations = customizations.filter((cust) => {
    const matchesSearch = cust.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         cust.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTenant = selectedTenant === 'all' || cust.tenant === selectedTenant;
    const matchesType = selectedType === 'all' || cust.type === selectedType;
    return matchesSearch && matchesTenant && matchesType;
  });

  const selectedCount = customizations.filter(c => c.selected).length;

  const handleSelectAll = (checked: boolean) => {
    setCustomizations(customizations.map(c => ({ ...c, selected: checked })));
  };

  const handleSelect = (id: string, checked: boolean) => {
    setCustomizations(customizations.map(c => 
      c.id === id ? { ...c, selected: checked } : c
    ));
  };

  const handleExtractSelected = () => {
    const selected = customizations.filter(c => c.selected);
    const extractData = {
      timestamp: new Date().toISOString(),
      count: selected.length,
      customizations: selected,
    };
    const dataStr = JSON.stringify(extractData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `customizations_${Date.now()}.json`;
    link.click();
  };

  const handleViewDetail = (customization: Customization) => {
    setSelectedCustomization(customization);
    setIsDetailDialogOpen(true);
  };

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Customization Extractor</h2>
          <p className="text-gray-500 mt-1">Extract and manage tenant customization configurations</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2">
            <Upload className="w-4 h-4" />
            Import Customization
          </Button>
          <Button 
            className="gap-2"
            disabled={selectedCount === 0}
            onClick={handleExtractSelected}
          >
            <Download className="w-4 h-4" />
            Export Selected ({selectedCount})
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Customizations</p>
                <p className="text-3xl font-semibold mt-2">{customizations.length}</p>
              </div>
              <div className="bg-blue-100 text-blue-600 p-3 rounded-lg">
                <Package className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">Schema Changes</p>
                <p className="text-3xl font-semibold mt-2">
                  {customizations.filter(c => c.type === 'schema').length}
                </p>
              </div>
              <div className="bg-purple-100 text-purple-600 p-3 rounded-lg">
                <Code className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">Transformations</p>
                <p className="text-3xl font-semibold mt-2">
                  {customizations.filter(c => c.type === 'transformation').length}
                </p>
              </div>
              <div className="bg-green-100 text-green-600 p-3 rounded-lg">
                <GitCompare className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">Validation Rules</p>
                <p className="text-3xl font-semibold mt-2">
                  {customizations.filter(c => c.type === 'validation').length}
                </p>
              </div>
              <div className="bg-orange-100 text-orange-600 p-3 rounded-lg">
                <Filter className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Customization List</CardTitle>
              <CardDescription>View and manage all customization configurations</CardDescription>
            </div>
            <div className="flex gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search customizations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Select value={selectedTenant} onValueChange={setSelectedTenant}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select Tenant" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tenants</SelectItem>
                  {tenants.filter(t => t !== 'all').map(tenant => (
                    <SelectItem key={tenant} value={tenant}>{tenant}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="schema">Schema</SelectItem>
                  <SelectItem value="config">Config</SelectItem>
                  <SelectItem value="transformation">Transformation</SelectItem>
                  <SelectItem value="validation">Validation</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Select All */}
            <div className="flex items-center gap-2 pb-3 border-b">
              <Checkbox
                checked={customizations.length > 0 && customizations.every(c => c.selected)}
                onCheckedChange={handleSelectAll}
              />
              <span className="text-sm text-gray-600">Select All</span>
              {selectedCount > 0 && (
                <Badge variant="secondary">{selectedCount} selected</Badge>
              )}
            </div>

            {/* Customization List */}
            {filteredCustomizations.map((cust) => {
              const TypeIcon = typeConfig[cust.type].icon;
              return (
                <div key={cust.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start gap-4">
                    <Checkbox
                      checked={cust.selected}
                      onCheckedChange={(checked) => handleSelect(cust.id, checked as boolean)}
                      className="mt-1"
                    />
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`${typeConfig[cust.type].className} p-2 rounded`}>
                          <TypeIcon className="w-4 h-4" />
                        </div>
                        <h4 className="font-medium text-gray-900">{cust.name}</h4>
                        <Badge className={typeConfig[cust.type].className}>
                          {typeConfig[cust.type].label}
                        </Badge>
                      </div>

                      <p className="text-sm text-gray-600 mb-3">{cust.description}</p>

                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm mb-3">
                        <div>
                          <span className="text-gray-500">Tenant: </span>
                          <span className="text-gray-900">{cust.tenant}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Data Product: </span>
                          <span className="text-gray-900">{cust.dataProduct}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Last Modified: </span>
                          <span className="text-gray-900">{cust.lastModified}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Author: </span>
                          <span className="text-gray-900">{cust.author}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-sm">
                          <Badge variant="outline" className="bg-green-50 text-green-700">
                            +{cust.diff.added}
                          </Badge>
                          <Badge variant="outline" className="bg-blue-50 text-blue-700">
                            ~{cust.diff.modified}
                          </Badge>
                          <Badge variant="outline" className="bg-red-50 text-red-700">
                            -{cust.diff.deleted}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <Button variant="outline" size="sm" onClick={() => handleViewDetail(cust)}>
                      View Details
                    </Button>
                  </div>
                </div>
              );
            })}

            {filteredCustomizations.length === 0 && (
              <div className="text-center py-12">
                <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No matching customizations found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      {selectedCustomization && (
        <CustomizationDetailDialog
          open={isDetailDialogOpen}
          onOpenChange={setIsDetailDialogOpen}
          customization={selectedCustomization}
        />
      )}
    </div>
  );
}
