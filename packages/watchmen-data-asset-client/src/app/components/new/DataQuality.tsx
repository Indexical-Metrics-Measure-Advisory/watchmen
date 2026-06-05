import { CheckCircle2, AlertTriangle, XCircle, Plus, Database, Clock, Target, TrendingUp, ChevronRight } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface QualityRule {
  id: string;
  name: string;
  description: string;
  type: 'null' | 'duplicate' | 'range' | 'consistency';
  dataset: string;
  status: 'passing' | 'warning' | 'failing';
  passRate: number;
  lastRun: string;
}

const qualityRules: QualityRule[] = [
  { id: '1', name: 'Customer Email Not Null', description: 'Ensure customer email is always populated', type: 'null', dataset: 'Customer Master', status: 'passing', passRate: 99.8, lastRun: '2024-01-15 08:00' },
  { id: '2', name: 'Policy ID Uniqueness', description: 'Check for duplicate policy IDs', type: 'duplicate', dataset: 'Policy Summary', status: 'warning', passRate: 96.5, lastRun: '2024-01-15 07:00' },
  { id: '3', name: 'Premium Range Check', description: 'Ensure premium amounts are within valid range', type: 'range', dataset: 'Policy Summary', status: 'passing', passRate: 98.9, lastRun: '2024-01-15 06:00' },
  { id: '4', name: 'Claims Date Consistency', description: 'Verify claim dates are logically consistent', type: 'consistency', dataset: 'Claims Transaction', status: 'failing', passRate: 87.2, lastRun: '2024-01-15 09:00' },
  { id: '5', name: 'Broker ID Reference', description: 'Check broker ID references are valid', type: 'consistency', dataset: 'Commission Calculation', status: 'passing', passRate: 99.5, lastRun: '2024-01-15 05:00' },
  { id: '6', name: 'Phone Number Format', description: 'Validate phone number format consistency', type: 'range', dataset: 'Customer Master', status: 'warning', passRate: 94.3, lastRun: '2024-01-15 04:00' },
];

const qualityTrendData = [
  { date: 'Jan 9', score: 92.5 },
  { date: 'Jan 10', score: 93.2 },
  { date: 'Jan 11', score: 94.8 },
  { date: 'Jan 12', score: 94.1 },
  { date: 'Jan 13', score: 95.2 },
  { date: 'Jan 14', score: 94.7 },
  { date: 'Jan 15', score: 95.5 },
];

export function DataQuality() {
  const overallScore = qualityRules.reduce((sum, rule) => sum + rule.passRate, 0) / qualityRules.length;
  const passingRules = qualityRules.filter(r => r.status === 'passing').length;
  const warningRules = qualityRules.filter(r => r.status === 'warning').length;
  const failingRules = qualityRules.filter(r => r.status === 'failing').length;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passing': return CheckCircle2;
      case 'warning': return AlertTriangle;
      case 'failing': return XCircle;
      default: return CheckCircle2;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passing': return 'text-emerald-600 bg-emerald-100';
      case 'warning': return 'text-amber-600 bg-amber-100';
      case 'failing': return 'text-red-600 bg-red-100';
      default: return 'text-slate-600 bg-slate-100';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'null': return 'bg-blue-100 text-blue-700';
      case 'duplicate': return 'bg-purple-100 text-purple-700';
      case 'range': return 'bg-orange-100 text-orange-700';
      case 'consistency': return 'bg-emerald-100 text-emerald-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Data Quality</h1>
          <p className="text-slate-600">Monitor and improve the quality of your data assets</p>
        </div>
        <button className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-5 py-2.5 rounded-xl font-medium hover:shadow-lg transition-all">
          <Plus className="w-5 h-5" />
          New Rule
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <div className="lg:col-span-1 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <CheckCircle2 className="w-8 h-8" />
            <TrendingUp className="w-6 h-6" />
          </div>
          <p className="text-emerald-100 text-sm mb-1">Overall Quality Score</p>
          <p className="text-4xl font-bold">{overallScore.toFixed(1)}%</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-slate-500 text-sm">Passing</p>
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-3xl font-bold text-emerald-600">{passingRules}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-slate-500 text-sm">Warnings</p>
            <AlertTriangle className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-3xl font-bold text-amber-600">{warningRules}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-slate-500 text-sm">Failing</p>
            <XCircle className="w-5 h-5 text-red-500" />
          </div>
          <p className="text-3xl font-bold text-red-600">{failingRules}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-slate-500 text-sm">Total Rules</p>
            <Target className="w-5 h-5 text-indigo-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900">{qualityRules.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900 mb-6">Quality Score Trend</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={qualityTrendData}>
                <defs>
                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis domain={[90, 100]} axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                />
                <Area type="monotone" dataKey="score" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900 mb-6">Rules by Type</h3>
          <div className="space-y-4">
            {[
              { type: 'Null Check', count: 12, color: 'bg-blue-500' },
              { type: 'Duplicate Check', count: 8, color: 'bg-purple-500' },
              { type: 'Range Check', count: 15, color: 'bg-orange-500' },
              { type: 'Consistency Check', count: 10, color: 'bg-emerald-500' },
            ].map((item, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${item.color}`} />
                  <span className="text-slate-700">{item.type}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-32 bg-slate-100 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${item.color}`}
                      style={{ width: `${(item.count / 15) * 100}%` }}
                    />
                  </div>
                  <span className="font-semibold text-slate-900 w-8">{item.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <h3 className="text-lg font-semibold text-slate-900 mb-6">Quality Rules</h3>
        <div className="space-y-4">
          {qualityRules.map((rule) => {
            const StatusIcon = getStatusIcon(rule.status);
            return (
              <div key={rule.id} className="flex items-center justify-between p-5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl ${getStatusColor(rule.status)} flex items-center justify-center`}>
                    <StatusIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h4 className="font-semibold text-slate-900">{rule.name}</h4>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getTypeColor(rule.type)}`}>
                        {rule.type.charAt(0).toUpperCase() + rule.type.slice(1)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 mb-2">{rule.description}</p>
                    <div className="flex items-center gap-4 text-sm text-slate-500">
                      <span className="flex items-center gap-1">
                        <Database className="w-4 h-4" />
                        {rule.dataset}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {rule.lastRun}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-2xl font-bold text-slate-900">{rule.passRate}%</p>
                    <p className="text-xs text-slate-500">Pass Rate</p>
                  </div>
                  <div className="w-24 bg-slate-100 rounded-full h-3">
                    <div 
                      className={`h-3 rounded-full ${
                        rule.status === 'passing' ? 'bg-emerald-500' :
                        rule.status === 'warning' ? 'bg-amber-500' :
                        'bg-red-500'
                      }`}
                      style={{ width: `${rule.passRate}%` }}
                    />
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
