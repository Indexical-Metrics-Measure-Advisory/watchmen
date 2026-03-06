import { useState } from "react";
import { Search, AlertCircle, CheckCircle, TrendingUp, TrendingDown, Filter, Download } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import { QualityScore, QualityIssue } from "./model/Quality";

export function QualityManagement() {
  const [searchQuery, setSearchQuery] = useState("");
  const [dimensionFilter, setDimensionFilter] = useState("all");

  // Quality trend data
  const qualityTrendData = [
    { month: 'Jul', completeness: 94, accuracy: 92, timeliness: 88, consistency: 90 },
    { month: 'Aug', completeness: 95, accuracy: 93, timeliness: 90, consistency: 91 },
    { month: 'Sep', completeness: 96, accuracy: 94, timeliness: 91, consistency: 92 },
    { month: 'Oct', completeness: 97, accuracy: 95, timeliness: 93, consistency: 93 },
    { month: 'Nov', completeness: 96, accuracy: 96, timeliness: 92, consistency: 94 },
    { month: 'Dec', completeness: 98, accuracy: 96, timeliness: 95, consistency: 97 },
  ];

  // Data product quality scores
  const productQualityScores: QualityScore[] = [
    {
      id: 'dp-001',
      name: 'User Behavior Data Product',
      overall: 96,
      completeness: 98,
      accuracy: 96,
      timeliness: 95,
      consistency: 97,
      trend: 'up',
      issues: 2,
      status: 'excellent',
    },
    {
      id: 'dp-002',
      name: 'Sales Analytics Data Product',
      overall: 95,
      completeness: 95,
      accuracy: 98,
      timeliness: 93,
      consistency: 94,
      trend: 'stable',
      issues: 3,
      status: 'excellent',
    },
    {
      id: 'dp-003',
      name: 'Customer Profile Data Product',
      overall: 87,
      completeness: 87,
      accuracy: 89,
      timeliness: 85,
      consistency: 88,
      trend: 'up',
      issues: 8,
      status: 'good',
    },
    {
      id: 'dp-004',
      name: 'Supply Chain Data Product',
      overall: 94,
      completeness: 92,
      accuracy: 94,
      timeliness: 96,
      consistency: 93,
      trend: 'up',
      issues: 4,
      status: 'excellent',
    },
    {
      id: 'dp-005',
      name: 'Marketing Campaign Data Product',
      overall: 78,
      completeness: 75,
      accuracy: 82,
      timeliness: 76,
      consistency: 79,
      trend: 'down',
      issues: 15,
      status: 'warning',
    },
  ];

  // Quality issues list
  const qualityIssues: QualityIssue[] = [
    {
      id: 1,
      product: 'Marketing Campaign Data Product',
      dimension: 'completeness',
      severity: 'high',
      issue: 'Missing fields exceeding 25%',
      affectedRecords: '12,345',
      detectedAt: '2024-12-16 14:30',
    },
    {
      id: 2,
      product: 'Customer Profile Data Product',
      dimension: 'timeliness',
      severity: 'medium',
      issue: 'Update delay exceeding 2 hours',
      affectedRecords: '8,760',
      detectedAt: '2024-12-16 12:15',
    },
    {
      id: 3,
      product: 'User Behavior Data Product',
      dimension: 'consistency',
      severity: 'low',
      issue: 'Cross-system data inconsistency',
      affectedRecords: '234',
      detectedAt: '2024-12-16 09:45',
    },
    {
      id: 4,
      product: 'Sales Analytics Data Product',
      dimension: 'accuracy',
      severity: 'medium',
      issue: 'Data validation rules failed',
      affectedRecords: '1,567',
      detectedAt: '2024-12-15 16:20',
    },
  ];

  // Radar chart data
  const radarData = [
    {
      dimension: 'Completeness',
      'User Behavior': 98,
      'Sales Analytics': 95,
      'Customer Profile': 87,
    },
    {
      dimension: 'Accuracy',
      'User Behavior': 96,
      'Sales Analytics': 98,
      'Customer Profile': 89,
    },
    {
      dimension: 'Timeliness',
      'User Behavior': 95,
      'Sales Analytics': 93,
      'Customer Profile': 85,
    },
    {
      dimension: 'Consistency',
      'User Behavior': 97,
      'Sales Analytics': 94,
      'Customer Profile': 88,
    },
  ];

  const statusConfig: Record<string, { label: string; className: string }> = {
    excellent: { label: 'Excellent', className: 'bg-green-100 text-green-700' },
    good: { label: 'Good', className: 'bg-blue-100 text-blue-700' },
    warning: { label: 'Warning', className: 'bg-yellow-100 text-yellow-700' },
    critical: { label: 'Critical', className: 'bg-red-100 text-red-700' },
  };

  const severityConfig: Record<string, { label: string; className: string }> = {
    high: { label: 'High', className: 'bg-red-100 text-red-700' },
    medium: { label: 'Medium', className: 'bg-yellow-100 text-yellow-700' },
    low: { label: 'Low', className: 'bg-blue-100 text-blue-700' },
  };

  const dimensionConfig: Record<string, { label: string; color: string }> = {
    completeness: { label: 'Completeness', color: '#10b981' },
    accuracy: { label: 'Accuracy', color: '#3b82f6' },
    timeliness: { label: 'Timeliness', color: '#f59e0b' },
    consistency: { label: 'Consistency', color: '#f97316' },
  };

  const filteredProducts = productQualityScores.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDimension = dimensionFilter === 'all' || true;
    return matchesSearch && matchesDimension;
  });

  const avgQuality = Math.round(
    productQualityScores.reduce((sum, p) => sum + p.overall, 0) / productQualityScores.length
  );

  const totalIssues = productQualityScores.reduce((sum, p) => sum + p.issues, 0);

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Quality Management</h2>
          <p className="text-gray-500 mt-1">Monitor and manage data product quality across four dimensions</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">Average Quality Score</p>
                <p className="text-3xl font-semibold mt-2">{avgQuality}%</p>
                <p className="text-sm text-green-600 mt-2 flex items-center gap-1">
                  <TrendingUp className="w-4 h-4" />
                  +2.5% vs last month
                </p>
              </div>
              <div className="bg-blue-100 text-blue-600 p-3 rounded-lg">
                <CheckCircle className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">Completeness</p>
                <p className="text-3xl font-semibold mt-2">
                  {Math.round(productQualityScores.reduce((sum, p) => sum + p.completeness, 0) / productQualityScores.length)}%
                </p>
                <p className="text-sm text-gray-600 mt-2">Field coverage</p>
              </div>
              <div className="bg-green-100 text-green-600 p-3 rounded-lg">
                <CheckCircle className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">Accuracy</p>
                <p className="text-3xl font-semibold mt-2">
                  {Math.round(productQualityScores.reduce((sum, p) => sum + p.accuracy, 0) / productQualityScores.length)}%
                </p>
                <p className="text-sm text-gray-600 mt-2">Data validity</p>
              </div>
              <div className="bg-blue-100 text-blue-600 p-3 rounded-lg">
                <CheckCircle className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">Active Issues</p>
                <p className="text-3xl font-semibold mt-2">{totalIssues}</p>
                <p className="text-sm text-yellow-600 mt-2">Require attention</p>
              </div>
              <div className="bg-yellow-100 text-yellow-600 p-3 rounded-lg">
                <AlertCircle className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="products">Product Scores</TabsTrigger>
          <TabsTrigger value="issues">Quality Issues</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Quality Trend (Last 6 Months)</CardTitle>
                <CardDescription>Quality dimension performance over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={qualityTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis domain={[80, 100]} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="completeness" stroke="#10b981" name="Completeness" strokeWidth={2} />
                    <Line type="monotone" dataKey="accuracy" stroke="#3b82f6" name="Accuracy" strokeWidth={2} />
                    <Line type="monotone" dataKey="timeliness" stroke="#f59e0b" name="Timeliness" strokeWidth={2} />
                    <Line type="monotone" dataKey="consistency" stroke="#f97316" name="Consistency" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Multi-dimensional Comparison</CardTitle>
                <CardDescription>Quality dimension radar chart for top products</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="dimension" />
                    <PolarRadiusAxis domain={[0, 100]} />
                    <Radar name="User Behavior" dataKey="User Behavior" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                    <Radar name="Sales Analytics" dataKey="Sales Analytics" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
                    <Radar name="Customer Profile" dataKey="Customer Profile" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.3} />
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Quality Dimension Distribution</CardTitle>
              <CardDescription>Average scores across all data products</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={[
                  { 
                    dimension: 'Completeness', 
                    score: Math.round(productQualityScores.reduce((sum, p) => sum + p.completeness, 0) / productQualityScores.length) 
                  },
                  { 
                    dimension: 'Accuracy', 
                    score: Math.round(productQualityScores.reduce((sum, p) => sum + p.accuracy, 0) / productQualityScores.length) 
                  },
                  { 
                    dimension: 'Timeliness', 
                    score: Math.round(productQualityScores.reduce((sum, p) => sum + p.timeliness, 0) / productQualityScores.length) 
                  },
                  { 
                    dimension: 'Consistency', 
                    score: Math.round(productQualityScores.reduce((sum, p) => sum + p.consistency, 0) / productQualityScores.length) 
                  },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="dimension" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Bar dataKey="score" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Product Scores Tab */}
        <TabsContent value="products" className="space-y-6">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search data products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={dimensionFilter} onValueChange={setDimensionFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Dimension" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Dimensions</SelectItem>
                <SelectItem value="completeness">Completeness</SelectItem>
                <SelectItem value="accuracy">Accuracy</SelectItem>
                <SelectItem value="timeliness">Timeliness</SelectItem>
                <SelectItem value="consistency">Consistency</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            {filteredProducts.map((product) => (
              <Card key={product.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-medium text-gray-900">{product.name}</h3>
                        <Badge className={statusConfig[product.status].className}>
                          {statusConfig[product.status].label}
                        </Badge>
                        {product.trend === 'up' && (
                          <span className="text-green-600 flex items-center gap-1 text-sm">
                            <TrendingUp className="w-4 h-4" />
                            Improving
                          </span>
                        )}
                        {product.trend === 'down' && (
                          <span className="text-red-600 flex items-center gap-1 text-sm">
                            <TrendingDown className="w-4 h-4" />
                            Declining
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">{product.id} • {product.issues} active issues</p>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-semibold text-gray-900">{product.overall}%</p>
                      <p className="text-sm text-gray-500">Overall Score</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-600">Completeness</span>
                        <span className="text-xs font-medium text-gray-900">{product.completeness}%</span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-green-600 rounded-full" 
                          style={{ width: `${product.completeness}%` }}
                        ></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-600">Accuracy</span>
                        <span className="text-xs font-medium text-gray-900">{product.accuracy}%</span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-600 rounded-full" 
                          style={{ width: `${product.accuracy}%` }}
                        ></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-600">Timeliness</span>
                        <span className="text-xs font-medium text-gray-900">{product.timeliness}%</span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-yellow-600 rounded-full" 
                          style={{ width: `${product.timeliness}%` }}
                        ></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-600">Consistency</span>
                        <span className="text-xs font-medium text-gray-900">{product.consistency}%</span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-orange-600 rounded-full" 
                          style={{ width: `${product.consistency}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Quality Issues Tab */}
        <TabsContent value="issues" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Active Quality Issues</CardTitle>
              <CardDescription>Issues detected by automated quality monitoring</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {qualityIssues.map((issue) => (
                  <div key={issue.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={severityConfig[issue.severity].className}>
                            {severityConfig[issue.severity].label}
                          </Badge>
                          <Badge variant="outline">
                            {dimensionConfig[issue.dimension as keyof typeof dimensionConfig]?.label || issue.dimension}
                          </Badge>
                        </div>
                        <h4 className="font-medium text-gray-900 mb-1">{issue.issue}</h4>
                        <p className="text-sm text-gray-600">{issue.product}</p>
                      </div>
                      <Button variant="outline" size="sm">View Details</Button>
                    </div>
                    <div className="flex items-center gap-6 text-sm text-gray-500">
                      <span>Affected Records: {issue.affectedRecords}</span>
                      <span>Detected: {issue.detectedAt}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Historical Quality Trends</CardTitle>
              <CardDescription>6-month quality performance analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={qualityTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis domain={[80, 100]} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="completeness" stroke="#10b981" name="Completeness" strokeWidth={2} />
                  <Line type="monotone" dataKey="accuracy" stroke="#3b82f6" name="Accuracy" strokeWidth={2} />
                  <Line type="monotone" dataKey="timeliness" stroke="#f59e0b" name="Timeliness" strokeWidth={2} />
                  <Line type="monotone" dataKey="consistency" stroke="#f97316" name="Consistency" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Key Insights</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-green-900">Overall quality improving</p>
                    <p className="text-xs text-green-700">Average score increased 2.5% this month</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">Completeness at highest level</p>
                    <p className="text-xs text-blue-700">98% average completeness achieved</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-900">Timeliness needs attention</p>
                    <p className="text-xs text-yellow-700">Some products experiencing update delays</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recommendations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 border rounded-lg">
                  <p className="text-sm font-medium text-gray-900 mb-1">1. Address Marketing Campaign issues</p>
                  <p className="text-xs text-gray-600">Focus on completeness improvements</p>
                </div>
                <div className="p-3 border rounded-lg">
                  <p className="text-sm font-medium text-gray-900 mb-1">2. Optimize data refresh schedules</p>
                  <p className="text-xs text-gray-600">Improve timeliness across products</p>
                </div>
                <div className="p-3 border rounded-lg">
                  <p className="text-sm font-medium text-gray-900 mb-1">3. Implement automated monitoring</p>
                  <p className="text-xs text-gray-600">Set up alerts for quality threshold violations</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
