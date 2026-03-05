import { useState } from "react";
import { Search, Plus, MoreVertical, Package, Calendar, Users, Tag, Download, Upload, FileJson, Eye, Edit } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { CreateDataProductDialog } from "./CreateDataProductDialog";
import { DataProductDetailDialog } from "./DataProductDetailDialog";
import { DataProduct } from "./model/DataProduct";

export function DataProductCatalog() {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<DataProduct | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  
  const [dataProducts, setDataProducts] = useState<DataProduct[]>([
    {
      id: 'dp-001',
      version: 'v2.1.0',
      name: 'User Behavior Data Product',
      description: 'Provides comprehensive user lifecycle behavior data including visits, clicks, purchases, reviews, and other behavioral events',
      productOwner: 'Data Team',
      visibility: 'organization',
      status: 'production',
      tags: ['User Analytics', 'Behavior Tracking', 'Core Data'],
      categories: ['User Data', 'Behavioral Data'],
      createdAt: '2024-06-15',
      updatedAt: '2024-12-15',
      dataComponents: {
        datasets: 3,
        apis: 5,
        files: 12,
      },
      quality: {
        completeness: 98,
        accuracy: 96,
        timeliness: 95,
        consistency: 97,
      },
      sla: {
        availability: '99.9%',
        responseTime: '< 500ms',
        updateFrequency: 'Real-time',
      },
      pricing: {
        model: 'free',
      },
      consumers: 12,
      license: 'CC BY 4.0',
    },
    {
      id: 'dp-002',
      version: 'v1.5.2',
      name: 'Sales Analytics Data Product',
      description: 'Multi-dimensional sales data analysis, supporting region, product, channel and other dimension drilling analysis',
      productOwner: 'Business Intelligence Team',
      visibility: 'organization',
      status: 'production',
      tags: ['Sales Analysis', 'BI Report', 'Business Metrics'],
      categories: ['Sales Data', 'Financial Data'],
      createdAt: '2024-03-20',
      updatedAt: '2024-12-10',
      dataComponents: {
        datasets: 5,
        apis: 8,
        files: 20,
      },
      quality: {
        completeness: 95,
        accuracy: 97,
        timeliness: 93,
        consistency: 94,
      },
      sla: {
        availability: '99.5%',
        responseTime: '< 1s',
        updateFrequency: 'Hourly',
      },
      pricing: {
        model: 'subscription',
        price: '$99/month',
      },
      consumers: 8,
      license: 'Proprietary',
    },
    {
      id: 'dp-003',
      version: 'v3.0.0-beta',
      name: 'Customer Profile Data Product',
      description: '360-degree customer profile including demographic characteristics, behavioral preferences, value segmentation and other dimensions',
      productOwner: 'Analytics Team',
      visibility: 'private',
      status: 'development',
      tags: ['Customer Portrait', 'Precision Marketing', 'Segmentation'],
      categories: ['User Data', 'Marketing Data'],
      createdAt: '2024-11-01',
      updatedAt: '2024-12-16',
      dataComponents: {
        datasets: 4,
        apis: 6,
        files: 8,
      },
      quality: {
        completeness: 87,
        accuracy: 89,
        timeliness: 85,
        consistency: 88,
      },
      sla: {
        availability: '99.0%',
        responseTime: '< 2s',
        updateFrequency: 'Daily',
      },
      pricing: {
        model: 'usage-based',
        price: '$0.01/query',
      },
      consumers: 3,
      license: 'Internal Use Only',
    },
    {
      id: 'dp-004',
      version: 'v1.2.1',
      name: 'Product Inventory Data Product',
      description: 'Real-time product inventory data including warehouse inventory, in-transit inventory, reserved inventory and other status',
      productOwner: 'Supply Chain Team',
      visibility: 'organization',
      status: 'production',
      tags: ['Inventory Management', 'Supply Chain', 'Real-time Data'],
      categories: ['Operational Data', 'Supply Chain Data'],
      createdAt: '2024-05-10',
      updatedAt: '2024-12-14',
      dataComponents: {
        datasets: 2,
        apis: 4,
        files: 6,
      },
      quality: {
        completeness: 99,
        accuracy: 98,
        timeliness: 97,
        consistency: 99,
      },
      sla: {
        availability: '99.99%',
        responseTime: '< 300ms',
        updateFrequency: 'Real-time',
      },
      pricing: {
        model: 'free',
      },
      consumers: 15,
      license: 'CC BY-NC 4.0',
    },
    {
      id: 'dp-005',
      version: 'v0.8.0',
      name: 'Marketing Campaign Data Product',
      description: 'Marketing campaign execution data including touch data, conversion data, ROI analysis, etc.',
      productOwner: 'Marketing Team',
      visibility: 'public',
      status: 'deprecated',
      tags: ['Marketing', 'Campaign', 'ROI'],
      categories: ['Marketing Data'],
      createdAt: '2024-01-15',
      updatedAt: '2024-11-30',
      dataComponents: {
        datasets: 3,
        apis: 3,
        files: 10,
      },
      quality: {
        completeness: 75,
        accuracy: 78,
        timeliness: 70,
        consistency: 76,
      },
      pricing: {
        model: 'free',
      },
      consumers: 5,
      license: 'MIT',
    },
  ]);

  const statusConfig: Record<string, { label: string; className: string }> = {
    production: { label: 'Production', className: 'bg-green-100 text-green-700' },
    development: { label: 'Development', className: 'bg-yellow-100 text-yellow-700' },
    deprecated: { label: 'Deprecated', className: 'bg-gray-100 text-gray-700' },
    sunset: { label: 'Sunset', className: 'bg-red-100 text-red-700' },
  };

  const visibilityConfig: Record<string, { label: string; className: string }> = {
    public: { label: 'Public', className: 'bg-blue-100 text-blue-700' },
    private: { label: 'Private', className: 'bg-purple-100 text-purple-700' },
    organization: { label: 'Organization', className: 'bg-indigo-100 text-indigo-700' },
  };

  const filteredProducts = dataProducts.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || product.categories.includes(categoryFilter);
    const matchesStatus = statusFilter === 'all' || product.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const categories = Array.from(new Set(dataProducts.flatMap(p => p.categories)));

  const handleViewDetails = (product: DataProduct) => {
    setSelectedProduct(product);
    setIsDetailDialogOpen(true);
  };

  const handleCreateProduct = (newProduct: Omit<DataProduct, 'id' | 'createdAt' | 'updatedAt' | 'consumers'>) => {
    const product: DataProduct = {
      ...newProduct,
      id: `dp-${String(dataProducts.length + 1).padStart(3, '0')}`,
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
      consumers: 0,
    };
    setDataProducts([...dataProducts, product]);
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Data Product Catalog</h2>
          <p className="text-gray-500 mt-1">Browse and manage all data products compliant with ODPS</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Export
          </Button>
          <Button variant="outline" className="gap-2">
            <Upload className="w-4 h-4" />
            Import
          </Button>
          <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Create Data Product
          </Button>
        </div>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search data products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(category => (
              <SelectItem key={category} value={category}>{category}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="production">Production</SelectItem>
            <SelectItem value="development">Development</SelectItem>
            <SelectItem value="deprecated">Deprecated</SelectItem>
            <SelectItem value="sunset">Sunset</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.map((product) => (
          <div key={product.id} className="bg-white rounded-lg border hover:shadow-lg transition-shadow">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white flex-shrink-0">
                    <Package className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{product.name}</h3>
                    <p className="text-sm text-gray-500">{product.version}</p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleViewDetails(product)}>
                      <Eye className="w-4 h-4 mr-2" />
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSelectedProduct(product)}>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <FileJson className="w-4 h-4 mr-2" />
                      Export Metadata
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Download className="w-4 h-4 mr-2" />
                      Download Data
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <p className="text-sm text-gray-600 mb-4 line-clamp-2">{product.description}</p>

              <div className="flex flex-wrap gap-2 mb-4">
                <Badge className={statusConfig[product.status].className}>
                  {statusConfig[product.status].label}
                </Badge>
                <Badge className={visibilityConfig[product.visibility].className}>
                  {visibilityConfig[product.visibility].label}
                </Badge>
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Users className="w-4 h-4" />
                  <span>{product.productOwner}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span>Updated {product.updatedAt}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Package className="w-4 h-4" />
                  <span>{product.dataComponents.datasets} Datasets • {product.dataComponents.apis} APIs</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-1 mb-4">
                {product.tags.slice(0, 3).map((tag, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    <Tag className="w-3 h-3 mr-1" />
                    {tag}
                  </Badge>
                ))}
                {product.tags.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{product.tags.length - 3}
                  </Badge>
                )}
              </div>

              <div className="pt-4 border-t">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Quality Score</span>
                  <span className="font-semibold text-gray-900">
                    {Math.round((product.quality.completeness + product.quality.accuracy + 
                               product.quality.timeliness + product.quality.consistency) / 4)}%
                  </span>
                </div>
                <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-green-500 to-blue-500 rounded-full" 
                    style={{ 
                      width: `${Math.round((product.quality.completeness + product.quality.accuracy + 
                                          product.quality.timeliness + product.quality.consistency) / 4)}%` 
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border">
          <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No data products found</p>
          <p className="text-sm text-gray-400 mt-1">Try adjusting your filters or search terms</p>
        </div>
      )}

      <CreateDataProductDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onCreateProduct={handleCreateProduct}
      />

      {selectedProduct && (
        <DataProductDetailDialog
          open={isDetailDialogOpen}
          onOpenChange={setIsDetailDialogOpen}
          product={selectedProduct}
        />
      )}
    </div>
  );
}