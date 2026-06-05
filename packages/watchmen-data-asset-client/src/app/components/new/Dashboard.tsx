import { Database, Package, Network, BookOpen, Shield, CheckCircle2, Brain, TrendingUp, Users, Clock } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";

const data = [
  { name: 'Mon', assets: 400, quality: 240 },
  { name: 'Tue', assets: 300, quality: 139 },
  { name: 'Wed', assets: 200, quality: 980 },
  { name: 'Thu', assets: 278, quality: 390 },
  { name: 'Fri', assets: 189, quality: 480 },
  { name: 'Sat', assets: 239, quality: 380 },
  { name: 'Sun', assets: 349, quality: 430 },
];

const modules = [
  { name: 'Data Catalog', icon: Database, color: 'from-blue-500 to-blue-600', count: 256, desc: 'Datasets & Tables' },
  { name: 'Data Products', icon: Package, color: 'from-purple-500 to-purple-600', count: 48, desc: 'Business Products' },
  { name: 'Data Lineage', icon: Network, color: 'from-emerald-500 to-emerald-600', count: 1200, desc: 'Lineage Relations' },
  { name: 'Business Glossary', icon: BookOpen, color: 'from-orange-500 to-orange-600', count: 89, desc: 'Business Terms' },
  { name: 'Data Governance', icon: Shield, color: 'from-red-500 to-red-600', count: 156, desc: 'Governance Rules' },
  { name: 'Data Quality', icon: CheckCircle2, color: 'from-green-500 to-green-600', count: 95, desc: 'Quality Checks' },
  { name: 'Semantic Layer', icon: Brain, color: 'from-indigo-500 to-indigo-600', count: 32, desc: 'Semantic Models' },
];

const recentActivities = [
  { user: 'John Smith', action: 'updated dataset', target: 'Customer Master', time: '2 minutes ago', type: 'edit' },
  { user: 'Sarah Chen', action: 'created data product', target: 'Broker 360', time: '15 minutes ago', type: 'create' },
  { user: 'Mike Johnson', action: 'fixed quality issue', target: 'Policy Summary', time: '1 hour ago', type: 'fix' },
  { user: 'Emily Wang', action: 'added business term', target: 'Gross Premium', time: '3 hours ago', type: 'add' },
];

export function Dashboard() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Welcome back!</h1>
        <p className="text-slate-600">Here's what's happening with your data assets today.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[
          { label: 'Total Assets', value: '1,892', change: '+12%', icon: Database, color: 'bg-blue-500' },
          { label: 'Data Quality Score', value: '94.5%', change: '+2.3%', icon: CheckCircle2, color: 'bg-green-500' },
          { label: 'Active Users', value: '156', change: '+8%', icon: Users, color: 'bg-purple-500' },
          { label: 'Avg. Query Time', value: '0.8s', change: '-0.2s', icon: Clock, color: 'bg-orange-500' },
        ].map((stat, idx) => (
          <div key={idx} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-xl ${stat.color}`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
              <span className="text-emerald-600 text-sm font-medium flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                {stat.change}
              </span>
            </div>
            <p className="text-3xl font-bold text-slate-900 mb-1">{stat.value}</p>
            <p className="text-slate-500 text-sm">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-slate-900">Asset Growth</h3>
            <select className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white">
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
              <option>Last 90 Days</option>
            </select>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorAssets" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                />
                <Area type="monotone" dataKey="assets" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorAssets)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900 mb-6">Recent Activity</h3>
          <div className="space-y-4">
            {recentActivities.map((activity, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                <div className={`w-2 h-2 rounded-full mt-2 ${
                  activity.type === 'create' ? 'bg-blue-500' :
                  activity.type === 'edit' ? 'bg-purple-500' :
                  activity.type === 'fix' ? 'bg-green-500' : 'bg-orange-500'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-900">
                    <span className="font-medium">{activity.user}</span> {activity.action}{' '}
                    <span className="font-medium text-indigo-600">{activity.target}</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-1">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-6">Modules Overview</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
          {modules.map((module, idx) => {
            const Icon = module.icon;
            return (
              <div key={idx} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 hover:shadow-md transition-all cursor-pointer">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${module.color} flex items-center justify-center mb-4`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h4 className="font-semibold text-slate-900 mb-1">{module.name}</h4>
                <p className="text-2xl font-bold text-slate-900 mb-1">{module.count}</p>
                <p className="text-xs text-slate-500">{module.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
