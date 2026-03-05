import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Code, FileJson, GitCompare, Calendar, User, Package, AlertCircle, Download, Copy, History, Plus, Minus, Edit } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Customization } from "./model/Customization";

interface CustomizationDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customization: Customization;
}

export function CustomizationDetailDialog({ open, onOpenChange, customization }: CustomizationDetailDialogProps) {
  // Simulated detailed code differences
  const codeDiff = {
    before: `{
  "schema": {
    "user_id": {
      "type": "string",
      "required": true
    },
    "email": {
      "type": "string",
      "format": "email"
    },
    "phone": {
      "type": "string"
    }
  },
  "validation": {
    "rules": ["email_required"]
  }
}`,
    after: `{
  "schema": {
    "user_id": {
      "type": "string",
      "required": true
    },
    "email": {
      "type": "string",
      "format": "email"
    },
    "phone": {
      "type": "string"
    },
    "wechat_id": {
      "type": "string",
      "description": "WeChat Open Platform UnionID"
    },
    "alipay_id": {
      "type": "string",
      "description": "Alipay User ID"
    }
  },
  "validation": {
    "rules": ["email_required", "local_id_required"]
  },
  "localization": {
    "currency": "CNY",
    "timezone": "Asia/Shanghai"
  }
}`
  };

  // Detailed line-by-line differences
  const lineDiff = [
    { line: 1, type: 'unchanged', content: '{' },
    { line: 2, type: 'unchanged', content: '  "schema": {' },
    { line: 3, type: 'unchanged', content: '    "user_id": {' },
    { line: 4, type: 'unchanged', content: '      "type": "string",' },
    { line: 5, type: 'unchanged', content: '      "required": true' },
    { line: 6, type: 'unchanged', content: '    },' },
    { line: 7, type: 'unchanged', content: '    "email": {' },
    { line: 8, type: 'unchanged', content: '      "type": "string",' },
    { line: 9, type: 'unchanged', content: '      "format": "email"' },
    { line: 10, type: 'unchanged', content: '    },' },
    { line: 11, type: 'unchanged', content: '    "phone": {' },
    { line: 12, type: 'unchanged', content: '      "type": "string"' },
    { line: 13, type: 'unchanged', content: '    },' },
    { line: 14, type: 'added', content: '    "wechat_id": {' },
    { line: 15, type: 'added', content: '      "type": "string",' },
    { line: 16, type: 'added', content: '      "description": "WeChat Open Platform UnionID"' },
    { line: 17, type: 'added', content: '    },' },
    { line: 18, type: 'added', content: '    "alipay_id": {' },
    { line: 19, type: 'added', content: '      "type": "string",' },
    { line: 20, type: 'added', content: '      "description": "Alipay User ID"' },
    { line: 21, type: 'added', content: '    }' },
    { line: 22, type: 'unchanged', content: '  },' },
    { line: 23, type: 'unchanged', content: '  "validation": {' },
    { line: 24, type: 'modified', before: '    "rules": ["email_required"]', after: '    "rules": ["email_required", "local_id_required"]' },
    { line: 25, type: 'unchanged', content: '  },' },
    { line: 26, type: 'added', content: '  "localization": {' },
    { line: 27, type: 'added', content: '    "currency": "CNY",' },
    { line: 28, type: 'added', content: '    "timezone": "Asia/Shanghai"' },
    { line: 29, type: 'added', content: '  }' },
    { line: 30, type: 'unchanged', content: '}' },
  ];

  // Change history
  const changeHistory = [
    {
      version: 'v3.0',
      date: '2024-12-15',
      author: 'John Doe',
      changes: 'Add WeChat ID and Alipay ID fields',
      impact: 'high',
    },
    {
      version: 'v2.1',
      date: '2024-11-20',
      author: 'John Doe',
      changes: 'Update validation rules',
      impact: 'medium',
    },
    {
      version: 'v2.0',
      date: '2024-10-05',
      author: 'Jane Smith',
      changes: 'Initial version created',
      impact: 'high',
    },
  ];

  // Impact analysis
  const impactAnalysis = {
    affectedProducts: 3,
    affectedTenants: 1,
    dataVolume: '1.2M records',
    estimatedMigrationTime: '2-3 hours',
    dependencies: [
      'User Authentication Service',
      'Third-party Login Integration',
      'Data Sync Pipeline',
    ],
    risks: [
      'Existing data needs backfilling for new fields',
      'May affect downstream reporting statistics',
      'API documentation needs to be updated',
    ],
  };

  const typeConfig = {
    schema: { label: 'Schema', className: 'bg-blue-100 text-blue-700', icon: Code },
    config: { label: 'Config', className: 'bg-green-100 text-green-700', icon: FileJson },
    transformation: { label: 'Transformation', className: 'bg-purple-100 text-purple-700', icon: GitCompare },
    validation: { label: 'Validation', className: 'bg-orange-100 text-orange-700', icon: AlertCircle },
  };

  const TypeIcon = typeConfig[customization.type].icon;

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
  };

  const handleExportDetail = () => {
    const exportData = {
      customization,
      codeDiff,
      changeHistory,
      impactAnalysis,
      exportedAt: new Date().toISOString(),
    };
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `customization_${customization.id}_detail.json`;
    link.click();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[90vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={`${typeConfig[customization.type].className} p-3 rounded-lg`}>
              <TypeIcon className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-xl">{customization.name}</DialogTitle>
              <DialogDescription className="flex items-center gap-2 mt-1">
                <Badge className={typeConfig[customization.type].className}>
                  {typeConfig[customization.type].label}
                </Badge>
                <span>•</span>
                <span>{customization.id}</span>
              </DialogDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleExportDetail} className="gap-2">
              <Download className="w-4 h-4" />
              Export Details
            </Button>
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="mt-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="diff">Code Diff</TabsTrigger>
            <TabsTrigger value="impact">Impact Analysis</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="metadata">Metadata</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6 mt-4">
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">Description</h3>
              <p className="text-sm text-gray-600">{customization.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <Package className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-500 mb-1">Data Product</p>
                      <p className="font-medium text-gray-900">{customization.dataProduct}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <User className="w-5 h-5 text-green-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-500 mb-1">Tenant Environment</p>
                      <p className="font-medium text-gray-900">{customization.tenant}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-purple-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-500 mb-1">Last Modified</p>
                      <p className="font-medium text-gray-900">{customization.lastModified}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <User className="w-5 h-5 text-orange-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-500 mb-1">Author</p>
                      <p className="font-medium text-gray-900">{customization.author}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Change Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-6">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <Plus className="w-8 h-8 text-green-600 mx-auto mb-2" />
                    <p className="text-3xl font-semibold text-green-700">{customization.diff.added}</p>
                    <p className="text-sm text-green-600 mt-1">Added</p>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <Edit className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                    <p className="text-3xl font-semibold text-blue-700">{customization.diff.modified}</p>
                    <p className="text-sm text-blue-600 mt-1">Modified</p>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <Minus className="w-8 h-8 text-red-600 mx-auto mb-2" />
                    <p className="text-3xl font-semibold text-red-700">{customization.diff.deleted}</p>
                    <p className="text-sm text-red-600 mt-1">Deleted</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Code Diff Tab */}
          <TabsContent value="diff" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Before</CardTitle>
                    <CardDescription>Original Configuration</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleCopyCode(codeDiff.before)} className="gap-2">
                    <Copy className="w-4 h-4" />
                    Copy
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto text-sm font-mono">
                  {codeDiff.before}
                </pre>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">After</CardTitle>
                    <CardDescription>Customized Configuration</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleCopyCode(codeDiff.after)} className="gap-2">
                    <Copy className="w-4 h-4" />
                    Copy
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto text-sm font-mono">
                  {codeDiff.after}
                </pre>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Line-by-Line Comparison</CardTitle>
                <CardDescription>Detailed diff view</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-hidden">
                  {lineDiff.map((line, index) => {
                    if (line.type === 'unchanged') {
                      return (
                        <div key={index} className="flex font-mono text-sm">
                          <span className="w-12 text-center text-gray-400 bg-gray-50 border-r py-1">
                            {line.line}
                          </span>
                          <pre className="flex-1 px-4 py-1 bg-white">{line.content}</pre>
                        </div>
                      );
                    } else if (line.type === 'added') {
                      return (
                        <div key={index} className="flex font-mono text-sm bg-green-50">
                          <span className="w-12 text-center text-gray-400 bg-green-100 border-r py-1">
                            {line.line}
                          </span>
                          <div className="flex-1 px-4 py-1">
                            <Plus className="w-3 h-3 text-green-600 inline mr-2" />
                            <span className="text-green-700">{line.content}</span>
                          </div>
                        </div>
                      );
                    } else if (line.type === 'deleted') {
                      return (
                        <div key={index} className="flex font-mono text-sm bg-red-50">
                          <span className="w-12 text-center text-gray-400 bg-red-100 border-r py-1">
                            {line.line}
                          </span>
                          <div className="flex-1 px-4 py-1">
                            <Minus className="w-3 h-3 text-red-600 inline mr-2" />
                            <span className="text-red-700 line-through">{line.content}</span>
                          </div>
                        </div>
                      );
                    } else if (line.type === 'modified') {
                      return (
                        <div key={index}>
                          <div className="flex font-mono text-sm bg-red-50">
                            <span className="w-12 text-center text-gray-400 bg-red-100 border-r py-1">
                              {line.line}
                            </span>
                            <div className="flex-1 px-4 py-1">
                              <Minus className="w-3 h-3 text-red-600 inline mr-2" />
                              <span className="text-red-700 line-through">{line.before}</span>
                            </div>
                          </div>
                          <div className="flex font-mono text-sm bg-green-50">
                            <span className="w-12 text-center text-gray-400 bg-green-100 border-r py-1">
                              {line.line}
                            </span>
                            <div className="flex-1 px-4 py-1">
                              <Plus className="w-3 h-3 text-green-600 inline mr-2" />
                              <span className="text-green-700">{line.after}</span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Impact Analysis Tab */}
          <TabsContent value="impact" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Impact Scope</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Affected Data Products</span>
                    <span className="font-semibold text-gray-900">{impactAnalysis.affectedProducts}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Affected Tenants</span>
                    <span className="font-semibold text-gray-900">{impactAnalysis.affectedTenants}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Data Volume</span>
                    <span className="font-semibold text-gray-900">{impactAnalysis.dataVolume}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Est. Migration Time</span>
                    <span className="font-semibold text-gray-900">{impactAnalysis.estimatedMigrationTime}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Dependencies</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {impactAnalysis.dependencies.map((dep, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-blue-50 rounded">
                        <Package className="w-4 h-4 text-blue-600" />
                        <span className="text-sm text-blue-900">{dep}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                  Risk Assessment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {impactAnalysis.risks.map((risk, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-yellow-900">{risk}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Migration Suggestions</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-2 list-decimal list-inside text-sm text-gray-700">
                  <li>Perform full regression testing in test environment first</li>
                  <li>Prepare data backfill scripts to handle historical data</li>
                  <li>Update relevant API documentation and usage instructions</li>
                  <li>Notify downstream systems to make corresponding adjustments</li>
                  <li>Develop rollback plan for exceptions</li>
                </ol>
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <History className="w-5 h-5" />
                  Version History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {changeHistory.map((change, index) => (
                    <div key={index} className="relative pl-8 pb-4 border-l-2 border-gray-200 last:border-l-0 last:pb-0">
                      <div className={`absolute -left-2 w-4 h-4 rounded-full ${
                        index === 0 ? 'bg-blue-600' : 'bg-gray-400'
                      }`}></div>
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-medium text-gray-900">{change.version}</h4>
                          <p className="text-sm text-gray-500">{change.date} • {change.author}</p>
                        </div>
                        <Badge variant={
                          change.impact === 'high' ? 'destructive' :
                          change.impact === 'medium' ? 'default' : 'secondary'
                        }>
                          {change.impact === 'high' ? 'High Impact' :
                           change.impact === 'medium' ? 'Medium Impact' : 'Low Impact'}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-700">{change.changes}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Metadata Tab */}
          <TabsContent value="metadata" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Full Metadata</CardTitle>
                <CardDescription>Structured metadata of customization configuration</CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto text-sm font-mono">
{JSON.stringify({
  id: customization.id,
  name: customization.name,
  type: customization.type,
  tenant: customization.tenant,
  dataProduct: customization.dataProduct,
  author: customization.author,
  lastModified: customization.lastModified,
  description: customization.description,
  diff: customization.diff,
  version: changeHistory[0].version,
  status: 'active',
  tags: ['localization', 'schema-extension', 'china-region'],
}, null, 2)}
                </pre>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}