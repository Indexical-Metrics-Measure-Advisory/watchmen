import { Package, Search, Database, Network, BookOpen, Shield, CheckCircle2, Brain, LayoutDashboard } from "lucide-react";

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'catalog', label: 'Data Catalog', icon: Database },
    { id: 'products', label: 'Data Products', icon: Package },
    { id: 'lineage', label: 'Data Lineage', icon: Network },
    { id: 'glossary', label: 'Business Glossary', icon: BookOpen },
    { id: 'governance', label: 'Data Governance', icon: Shield },
    { id: 'quality', label: 'Data Quality', icon: CheckCircle2 },
    { id: 'semantic', label: 'Semantic Layer', icon: Brain },
  ];

  return (
    <div className="w-72 bg-white min-h-screen flex flex-col shadow-xl border-r border-slate-200">
      <div className="p-6 border-b border-slate-100">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Package className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">DataMo</h1>
          </div>
        </div>
        <p className="text-xs text-slate-500 font-medium tracking-wide uppercase">Data Asset Center</p>
      </div>
      
      <nav className="flex-1 p-4">
        <div className="mb-4 px-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Core Modules</p>
        </div>
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <li key={item.id}>
                <button
                  onClick={() => onTabChange(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 border border-indigo-100'
                      : 'hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Icon className={`w-5 h-5 transition-colors ${isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                  <span className="text-sm font-medium">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
      
      <div className="p-4 border-t border-slate-100 bg-slate-50">
        <div className="px-4 py-3 bg-white rounded-xl border border-slate-200 mb-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-xs text-slate-500 font-medium">Platform Status</p>
          </div>
          <div className="flex justify-between items-center">
             <p className="text-xs text-slate-700">All Systems Operational</p>
             <span className="text-[10px] bg-emerald-500/10 text-emerald-600 px-1.5 py-0.5 rounded-full border border-emerald-200">Healthy</span>
          </div>
        </div>
        <div className="flex items-center gap-3 px-2">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold shadow-sm">
            A
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800 truncate">Admin User</p>
            <p className="text-xs text-slate-500 truncate">admin@datamo.io</p>
          </div>
        </div>
      </div>
    </div>
  );
}
