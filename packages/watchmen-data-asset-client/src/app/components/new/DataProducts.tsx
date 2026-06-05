import { Package, Plus, Database, BarChart3, Layout, FileText, Users, Star, ChevronRight } from "lucide-react";

interface DataProduct {
  id: string;
  name: string;
  description: string;
  owner: string;
  domain: string;
  datasets: number;
  metrics: number;
  dashboards: number;
  rating: number;
  tags: string[];
  updatedAt: string;
}

const dataProducts: DataProduct[] = [
  { id: '1', name: 'Broker 360', description: 'Complete view of broker performance and commission data', owner: 'Sarah Chen', domain: 'Broker', datasets: 8, metrics: 24, dashboards: 5, rating: 4.8, tags: ['Sales', 'Commission'], updatedAt: '2024-01-15' },
  { id: '2', name: 'Customer 360', description: 'Unified customer master with policy and claims history', owner: 'John Smith', domain: 'Customer', datasets: 12, metrics: 36, dashboards: 8, rating: 4.9, tags: ['PII', 'Master Data'], updatedAt: '2024-01-14' },
  { id: '3', name: 'Claims Analytics', description: 'Comprehensive claims analysis and fraud detection', owner: 'Mike Johnson', domain: 'Claims', datasets: 15, metrics: 42, dashboards: 10, rating: 4.7, tags: ['Analytics', 'Fraud'], updatedAt: '2024-01-13' },
  { id: '4', name: 'Financial Performance', description: 'Financial metrics and performance reporting', owner: 'Emily Wang', domain: 'Finance', datasets: 10, metrics: 30, dashboards: 7, rating: 4.6, tags: ['Financial', 'Reporting'], updatedAt: '2024-01-12' },
  { id: '5', name: 'Product Insights', description: 'Product performance and market analysis', owner: 'David Lee', domain: 'Product', datasets: 7, metrics: 18, dashboards: 4, rating: 4.5, tags: ['Product', 'Market'], updatedAt: '2024-01-11' },
  { id: '6', name: 'Agent Effectiveness', description: 'Agent performance and productivity metrics', owner: 'Lisa Brown', domain: 'Broker', datasets: 6, metrics: 22, dashboards: 6, rating: 4.4, tags: ['Agents', 'Performance'], updatedAt: '2024-01-10' },
];

export function DataProducts() {
  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Data Products</h1>
          <p className="text-slate-600">Transform technical data into business-ready products</p>
        </div>
        <button className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-5 py-2.5 rounded-xl font-medium hover:shadow-lg transition-all">
          <Plus className="w-5 h-5" />
          Create Product
        </button>
      </div>

      <div className="grid grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-slate-500 text-sm">Total Products</p>
            <Package className="w-5 h-5 text-indigo-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900">{dataProducts.length}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-slate-500 text-sm">Datasets</p>
            <Database className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900">{dataProducts.reduce((sum, p) => sum + p.datasets, 0)}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-slate-500 text-sm">Metrics</p>
            <BarChart3 className="w-5 h-5 text-purple-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900">{dataProducts.reduce((sum, p) => sum + p.metrics, 0)}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-slate-500 text-sm">Dashboards</p>
            <Layout className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900">{dataProducts.reduce((sum, p) => sum + p.dashboards, 0)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {dataProducts.map((product) => (
          <div key={product.id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-lg transition-all cursor-pointer group">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div className="flex items-center gap-1 text-amber-500">
                <Star className="w-4 h-4 fill-current" />
                <span className="text-sm font-semibold">{product.rating}</span>
              </div>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors">{product.name}</h3>
            <p className="text-slate-600 text-sm mb-4 line-clamp-2">{product.description}</p>
            
            <div className="grid grid-cols-3 gap-4 mb-4 p-4 bg-slate-50 rounded-xl">
              <div className="text-center">
                <p className="text-2xl font-bold text-slate-900">{product.datasets}</p>
                <p className="text-xs text-slate-500">Datasets</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-slate-900">{product.metrics}</p>
                <p className="text-xs text-slate-500">Metrics</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-slate-900">{product.dashboards}</p>
                <p className="text-xs text-slate-500">Dashboards</p>
              </div>
            </div>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xs font-semibold">
                {product.owner.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">{product.owner}</p>
                <p className="text-xs text-slate-500">{product.domain} Domain</p>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-4">
              {product.tags.map((tag, idx) => (
                <span key={idx} className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium">
                  {tag}
                </span>
              ))}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <span className="text-xs text-slate-500">Updated {product.updatedAt}</span>
              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
