import { Shield, Plus, User, Lock, FileCheck, AlertTriangle, CheckCircle2, Users, Tag, ChevronRight } from "lucide-react";
import { useState } from "react";

interface GovernanceRule {
  id: string;
  name: string;
  description: string;
  type: 'ownership' | 'classification' | 'policy' | 'compliance';
  owner: string;
  status: 'active' | 'pending' | 'inactive';
  assets: number;
  lastAudit: string;
}

const governanceRules: GovernanceRule[] = [
  { id: '1', name: 'PII Data Classification', description: 'Classify and protect personally identifiable information', type: 'classification', owner: 'Emily Wang', status: 'active', assets: 45, lastAudit: '2024-01-10' },
  { id: '2', name: 'GDPR Compliance', description: 'Ensure compliance with GDPR regulations', type: 'compliance', owner: 'Legal Team', status: 'active', assets: 89, lastAudit: '2024-01-08' },
  { id: '3', name: 'Data Owner Assignment', description: 'Assign data owners to all critical datasets', type: 'ownership', owner: 'John Smith', status: 'active', assets: 156, lastAudit: '2024-01-12' },
  { id: '4', name: 'Access Control Policy', description: 'Define and enforce data access controls', type: 'policy', owner: 'Security Team', status: 'active', assets: 234, lastAudit: '2024-01-05' },
  { id: '5', name: 'Data Retention Policy', description: 'Manage data retention and archival', type: 'policy', owner: 'Emily Wang', status: 'pending', assets: 67, lastAudit: '2023-12-20' },
  { id: '6', name: 'MAS Notice 637', description: 'Compliance with MAS regulations', type: 'compliance', owner: 'Compliance Team', status: 'active', assets: 78, lastAudit: '2024-01-09' },
];

const dataClassifications = [
  { level: 'Public', color: 'bg-slate-100 text-slate-700', description: 'Data that can be freely shared' },
  { level: 'Internal', color: 'bg-blue-100 text-blue-700', description: 'Data for internal use only' },
  { level: 'Confidential', color: 'bg-orange-100 text-orange-700', description: 'Sensitive internal data' },
  { level: 'Restricted', color: 'bg-red-100 text-red-700', description: 'Highly restricted data' },
];

export function DataGovernance() {
  const [selectedType, setSelectedType] = useState('All Types');

  const types = ['All Types', 'Ownership', 'Classification', 'Policy', 'Compliance'];

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Data Governance</h1>
          <p className="text-slate-600">Establish trust and compliance in your data ecosystem</p>
        </div>
        <button className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-5 py-2.5 rounded-xl font-medium hover:shadow-lg transition-all">
          <Plus className="w-5 h-5" />
          New Rule
        </button>
      </div>

      <div className="grid grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-slate-500 text-sm">Governance Rules</p>
            <Shield className="w-5 h-5 text-indigo-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900">{governanceRules.length}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-slate-500 text-sm">Active Rules</p>
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-3xl font-bold text-emerald-600">{governanceRules.filter(r => r.status === 'active').length}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-slate-500 text-sm">Covered Assets</p>
            <FileCheck className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900">{governanceRules.reduce((sum, r) => sum + r.assets, 0)}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-slate-500 text-sm">Compliance Frameworks</p>
            <Lock className="w-5 h-5 text-purple-500" />
          </div>
          <p className="text-3xl font-bold text-purple-600">3</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Data Classification Levels</h3>
          <div className="space-y-3">
            {dataClassifications.map((classification, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 rounded-xl border border-slate-200">
                <div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${classification.color}`}>
                    {classification.level}
                  </span>
                  <p className="text-sm text-slate-500 mt-2">{classification.description}</p>
                </div>
                <span className="text-2xl font-bold text-slate-900">
                  {idx === 0 ? '45' : idx === 1 ? '123' : idx === 2 ? '78' : '10'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Role Assignments</h3>
          <div className="space-y-4">
            {[
              { role: 'Data Owners', count: 24, icon: User, color: 'text-blue-600' },
              { role: 'Data Stewards', count: 18, icon: Users, color: 'text-purple-600' },
              { role: 'Business Owners', count: 12, icon: Shield, color: 'text-emerald-600' },
            ].map((role, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <role.icon className={`w-6 h-6 ${role.color}`} />
                  <span className="font-medium text-slate-900">{role.role}</span>
                </div>
                <span className="text-2xl font-bold text-slate-900">{role.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-slate-900">Governance Rules</h3>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-4 py-2 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            {types.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        <div className="space-y-4">
          {governanceRules.map((rule) => {
            const getTypeIcon = () => {
              switch (rule.type) {
                case 'ownership': return Users;
                case 'classification': return Tag;
                case 'policy': return FileCheck;
                case 'compliance': return Shield;
                default: return Shield;
              }
            };

            const getTypeColor = () => {
              switch (rule.type) {
                case 'ownership': return 'bg-blue-500';
                case 'classification': return 'bg-purple-500';
                case 'policy': return 'bg-orange-500';
                case 'compliance': return 'bg-emerald-500';
                default: return 'bg-slate-500';
              }
            };

            const Icon = getTypeIcon();

            return (
              <div key={rule.id} className="flex items-center justify-between p-5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl ${getTypeColor()} flex items-center justify-center`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h4 className="font-semibold text-slate-900">{rule.name}</h4>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        rule.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                        rule.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {rule.status.charAt(0).toUpperCase() + rule.status.slice(1)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 mb-2">{rule.description}</p>
                    <div className="flex items-center gap-4 text-sm text-slate-500">
                      <span>Owner: <span className="font-medium text-slate-700">{rule.owner}</span></span>
                      <span>Assets: <span className="font-medium text-slate-700">{rule.assets}</span></span>
                      <span>Last Audit: <span className="font-medium text-slate-700">{rule.lastAudit}</span></span>
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400" />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
