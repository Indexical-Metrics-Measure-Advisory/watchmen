import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";

interface CreateDataProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateProduct: (data: any) => void;
  editMode?: boolean;
  initialData?: any;
  onUpdateProduct?: (data: any) => void;
}

export function CreateDataProductDialog({ open, onOpenChange, onCreateProduct, editMode, initialData, onUpdateProduct }: CreateDataProductDialogProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    version: initialData?.version || 'v1.0.0',
    description: initialData?.description || '',
    productOwner: initialData?.productOwner || '',
    categories: initialData?.categories || [] as string[],
    visibility: initialData?.visibility || 'organization',
    status: initialData?.status || 'development',
    tags: initialData?.tags || [] as string[],
    pricing: {
      model: initialData?.pricing?.model || 'free' as 'free' | 'subscription' | 'usage-based',
      price: initialData?.pricing?.price || '',
    },
    license: initialData?.license || '',
    dataComponents: {
      datasets: initialData?.dataComponents?.datasets || 0,
      apis: initialData?.dataComponents?.apis || 0,
      files: initialData?.dataComponents?.files || 0,
    },
    quality: {
      completeness: initialData?.quality?.completeness || 0,
      accuracy: initialData?.quality?.accuracy || 0,
      timeliness: initialData?.quality?.timeliness || 0,
      consistency: initialData?.quality?.consistency || 0,
    },
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        version: initialData.version || 'v1.0.0',
        description: initialData.description || '',
        productOwner: initialData.productOwner || '',
        categories: initialData.categories || [] as string[],
        visibility: initialData.visibility || 'organization',
        status: initialData.status || 'development',
        tags: initialData.tags || [] as string[],
        pricing: {
          model: initialData.pricing?.model || 'free' as 'free' | 'subscription' | 'usage-based',
          price: initialData.pricing?.price || '',
        },
        license: initialData.license || '',
        dataComponents: {
          datasets: initialData.dataComponents?.datasets || 0,
          apis: initialData.dataComponents?.apis || 0,
          files: initialData.dataComponents?.files || 0,
        },
        quality: {
          completeness: initialData.quality?.completeness || 0,
          accuracy: initialData.quality?.accuracy || 0,
          timeliness: initialData.quality?.timeliness || 0,
          consistency: initialData.quality?.consistency || 0,
        },
      });
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editMode && onUpdateProduct) {
      onUpdateProduct(formData);
    } else {
      onCreateProduct(formData);
    }
    setFormData({
      name: '',
      version: 'v1.0.0',
      description: '',
      productOwner: '',
      categories: [],
      visibility: 'organization',
      status: 'development',
      tags: [],
      pricing: {
        model: 'free',
        price: '',
      },
      license: '',
      dataComponents: {
        datasets: 0,
        apis: 0,
        files: 0,
      },
      quality: {
        completeness: 0,
        accuracy: 0,
        timeliness: 0,
        consistency: 0,
      },
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{editMode ? 'Edit Data Product' : 'Create Data Product'}</DialogTitle>
          <DialogDescription>
            {editMode 
              ? 'Update the data product information based on Open Data Product Specification'
              : 'Create a new data product based on Open Data Product Specification'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="basic" className="py-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="access">Access Control</TabsTrigger>
              <TabsTrigger value="pricing">Pricing & License</TabsTrigger>
            </TabsList>
            
            <TabsContent value="basic" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Data Product Name *</Label>
                <Input
                  id="name"
                  placeholder="Enter data product name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="version">Version</Label>
                <Input
                  id="version"
                  placeholder="e.g., v1.0.0"
                  value={formData.version}
                  onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="productOwner">Product Owner *</Label>
                <Input
                  id="productOwner"
                  placeholder="Enter team or owner name"
                  value={formData.productOwner}
                  onChange={(e) => setFormData({ ...formData, productOwner: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Describe the content, purpose, and value of the data product"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select
                  value={formData.categories[0] || ''}
                  onValueChange={(value) => setFormData({ ...formData, categories: [value] })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select data product category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="User Data">User Data</SelectItem>
                    <SelectItem value="Business Data">Business Data</SelectItem>
                    <SelectItem value="Financial Data">Financial Data</SelectItem>
                    <SelectItem value="Operational Data">Operational Data</SelectItem>
                    <SelectItem value="Behavioral Data">Behavioral Data</SelectItem>
                    <SelectItem value="Marketing Data">Marketing Data</SelectItem>
                    <SelectItem value="Sales Data">Sales Data</SelectItem>
                    <SelectItem value="Supply Chain Data">Supply Chain Data</SelectItem>
                    <SelectItem value="AI/ML Model">AI/ML Model</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tags">Tags (comma-separated)</Label>
                <Input
                  id="tags"
                  placeholder="e.g., Real-time, Core Business, Analytics"
                  value={formData.tags.join(', ')}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value.split(',').map(t => t.trim()) })}
                />
              </div>
            </TabsContent>

            <TabsContent value="access" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="visibility">Visibility *</Label>
                <Select
                  value={formData.visibility}
                  onValueChange={(value) => setFormData({ ...formData, visibility: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select visibility level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public - Visible to everyone</SelectItem>
                    <SelectItem value="organization">Organization - Members only</SelectItem>
                    <SelectItem value="private">Private - Authorized users only</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  Control who can discover and access this data product
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status *</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="development">Development</SelectItem>
                    <SelectItem value="production">Production</SelectItem>
                    <SelectItem value="deprecated">Deprecated</SelectItem>
                    <SelectItem value="sunset">Sunset</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-900 font-medium mb-1">Access Control Notes</p>
                <p className="text-xs text-blue-700">
                  Detailed access control policies can be configured in the "Access Control" page after creating the data product
                </p>
              </div>
            </TabsContent>

            <TabsContent value="pricing" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pricingModel">Pricing Model *</Label>
                <Select
                  value={formData.pricing.model}
                  onValueChange={(value) => setFormData({ 
                    ...formData, 
                    pricing: { ...formData.pricing, model: value as 'free' | 'subscription' | 'usage-based' }
                  })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select pricing model" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="subscription">Subscription</SelectItem>
                    <SelectItem value="usage-based">Usage-based</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formData.pricing.model !== 'free' && (
                <div className="space-y-2">
                  <Label htmlFor="price">Price</Label>
                  <Input
                    id="price"
                    placeholder="e.g., $99/month or $0.01/query"
                    value={formData.pricing.price}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      pricing: { ...formData.pricing, price: e.target.value }
                    })}
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="license">License</Label>
                <Select
                  value={formData.license}
                  onValueChange={(value) => setFormData({ ...formData, license: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select data license (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CC BY 4.0">CC BY 4.0</SelectItem>
                    <SelectItem value="CC BY-SA 4.0">CC BY-SA 4.0</SelectItem>
                    <SelectItem value="CC BY-NC 4.0">CC BY-NC 4.0</SelectItem>
                    <SelectItem value="Apache 2.0">Apache 2.0</SelectItem>
                    <SelectItem value="MIT">MIT</SelectItem>
                    <SelectItem value="Proprietary">Proprietary License</SelectItem>
                    <SelectItem value="Internal Use Only">Internal Use Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{editMode ? 'Update Data Product' : 'Create Data Product'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}