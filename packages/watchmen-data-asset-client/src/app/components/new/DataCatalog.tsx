import { Search, Filter, Database, Table, Eye, Plus, Tag, User, Calendar, ChevronRight } from "lucide-react";
import { useState } from "react";

interface Dataset {
  id: string;
  name: string;
  description: string;
  type: 'table' | 'view' | 'topic' | 'api';
  owner: string;
  domain: string;
  tags: string[];
  updatedAt: string;
  rows: number;
  columns: number;
}

const datasets: Dataset[] = [
  { id: '1', name: 'Customer Master', description: 'Comprehensive customer master data', type: 'table', owner: 'John Smith', domain: 'Customer', tags: ['PII', 'Master Data'], updatedAt: '2024-01-15', rows: 156000, columns: 45 },
  { id: '2', name: 'Policy Summary', description: 'Daily snapshot of policy data', type: 'view', owner: 'Sarah Chen', domain: 'Policy', tags: ['Financial'], updatedAt: '2024-01-14', rows: 890000, columns: 67 },
  { id: '3', name: 'Claims Transaction', description: 'Real-time claims transaction log', type: 'topic', owner: 'Mike Johnson', domain: 'Claims', tags: ['Transactional', 'Streaming'], updatedAt: '2024-01-15', rows: 2300000, columns: 34 },
  { id: '4', name: 'Commission Calculation', description: 'Broker commission calculation', type: 'table', owner: 'Emily Wang', domain: 'Finance', tags: ['Financial', 'PII'], updatedAt: '2024-01-13', rows: 45000, columns: 52 },
  { id: '5', name: 'Product Catalog API', description: 'Product catalog data access', type: 'api', owner: 'David Lee', domain: 'Product', tags: ['API', 'External'], updatedAt: '2024-01-12', rows: 0, columns: 0 },
  { id: '6', name: 'Agent Performance', description: 'Agent performance metrics', type: 'view', owner: 'Lisa Brown', domain: 'Broker', tags: ['Metrics'], updatedAt: '2024-01-15', rows: 12000, columns: 28 },
];

const types = ['All Types', 'Table', 'View', 'Topic', 'API'];
const domains = ['All Domains', 'Customer', 'Policy', 'Claims', 'Finance', 'Product', 'Broker'];

export function DataCatalog() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('All Types');
  const [selectedDomain, setSelectedDomain] = useState('All Domains');

  const filteredDatasets = datasets.filter(dataset => {
    const matchesSearch = dataset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         dataset.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === 'All Types' || dataset.type === selectedType.toLowerCase();
    const matchesDomain = selectedDomain === 'All Domains' || dataset.domain === selectedDomain;
    return matchesSearch && matchesType && matchesDomain;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'table': return Table;
      case 'view': return Eye;
      case 'topic': return Database;
      case 'api': return ChevronRight;
      default: return Table;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'table': return 'bg-blue-100 text-blue-700';
      case 'view': return 'bg-purple-100 text-purple-700';
      case 'topic': return 'bg-emerald-100 text-emerald-700';
      case 'api': return 'bg-orange-100 text-orange-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Data Catalog</h1>
          <p className="text-slate-600">Discover and explore your data assets</p>
        </div>
        <button className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-5 py-2.5 rounded-xl font-medium hover:shadow-lg transition-all">
          <Plus className="w-5 h-5" />
          Add Dataset
        </button>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search datasets by name, description, or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
            />
          </div>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-slate-400" />
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-4 py-3 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                {types.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <select
              value={selectedDomain}
              onChange={(e) => setSelectedDomain(e.target.value)}
              className="px-4 py-3 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              {domains.map(domain => (
                <option key={domain} value={domain}>{domain}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <p className="text-slate-500 text-sm mb-1">Total Datasets</p>
          <p className="text-3xl font-bold text-slate-900">{datasets.length}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <p className="text-slate-500 text-sm mb-1">Tables</p>
          <p className="text-3xl font-bold text-blue-600">{datasets.filter(d => d.type === 'table').length}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <p className="text-slate-500 text-sm mb-1">Views</p>
          <p className="text-3xl font-bold text-purple-600">{datasets.filter(d => d.type === 'view').length}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <p className="text-slate-500 text-sm mb-1">Topics</p>
          <p className="text-3xl font-bold text-emerald-600">{datasets.filter(d => d.type === 'topic').length}</p>
        </div>
      </div>

      <div className="space-y-4">
        {filteredDatasets.map((dataset) => {
          const TypeIcon = getTypeIcon(dataset.type);
          return (
            <div key={dataset.id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-all cursor-pointer">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl ${getTypeColor(dataset.type)} flex items-center justify-center`}>
                    <TypeIcon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-slate-900">{dataset.name}</h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(dataset.type)}`}>
                        {dataset.type.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-slate-600 text-sm mb-3">{dataset.description}</p>
                    <div className="flex items-center gap-6 text-sm">
                      <div className="flex items-center gap-2 text-slate-500">
                        <User className="w-4 h-4" />
                        <span>{dataset.owner}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-500">
                        <Tag className="w-4 h-4" />
                        <span>{dataset.domain}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-500">
                        <Calendar className="w-4 h-4" />
                        <span>{dataset.updatedAt}</span>
                      </div>
                      {dataset.rows > 0 && (
                        <>
                          <div className="flex items-center gap-2 text-slate-500">
                            <span className="font-medium text-slate-700">{dataset.rows.toLocaleString()}</span>
                            <span>rows</span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-500">
                            <span className="font-medium text-slate-700">{dataset.columns}</span>
                            <span>columns</span>
                          </div>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      {dataset.tags.map((tag, idx) => (
                        <span key={idx} className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-medium">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
