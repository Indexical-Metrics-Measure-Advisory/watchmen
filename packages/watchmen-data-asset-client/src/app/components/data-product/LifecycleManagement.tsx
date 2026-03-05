import { useState } from "react";
import { Package, ArrowRight, GitBranch, Clock, CheckCircle, AlertCircle, XCircle, Calendar } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Textarea } from "../ui/textarea";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { LifecycleProduct } from "./model/Lifecycle";

export function LifecycleManagement() {
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isTransitionDialogOpen, setIsTransitionDialogOpen] = useState(false);
  const [transitionTo, setTransitionTo] = useState("");
  const [transitionComment, setTransitionComment] = useState("");

  // Lifecycle stage distribution data
  const lifecycleDistribution = [
    { name: 'Development', value: 12, color: '#f59e0b' },
    { name: 'Production', value: 32, color: '#10b981' },
    { name: 'Deprecated', value: 3, color: '#6b7280' },
    { name: 'Sunset', value: 1, color: '#ef4444' },
  ];

  // Lifecycle transition trends
  const lifecycleTrend = [
    { month: 'Jul', development: 8, production: 28, deprecated: 2 },
    { month: 'Aug', development: 10, production: 29, deprecated: 2 },
    { month: 'Sep', development: 11, production: 30, deprecated: 2 },
    { month: 'Oct', development: 10, production: 31, deprecated: 3 },
    { month: 'Nov', development: 11, production: 32, deprecated: 3 },
    { month: 'Dec', development: 12, production: 32, deprecated: 3 },
  ];

  // Data products list
  const [dataProducts, setDataProducts] = useState<LifecycleProduct[]>([
    {
      id: 'dp-001',
      name: 'User Behavior Data Product',
      version: 'v2.1.0',
      currentStatus: 'production',
      owner: 'Data Team',
      createdAt: '2024-06-15',
      lastTransition: '2024-10-01',
      nextReview: '2025-01-15',
      consumers: 12,
      history: [
        { status: 'development', date: '2024-06-15', duration: '107 days', operator: 'John Doe' },
        { status: 'production', date: '2024-10-01', duration: '77 days (current)', operator: 'Jane Smith' },
      ],
    },
    {
      id: 'dp-002',
      name: 'Sales Analytics Data Product',
      version: 'v1.5.2',
      currentStatus: 'production',
      owner: 'Business Team',
      createdAt: '2024-03-20',
      lastTransition: '2024-06-15',
      nextReview: '2025-03-20',
      consumers: 8,
      history: [
        { status: 'development', date: '2024-03-20', duration: '87 days', operator: 'Mike Johnson' },
        { status: 'production', date: '2024-06-15', duration: '185 days (current)', operator: 'Sarah Brown' },
      ],
    },
    {
      id: 'dp-003',
      name: 'Customer Profile Data Product',
      version: 'v3.0.0-beta',
      currentStatus: 'development',
      owner: 'Analytics Team',
      createdAt: '2024-09-01',
      lastTransition: '2024-09-01',
      nextReview: '2024-12-31',
      consumers: 3,
      history: [
        { status: 'development', date: '2024-09-01', duration: '107 days (current)', operator: 'Alice Wang' },
      ],
    },
    {
      id: 'dp-004',
      name: 'Supply Chain Data Product',
      version: 'v2.3.1',
      currentStatus: 'production',
      owner: 'Operations Team',
      createdAt: '2024-01-10',
      lastTransition: '2024-04-01',
      nextReview: '2025-04-01',
      consumers: 15,
      history: [
        { status: 'development', date: '2024-01-10', duration: '82 days', operator: 'Bob Chen' },
        { status: 'production', date: '2024-04-01', duration: '260 days (current)', operator: 'Emma Liu' },
      ],
    },
    {
      id: 'dp-005',
      name: 'Marketing Campaign Data Product',
      version: 'v0.8.0',
      currentStatus: 'deprecated',
      owner: 'Marketing Team',
      createdAt: '2023-06-01',
      lastTransition: '2024-11-01',
      nextReview: '2025-02-01',
      consumers: 2,
      history: [
        { status: 'development', date: '2023-06-01', duration: '90 days', operator: 'David Lee' },
        { status: 'production', date: '2023-08-30', duration: '428 days', operator: 'Lisa Zhang' },
        { status: 'deprecated', date: '2024-11-01', duration: '46 days (current)', operator: 'Tom Wilson' },
      ],
    },
  ]);

  const statusConfig: Record<string, { label: string; className: string; icon: any }> = {
    development: { 
      label: 'Development', 
      className: 'bg-yellow-100 text-yellow-700',
      icon: Clock,
    },
    production: { 
      label: 'Production', 
      className: 'bg-green-100 text-green-700',
      icon: CheckCircle,
    },
    deprecated: { 
      label: 'Deprecated', 
      className: 'bg-gray-100 text-gray-700',
      icon: AlertCircle,
    },
    sunset: { 
      label: 'Sunset', 
      className: 'bg-red-100 text-red-700',
      icon: XCircle,
    },
  };

  const handleInitiateTransition = (product: any) => {
    setSelectedProduct(product);
    setIsTransitionDialogOpen(true);
  };

  const handleConfirmTransition = () => {
    if (selectedProduct && transitionTo) {
      const updatedProducts = dataProducts.map(p => {
        if (p.id === selectedProduct.id) {
          return {
            ...p,
            currentStatus: transitionTo,
            lastTransition: new Date().toISOString().split('T')[0],
            history: [
              ...p.history,
              {
                status: transitionTo,
                date: new Date().toISOString().split('T')[0],
                duration: '0 days (current)',
                operator: 'Current User',
              },
            ],
          };
        }
        return p;
      });
      setDataProducts(updatedProducts);
      setIsTransitionDialogOpen(false);
      setTransitionTo("");
      setTransitionComment("");
      setSelectedProduct(null);
    }
  };

  const getAvailableTransitions = (currentStatus: string) => {
    const transitions: Record<string, string[]> = {
      development: ['production', 'deprecated'],
      production: ['deprecated', 'sunset'],
      deprecated: ['sunset'],
      sunset: [],
    };
    return transitions[currentStatus] || [];
  };

  return (
    <div className="p-8 space-y-8">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">Lifecycle Management</h2>
        <p className="text-gray-500 mt-1">Manage data product lifecycle stages and transitions</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {lifecycleDistribution.map((stage) => {
          const Icon = statusConfig[stage.name.toLowerCase()]?.icon || Package;
          return (
            <Card key={stage.name}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-500">{stage.name}</p>
                    <p className="text-3xl font-semibold mt-2">{stage.value}</p>
                    <p className="text-sm text-gray-600 mt-2">
                      {((stage.value / lifecycleDistribution.reduce((sum, s) => sum + s.value, 0)) * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div className={`${statusConfig[stage.name.toLowerCase()]?.className} p-3 rounded-lg`}>
                    <Icon className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="products">Products by Stage</TabsTrigger>
          <TabsTrigger value="transitions">Transition History</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Lifecycle Distribution</CardTitle>
                <CardDescription>Current stage distribution of all data products</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={lifecycleDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {lifecycleDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Lifecycle Trends</CardTitle>
                <CardDescription>6-month stage evolution</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={lifecycleTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="development" fill="#f59e0b" name="Development" />
                    <Bar dataKey="production" fill="#10b981" name="Production" />
                    <Bar dataKey="deprecated" fill="#6b7280" name="Deprecated" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Lifecycle Stage Workflow</CardTitle>
              <CardDescription>Standard progression through data product lifecycle</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between py-8">
                <div className="flex-1 text-center">
                  <div className="w-16 h-16 bg-yellow-100 text-yellow-700 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Clock className="w-8 h-8" />
                  </div>
                  <h3 className="font-medium text-gray-900 mb-1">Development</h3>
                  <p className="text-xs text-gray-500">Under construction</p>
                </div>
                <ArrowRight className="w-8 h-8 text-gray-400 mx-4" />
                <div className="flex-1 text-center">
                  <div className="w-16 h-16 bg-green-100 text-green-700 rounded-full flex items-center justify-center mx-auto mb-3">
                    <CheckCircle className="w-8 h-8" />
                  </div>
                  <h3 className="font-medium text-gray-900 mb-1">Production</h3>
                  <p className="text-xs text-gray-500">Live and available</p>
                </div>
                <ArrowRight className="w-8 h-8 text-gray-400 mx-4" />
                <div className="flex-1 text-center">
                  <div className="w-16 h-16 bg-gray-100 text-gray-700 rounded-full flex items-center justify-center mx-auto mb-3">
                    <AlertCircle className="w-8 h-8" />
                  </div>
                  <h3 className="font-medium text-gray-900 mb-1">Deprecated</h3>
                  <p className="text-xs text-gray-500">Not recommended</p>
                </div>
                <ArrowRight className="w-8 h-8 text-gray-400 mx-4" />
                <div className="flex-1 text-center">
                  <div className="w-16 h-16 bg-red-100 text-red-700 rounded-full flex items-center justify-center mx-auto mb-3">
                    <XCircle className="w-8 h-8" />
                  </div>
                  <h3 className="font-medium text-gray-900 mb-1">Sunset</h3>
                  <p className="text-xs text-gray-500">Scheduled removal</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Products by Stage Tab */}
        <TabsContent value="products" className="space-y-6">
          {Object.keys(statusConfig).map((status) => {
            const products = dataProducts.filter(p => p.currentStatus === status);
            if (products.length === 0) return null;

            const Icon = statusConfig[status].icon;
            return (
              <Card key={status}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className={`${statusConfig[status].className} p-2 rounded-lg`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <CardTitle>{statusConfig[status].label}</CardTitle>
                      <CardDescription>{products.length} data products</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {products.map((product) => (
                      <div key={product.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="font-medium text-gray-900">{product.name}</h4>
                              <Badge variant="outline">{product.version}</Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm text-gray-600">
                              <div className="flex items-center gap-2">
                                <Package className="w-4 h-4" />
                                <span>{product.owner}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                <span>Created: {product.createdAt}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <GitBranch className="w-4 h-4" />
                                <span>Last Transition: {product.lastTransition}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4" />
                                <span>Next Review: {product.nextReview}</span>
                              </div>
                            </div>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleInitiateTransition(product)}
                            disabled={getAvailableTransitions(product.currentStatus).length === 0}
                          >
                            Transition
                          </Button>
                        </div>
                        <div className="pt-3 border-t">
                          <p className="text-xs text-gray-500 mb-2">Lifecycle History</p>
                          <div className="flex items-center gap-2">
                            {product.history.map((h, index) => (
                              <div key={index} className="flex items-center gap-2">
                                <Badge className={statusConfig[h.status].className} variant="outline">
                                  {statusConfig[h.status].label}
                                </Badge>
                                {index < product.history.length - 1 && (
                                  <ArrowRight className="w-4 h-4 text-gray-400" />
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        {/* Transition History Tab */}
        <TabsContent value="transitions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Transitions</CardTitle>
              <CardDescription>History of lifecycle stage changes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dataProducts.flatMap(product => 
                  product.history.map((h, index) => ({
                    ...h,
                    productName: product.name,
                    productId: product.id,
                    isLatest: index === product.history.length - 1,
                  }))
                ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10).map((transition, index) => (
                  <div key={index} className="flex items-start gap-4 p-4 border rounded-lg">
                    <div className={`${statusConfig[transition.status].className} p-2 rounded-lg`}>
                      {(() => {
                        const Icon = statusConfig[transition.status].icon;
                        return <Icon className="w-5 h-5" />;
                      })()}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-gray-900">{transition.productName}</h4>
                        <ArrowRight className="w-4 h-4 text-gray-400" />
                        <Badge className={statusConfig[transition.status].className}>
                          {statusConfig[transition.status].label}
                        </Badge>
                        {transition.isLatest && (
                          <Badge variant="outline" className="text-xs">Current</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>Date: {transition.date}</span>
                        <span>Duration: {transition.duration}</span>
                        <span>By: {transition.operator}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Transition Dialog */}
      <Dialog open={isTransitionDialogOpen} onOpenChange={setIsTransitionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lifecycle Stage Transition</DialogTitle>
            <DialogDescription>
              Transition {selectedProduct?.name} to a new lifecycle stage
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Current Stage</label>
              <div className="p-3 bg-gray-50 rounded-lg">
                <Badge className={statusConfig[selectedProduct?.currentStatus]?.className}>
                  {statusConfig[selectedProduct?.currentStatus]?.label}
                </Badge>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Transition To</label>
              <Select value={transitionTo} onValueChange={setTransitionTo}>
                <SelectTrigger>
                  <SelectValue placeholder="Select new stage" />
                </SelectTrigger>
                <SelectContent>
                  {selectedProduct && getAvailableTransitions(selectedProduct.currentStatus).map((status) => (
                    <SelectItem key={status} value={status}>
                      {statusConfig[status].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Comments (Optional)</label>
              <Textarea
                placeholder="Add notes about this transition..."
                value={transitionComment}
                onChange={(e) => setTransitionComment(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTransitionDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmTransition} disabled={!transitionTo}>
              Confirm Transition
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
