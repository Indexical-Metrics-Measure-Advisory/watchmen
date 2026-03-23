import { Package, Network, Layers, LayoutDashboard, Database, ShieldCheck, Users, Sliders, GitMerge, Settings, RefreshCw, Map } from "lucide-react";

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'catalog', label: 'Data Products', icon: Database },
    { id: 'lineage', label: 'Data Lineage Map', icon: Network },
    { id: 'domain', label: 'Business Ontology', icon: Layers },
    { id: 'asset-map', label: 'Asset Ecosystem', icon: Map },
    { id: 'lifecycle', label: 'Lifecycle Management', icon: RefreshCw },
    { id: 'quality', label: 'Quality Management', icon: ShieldCheck },
    { id: 'tenants', label: 'Tenant Management', icon: Users },
    { id: 'customization', label: 'Customization', icon: Sliders },
    { id: 'merge', label: 'Merge Visualizer', icon: GitMerge },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="w-72 bg-slate-900 min-h-screen flex flex-col text-slate-300 relative z-20 shadow-[2px_0_24px_rgba(0,0,0,0.25)]">
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Package className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">DataMO</h1>
          </div>
        </div>
        <p className="text-xs text-slate-500 font-medium tracking-wide uppercase">Asset Management</p>
      </div>
      
      <nav className="flex-1 p-4">
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
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20'
                      : 'hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon className={`w-5 h-5 transition-colors ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
                  <span className="text-sm font-medium">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
      
      <div className="p-4 border-t border-slate-800 bg-slate-900/50">
        <div className="px-4 py-3 bg-slate-800/50 rounded-xl border border-slate-700/50 mb-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-xs text-slate-400 font-medium">System Status</p>
          </div>
          <div className="flex justify-between items-center">
             <p className="text-xs text-slate-300">ODPS v3.0</p>
             <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20">Active</span>
          </div>
        </div>
        <div className="flex items-center gap-3 px-2">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold ring-2 ring-slate-800 shadow-sm">
            A
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">Administrator</p>
            <p className="text-xs text-slate-500 truncate">admin@company.com</p>
          </div>
        </div>
      </div>
    </div>
  );
}
