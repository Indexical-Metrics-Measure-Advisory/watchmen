
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { 
  Database, 
  Settings, 
  Activity, 
  CheckCircle, 
  ArrowRight,
  Plus,
  Eye,
  TrendingUp,
  Server,
} from 'lucide-react';
import MetricCard from '@/components/ui/metric-card';
import ActionTile from '@/components/ui/action-tile';
import { tableService, modelService, moduleService } from '@/services';

const Index = () => {
  const { user } = useAuth();
  const [totalTables, setTotalTables] = useState(0);
  const [totalModels, setTotalModels] = useState(0);
  const [totalModules, setTotalModules] = useState(0);

  useEffect(() => {
    const loadStats = async () => {
      // Load Table Stats
      try {
        const tables = await tableService.getAllTables();
        setTotalTables(tables.length);
      } catch {
        console.error('Error loading tables:');
      }

      // Load Model Stats
      try {
        const models = await modelService.getAllModels();
        setTotalModels(models.length);
      } catch {
         console.error('Error loading models:');
      }

      // Load Module Stats
      try {
        const modules = await moduleService.getAllModules();
          setTotalModules(modules.length);
      } catch {
        console.error('Error loading modules:');
      }
    };

    if (user) {
      loadStats();
    }
  }, [user]);
  
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

  

  // Mock statistics
  const stats = {
    activeIngestions: 3,
    lastUpdate: "2 minutes ago"
  };

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto bg-gray-50/50 min-h-screen">
     
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b pb-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your data ingestion pipeline and system health
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1 bg-white border rounded-full shadow-sm">
            <div className="h-2.5 w-2.5 rounded-full bg-green-500"></div>
            <span className="text-sm font-medium text-gray-700">System Normal</span>
          </div>
          <span className="text-sm text-muted-foreground">Last updated: {stats.lastUpdate}</span>
        </div>
      </div>

      {/* Quick Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard label="Total Modules" value={totalModules} icon={<Database className="h-4 w-4" />} variant="module" aria-label="Total modules" />
        <MetricCard label="Total Models" value={totalModels} icon={<TrendingUp className="h-4 w-4" />} variant="model" aria-label="Total models" />
        <MetricCard label="Total Tables" value={totalTables} icon={<Activity className="h-4 w-4" />} variant="table" aria-label="Total tables" />
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Quick Actions */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Quick Actions</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ActionTile to="/modules" title="Add Module" subtitle="Configure data source" icon={<Plus />} variant="module" />
            <ActionTile to="/models" title="Setup Model" subtitle="Define data structure" icon={<Database />} variant="model" />
            <ActionTile to="/tables" title="Configure Tables" subtitle="Map table structures" icon={<Server />} variant="table" />
            <ActionTile to="/monitor" title="Monitor System" subtitle="Check ingestion status" icon={<Eye />} variant="monitor" />
          </div>
        </div>

        {/* Sidebar / Status */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-900">System Status</h2>
          
          <Card className="shadow-sm border-l-4 border-l-green-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                All Systems Operational
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                All modules are running smoothly.
              </p>
              <Link to="/monitor">
                <Button variant="outline" size="sm" className="w-full justify-between group">
                  View Detailed Report
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">Quick Links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link to="/monitor" className="block">
                <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-gray-600 hover:text-primary hover:bg-blue-50">
                  <Activity className="h-4 w-4" /> View Activity Log
                </Button>
              </Link>
              <Link to="/modules" className="block">
                <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-gray-600 hover:text-primary hover:bg-blue-50">
                  <Settings className="h-4 w-4" /> Manage Configurations
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
