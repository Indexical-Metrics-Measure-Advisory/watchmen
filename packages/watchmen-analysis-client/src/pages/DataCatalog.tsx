
import React, { useState, useEffect, useCallback } from 'react';
import { Search, Filter, Grid, List, Eye, Calendar, User, ExternalLink, Database, Activity, TrendingUp, Star, Edit, Save, X, Plus, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { dataCatalogService } from '@/services/dataCatalogService';
import { 
  DataProduct, 
  DataProductStatus, 
  DataProductType, 
  DataProductVisibility,
  DataCatalogQuery,
  DataCatalogStats,
  DataProductArchetype
} from '@/model/DataCatalog';
import { useSidebar } from '@/contexts/SidebarContext';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';

interface ProductFormData {
  name: string;
  description: string;
  version: string;
  status: DataProductStatus;
  type: DataProductType;
  visibility: DataProductVisibility;
  archetype: DataProductArchetype;
  owner: string;
  domain: string;
  tags: string;
  dataHolderName: string;
  dataHolderEmail: string;
  dataHolderRole: string;
  documentationLink: string;
  repositoryLink: string;
  supportLink: string;
}

const DataCatalog: React.FC = () => {
  const { collapsed } = useSidebar();
  const [products, setProducts] = useState<DataProduct[]>([]);
  const [stats, setStats] = useState<DataCatalogStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<DataProduct | null>(null);
  const [editingProduct, setEditingProduct] = useState<DataProduct | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<ProductFormData>>({});
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [createFormData, setCreateFormData] = useState<Partial<ProductFormData>>({});
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'relevance' | 'name' | 'createdAt'>('relevance');
  const [filters, setFilters] = useState({
    search: '',
    status: '' as DataProductStatus | '',
    type: '' as DataProductType | '',
    domain: '',
    visibility: '' as DataProductVisibility | ''
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const applyFilters = useCallback(async () => {
    try {
      setLoading(true);
      const query: DataCatalogQuery = {
        filter: {
          searchQuery: filters.search || searchQuery,
          status: filters.status ? [filters.status] : undefined,
          type: filters.type ? [filters.type] : undefined,
          domain: filters.domain ? [filters.domain] : undefined,
          visibility: filters.visibility ? [filters.visibility] : undefined
        },
        pagination: { page: 1, pageSize: 50, total: 0 }
      };
      
      const response = await dataCatalogService.getDataProducts(query);
      setProducts(response.products);
    } catch (error) {
      console.error('Failed to apply filters:', error);
    } finally {
      setLoading(false);
    }
  }, [filters, searchQuery]);

  // Debounced search apply
  useEffect(() => {
    const t = setTimeout(() => {
      if (searchQuery.trim().length === 0) return;
      applyFilters();
    }, 400);
    return () => clearTimeout(t);
  }, [searchQuery, applyFilters]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [productsResponse, statsResponse] = await Promise.all([
        dataCatalogService.getDataProducts(),
        dataCatalogService.getDataCatalogStats()
      ]);
      setProducts(productsResponse.products);
      setStats(statsResponse);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetFilters = () => {
    setFilters({
      search: '',
      status: '',
      type: '',
      domain: '',
      visibility: ''
    });
    setSearchQuery('');
    loadData();
  };

  const getEmptyProductFormData = () => ({
    name: '',
    description: '',
    version: '1.0.0',
    status: DataProductStatus.DRAFT,
    type: DataProductType.DATASET,
    visibility: DataProductVisibility.INTERNAL,
    archetype: DataProductArchetype.SOURCE_ALIGNED,
    owner: '',
    domain: '',
    tags: '',
    dataHolderName: '',
    dataHolderEmail: '',
    dataHolderRole: '',
    documentationLink: '',
    repositoryLink: '',
    supportLink: ''
  });

  const handleOpenCreateProduct = () => {
    setCreateFormData(getEmptyProductFormData());
    setIsCreateDialogOpen(true);
  };

  const handleEditProduct = (product: DataProduct) => {
    setEditingProduct(product);
    setEditFormData({
      name: product.product.en.name,
      description: product.product.en.description || '',
      version: product.product.en.version || '',
      status: product.product.en.status,
      type: product.product.en.type,
      visibility: product.product.en.visibility,
      archetype: product.product.en.archetype || DataProductArchetype.SOURCE_ALIGNED,
      owner: product.product.en.owner || '',
      domain: product.product.en.domain || '',
      tags: product.product.en.tags?.join(', ') || '',
      dataHolderName: product.dataHolder?.name || '',
      dataHolderEmail: product.dataHolder?.email || '',
      dataHolderRole: product.dataHolder?.role || '',
      documentationLink: product.links?.documentation || '',
      repositoryLink: product.links?.repository || '',
      supportLink: product.links?.support || ''
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveProduct = async () => {
    if (!editingProduct) return;

    try {
      // Build update data
      const updateData = {
        product: {
          en: {
            productID: editingProduct.product.en.productID,
            name: editFormData.name || editingProduct.product.en.name,
            description: editFormData.description || editingProduct.product.en.description,
            version: editFormData.version || editingProduct.product.en.version,
            status: editFormData.status || editingProduct.product.en.status,
            type: editFormData.type || editingProduct.product.en.type,
            visibility: editFormData.visibility || editingProduct.product.en.visibility,
            archetype: editFormData.archetype || editingProduct.product.en.archetype,
            owner: editFormData.owner || editingProduct.product.en.owner,
            domain: editFormData.domain || editingProduct.product.en.domain,
            tags: editFormData.tags ? editFormData.tags.split(',').map((tag: string) => tag.trim()).filter(Boolean) : editingProduct.product.en.tags
          }
        },
        dataHolder: {
          name: editFormData.dataHolderName || editingProduct.dataHolder?.name,
          email: editFormData.dataHolderEmail || editingProduct.dataHolder?.email,
          role: editFormData.dataHolderRole || editingProduct.dataHolder?.role
        },
        links: {
          documentation: editFormData.documentationLink || editingProduct.links?.documentation,
          repository: editFormData.repositoryLink || editingProduct.links?.repository,
          support: editFormData.supportLink || editingProduct.links?.support
        }
      };

      // Call API to update product
      const updatedProduct = await dataCatalogService.updateDataProduct(
        editingProduct.product.en.productID,
        updateData
      );

      // Update local state
      setProducts(prevProducts => 
        prevProducts.map(p => 
          p.product.en.productID === editingProduct.product.en.productID ? updatedProduct : p
        )
      );

      setIsEditDialogOpen(false);
      setEditingProduct(null);
      setEditFormData({} as Partial<ProductFormData>);
    } catch (error) {
      console.error('Failed to update product:', error);
    }
  };

  const handleCancelEdit = () => {
    setIsEditDialogOpen(false);
    setEditingProduct(null);
    setEditFormData({} as Partial<ProductFormData>);
  };

  const handleCancelCreate = () => {
    setIsCreateDialogOpen(false);
    setCreateFormData({} as ProductFormData);
  };

  const createProductId = (name: string) => {
    const base = name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'data-product';
    const suffix = String(Date.now()).slice(-6);
    return `${base}-${suffix}`;
  };

  const handleCreateProduct = async () => {
    const name = (createFormData.name || '').trim();
    if (!name) return;

    try {
      const newProduct: DataProduct = {
        product: {
          en: {
            productID: createProductId(name),
            name,
            description: createFormData.description?.trim() || '',
            version: createFormData.version?.trim() || '1.0.0',
            status: createFormData.status || DataProductStatus.DRAFT,
            type: createFormData.type || DataProductType.DATASET,
            visibility: createFormData.visibility || DataProductVisibility.INTERNAL,
            archetype: createFormData.archetype || DataProductArchetype.SOURCE_ALIGNED,
            owner: createFormData.owner?.trim() || '',
            domain: createFormData.domain?.trim() || '',
            tags: createFormData.tags
              ? createFormData.tags.split(',').map((tag: string) => tag.trim()).filter(Boolean)
              : []
          }
        },
        dataHolder: createFormData.dataHolderName || createFormData.dataHolderEmail || createFormData.dataHolderRole
          ? {
              name: createFormData.dataHolderName?.trim() || '',
              email: createFormData.dataHolderEmail?.trim() || '',
              role: createFormData.dataHolderRole?.trim() || ''
            }
          : undefined,
        links: createFormData.documentationLink || createFormData.repositoryLink || createFormData.supportLink
          ? {
              documentation: createFormData.documentationLink?.trim() || undefined,
              repository: createFormData.repositoryLink?.trim() || undefined,
              support: createFormData.supportLink?.trim() || undefined
            }
          : undefined
      };

      const createdProduct = await dataCatalogService.createDataProduct(newProduct);
      setProducts(prevProducts => [createdProduct, ...prevProducts]);
      setStats(await dataCatalogService.getDataCatalogStats());
      setIsCreateDialogOpen(false);
      setCreateFormData({} as ProductFormData);
    } catch (error) {
      console.error('Failed to create product:', error);
    }
  };

  const getStatusColor = (status: DataProductStatus) => {
    switch (status) {
      case DataProductStatus.ACTIVE: return 'bg-green-100 text-green-800';
      case DataProductStatus.DEPRECATED: return 'bg-yellow-100 text-yellow-800';
      case DataProductStatus.DRAFT: return 'bg-blue-100 text-blue-800';
      case DataProductStatus.RETIRED: return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const StatsCard = ({ title, value, icon: Icon, trend }: { title: string; value: number; icon: LucideIcon; trend?: string }) => (
    <Card className="transition-all hover:shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {trend && <p className="text-xs text-muted-foreground mt-1">{trend}</p>}
          </div>
          <Icon className="h-8 w-8 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  );

  const ProductCard = ({ product }: { product: DataProduct }) => {
    const productInfo = product.product.en;
    return (
      <Card className="hover:shadow-md transition-all cursor-pointer border-muted/60">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg">{productInfo.name}</CardTitle>
              <CardDescription className="mt-1 line-clamp-2">{productInfo.description}</CardDescription>
            </div>
            <Badge className={getStatusColor(productInfo.status)}>{productInfo.status}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <User className="h-4 w-4" />
                <span>{productInfo.owner || 'Unknown'}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>{product.createdAt ? new Date(product.createdAt).toLocaleDateString() : 'N/A'}</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{productInfo.type}</Badge>
                <Badge variant="outline">{productInfo.domain}</Badge>
                {productInfo.tags?.slice(0, 2).map((tag, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">{tag}</Badge>
                ))}
              </div>
              <div className="flex items-center gap-1">
                {product.links?.documentation && (
                  <Button asChild variant="ghost" size="sm">
                    <a href={product.links.documentation} target="_blank" rel="noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                )}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleEditProduct(product)}
                  title="Edit product"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedProduct(product)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{productInfo.name}</DialogTitle>
                      <DialogDescription>{productInfo.description}</DialogDescription>
                    </DialogHeader>
                    <ProductDetails product={product} />
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const ProductListItem = ({ product }: { product: DataProduct }) => {
    const productInfo = product.product.en;
    return (
      <Card className="hover:shadow-sm transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h3 className="font-medium">{productInfo.name}</h3>
                <Badge className={getStatusColor(productInfo.status)}>{productInfo.status}</Badge>
                <Badge variant="outline">{productInfo.type}</Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{productInfo.description}</p>
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                <span>{productInfo.owner || 'Unknown'}</span>
                <span>{productInfo.domain}</span>
                <span>{product.createdAt ? new Date(product.createdAt).toLocaleDateString() : 'N/A'}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {product.links?.documentation && (
                <Button asChild variant="ghost" size="sm">
                  <a href={product.links.documentation} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              )}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => handleEditProduct(product)}
                title="Edit product"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedProduct(product)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{productInfo.name}</DialogTitle>
                    <DialogDescription>{productInfo.description}</DialogDescription>
                  </DialogHeader>
                  <ProductDetails product={product} />
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const ProductDetails = ({ product }: { product: DataProduct }) => {
    const productInfo = product.product.en;
    return (
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="schema">Schema</TabsTrigger>
          <TabsTrigger value="quality">Quality</TabsTrigger>
          <TabsTrigger value="access">Access</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">Basic Information</h4>
              <div className="space-y-2 text-sm">
                <div><span className="font-medium">Version:</span> {productInfo.version || 'N/A'}</div>
                <div><span className="font-medium">Status:</span> {productInfo.status}</div>
                <div><span className="font-medium">Type:</span> {productInfo.type}</div>
                <div><span className="font-medium">Domain:</span> {productInfo.domain || 'N/A'}</div>
                <div><span className="font-medium">Visibility:</span> {productInfo.visibility}</div>
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-2">Owner Information</h4>
              <div className="space-y-1 text-sm">
                <div><span className="font-medium">Name:</span> {product.dataHolder?.name || productInfo.owner || 'N/A'}</div>
                <div><span className="font-medium">Email:</span> {product.dataHolder?.email || 'N/A'}</div>
                <div><span className="font-medium">Role:</span> {product.dataHolder?.role || 'N/A'}</div>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="font-medium mb-2">Tags</h4>
            <div className="flex flex-wrap gap-1">
              {productInfo.tags?.map((tag, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              )) || <span className="text-sm text-muted-foreground">No tags</span>}
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="schema" className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Input Ports</h4>
            {product.inputPorts?.map((port, index) => (
              <Card key={index} className="mb-2">
                <CardContent className="p-3">
                  <div className="font-medium">{port.name}</div>
                  <div className="text-sm text-muted-foreground">{port.description}</div>
                  <div className="text-xs text-muted-foreground mt-1">Format: {port.format}</div>
                </CardContent>
              </Card>
            )) || <span className="text-sm text-muted-foreground">No input ports</span>}
          </div>
          
          <div>
            <h4 className="font-medium mb-2">Output Ports</h4>
            {product.outputPorts?.map((port, index) => (
              <Card key={index} className="mb-2">
                <CardContent className="p-3">
                  <div className="font-medium">{port.name}</div>
                  <div className="text-sm text-muted-foreground">{port.description}</div>
                  <div className="text-xs text-muted-foreground mt-1">Format: {port.format}</div>
                </CardContent>
              </Card>
            )) || <span className="text-sm text-muted-foreground">No output ports</span>}
          </div>
        </TabsContent>
        
        <TabsContent value="quality" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">N/A</div>
                  <div className="text-sm text-muted-foreground">Quality Score</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <Badge variant="outline">Not Assessed</Badge>
                  <div className="text-sm text-muted-foreground mt-1">Quality Level</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="access" className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Related Links</h4>
            <div className="space-y-2">
              {product.links?.documentation && (
                <div className="flex items-center justify-between p-2 bg-muted rounded">
                  <div>
                    <div className="font-medium">Documentation</div>
                    <div className="text-xs text-muted-foreground">{product.links.documentation}</div>
                  </div>
                  <Badge variant="outline">Documentation</Badge>
                </div>
              )}
              
              {product.links?.repository && (
                <div className="flex items-center justify-between p-2 bg-muted rounded">
                  <div>
                    <div className="font-medium">Repository</div>
                    <div className="text-xs text-muted-foreground">{product.links.repository}</div>
                  </div>
                  <Badge variant="outline">Repository</Badge>
                </div>
              )}
              
              {!product.links?.documentation && !product.links?.repository && (
                <span className="text-sm text-muted-foreground">No access endpoints</span>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    );
  };

  const anyActiveFilter = Boolean(filters.status || filters.type || filters.domain || filters.visibility || searchQuery);

  const sortedProducts = React.useMemo(() => {
    const arr = [...products];
    if (sortBy === 'name') {
      return arr.sort((a, b) => (a.product.en.name || '').localeCompare(b.product.en.name || ''));
    }
    if (sortBy === 'createdAt') {
      return arr.sort((a, b) => {
        const ad = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bd = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bd - ad;
      });
    }
    return arr; // relevance (default order from backend)
  }, [products, sortBy]);

  const ProductFormTabs = ({
    formData,
    setFormData
  }: {
    formData: Partial<ProductFormData>;
    setFormData: React.Dispatch<React.SetStateAction<Partial<ProductFormData>>>;
  }) => (
    <Tabs defaultValue="basic" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="basic">Basic Info</TabsTrigger>
        <TabsTrigger value="contact">Contact</TabsTrigger>
        <TabsTrigger value="links">Links</TabsTrigger>
      </TabsList>
      
      <TabsContent value="basic" className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Product Name</Label>
            <Input
              id="name"
              value={formData.name || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Enter product name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="version">Version</Label>
            <Input
              id="version"
              value={formData.version || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, version: e.target.value }))}
              placeholder="e.g., 1.0.0"
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
            placeholder="Enter product description"
            rows={3}
          />
        </div>
        
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={formData.status} onValueChange={(value) => { const v = value as DataProductStatus; setFormData((prev) => ({ ...prev, status: v })); }}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={DataProductStatus.DRAFT}>Draft</SelectItem>
                <SelectItem value={DataProductStatus.ACTIVE}>Active</SelectItem>
                <SelectItem value={DataProductStatus.DEPRECATED}>Deprecated</SelectItem>
                <SelectItem value={DataProductStatus.RETIRED}>Retired</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <Select value={formData.type} onValueChange={(value) => { const v = value as DataProductType; setFormData((prev) => ({ ...prev, type: v })); }}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={DataProductType.DATASET}>Dataset</SelectItem>
                <SelectItem value={DataProductType.API}>API</SelectItem>
                <SelectItem value={DataProductType.STREAM}>Stream</SelectItem>
                <SelectItem value={DataProductType.MODEL}>Model</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="visibility">Visibility</Label>
            <Select value={formData.visibility} onValueChange={(value) => { const v = value as DataProductVisibility; setFormData((prev) => ({ ...prev, visibility: v })); }}>
              <SelectTrigger>
                <SelectValue placeholder="Select visibility" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={DataProductVisibility.PUBLIC}>Public</SelectItem>
                <SelectItem value={DataProductVisibility.INTERNAL}>Internal</SelectItem>
                <SelectItem value={DataProductVisibility.PRIVATE}>Private</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="owner">Owner</Label>
            <Input
              id="owner"
              value={formData.owner || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, owner: e.target.value }))}
              placeholder="Enter owner name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="domain">Domain</Label>
            <Input
              id="domain"
              value={formData.domain || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, domain: e.target.value }))}
              placeholder="Enter business domain"
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="tags">Tags</Label>
          <Input
            id="tags"
            value={formData.tags || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, tags: e.target.value }))}
            placeholder="Separate multiple tags with commas"
          />
        </div>
      </TabsContent>
      
      <TabsContent value="contact" className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="dataHolderName">Data Holder Name</Label>
            <Input
              id="dataHolderName"
              value={formData.dataHolderName || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, dataHolderName: e.target.value }))}
              placeholder="Enter name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dataHolderEmail">Email</Label>
            <Input
              id="dataHolderEmail"
              type="email"
              value={formData.dataHolderEmail || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, dataHolderEmail: e.target.value }))}
              placeholder="Enter email address"
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="dataHolderRole">Role</Label>
          <Input
            id="dataHolderRole"
            value={formData.dataHolderRole || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, dataHolderRole: e.target.value }))}
            placeholder="Enter role"
          />
        </div>
      </TabsContent>
      
      <TabsContent value="links" className="space-y-4">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="documentationLink">Documentation Link</Label>
            <Input
              id="documentationLink"
              value={formData.documentationLink || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, documentationLink: e.target.value }))}
              placeholder="https://docs.example.com"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="repositoryLink">Repository Link</Label>
            <Input
              id="repositoryLink"
              value={formData.repositoryLink || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, repositoryLink: e.target.value }))}
              placeholder="https://github.com/example/repo"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="supportLink">Support Link</Label>
            <Input
              id="supportLink"
              value={formData.supportLink || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, supportLink: e.target.value }))}
              placeholder="https://support.example.com"
            />
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );

  // Edit dialog component
  const EditProductDialog = () => (
    <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Data Product</DialogTitle>
          <DialogDescription>Modify the basic information and configuration of the data product</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          <ProductFormTabs formData={editFormData} setFormData={setEditFormData} />
          
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={handleCancelEdit}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSaveProduct}>
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  const CreateProductDialog = () => (
    <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Data Product</DialogTitle>
          <DialogDescription>Create a new data catalog entry for your data product</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <ProductFormTabs formData={createFormData} setFormData={setCreateFormData} />

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={handleCancelCreate}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleCreateProduct} disabled={!createFormData.name?.trim()}>
              <Plus className="h-4 w-4 mr-2" />
              Create
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      
      <div className={`${collapsed ? 'pl-20' : 'pl-56'} min-h-screen transition-all duration-300`}>
        <Header />
        
        {/* Edit Dialog */}
        <EditProductDialog />
        <CreateProductDialog />
        
        <main className="container mx-auto p-6 space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold">Data Catalog</h1>
              <p className="text-muted-foreground">Browse and manage all data assets</p>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={handleOpenCreateProduct}>
                <Plus className="h-4 w-4 mr-2" />
                Create
              </Button>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as 'relevance' | 'name' | 'createdAt')}>
                <SelectTrigger className="w-[160px]"><SelectValue placeholder="Sort by" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevance">Relevance</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="createdAt">Newest</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                title={viewMode === 'grid' ? 'Switch to list' : 'Switch to grid'}
              >
                {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
            </div>
          </div>

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <StatsCard title="Total Products" value={stats.totalProducts} icon={Database} />
              <StatsCard title="Active Products" value={stats.activeProducts} icon={Activity} />
              <StatsCard title="Total Domains" value={stats.totalDomains} icon={TrendingUp} />
              <StatsCard title="Total Owners" value={stats.totalOwners} icon={Star} />
            </div>
          )}

          {/* Search and Filters */}
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search data products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') applyFilters(); }}
                  className="w-full pl-9"
                />
              </div>
              <Button onClick={applyFilters}>
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
            </div>

            {anyActiveFilter && (
              <div className="flex flex-wrap items-center gap-2">
                {searchQuery && <Badge variant="secondary" className="flex items-center gap-2">Search: "{searchQuery}" <Button variant="ghost" size="sm" onClick={() => setSearchQuery('')}>×</Button></Badge>}
                {filters.status && <Badge variant="secondary" className="flex items-center gap-2">Status: {filters.status} <Button variant="ghost" size="sm" onClick={() => setFilters({ ...filters, status: '' })}>×</Button></Badge>}
                {filters.type && <Badge variant="secondary" className="flex items-center gap-2">Type: {filters.type} <Button variant="ghost" size="sm" onClick={() => setFilters({ ...filters, type: '' })}>×</Button></Badge>}
                {filters.domain && <Badge variant="secondary" className="flex items-center gap-2">Domain: {filters.domain} <Button variant="ghost" size="sm" onClick={() => setFilters({ ...filters, domain: '' })}>×</Button></Badge>}
                {filters.visibility && <Badge variant="secondary" className="flex items-center gap-2">Visibility: {filters.visibility} <Button variant="ghost" size="sm" onClick={() => setFilters({ ...filters, visibility: '' })}>×</Button></Badge>}
                <Button variant="outline" size="sm" onClick={resetFilters}>Clear all</Button>
              </div>
            )}

            {showFilters && (
              <Card>
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Select value={filters.status} onValueChange={(value) => setFilters({...filters, status: value as DataProductStatus | ''})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Status</SelectItem>
                        <SelectItem value={DataProductStatus.ACTIVE}>Active</SelectItem>
                        <SelectItem value={DataProductStatus.DRAFT}>Draft</SelectItem>
                        <SelectItem value={DataProductStatus.DEPRECATED}>Deprecated</SelectItem>
                        <SelectItem value={DataProductStatus.RETIRED}>Retired</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={filters.type} onValueChange={(value) => setFilters({...filters, type: value as DataProductType | ''})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Types</SelectItem>
                        <SelectItem value={DataProductType.DATASET}>Dataset</SelectItem>
                        <SelectItem value={DataProductType.API}>API</SelectItem>
                        <SelectItem value={DataProductType.STREAM}>Stream</SelectItem>
                        <SelectItem value={DataProductType.MODEL}>Model</SelectItem>
                      </SelectContent>
                    </Select>

                    <Input
                      placeholder="Domain"
                      value={filters.domain}
                      onChange={(e) => setFilters({...filters, domain: e.target.value})}
                    />

                    <Select value={filters.visibility} onValueChange={(value) => setFilters({...filters, visibility: value as DataProductVisibility | ''})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Visibility" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Visibility</SelectItem>
                        <SelectItem value={DataProductVisibility.PUBLIC}>Public</SelectItem>
                        <SelectItem value={DataProductVisibility.INTERNAL}>Internal</SelectItem>
                        <SelectItem value={DataProductVisibility.PRIVATE}>Private</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex justify-end gap-2 mt-4">
                    <Button variant="outline" onClick={resetFilters}>Reset</Button>
                    <Button onClick={applyFilters}>Apply Filters</Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Results header */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div>
              {loading ? 'Loading results…' : `Showing ${sortedProducts.length} result${sortedProducts.length !== 1 ? 's' : ''}`}
            </div>
          </div>

          {/* Products */}
          {loading ? (
            <div>
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Card key={i}>
                      <CardHeader className="pb-3">
                        <Skeleton className="h-5 w-40" />
                        <Skeleton className="h-4 w-full mt-2" />
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex items-center gap-4">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-4 w-24" />
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex gap-2">
                              <Skeleton className="h-5 w-16" />
                              <Skeleton className="h-5 w-16" />
                            </div>
                            <Skeleton className="h-8 w-8 rounded" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Card key={i}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <Skeleton className="h-5 w-60" />
                          <div className="flex items-center gap-2">
                            <Skeleton className="h-6 w-6 rounded" />
                            <Skeleton className="h-6 w-6 rounded" />
                          </div>
                        </div>
                        <Skeleton className="h-4 w-full mt-2" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {sortedProducts.length > 0 ? (
                viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {sortedProducts.map((product, index) => (
                      <ProductCard key={index} product={product} />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {sortedProducts.map((product, index) => (
                      <ProductListItem key={index} product={product} />
                    ))}
                  </div>
                )
              ) : (
                <Card className="border-dashed">
                  <CardContent className="py-12 text-center space-y-2">
                    <div className="text-lg font-medium">No data products found</div>
                    <div className="text-sm text-muted-foreground">Try adjusting your search or filters</div>
                    <div className="flex justify-center gap-2 pt-2">
                      <Button variant="outline" onClick={resetFilters}>Reset Filters</Button>
                      <Button onClick={loadData}>Reload</Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default DataCatalog;
