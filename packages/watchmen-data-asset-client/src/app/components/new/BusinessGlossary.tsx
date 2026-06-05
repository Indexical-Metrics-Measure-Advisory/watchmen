import { BookOpen, Plus, Search, Layers, Tag, User, Calendar, ChevronRight } from "lucide-react";
import { useState } from "react";

interface BusinessTerm {
  id: string;
  name: string;
  description: string;
  domain: string;
  owner: string;
  status: 'active' | 'draft' | 'deprecated';
  relatedTerms: string[];
  datasets: string[];
  createdAt: string;
}

const businessTerms: BusinessTerm[] = [
  { id: '1', name: 'Gross Premium', description: 'Total premium written before deductions and commissions', domain: 'Finance', owner: 'Emily Wang', status: 'active', relatedTerms: ['Net Premium', 'Written Premium'], datasets: ['Policy Summary', 'Commission Calculation'], createdAt: '2023-06-15' },
  { id: '2', name: 'Net Premium', description: 'Premium amount after deductions for commissions and fees', domain: 'Finance', owner: 'Emily Wang', status: 'active', relatedTerms: ['Gross Premium', 'Earned Premium'], datasets: ['Policy Summary', 'Financial Report'], createdAt: '2023-06-15' },
  { id: '3', name: 'Loss Ratio', description: 'Ratio of incurred losses to earned premiums, expressed as a percentage', domain: 'Claims', owner: 'Mike Johnson', status: 'active', relatedTerms: ['Claims Frequency', 'Severity'], datasets: ['Claims Transaction', 'Loss Analysis'], createdAt: '2023-07-20' },
  { id: '4', name: 'Renewal Rate', description: 'Percentage of policies renewed at expiration', domain: 'Policy', owner: 'Sarah Chen', status: 'active', relatedTerms: ['Retention Rate', 'Lapse Rate'], datasets: ['Policy Summary', 'Customer Master'], createdAt: '2023-08-10' },
  { id: '5', name: 'Customer Lifetime Value', description: 'Total revenue expected from a customer over their lifetime', domain: 'Customer', owner: 'John Smith', status: 'draft', relatedTerms: ['Churn Rate', 'Retention'], datasets: ['Customer Master', 'Policy Summary'], createdAt: '2024-01-05' },
  { id: '6', name: 'Commission Rate', description: 'Percentage of premium paid to brokers or agents', domain: 'Broker', owner: 'Lisa Brown', status: 'active', relatedTerms: ['Gross Commission', 'Net Commission'], datasets: ['Commission Calculation', 'Broker Performance'], createdAt: '2023-09-01' },
];

const domains = ['All Domains', 'Policy', 'Claims', 'Finance', 'Customer', 'Broker', 'Product'];
const statuses = ['All Statuses', 'Active', 'Draft', 'Deprecated'];

export function BusinessGlossary() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDomain, setSelectedDomain] = useState('All Domains');
  const [selectedStatus, setSelectedStatus] = useState('All Statuses');

  const filteredTerms = businessTerms.filter(term => {
    const matchesSearch = term.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         term.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDomain = selectedDomain === 'All Domains' || term.domain === selectedDomain;
    const matchesStatus = selectedStatus === 'All Statuses' || term.status === selectedStatus.toLowerCase();
    return matchesSearch && matchesDomain && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-100 text-emerald-700';
      case 'draft': return 'bg-amber-100 text-amber-700';
      case 'deprecated': return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Business Glossary</h1>
          <p className="text-slate-600">Unify business language and terminology across your organization</p>
        </div>
        <button className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-5 py-2.5 rounded-xl font-medium hover:shadow-lg transition-all">
          <Plus className="w-5 h-5" />
          Add Term
        </button>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search business terms..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
            />
          </div>
          <div className="flex gap-4">
            <select
              value={selectedDomain}
              onChange={(e) => setSelectedDomain(e.target.value)}
              className="px-4 py-3 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              {domains.map(domain => (
                <option key={domain} value={domain}>{domain}</option>
              ))}
            </select>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-4 py-3 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              {statuses.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <p className="text-slate-500 text-sm mb-1">Total Terms</p>
          <p className="text-3xl font-bold text-slate-900">{businessTerms.length}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <p className="text-slate-500 text-sm mb-1">Active Terms</p>
          <p className="text-3xl font-bold text-emerald-600">{businessTerms.filter(t => t.status === 'active').length}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <p className="text-slate-500 text-sm mb-1">Business Domains</p>
          <p className="text-3xl font-bold text-indigo-600">{new Set(businessTerms.map(t => t.domain)).size}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <p className="text-slate-500 text-sm mb-1">Drafts</p>
          <p className="text-3xl font-bold text-amber-600">{businessTerms.filter(t => t.status === 'draft').length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredTerms.map((term) => (
          <div key={term.id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-all cursor-pointer">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(term.status)}`}>
                {term.status.charAt(0).toUpperCase() + term.status.slice(1)}
              </span>
            </div>
            
            <h3 className="text-xl font-bold text-slate-900 mb-2">{term.name}</h3>
            <p className="text-slate-600 text-sm mb-4 line-clamp-2">{term.description}</p>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Layers className="w-4 h-4 text-slate-400" />
                <span className="text-slate-600">Domain:</span>
                <span className="font-medium text-slate-900">{term.domain}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <User className="w-4 h-4 text-slate-400" />
                <span className="text-slate-600">Owner:</span>
                <span className="font-medium text-slate-900">{term.owner}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span className="text-slate-600">Created:</span>
                <span className="font-medium text-slate-900">{term.createdAt}</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="mb-3">
                <p className="text-xs font-medium text-slate-500 mb-2">Related Terms</p>
                <div className="flex flex-wrap gap-2">
                  {term.relatedTerms.map((related, idx) => (
                    <span key={idx} className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium">
                      {related}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 mb-2">Related Datasets</p>
                <div className="flex flex-wrap gap-2">
                  {term.datasets.map((dataset, idx) => (
                    <span key={idx} className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                      {dataset}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
