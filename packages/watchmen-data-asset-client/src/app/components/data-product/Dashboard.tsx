import { Package, CheckCircle, AlertCircle, Clock, TrendingUp, Users, Database, FileJson } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";

export function Dashboard() {
  const stats = [
    {
      title: 'Total Data Products',
      value: '48',
      change: '+6 this month',
      icon: Package,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Production',
      value: '32',
      change: '66.7%',
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'In Development',
      value: '12',
      change: '25%',
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
    },
    {
      title: 'Needs Attention',
      value: '4',
      change: '8.3%',
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
    },
  ];

  const recentProducts = [
    {
      name: 'User Behavior Data Product',
      version: 'v2.1.0',
      status: 'production',
      quality: 98,
      owner: 'Data Team',
      consumers: 12,
    },
    {
      name: 'Sales Analytics Data Product',
      version: 'v1.5.2',
      status: 'production',
      quality: 95,
      owner: 'Business Team',
      consumers: 8,
    },
    {
      name: 'Customer Profile Data Product',
      version: 'v3.0.0-beta',
      status: 'development',
      quality: 87,
      owner: 'Analytics Team',
      consumers: 3,
    },
  ];

  const qualityMetrics = [
    { name: 'Completeness', value: 96, color: 'bg-green-600' },
    { name: 'Accuracy', value: 94, color: 'bg-blue-600' },
    { name: 'Timeliness', value: 91, color: 'bg-yellow-600' },
    { name: 'Consistency', value: 88, color: 'bg-orange-600' },
  ];

  const statusConfig: Record<string, { label: string; className: string }> = {
    production: { label: 'Production', className: 'bg-green-100 text-green-700' },
    development: { label: 'Development', className: 'bg-yellow-100 text-yellow-700' },
    deprecated: { label: 'Deprecated', className: 'bg-gray-100 text-gray-700' },
  };

  return (
    <div className="p-8 space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Data Product Overview</h2>
        <p className="text-slate-500 mt-2 text-lg">Data product management based on Open Data Product Specification</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">{stat.title}</p>
                    <p className="text-3xl font-bold text-slate-900 mt-2">{stat.value}</p>
                    <p className="text-sm text-slate-600 mt-2 font-medium">{stat.change}</p>
                  </div>
                  <div className={`${stat.bgColor} ${stat.color} p-3 rounded-xl`}>
                    <Icon className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl text-slate-900">Popular Data Products</CardTitle>
            <CardDescription className="text-slate-500">Most accessed data products</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentProducts.map((product, index) => (
                <div key={index} className="flex items-start gap-4 pb-4 border-b border-slate-100 last:border-b-0 last:pb-0">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white flex-shrink-0 shadow-sm">
                    <Package className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-slate-900 truncate">{product.name}</h4>
                      <Badge variant="outline" className="text-xs flex-shrink-0 border-slate-200 text-slate-500">{product.version}</Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-500 mb-2">
                      <Badge className={`${statusConfig[product.status].className} border-0 px-2 py-0.5`}>
                        {statusConfig[product.status].label}
                      </Badge>
                      <span className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" />
                        {product.consumers} consumers
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-emerald-500 rounded-full" 
                          style={{ width: `${product.quality}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-slate-600 font-bold">{product.quality}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl text-slate-900">Overall Quality Score</CardTitle>
            <CardDescription className="text-slate-500">Data product quality dimension analysis</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {qualityMetrics.map((metric) => (
                <div key={metric.name}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700">{metric.name}</span>
                    <span className="text-sm font-bold text-slate-900">{metric.value}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${metric.color} rounded-full transition-all`} 
                      style={{ width: `${metric.value}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 p-4 bg-blue-50/50 border border-blue-100 rounded-xl">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-semibold text-blue-900">Overall Score</span>
              </div>
              <p className="text-3xl font-bold text-blue-900">92.25%</p>
              <p className="text-xs text-blue-700 mt-1 font-medium">Meets data product quality standards</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-slate-900">
              <Database className="w-5 h-5 text-slate-500" />
              Data Components
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg transition-colors">
                <span className="text-sm text-slate-600">Datasets</span>
                <span className="font-bold text-slate-900">156</span>
              </div>
              <div className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg transition-colors">
                <span className="text-sm text-slate-600">API Endpoints</span>
                <span className="font-bold text-slate-900">89</span>
              </div>
              <div className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg transition-colors">
                <span className="text-sm text-slate-600">File Resources</span>
                <span className="font-bold text-slate-900">234</span>
              </div>
              <div className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg transition-colors">
                <span className="text-sm text-slate-600">Streaming Data</span>
                <span className="font-bold text-slate-900">45</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-slate-900">
              <Users className="w-5 h-5 text-slate-500" />
              Consumer Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg transition-colors">
                <span className="text-sm text-slate-600">Internal Teams</span>
                <span className="font-bold text-slate-900">24</span>
              </div>
              <div className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg transition-colors">
                <span className="text-sm text-slate-600">External Partners</span>
                <span className="font-bold text-slate-900">8</span>
              </div>
              <div className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg transition-colors">
                <span className="text-sm text-slate-600">API Calls</span>
                <span className="font-bold text-slate-900">1.2M</span>
              </div>
              <div className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg transition-colors">
                <span className="text-sm text-slate-600">Data Downloads</span>
                <span className="font-bold text-slate-900">456GB</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-slate-900">
              <FileJson className="w-5 h-5 text-slate-500" />
              Compliance Check
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg transition-colors">
                <span className="text-sm text-slate-600">ODPS Specification</span>
                <Badge className="bg-emerald-100 text-emerald-700 border-0 hover:bg-emerald-200">Passed</Badge>
              </div>
              <div className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg transition-colors">
                <span className="text-sm text-slate-600">Metadata Integrity</span>
                <Badge className="bg-emerald-100 text-emerald-700 border-0 hover:bg-emerald-200">Passed</Badge>
              </div>
              <div className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg transition-colors">
                <span className="text-sm text-slate-600">SLA Definition</span>
                <Badge className="bg-amber-100 text-amber-700 border-0 hover:bg-amber-200">Partial</Badge>
              </div>
              <div className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg transition-colors">
                <span className="text-sm text-slate-600">Access Control</span>
                <Badge className="bg-emerald-100 text-emerald-700 border-0 hover:bg-emerald-200">Passed</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
