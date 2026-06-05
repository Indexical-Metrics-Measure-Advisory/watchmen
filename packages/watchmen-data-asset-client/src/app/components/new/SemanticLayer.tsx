import { Brain, Plus, BarChart3, Layers, Database, Users, TrendingUp, ChevronRight } from "lucide-react";
import { useState } from "react";

interface SemanticMetric {
  id: string;
  name: string;
  description: string;
  formula: string;
  owner: string;
  domain: string;
  datasets: string[];
  usageCount: number;
  status: 'active' | 'draft' | 'deprecated';
}

const semanticMetrics: SemanticMetric[] = [
  { id: '1', name: 'Gross Premium', description: 'Total premium written before deductions', formula: 'SUM(policy.premium_amount)', owner: 'Emily Wang', domain: 'Finance', datasets: ['Policy Summary'], usageCount: 234, status: 'active' },
  { id: '2', name: 'Net Premium', description: 'Premium after commissions and fees', formula: 'Gross Premium - Commission - Fees', owner: 'Emily Wang', domain: 'Finance', datasets: ['Policy Summary', 'Commission Calculation'], usageCount: 189, status: 'active' },
  { id: '3', name: 'Loss Ratio', description: 'Ratio of losses to earned premium', formula: '(Incurred Losses / Earned Premium) * 100', owner: 'Mike Johnson', domain: 'Claims', datasets: ['Claims Transaction', 'Policy Summary'], usageCount: 156, status: 'active' },
  { id: '4', name: 'Renewal Rate', description: 'Percentage of policies renewed', formula: '(Renewed Policies / Expiring Policies) * 100', owner: 'Sarah Chen', domain: 'Policy', datasets: ['Policy Summary'], usageCount: 98, status: 'active' },
  { id: '5', name: 'Customer Lifetime Value', description: 'Total expected revenue from a customer', formula: 'Average Policy Value * Average Customer Tenure', owner: 'John Smith', domain: 'Customer', datasets: ['Customer Master', 'Policy Summary'], usageCount: 45, status: 'draft' },
  { id: '6', name: 'Commission Rate', description: 'Percentage of premium paid as commission', formula: '(Commission / Gross Premium) * 100', owner: 'Lisa Brown', domain: 'Broker', datasets: ['Commission Calculation', 'Policy Summary'], usageCount: 134, status: 'active' },
];

const entityModels = [
  { name: 'Customer', entities: 45, attributes: 234, metrics: 18 },
  { name: 'Policy', entities: 38, attributes: 189, metrics: 24 },
  { name: 'Claim', entities: 29, attributes: 156, metrics: 15 },
  { name: 'Broker', entities: 21, attributes: 98, metrics: 12 },
];

export function SemanticLayer() {
  const [selectedDomain, setSelectedDomain] = useState('All Domains');
  const [searchQuery, setSearchQuery] = useState('');

  const domains = ['All Domains', 'Policy', 'Claims', 'Finance', 'Customer', 'Broker'];

  const filteredMetrics = semanticMetrics.filter(metric => {
    const matchesSearch = metric.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         metric.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDomain = selectedDomain === 'All Domains' || metric.domain === selectedDomain;
    return matchesSearch && matchesDomain;
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Semantic Layer</h1>
          <p className="text-slate-600">Define business metrics and create a unified semantic model</p>
        </div>
        <button className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-5 py-2.5 rounded-xl font-medium hover:shadow-lg transition-all">
          <Plus className="w-5 h-5" />
          New Metric
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-slate-500 text-sm">Business Metrics</p>
            <BarChart3 className="w-5 h-5 text-indigo-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900">{semanticMetrics.length}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-slate-500 text-sm">Entity Models</p>
            <Layers className="w-5 h-5 text-purple-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900">{entityModels.length}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-slate-500 text-sm">Total Usages</p>
            <TrendingUp className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900">{semanticMetrics.reduce((sum, m) => sum + m.usageCount, 0)}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-slate-500 text-sm">Active Metrics</p>
            <Brain className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-3xl font-bold text-blue-600">{semanticMetrics.filter(m => m.status === 'active').length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900 mb-6">Entity Models</h3>
          <div className="space-y-3">
            {entityModels.map((model, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                    <Database className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{model.name}</p>
                    <p className="text-xs text-slate-500">{model.entities} entities</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-lg font-bold text-slate-900">{model.attributes}</p>
                    <p className="text-xs text-slate-500">Attributes</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-indigo-600">{model.metrics}</p>
                    <p className="text-xs text-slate-500">Metrics</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900 mb-6">AI Integration</h3>
          <div className="space-y-4">
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
              <div className="flex items-center gap-3 mb-2">
                <Brain className="w-6 h-6 text-emerald-600" />
                <span className="font-semibold text-emerald-900">Natural Language Query</span>
              </div>
              <p className="text-sm text-emerald-700">Ask questions in plain English about your business metrics</p>
            </div>
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
              <div className="flex items-center gap-3 mb-2">
                <BarChart3 className="w-6 h-6 text-blue-600" />
                <span className="font-semibold text-blue-900">Auto-Generated Visualizations</span>
              </div>
              <p className="text-sm text-blue-700">AI creates optimal charts based on your metrics</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
              <div className="flex items-center gap-3 mb-2">
                <Users className="w-6 h-6 text-purple-600" />
                <span className="font-semibold text-purple-900">Insight Recommendations</span>
              </div>
              <p className="text-sm text-purple-700">Get smart suggestions for metric analysis</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-slate-900">Semantic Metrics</h3>
          <div className="flex gap-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search metrics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              <BarChart3 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            </div>
            <select
              value={selectedDomain}
              onChange={(e) => setSelectedDomain(e.target.value)}
              className="px-4 py-2 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              {domains.map(domain => (
                <option key={domain} value={domain}>{domain}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-4">
          {filteredMetrics.map((metric) => (
            <div key={metric.id} className="flex items-start justify-between p-5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  <Brain className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h4 className="font-semibold text-slate-900">{metric.name}</h4>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      metric.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                      metric.status === 'draft' ? 'bg-amber-100 text-amber-700' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {metric.status.charAt(0).toUpperCase() + metric.status.slice(1)}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 mb-2">{metric.description}</p>
                  <div className="bg-slate-100 p-3 rounded-lg mb-3 font-mono text-sm text-slate-700">
                    {metric.formula}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-slate-500">
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      Owner: {metric.owner}
                    </span>
                    <span className="flex items-center gap-1">
                      <Layers className="w-4 h-4" />
                      Domain: {metric.domain}
                    </span>
                    <span className="flex items-center gap-1">
                      <TrendingUp className="w-4 h-4" />
                      Used {metric.usageCount}x
                    </span>
                  </div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400 mt-2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
