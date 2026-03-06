import { useState } from "react";
import { Search, Plus, MoreVertical, BarChart3, Calendar, Users, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { CreateMetricDialog } from "./CreateMetricDialog";

interface Metric {
  id: string;
  name: string;
  description: string;
  type: string;
  owner: string;
  updatedAt: string;
  value: string;
  trend: 'up' | 'down' | 'stable';
  trendValue: string;
  category: string;
}

export function Metrics() {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [metrics, setMetrics] = useState<Metric[]>([
    {
      id: '1',
      name: 'Daily Active Users (DAU)',
      description: 'Total daily active users',
      type: 'User Metric',
      owner: 'John Doe',
      updatedAt: '2024-12-15',
      value: '125,432',
      trend: 'up',
      trendValue: '+12.5%',
      category: 'Core Metric',
    },
    {
      id: '2',
      name: 'Monthly Active Users (MAU)',
      description: 'Total monthly active users',
      type: 'User Metric',
      owner: 'John Doe',
      updatedAt: '2024-12-15',
      value: '2,345,678',
      trend: 'up',
      trendValue: '+8.3%',
      category: 'Core Metric',
    },
    {
      id: '3',
      name: 'Conversion Rate',
      description: 'Conversion ratio from visitors to paid users',
      type: 'Conversion Metric',
      owner: 'Jane Smith',
      updatedAt: '2024-12-14',
      value: '3.45%',
      trend: 'down',
      trendValue: '-0.5%',
      category: 'Business Metric',
    },
    {
      id: '4',
      name: 'Average Order Value',
      description: 'Average amount per order',
      type: 'Revenue Metric',
      owner: 'Alice Johnson',
      updatedAt: '2024-12-13',
      value: '¥489',
      trend: 'up',
      trendValue: '+15.2%',
      category: 'Financial Metric',
    },
    {
      id: '5',
      name: 'User Retention Rate',
      description: '7-day user retention ratio',
      type: 'User Metric',
      owner: 'Bob Wilson',
      updatedAt: '2024-12-12',
      value: '42%',
      trend: 'stable',
      trendValue: '+0.2%',
      category: 'Core Metric',
    },
    {
      id: '6',
      name: 'GMV',
      description: 'Gross Merchandise Volume',
      type: 'Revenue Metric',
      owner: 'Jane Smith',
      updatedAt: '2024-12-11',
      value: '¥12.5M',
      trend: 'up',
      trendValue: '+23.8%',
      category: 'Financial Metric',
    },
  ]);

  const filteredMetrics = metrics.filter((metric) => {
    const matchesSearch = metric.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         metric.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || metric.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const handleCreateMetric = (data: any) => {
    const newMetric: Metric = {
      id: String(metrics.length + 1),
      name: data.name,
      description: data.description,
      type: data.type,
      owner: 'Current User',
      updatedAt: new Date().toISOString().split('T')[0],
      value: '0',
      trend: 'stable',
      trendValue: '0%',
      category: data.category,
    };
    setMetrics([newMetric, ...metrics]);
  };

  const handleDeleteMetric = (id: string) => {
    setMetrics(metrics.filter(m => m.id !== id));
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Metric Management</h2>
          <p className="text-gray-500 mt-1">Define and monitor key business metrics</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Create Metric
        </Button>
      </div>

      <div className="bg-white rounded-lg border">
        <div className="p-6 border-b space-y-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search metric name or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="User Metric">User Metric</SelectItem>
                <SelectItem value="Revenue Metric">Revenue Metric</SelectItem>
                <SelectItem value="Conversion Metric">Conversion Metric</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
          {filteredMetrics.map((metric) => (
            <div key={metric.id} className="border rounded-lg p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <Badge variant="outline" className="text-xs mb-1">
                      {metric.type}
                    </Badge>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>View Details</DropdownMenuItem>
                    <DropdownMenuItem>Edit</DropdownMenuItem>
                    <DropdownMenuItem>View Trend</DropdownMenuItem>
                    <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteMetric(metric.id)}>
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <h3 className="font-medium text-gray-900 mb-2">{metric.name}</h3>
              <p className="text-sm text-gray-600 mb-4">{metric.description}</p>

              <div className="mb-4">
                <div className="text-3xl font-semibold text-gray-900 mb-1">{metric.value}</div>
                <div className="flex items-center gap-1">
                  {metric.trend === 'up' && <TrendingUp className="w-4 h-4 text-green-600" />}
                  {metric.trend === 'down' && <TrendingDown className="w-4 h-4 text-red-600" />}
                  <span className={`text-sm ${
                    metric.trend === 'up' ? 'text-green-600' :
                    metric.trend === 'down' ? 'text-red-600' :
                    'text-gray-600'
                  }`}>
                    {metric.trendValue}
                  </span>
                  <span className="text-sm text-gray-500">vs last period</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm text-gray-500 pt-4 border-t">
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>{metric.owner}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>{metric.updatedAt}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredMetrics.length === 0 && (
          <div className="p-12 text-center">
            <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No matching metrics found</p>
          </div>
        )}
      </div>

      <CreateMetricDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSubmit={handleCreateMetric}
      />
    </div>
  );
}
