import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, TrendingDown, TrendingUp, Filter, X, BarChart3 } from 'lucide-react';
import { MetricDimension } from '@/model/analysis';
import { drillDownService, DrillDownResponse, DrillDownFilter } from '@/services/drillDownService';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from 'recharts';

interface DrillDownPanelProps {
  metricId: string;
  metricName: string;
  isOpen: boolean;
  onClose: () => void;
  onDrillDown?: (dimension: string, value: string) => void;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export const DrillDownPanel: React.FC<DrillDownPanelProps> = ({
  metricId,
  metricName,
  isOpen,
  onClose,
  onDrillDown
}) => {
  const [dimensions, setDimensions] = useState<MetricDimension[]>([]);
  const [selectedDimension, setSelectedDimension] = useState<string>('');
  const [drillDownData, setDrillDownData] = useState<DrillDownResponse | null>(null);
  const [appliedFilters, setAppliedFilters] = useState<DrillDownFilter[]>([]);
  const [loading, setLoading] = useState(false);
  const [dimensionsLoading, setDimensionsLoading] = useState(false);
  const [chartType, setChartType] = useState<'bar' | 'pie'>('bar');

  // Load available dimensions when panel opens
  useEffect(() => {
    if (isOpen && metricId) {
      loadDimensions();
    }
  }, [isOpen, metricId]);

  // Load drill-down data when dimension is selected
  useEffect(() => {
    if (selectedDimension) {
      loadDrillDownData();
    }
  }, [selectedDimension, appliedFilters]);

  const loadDimensions = async () => {
    setDimensionsLoading(true);
    try {
      const dims = await drillDownService.getAvailableDimensions(metricId);
      setDimensions(dims);
      if (dims.length > 0) {
        setSelectedDimension(dims[0].qualified_name || dims[0].name);
      }
    } catch (error) {
      console.error('Error loading dimensions:', error);
    } finally {
      setDimensionsLoading(false);
    }
  };

  const loadDrillDownData = async () => {
    if (!selectedDimension) return;
    
    setLoading(true);
    try {
      const response = await drillDownService.getDrillDownData({
        metricId,
        dimension: selectedDimension,
        filters: appliedFilters,
        limit: 10
      });
      setDrillDownData(response);
    } catch (error) {
      console.error('Error loading drill-down data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDimensionChange = (dimension: string) => {
    setSelectedDimension(dimension);
    setAppliedFilters([]); // Clear filters when changing dimension
  };

  const addFilter = (dimension: string, value: string) => {
    const newFilter: DrillDownFilter = {
      dimension,
      value,
      operator: 'equals'
    };
    setAppliedFilters(prev => [...prev, newFilter]);
    if (onDrillDown) {
      onDrillDown(dimension, value);
    }
  };

  const removeFilter = (index: number) => {
    setAppliedFilters(prev => prev.filter((_, i) => i !== index));
  };

  const formatValue = (value: number): string => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toString();
  };

  const renderChart = () => {
    if (!drillDownData?.data) return null;

    if (chartType === 'pie') {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={drillDownData.data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percentage }) => `${name}: ${percentage}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {drillDownData.data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value: number) => [formatValue(value), 'Value']} />
          </PieChart>
        </ResponsiveContainer>
      );
    }

    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={drillDownData.data}>
          <XAxis 
            dataKey="name" 
            angle={-45}
            textAnchor="end"
            height={80}
            fontSize={12}
          />
          <YAxis tickFormatter={formatValue} />
          <Tooltip 
            formatter={(value: number) => [formatValue(value), 'Value']}
            labelFormatter={(label) => `${label}`}
          />
          <Bar 
            dataKey="value" 
            fill="#0088FE"
            onClick={(data) => {
              if (data && data.name) {
                addFilter(selectedDimension, data.name);
              }
            }}
            style={{ cursor: 'pointer' }}
          />
        </BarChart>
      </ResponsiveContainer>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-xl font-semibold">
            <BarChart3 className="inline-block w-5 h-5 mr-2" />
            Drill Down Analysis: {metricName}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Dimension Selection */}
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Select Dimension</label>
              <Select value={selectedDimension} onValueChange={handleDimensionChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a dimension to analyze" />
                </SelectTrigger>
                <SelectContent>
                  {dimensions.map((dim) => (
                    <SelectItem key={dim.qualified_name || dim.name} value={dim.qualified_name || dim.name}>
                      <div className="flex items-center justify-between w-full">
                        <span>{dim.name}</span>
                        {dim.importance && (
                          <Badge variant="secondary" className="ml-2">
                            {Math.round(dim.importance * 100)}%
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium">Chart Type:</label>
              <Select value={chartType} onValueChange={(value: 'bar' | 'pie') => setChartType(value)}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bar">Bar</SelectItem>
                  <SelectItem value="pie">Pie</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Applied Filters */}
          {appliedFilters.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center">
                <Filter className="w-4 h-4 mr-1" />
                Applied Filters
              </label>
              <div className="flex flex-wrap gap-2">
                {appliedFilters.map((filter, index) => (
                  <Badge key={index} variant="outline" className="flex items-center gap-1">
                    {filter.dimension}: {filter.value}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-transparent"
                      onClick={() => removeFilter(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Loading State */}
          {(loading || dimensionsLoading) && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span>Loading drill-down data...</span>
            </div>
          )}

          {/* Chart and Data */}
          {!loading && !dimensionsLoading && drillDownData && (
            <div className="space-y-4">
              {/* Chart */}
              <div className="bg-gray-50 rounded-lg p-4">
                {renderChart()}
              </div>

              {/* Data Table */}
              <div className="space-y-2">
                <h4 className="font-medium">Detailed Breakdown</h4>
                <ScrollArea className="h-48 border rounded">
                  <div className="p-4 space-y-2">
                    {drillDownData.data.map((item, index) => (
                      <div 
                        key={index} 
                        className="flex items-center justify-between p-2 hover:bg-gray-50 rounded cursor-pointer"
                        onClick={() => addFilter(selectedDimension, item.name)}
                      >
                        <div className="flex items-center space-x-3">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <span className="font-medium">{item.name}</span>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span>{formatValue(item.value)}</span>
                          <span className="flex items-center">
                            {item.percentage > 20 ? (
                              <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                            ) : (
                              <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                            )}
                            {item.percentage.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* Summary */}
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Total Items:</strong> {drillDownData.totalCount} | 
                  <strong> Showing:</strong> {drillDownData.data.length} items
                  {drillDownData.hasMore && ' (more available)'}
                </p>
              </div>
            </div>
          )}

          {/* No Data State */}
          {!loading && !dimensionsLoading && !drillDownData && selectedDimension && (
            <div className="text-center py-8 text-gray-500">
              <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No drill-down data available for this dimension</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};