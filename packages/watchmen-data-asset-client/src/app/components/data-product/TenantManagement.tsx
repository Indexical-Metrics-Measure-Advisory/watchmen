import { useState } from "react";
import { Globe, Server, CheckCircle, XCircle, RefreshCw, Settings, Download, Plus, Database } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";

interface Tenant {
  id: string;
  name: string;
  region: string;
  country: string;
  environment: 'production' | 'staging' | 'development';
  status: 'connected' | 'disconnected' | 'error';
  apiEndpoint: string;
  lastSync: string;
  dataProducts: number;
  customizations: number;
}

export function TenantManagement() {
  const [tenants, setTenants] = useState<Tenant[]>([
    {
      id: 'tenant-cn-prod',
      name: 'China Production',
      region: 'Asia Pacific',
      country: 'China',
      environment: 'production',
      status: 'connected',
      apiEndpoint: 'https://api-cn.example.com',
      lastSync: '2024-12-16 15:30',
      dataProducts: 45,
      customizations: 23,
    },
    {
      id: 'tenant-us-prod',
      name: 'US Production',
      region: 'North America',
      country: 'United States',
      environment: 'production',
      status: 'connected',
      apiEndpoint: 'https://api-us.example.com',
      lastSync: '2024-12-16 15:28',
      dataProducts: 38,
      customizations: 12,
    },
    {
      id: 'tenant-eu-prod',
      name: 'Europe Production',
      region: 'Europe',
      country: 'Germany',
      environment: 'production',
      status: 'connected',
      apiEndpoint: 'https://api-eu.example.com',
      lastSync: '2024-12-16 15:25',
      dataProducts: 42,
      customizations: 18,
    },
    {
      id: 'tenant-jp-prod',
      name: 'Japan Production',
      region: 'Asia Pacific',
      country: 'Japan',
      environment: 'production',
      status: 'connected',
      apiEndpoint: 'https://api-jp.example.com',
      lastSync: '2024-12-16 15:20',
      dataProducts: 35,
      customizations: 15,
    },
    {
      id: 'tenant-sg-staging',
      name: 'Singapore Staging',
      region: 'Asia Pacific',
      country: 'Singapore',
      environment: 'staging',
      status: 'disconnected',
      apiEndpoint: 'https://api-sg-staging.example.com',
      lastSync: '2024-12-15 10:15',
      dataProducts: 28,
      customizations: 8,
    },
  ]);

  const statusConfig: Record<string, { label: string; className: string; icon: any }> = {
    connected: {
      label: 'Connected',
      className: 'bg-green-100 text-green-700',
      icon: CheckCircle,
    },
    disconnected: {
      label: 'Disconnected',
      className: 'bg-gray-100 text-gray-700',
      icon: XCircle,
    },
    error: {
      label: 'Error',
      className: 'bg-red-100 text-red-700',
      icon: XCircle,
    },
  };

  const environmentConfig: Record<string, { label: string; className: string }> = {
    production: { label: 'Production', className: 'bg-blue-100 text-blue-700' },
    staging: { label: 'Staging', className: 'bg-yellow-100 text-yellow-700' },
    development: { label: 'Development', className: 'bg-purple-100 text-purple-700' },
  };

  const totalTenants = tenants.length;
  const connectedTenants = tenants.filter(t => t.status === 'connected').length;
  const totalDataProducts = tenants.reduce((sum, t) => sum + t.dataProducts, 0);
  const totalCustomizations = tenants.reduce((sum, t) => sum + t.customizations, 0);

  const handleSync = (tenantId: string) => {
    setTenants(tenants.map(t => 
      t.id === tenantId 
        ? { ...t, lastSync: new Date().toLocaleString('en-US', { 
            year: 'numeric',
            month: '2-digit', 
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          }).replace(',', '') }
        : t
    ));
  };

  const handleConnect = (tenantId: string) => {
    setTenants(tenants.map(t => 
      t.id === tenantId ? { ...t, status: 'connected' as const } : t
    ));
  };

  const handleDisconnect = (tenantId: string) => {
    setTenants(tenants.map(t => 
      t.id === tenantId ? { ...t, status: 'disconnected' as const } : t
    ));
  };

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Tenant Management</h2>
          <p className="text-gray-500 mt-1">Manage global tenant environment connections</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Export Config
          </Button>
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Add Tenant
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Tenants</p>
                <p className="text-3xl font-semibold mt-2">{totalTenants}</p>
                <p className="text-sm text-gray-600 mt-2">Across all regions</p>
              </div>
              <div className="bg-blue-100 text-blue-600 p-3 rounded-lg">
                <Globe className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">Connected</p>
                <p className="text-3xl font-semibold mt-2">{connectedTenants}</p>
                <p className="text-sm text-green-600 mt-2">
                  {((connectedTenants / totalTenants) * 100).toFixed(0)}% uptime
                </p>
              </div>
              <div className="bg-green-100 text-green-600 p-3 rounded-lg">
                <CheckCircle className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">Data Products</p>
                <p className="text-3xl font-semibold mt-2">{totalDataProducts}</p>
                <p className="text-sm text-gray-600 mt-2">Total across tenants</p>
              </div>
              <div className="bg-purple-100 text-purple-600 p-3 rounded-lg">
                <Database className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">Customizations</p>
                <p className="text-3xl font-semibold mt-2">{totalCustomizations}</p>
                <p className="text-sm text-gray-600 mt-2">Region-specific</p>
              </div>
              <div className="bg-orange-100 text-orange-600 p-3 rounded-lg">
                <Settings className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all" className="space-y-6">
        <TabsList>
          <TabsTrigger value="all">All Tenants</TabsTrigger>
          <TabsTrigger value="production">Production</TabsTrigger>
          <TabsTrigger value="staging">Staging</TabsTrigger>
          <TabsTrigger value="development">Development</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {tenants.map((tenant) => {
            const StatusIcon = statusConfig[tenant.status].icon;
            return (
              <Card key={tenant.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className={`${statusConfig[tenant.status].className} p-3 rounded-lg`}>
                        <StatusIcon className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-medium text-gray-900">{tenant.name}</h3>
                          <Badge className={statusConfig[tenant.status].className}>
                            {statusConfig[tenant.status].label}
                          </Badge>
                          <Badge className={environmentConfig[tenant.environment].className}>
                            {environmentConfig[tenant.environment].label}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-600 mb-3">
                          <div>
                            <span className="text-gray-500">Region: </span>
                            <span className="text-gray-900">{tenant.region}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Country: </span>
                            <span className="text-gray-900">{tenant.country}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Data Products: </span>
                            <span className="text-gray-900">{tenant.dataProducts}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Customizations: </span>
                            <span className="text-gray-900">{tenant.customizations}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Endpoint: </span>
                            <code className="text-xs bg-gray-100 px-2 py-1 rounded">{tenant.apiEndpoint}</code>
                          </div>
                          <div>
                            <span className="text-gray-500">Last Sync: </span>
                            <span className="text-gray-900">{tenant.lastSync}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {tenant.status === 'connected' ? (
                        <>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleSync(tenant.id)}
                            className="gap-2"
                          >
                            <RefreshCw className="w-4 h-4" />
                            Sync
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDisconnect(tenant.id)}
                          >
                            Disconnect
                          </Button>
                        </>
                      ) : (
                        <Button 
                          variant="default" 
                          size="sm"
                          onClick={() => handleConnect(tenant.id)}
                        >
                          Connect
                        </Button>
                      )}
                      <Button variant="ghost" size="sm">
                        <Settings className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="production" className="space-y-4">
          {tenants.filter(t => t.environment === 'production').map((tenant) => {
            const StatusIcon = statusConfig[tenant.status].icon;
            return (
              <Card key={tenant.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className={`${statusConfig[tenant.status].className} p-3 rounded-lg`}>
                        <StatusIcon className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-medium text-gray-900">{tenant.name}</h3>
                          <Badge className={statusConfig[tenant.status].className}>
                            {statusConfig[tenant.status].label}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-600 mb-3">
                          <div>
                            <span className="text-gray-500">Region: </span>
                            <span className="text-gray-900">{tenant.region}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Country: </span>
                            <span className="text-gray-900">{tenant.country}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Data Products: </span>
                            <span className="text-gray-900">{tenant.dataProducts}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Customizations: </span>
                            <span className="text-gray-900">{tenant.customizations}</span>
                          </div>
                        </div>
                        <div className="text-sm">
                          <span className="text-gray-500">Last Sync: </span>
                          <span className="text-gray-900">{tenant.lastSync}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {tenant.status === 'connected' ? (
                        <>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleSync(tenant.id)}
                            className="gap-2"
                          >
                            <RefreshCw className="w-4 h-4" />
                            Sync
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDisconnect(tenant.id)}
                          >
                            Disconnect
                          </Button>
                        </>
                      ) : (
                        <Button 
                          variant="default" 
                          size="sm"
                          onClick={() => handleConnect(tenant.id)}
                        >
                          Connect
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="staging" className="space-y-4">
          {tenants.filter(t => t.environment === 'staging').map((tenant) => {
            const StatusIcon = statusConfig[tenant.status].icon;
            return (
              <Card key={tenant.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className={`${statusConfig[tenant.status].className} p-3 rounded-lg`}>
                        <StatusIcon className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-medium text-gray-900">{tenant.name}</h3>
                          <Badge className={statusConfig[tenant.status].className}>
                            {statusConfig[tenant.status].label}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-600">
                          <p>{tenant.region} • {tenant.country}</p>
                          <p className="mt-1">Last Sync: {tenant.lastSync}</p>
                        </div>
                      </div>
                    </div>
                    <Button 
                      variant="default" 
                      size="sm"
                      onClick={() => handleConnect(tenant.id)}
                    >
                      Connect
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {tenants.filter(t => t.environment === 'staging').length === 0 && (
            <Card>
              <CardContent className="pt-6 text-center py-12">
                <Server className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No staging tenants configured</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="development" className="space-y-4">
          {tenants.filter(t => t.environment === 'development').length === 0 && (
            <Card>
              <CardContent className="pt-6 text-center py-12">
                <Server className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No development tenants configured</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
