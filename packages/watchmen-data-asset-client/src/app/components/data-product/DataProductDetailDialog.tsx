import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { Badge } from "../ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { DataProduct } from "./model/DataProduct";
import { Calendar, Users, Package, Database, FileJson, Globe, Shield, DollarSign, CheckCircle, Tag } from "lucide-react";

interface DataProductDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: DataProduct;
}

export function DataProductDetailDialog({ open, onOpenChange, product }: DataProductDetailDialogProps) {
  const statusConfig = {
    development: { label: 'Development', className: 'bg-yellow-100 text-yellow-700' },
    production: { label: 'Production', className: 'bg-green-100 text-green-700' },
    deprecated: { label: 'Deprecated', className: 'bg-gray-100 text-gray-700' },
    sunset: { label: 'Sunset', className: 'bg-red-100 text-red-700' },
  };

  const visibilityConfig = {
    public: { label: 'Public', className: 'bg-blue-100 text-blue-700' },
    private: { label: 'Private', className: 'bg-purple-100 text-purple-700' },
    organization: { label: 'Organization', className: 'bg-indigo-100 text-indigo-700' },
  };

  const pricingConfig = {
    free: 'Free',
    subscription: 'Subscription',
    'usage-based': 'Usage-based',
  };

  const avgQuality = Math.round(
    (product.quality.completeness + product.quality.accuracy + 
     product.quality.timeliness + product.quality.consistency) / 4
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white">
              <Package className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-xl">{product.name}</DialogTitle>
              <DialogDescription className="flex items-center gap-2 mt-1">
                <span>{product.id}</span>
                <span>•</span>
                <span>{product.version}</span>
                <Badge className={statusConfig[product.status].className}>
                  {statusConfig[product.status].label}
                </Badge>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="mt-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="components">Data Components</TabsTrigger>
            <TabsTrigger value="quality">Quality</TabsTrigger>
            <TabsTrigger value="sla">SLA</TabsTrigger>
            <TabsTrigger value="metadata">Metadata</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-4">
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">Description</h3>
              <p className="text-sm text-gray-600">{product.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-900">Product Owner</span>
                </div>
                <p className="text-sm text-gray-600">{product.productOwner}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Globe className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-900">Visibility</span>
                </div>
                <Badge className={visibilityConfig[product.visibility].className}>
                  {visibilityConfig[product.visibility].label}
                </Badge>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-900">Created</span>
                </div>
                <p className="text-sm text-gray-600">{product.createdAt}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-900">Last Updated</span>
                </div>
                <p className="text-sm text-gray-600">{product.updatedAt}</p>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">Categories & Tags</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500 mb-2">Categories</p>
                  <div className="flex flex-wrap gap-2">
                    {product.categories.map((category, index) => (
                      <Badge key={index} variant="outline">{category}</Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-2">Tags</p>
                  <div className="flex flex-wrap gap-2">
                    {product.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="gap-1">
                        <Tag className="w-3 h-3" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">Pricing</span>
                </div>
                <p className="text-sm text-blue-700">{pricingConfig[product.pricing.model]}</p>
                {product.pricing.price && (
                  <p className="text-xs text-blue-600 mt-1">{product.pricing.price}</p>
                )}
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4 text-purple-600" />
                  <span className="text-sm font-medium text-purple-900">License</span>
                </div>
                <p className="text-sm text-purple-700">{product.license || 'Not specified'}</p>
              </div>
            </div>

            <div className="p-4 bg-green-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-900">Active Consumers</span>
              </div>
              <p className="text-2xl font-semibold text-green-900">{product.consumers}</p>
              <p className="text-xs text-green-700 mt-1">Teams or applications consuming this data product</p>
            </div>
          </TabsContent>

          <TabsContent value="components" className="space-y-6 mt-4">
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-4">Data Components Summary</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Database className="w-5 h-5 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">Datasets</span>
                  </div>
                  <p className="text-3xl font-semibold text-blue-900">{product.dataComponents.datasets}</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Globe className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-medium text-green-900">API Endpoints</span>
                  </div>
                  <p className="text-3xl font-semibold text-green-900">{product.dataComponents.apis}</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <FileJson className="w-5 h-5 text-purple-600" />
                    <span className="text-sm font-medium text-purple-900">File Resources</span>
                  </div>
                  <p className="text-3xl font-semibold text-purple-900">{product.dataComponents.files}</p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Component Details</h4>
              <p className="text-xs text-gray-500">
                Detailed component information including schemas, API specifications, and file formats 
                can be accessed through the ODPS metadata endpoint or the data product API documentation.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="quality" className="space-y-6 mt-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-900">Overall Quality Score</span>
                <span className="text-2xl font-semibold text-blue-900">{avgQuality}%</span>
              </div>
              <div className="h-2 bg-blue-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-600 rounded-full" 
                  style={{ width: `${avgQuality}%` }}
                ></div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-700">Completeness</span>
                  <span className="text-sm font-medium text-gray-900">{product.quality.completeness}%</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-600 rounded-full" 
                    style={{ width: `${product.quality.completeness}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">Percentage of required fields that are populated</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-700">Accuracy</span>
                  <span className="text-sm font-medium text-gray-900">{product.quality.accuracy}%</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-600 rounded-full" 
                    style={{ width: `${product.quality.accuracy}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">Data accuracy validated against business rules</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-700">Timeliness</span>
                  <span className="text-sm font-medium text-gray-900">{product.quality.timeliness}%</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-yellow-600 rounded-full" 
                    style={{ width: `${product.quality.timeliness}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">Data freshness and update frequency compliance</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-700">Consistency</span>
                  <span className="text-sm font-medium text-gray-900">{product.quality.consistency}%</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-orange-600 rounded-full" 
                    style={{ width: `${product.quality.consistency}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">Cross-system data consistency validation</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="sla" className="space-y-6 mt-4">
            {product.sla ? (
              <>
                <div className="grid grid-cols-1 gap-4">
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium text-green-900">Availability</span>
                    </div>
                    <p className="text-2xl font-semibold text-green-900">{product.sla.availability}</p>
                    <p className="text-xs text-green-700 mt-1">System uptime guarantee</p>
                  </div>

                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-900">Response Time</span>
                    </div>
                    <p className="text-2xl font-semibold text-blue-900">{product.sla.responseTime}</p>
                    <p className="text-xs text-blue-700 mt-1">API response time guarantee</p>
                  </div>

                  <div className="p-4 bg-purple-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-4 h-4 text-purple-600" />
                      <span className="text-sm font-medium text-purple-900">Update Frequency</span>
                    </div>
                    <p className="text-2xl font-semibold text-purple-900">{product.sla.updateFrequency}</p>
                    <p className="text-xs text-purple-700 mt-1">Data refresh schedule</p>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">SLA Compliance</h4>
                  <p className="text-xs text-gray-600">
                    Service Level Agreements define the performance standards and guarantees for this data product. 
                    Violations are monitored and reported in the quality management dashboard.
                  </p>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No SLA defined</p>
                <p className="text-sm text-gray-400 mt-1">Service level agreements have not been configured for this data product</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="metadata" className="space-y-6 mt-4">
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">ODPS Compliant Metadata</h3>
              <p className="text-xs text-gray-500 mb-4">
                Complete metadata structure following Open Data Product Specification v3.0
              </p>
              <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto text-xs font-mono max-h-96 overflow-y-auto">
{JSON.stringify({
  product: {
    id: product.id,
    version: product.version,
    name: product.name,
    description: product.description,
    productOwner: product.productOwner,
    visibility: product.visibility,
    status: product.status,
    categories: product.categories,
    tags: product.tags,
    created: product.createdAt,
    updated: product.updatedAt,
  },
  dataComponents: product.dataComponents,
  quality: product.quality,
  sla: product.sla,
  pricing: product.pricing,
  license: product.license,
  consumers: product.consumers,
  compliance: {
    odpsVersion: '3.0',
    lastValidated: new Date().toISOString().split('T')[0],
    status: 'compliant',
  },
}, null, 2)}
              </pre>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
