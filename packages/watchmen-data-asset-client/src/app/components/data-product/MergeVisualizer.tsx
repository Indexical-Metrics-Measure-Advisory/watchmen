import { useState } from "react";
import { GitMerge, ChevronRight, Plus, Minus, Edit, AlertTriangle, CheckCircle, Copy } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Label } from "../ui/label";

interface DiffLine {
  type: 'unchanged' | 'added' | 'removed' | 'modified' | 'conflict';
  base?: string;
  source?: string;
  target?: string;
  lineNumber: number;
  conflictResolution?: 'source' | 'target' | 'custom';
}

export function MergeVisualizer() {
  const [sourceTenant, setSourceTenant] = useState('tenant-cn-001');
  const [targetTenant, setTargetTenant] = useState('tenant-us-001');
  const [selectedProduct, setSelectedProduct] = useState('dp-001');
  const [mergeMode, setMergeMode] = useState<'auto' | 'manual'>('auto');

  // Simulated diff data
  const [diffData, setDiffData] = useState<DiffLine[]>([
    { type: 'unchanged', base: '  "version": "2.1.0",', lineNumber: 1 },
    { type: 'unchanged', base: '  "name": "User Behavior Data Product",', lineNumber: 2 },
    { type: 'modified', base: '  "description": "User Behavior Data",', source: '  "description": "Includes WeChat and Alipay user behavior data",', target: '  "description": "User behavior analytics data",', lineNumber: 3 },
    { type: 'unchanged', base: '  "schema": {', lineNumber: 4 },
    { type: 'added', source: '    "wechat_id": "string",', lineNumber: 5 },
    { type: 'added', source: '    "alipay_id": "string",', lineNumber: 6 },
    { type: 'unchanged', base: '    "user_id": "string",', lineNumber: 7 },
    { type: 'conflict', base: '    "currency": "USD",', source: '    "currency": "CNY",', target: '    "currency": "USD",', lineNumber: 8, conflictResolution: 'source' },
    { type: 'removed', target: '    "legacy_field": "string",', lineNumber: 9 },
    { type: 'unchanged', base: '  }', lineNumber: 10 },
  ]);

  const tenants = [
    { id: 'tenant-cn-001', name: 'China Production Environment' },
    { id: 'tenant-us-001', name: 'US Production Environment' },
    { id: 'tenant-eu-001', name: 'Europe Production Environment' },
  ];

  const products = [
    { id: 'dp-001', name: 'User Behavior Data Product' },
    { id: 'dp-002', name: 'Sales Analytics Data Product' },
  ];

  const stats = {
    total: diffData.length,
    unchanged: diffData.filter(d => d.type === 'unchanged').length,
    added: diffData.filter(d => d.type === 'added').length,
    removed: diffData.filter(d => d.type === 'removed').length,
    modified: diffData.filter(d => d.type === 'modified').length,
    conflicts: diffData.filter(d => d.type === 'conflict').length,
  };

  const handleConflictResolution = (lineNumber: number, resolution: 'source' | 'target') => {
    setDiffData(diffData.map(line => 
      line.lineNumber === lineNumber && line.type === 'conflict'
        ? { ...line, conflictResolution: resolution }
        : line
    ));
  };

  const handleApplyMerge = () => {
    alert('Merge applied! In actual application, the merge result will be saved to the target tenant.');
  };

  const renderDiffLine = (line: DiffLine) => {
    const baseClasses = "font-mono text-sm p-2 border-l-4";
    
    switch (line.type) {
      case 'unchanged':
        return (
          <div key={line.lineNumber} className={`${baseClasses} border-l-gray-300 bg-white`}>
            <span className="text-gray-400 w-12 inline-block">{line.lineNumber}</span>
            <span className="text-gray-700">{line.base}</span>
          </div>
        );
      
      case 'added':
        return (
          <div key={line.lineNumber} className={`${baseClasses} border-l-green-500 bg-green-50`}>
            <span className="text-gray-400 w-12 inline-block">{line.lineNumber}</span>
            <Plus className="w-4 h-4 text-green-600 inline mr-2" />
            <span className="text-green-700">{line.source}</span>
          </div>
        );
      
      case 'removed':
        return (
          <div key={line.lineNumber} className={`${baseClasses} border-l-red-500 bg-red-50`}>
            <span className="text-gray-400 w-12 inline-block">{line.lineNumber}</span>
            <Minus className="w-4 h-4 text-red-600 inline mr-2" />
            <span className="text-red-700 line-through">{line.target}</span>
          </div>
        );
      
      case 'modified':
        return (
          <div key={line.lineNumber} className="border-l-4 border-l-blue-500">
            <div className="bg-red-50 font-mono text-sm p-2">
              <span className="text-gray-400 w-12 inline-block">{line.lineNumber}</span>
              <Minus className="w-4 h-4 text-red-600 inline mr-2" />
              <span className="text-red-700 line-through">{line.base}</span>
            </div>
            <div className="bg-green-50 font-mono text-sm p-2">
              <span className="text-gray-400 w-12 inline-block">{line.lineNumber}</span>
              <Plus className="w-4 h-4 text-green-600 inline mr-2" />
              <span className="text-green-700">{line.source || line.target}</span>
            </div>
          </div>
        );
      
      case 'conflict':
        return (
          <div key={line.lineNumber} className="border-l-4 border-l-yellow-500 bg-yellow-50 p-4 mb-2">
            <div className="flex items-start gap-3 mb-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-yellow-900 mb-2">Merge Conflict (Line {line.lineNumber})</h4>
                <div className="space-y-3">
                  <div className="border rounded-lg p-3 bg-white">
                    <div className="flex items-start gap-2 mb-2">
                      <input
                        type="radio"
                        name={`conflict-${line.lineNumber}`}
                        checked={line.conflictResolution === 'source'}
                        onChange={() => handleConflictResolution(line.lineNumber, 'source')}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <Label className="text-sm font-medium text-gray-700 mb-1 block">
                          Source Tenant ({tenants.find(t => t.id === sourceTenant)?.name})
                        </Label>
                        <code className="text-sm text-green-700 bg-green-50 px-2 py-1 rounded">
                          {line.source}
                        </code>
                      </div>
                    </div>
                  </div>
                  
                  <div className="border rounded-lg p-3 bg-white">
                    <div className="flex items-start gap-2">
                      <input
                        type="radio"
                        name={`conflict-${line.lineNumber}`}
                        checked={line.conflictResolution === 'target'}
                        onChange={() => handleConflictResolution(line.lineNumber, 'target')}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <Label className="text-sm font-medium text-gray-700 mb-1 block">
                          Target Tenant ({tenants.find(t => t.id === targetTenant)?.name})
                        </Label>
                        <code className="text-sm text-blue-700 bg-blue-50 px-2 py-1 rounded">
                          {line.target}
                        </code>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Merge Visualization</h2>
          <p className="text-gray-500 mt-1">Compare and merge customizations across different tenants</p>
        </div>
        <Button onClick={handleApplyMerge} className="gap-2">
          <GitMerge className="w-4 h-4" />
          Apply Merge
        </Button>
      </div>

      {/* Selectors */}
      <Card>
        <CardHeader>
          <CardTitle>Merge Configuration</CardTitle>
          <CardDescription>Select tenants and data products to compare and merge</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div className="space-y-2">
                <Label>Source Tenant</Label>
                <Select value={sourceTenant} onValueChange={setSourceTenant}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {tenants.map(tenant => (
                      <SelectItem key={tenant.id} value={tenant.id}>
                        {tenant.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-center pb-2">
                <div className="flex items-center gap-2">
                  <ChevronRight className="w-6 h-6 text-gray-400" />
                  <GitMerge className="w-6 h-6 text-blue-600" />
                  <ChevronRight className="w-6 h-6 text-gray-400" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Target Tenant</Label>
                <Select value={targetTenant} onValueChange={setTargetTenant}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {tenants.map(tenant => (
                      <SelectItem key={tenant.id} value={tenant.id}>
                        {tenant.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data Product</Label>
                <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map(product => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Merge Mode</Label>
                <RadioGroup value={mergeMode} onValueChange={(value: any) => setMergeMode(value)}>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="auto" id="auto" />
                      <Label htmlFor="auto" className="font-normal cursor-pointer">
                        Auto Merge
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="manual" id="manual" />
                      <Label htmlFor="manual" className="font-normal cursor-pointer">
                        Manual Conflict Resolution
                      </Label>
                    </div>
                  </div>
                </RadioGroup>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
            <p className="text-sm text-gray-500 mt-1">Total Lines</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-semibold text-gray-500">{stats.unchanged}</p>
            <p className="text-sm text-gray-500 mt-1">Unchanged</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-semibold text-green-600">{stats.added}</p>
            <p className="text-sm text-gray-500 mt-1">Added</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-semibold text-red-600">{stats.removed}</p>
            <p className="text-sm text-gray-500 mt-1">Removed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-semibold text-blue-600">{stats.modified}</p>
            <p className="text-sm text-gray-500 mt-1">Modified</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-semibold text-yellow-600">{stats.conflicts}</p>
            <p className="text-sm text-gray-500 mt-1">Conflicts</p>
          </CardContent>
        </Card>
      </div>

      {/* Diff View */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Diff Comparison</CardTitle>
              <CardDescription>
                View configuration differences between source and target tenants
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline" className="gap-1">
                <Plus className="w-3 h-3" />
                Added
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Minus className="w-3 h-3" />
                Removed
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Edit className="w-3 h-3" />
                Modified
              </Badge>
              <Badge variant="outline" className="gap-1">
                <AlertTriangle className="w-3 h-3" />
                Conflicts
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="unified" className="space-y-4">
            <TabsList>
              <TabsTrigger value="unified">Unified View</TabsTrigger>
              <TabsTrigger value="sidebyside">Side-by-Side</TabsTrigger>
            </TabsList>

            <TabsContent value="unified" className="space-y-1">
              <div className="border rounded-lg overflow-hidden bg-white">
                {diffData.map(line => renderDiffLine(line))}
              </div>
            </TabsContent>

            <TabsContent value="sidebyside">
              <div className="grid grid-cols-2 gap-4">
                {/* Source Tenant */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">
                      Source: {tenants.find(t => t.id === sourceTenant)?.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    {diffData.map((line, idx) => (
                      <div
                        key={idx}
                        className={`font-mono text-sm p-2 ${
                          line.type === 'added' ? 'bg-green-50 text-green-700' :
                          line.type === 'modified' ? 'bg-blue-50 text-blue-700' :
                          'bg-white text-gray-700'
                        }`}
                      >
                        <span className="text-gray-400 w-8 inline-block">{line.lineNumber}</span>
                        {line.source || line.base || ''}
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Target Tenant */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">
                      Target: {tenants.find(t => t.id === targetTenant)?.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    {diffData.map((line, idx) => (
                      <div
                        key={idx}
                        className={`font-mono text-sm p-2 ${
                          line.type === 'removed' ? 'bg-red-50 text-red-700 line-through' :
                          line.type === 'conflict' ? 'bg-yellow-50 text-yellow-700' :
                          'bg-white text-gray-700'
                        }`}
                      >
                        <span className="text-gray-400 w-8 inline-block">{line.lineNumber}</span>
                        {line.target || line.base || ''}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>

          {/* Merge Preview */}
          {stats.conflicts > 0 && (
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-yellow-900 mb-1">
                    Detected {stats.conflicts} merge conflicts
                  </h4>
                  <p className="text-sm text-yellow-700">
                    Please resolve all conflicts manually before applying the merge. Select the version to keep.
                  </p>
                </div>
              </div>
            </div>
          )}

          {stats.conflicts === 0 && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-green-900 mb-1">
                    No Merge Conflicts
                  </h4>
                  <p className="text-sm text-green-700">
                    All changes can be automatically merged. Click 'Apply Merge' to complete.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
