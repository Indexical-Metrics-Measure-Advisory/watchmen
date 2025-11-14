
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { 
  Database, 
  Settings, 
  Activity, 
  CheckCircle, 
  AlertTriangle, 
  Clock,
  ArrowRight,
  Plus,
  Eye,
  TrendingUp,
  Server,
  Home,
  
} from 'lucide-react';
import MetricCard from '@/components/ui/metric-card';
import ActionTile from '@/components/ui/action-tile';
import { variantStyles } from '@/lib/variants';

const Index = () => {
  const { user } = useAuth();
  
  // If user is not logged in, show loading state
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center" role="status" aria-live="polite" aria-busy="true">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto" aria-hidden="true"></div>
          <p className="mt-4 text-lg text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Mock recent activity data
  const recentActivity = [
    {
      id: 1,
      action: "Policy Management module configured",
      time: "2 hours ago",
      status: "success",
      user: "John Smith"
    },
    {
      id: 2,
      action: "Claims ingestion completed",
      time: "4 hours ago",
      status: "success",
      user: "System"
    },
    {
      id: 3,
      action: "Finance model validation failed",
      time: "6 hours ago",
      status: "error",
      user: "System"
    }
  ];

  // Mock statistics
  const stats = {
    totalModules: 8,
    // dashboard totals
    totalModels: 12,
    totalTables: 34,
    activeIngestions: 3,
    successRate: 94,
    lastUpdate: "2 minutes ago"
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-blue-600" />;
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
     
      {/* Hero header */}
      <Card className="border-0 bg-gradient-to-r from-primary to-primary/80 text-white rounded-lg shadow-md">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-white/20 rounded-lg shadow-md">
                <Home className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Dashboard</h1>
                <p className="text-blue-100 mt-1">Configure ingestion and monitor system health</p>
              </div>
            </div>
            
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard label="Total Modules" value={stats.totalModules} icon={<Database />} variant="module" aria-label="Total modules" />
        <MetricCard label="Total Models" value={stats.totalModels} icon={<TrendingUp />} variant="model" aria-label="Total models" />
        <MetricCard label="Total Tables" value={stats.totalTables} icon={<Activity />} variant="table" aria-label="Total tables" />
        <MetricCard label="Last Update" value={<span className="text-sm font-bold">{stats.lastUpdate}</span>} icon={<Clock />} variant="info" aria-label="Last update" />
      </div>

      {/* Main Action Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <Card className="shadow-lg lg:col-span-2 rounded-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-blue-600" />
              What would you like to do?
            </CardTitle>
            <CardDescription>Common tasks to get you started</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-3">
              <ActionTile to="/modules" title="Add New Module" subtitle="Configure a new data source" icon={<Plus />} variant="module" />
              <ActionTile to="/models" title="Setup Data Model" subtitle="Define your data structure" icon={<Database />} variant="model" />
              <ActionTile to="/tables" title="Configure Tables" subtitle="Map your table structures" icon={<Server />} variant="table" />
              <ActionTile to="/monitor" title="Monitor System" subtitle="Check ingestion status" icon={<Eye />} variant="monitor" />
            </div>
          </CardContent>
        </Card>

        {/* Shortcuts */}
        <Card className="shadow-sm rounded-lg">
          <CardHeader>
            <CardTitle className="text-gray-900">Shortcuts</CardTitle>
            <CardDescription>Quick links and resources</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Link to="/monitor">
              <Button variant="outline" size="sm" className="w-full justify-start gap-2">
                <Activity className="h-4 w-4" /> View Activity
              </Button>
            </Link>
            
          </CardContent>
        </Card>

        {/* Recent Activity */}
        {/* <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-green-600" />
              Recent Activity
            </CardTitle>
            <CardDescription>What's been happening in your system</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="mt-0.5">
                    {getStatusIcon(activity.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-500">{activity.time}</span>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs text-gray-500">by {activity.user}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t">
              <Link to="/monitor">
                <Button variant="outline" className="w-full">
                  View All Activity
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card> */}
      </div>

      {/* Status Banner */}
      <Card className="bg-gradient-to-r from-green-600 to-emerald-600 text-white border-0 rounded-lg">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-6 w-6" />
              <div>
                <h3 className="font-semibold">System Status: All Good!</h3>
                <p className="text-green-100">All modules are running smoothly with {stats.successRate}% success rate</p>
              </div>
            </div>
            <Link to="/monitor">
              <Button variant="secondary" size="sm">
                View Details
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

     
    </div>
  );
};

export default Index;
