import { Network, ArrowRight, Database, Layers, TrendingUp, AlertTriangle, Info } from "lucide-react";
import { useState } from "react";

interface LineageNode {
  id: string;
  name: string;
  type: 'source' | 'raw' | 'ods' | 'domain' | 'datamart' | 'metric' | 'dashboard';
  color: string;
  icon: any;
}

const lineageLevels: { type: string; name: string; color: string }[] = [
  { type: 'source', name: 'Source', color: 'bg-orange-500' },
  { type: 'raw', name: 'Raw', color: 'bg-yellow-500' },
  { type: 'ods', name: 'ODS', color: 'bg-blue-500' },
  { type: 'domain', name: 'Domain', color: 'bg-indigo-500' },
  { type: 'datamart', name: 'Datamart', color: 'bg-purple-500' },
  { type: 'metric', name: 'Metrics', color: 'bg-emerald-500' },
  { type: 'dashboard', name: 'Dashboard', color: 'bg-pink-500' },
];

const lineageData = {
  source: ['Customer DB', 'Policy DB', 'Claims API', 'Broker System'],
  raw: ['Raw Customer', 'Raw Policy', 'Raw Claims', 'Raw Broker'],
  ods: ['ODS Customer', 'ODS Policy', 'ODS Claims', 'ODS Broker'],
  domain: ['Customer Domain', 'Policy Domain', 'Claims Domain', 'Broker Domain'],
  datamart: ['Sales DM', 'Claims DM', 'Customer DM', 'Finance DM'],
  metric: ['Gross Premium', 'Loss Ratio', 'Renewal Rate', 'Commission'],
  dashboard: ['Executive Dashboard', 'Sales Performance', 'Claims Analysis', 'Customer Insights'],
};

export function DataLineage() {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Data Lineage</h1>
          <p className="text-slate-600">Track data flows and dependencies across your pipeline</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 border border-slate-200 rounded-xl bg-white text-slate-700 font-medium hover:bg-slate-50 transition-colors">
            <Info className="w-5 h-5 inline mr-2" />
            View Legend
          </button>
          <button className="px-4 py-2 border border-slate-200 rounded-xl bg-white text-slate-700 font-medium hover:bg-slate-50 transition-colors">
            <Layers className="w-5 h-5 inline mr-2" />
            Change View
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-slate-500 text-sm">Total Lineage Relations</p>
            <Network className="w-5 h-5 text-indigo-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900">1,247</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-slate-500 text-sm">Upstream Dependencies</p>
            <ArrowRight className="w-5 h-5 text-blue-500 rotate-180" />
          </div>
          <p className="text-3xl font-bold text-slate-900">856</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-slate-500 text-sm">Downstream Impacts</p>
            <ArrowRight className="w-5 h-5 text-purple-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900">391</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 mb-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-slate-900">Lineage Flow</h3>
          <select className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white">
            <option>Customer Domain</option>
            <option>Policy Domain</option>
            <option>Claims Domain</option>
            <option>Broker Domain</option>
          </select>
        </div>

        <div className="relative overflow-x-auto">
          <div className="flex gap-4 min-w-max pb-4">
            {lineageLevels.map((level, levelIdx) => (
              <div key={level.type} className="flex flex-col gap-3">
                <div className={`${level.color} text-white px-4 py-2 rounded-lg text-center font-semibold text-sm`}>
                  {level.name}
                </div>
                <div className="flex flex-col gap-3">
                  {(lineageData as any)[level.type].map((node: string, nodeIdx: number) => (
                    <div
                      key={node}
                      onClick={() => setSelectedNode(node)}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        selectedNode === node
                          ? 'border-indigo-500 bg-indigo-50 shadow-md'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Database className={`w-4 h-4 ${selectedNode === node ? 'text-indigo-600' : 'text-slate-400'}`} />
                        <span className={`text-sm font-medium ${selectedNode === node ? 'text-indigo-900' : 'text-slate-700'}`}>
                          {node}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span className="px-2 py-0.5 bg-slate-100 rounded-full">5 tables</span>
                        <span className="px-2 py-0.5 bg-slate-100 rounded-full">23 cols</span>
                      </div>
                    </div>
                  ))}
                </div>
                {levelIdx < lineageLevels.length - 1 && (
                  <div className="flex justify-center py-2">
                    <ArrowRight className="w-6 h-6 text-slate-300" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {selectedNode && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-1">{selectedNode}</h3>
              <p className="text-slate-500 text-sm">Impact Analysis & Dependencies</p>
            </div>
            <button className="px-4 py-2 bg-amber-50 text-amber-700 rounded-xl font-medium text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Impact Analysis
            </button>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                <ArrowRight className="w-4 h-4 text-blue-500 rotate-180" />
                Upstream Sources (8)
              </h4>
              <div className="space-y-2">
                {['Customer DB', 'User Profiles', 'Account History', 'Transaction Log'].map((src, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
                    <Database className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-blue-900">{src}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                <ArrowRight className="w-4 h-4 text-purple-500" />
                Downstream Targets (15)
              </h4>
              <div className="space-y-2">
                {['Customer Domain', 'Sales Datamart', 'Executive Dashboard', 'Customer Insights'].map((tgt, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-purple-50 rounded-xl border border-purple-100">
                    <Database className="w-4 h-4 text-purple-600" />
                    <span className="text-sm text-purple-900">{tgt}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
