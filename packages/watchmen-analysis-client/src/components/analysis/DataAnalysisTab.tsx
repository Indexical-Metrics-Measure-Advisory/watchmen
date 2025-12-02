import React, { useState } from 'react';
import { EmulativeAnalysisMethod, MetricDimension, DimensionType } from '@/model/analysis';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart as RechartBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart as RechartLineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, BarChart3, PieChart as PieChartIcon, Activity, AlertCircle, Drill } from 'lucide-react';
import { DrillDownPanel } from './DrillDownPanel';

interface MetricData {
  name: string;
  category: string;
  data: any[][];
  columns: string[];
  dimensions: MetricDimension[];
}

interface DataAnalysisTabProps {
  analysisMethod?: EmulativeAnalysisMethod;
  metricsData?: MetricData[] | null;
}

const DataAnalysisTab: React.FC<DataAnalysisTabProps> = ({ analysisMethod, metricsData }) => {
  const [selectedDimensions, setSelectedDimensions] = useState<{[key: string]: string}>({});
  const [selectedMeasures, setSelectedMeasures] = useState<{[key: string]: string}>({});
  const [drillDownData, setDrillDownData] = useState<any>(null);
  const [showDrillDown, setShowDrillDown] = useState(false);
  // console.log('metricsData', metricsData);
  // Early return with error handling if data is invalid
  if (!metricsData) {
    return (
      <Card className="shadow-sm">
        <CardContent className="flex flex-col items-center justify-center h-64 text-center">
          <div className="p-4 rounded-full bg-red-100 mb-4">
            <AlertCircle className="h-8 w-8 text-red-400" />
          </div>
          <h3 className="text-lg font-semibold text-red-700 mb-2">Data Loading Error</h3>
          <p className="text-red-500 mb-1">Unable to load analysis data</p>
          <p className="text-sm text-red-400">Please refresh the page or contact support</p>
        </CardContent>
      </Card>
    );
  }

  // Transform and group metrics data for chart rendering with dimension awareness
  const transformDataForChart = (metric: MetricData, groupByDimension?: MetricDimension, measureDimension?: MetricDimension) => {
    if (!metric || !metric.data || !Array.isArray(metric.data) || !metric.columns) {
      return [];
    }

    // First transform raw data to objects
    const transformedData = metric.data.map(row => {
      const obj: any = {};
      metric.columns.forEach((col, index) => {
        const dimension = metric.dimensions.find(d => d.qualified_name === col);
        let value = row[index];
        
        if (value !== null && value !== undefined && value !== '') {
          if (dimension?.dimensionType === DimensionType.NUMERICAL && typeof value === 'string') {
            value = parseFloat(value) || 0;
          } else if (dimension?.dimensionType === DimensionType.BOOLEAN && typeof value === 'string') {
            value = value.toLowerCase() === 'true' || value === '1';
          }
        }
        
        obj[col] = value;
      });
      
      return obj;
    });
    
    if (!groupByDimension || !measureDimension) {
      return transformedData;
    }

    const groupByDimName = groupByDimension.qualified_name;
    const measureDimName = measureDimension.qualified_name;
    console.log('transformedData', transformedData);
    // console.log('measureDimName', measureDimName);
    // Group data by the selected dimension and aggregate measures
    const groupedData = transformedData.reduce((acc, row) => {
      const groupKey = row[groupByDimName];
      const displayKey = groupKey === null || groupKey === undefined || groupKey === '' ? '(空值)' : groupKey;
      
      const rawMeasureValue = row[measureDimName];
      
      if (!acc[displayKey]) {
        acc[displayKey] = {
          [groupByDimName]: displayKey,
          [measureDimName]: 0,
          _count: 0
        };
      }

      if (rawMeasureValue !== null && rawMeasureValue !== undefined && rawMeasureValue !== '') {
        let measureValue = 0;
        if (typeof rawMeasureValue === 'number') {
          measureValue = rawMeasureValue;
        } else if (typeof rawMeasureValue === 'string') {
          const parsed = parseFloat(rawMeasureValue);
          measureValue = isNaN(parsed) ? 0 : parsed;
        }
        
        if (acc[displayKey]._count === 0) {
            acc[displayKey][measureDimName] = 0;
        }

        acc[displayKey][measureDimName] += measureValue;
        acc[displayKey]._count += 1;
      }
      
      return acc;
    }, {} as any);
    
    const result = Object.values(groupedData).map((group: any) => {
      if (isPercentageMetric(measureDimName) && group._count > 1) {
        group[measureDimName] = group[measureDimName] / group._count;
      }
      
      delete group._count;
      return group;
    });

    // If grouping by a time dimension, sort the results chronologically
    if (groupByDimension.dimensionType === DimensionType.TIME) {
      return result.sort((a, b) => new Date(a[groupByDimName]).getTime() - new Date(b[groupByDimName]).getTime());
    }
    
    return result;
  };

  // Get dimension information for better chart configuration
  const getDimensionInfo = (metric: MetricData) => {
    // console.log('metric', metric);
    const measureDimensions = metric.dimensions.filter(d => 
      d.dimensionType === DimensionType.NUMERICAL && d.qualified_name !== metric.columns[0]
    );
    const categoryDimensions = metric.dimensions.filter(d => 
      d.dimensionType === DimensionType.CATEGORICAL || d.dimensionType === DimensionType.TEXT
    );
    const timeDimensions = metric.dimensions.filter(d => 
      d.dimensionType === DimensionType.TIME
    );

    // if metric_time in metric dimensions, add it to timeDimensions
    metric.columns.forEach(column => {
      if (column.startsWith('metric_time')) {
        // Check if this dimension is already in timeDimensions to avoid duplicates
        if (!timeDimensions.some(td => td.qualified_name === column)) {
          timeDimensions.push({
            qualified_name: column,
            name: column,
            description: column,
            dimensionType: DimensionType.TIME
          });
        }
      }
    });
    
    // Per user request, the measure column is the metric's name itself.
    // We start with the predefined measure dimensions.
    const allMeasureColumns = [...measureDimensions];

    // Then, we add the metric's name as a measure if it's a valid column
    // and not already included as a dimension or measure.
    if (metric.name && metric.columns.includes(metric.name)) {
      const isAlreadyIncluded = 
        allMeasureColumns.some(m => m.qualified_name === metric.name) ||
        metric.dimensions.some(d => d.qualified_name === metric.name);

      if (!isAlreadyIncluded) {
        allMeasureColumns.push({
          qualified_name: metric.name,
          name: metric.name,
          description: `Measure dimension: ${metric.name}`,
          dimensionType: DimensionType.NUMERICAL
        });
      }
    }
    
    // Create default dimensions if none exist
    const defaultCategory = categoryDimensions[0] || {
      qualified_name: metric.columns[0] || 'category',
      name: metric.columns[0] || 'category',
      description: 'Default category dimension',
      dimensionType: DimensionType.CATEGORICAL
    };
    
    const defaultMeasure = allMeasureColumns[0] || {
      qualified_name: metric.columns[1] || 'value',
      name: metric.columns[1] || 'value',
      description: 'Default measure dimension', 
      dimensionType: DimensionType.NUMERICAL
    };
    
    return {
      measures: allMeasureColumns,
      categories: categoryDimensions,
      timeDimensions,
      primaryCategory: defaultCategory,
      primaryMeasure: defaultMeasure
    };
  };

  const getOptimalChartType = (metric: MetricData, analysisMethod?: EmulativeAnalysisMethod, chartData?: any[]) => {
    const dimInfo = getDimensionInfo(metric);
    
    // If we have time dimensions, prefer line charts
    if (dimInfo.timeDimensions.length > 0) {
      return 'line';
    }
    
    // For distribution analysis with categorical data, prefer pie charts for small datasets
    if (analysisMethod === EmulativeAnalysisMethod.DISTRIBUTION_ANALYSIS && 
        dimInfo.categories.length > 0 && chartData && chartData.length <= 8) {
      return 'pie';
    }
    
    // For comparison analysis, prefer bar charts
    if (analysisMethod === EmulativeAnalysisMethod.COMPARISON_ANALYSIS) {
      return 'bar';
    }
    
    // Default to bar chart for most cases
    return 'bar';
  };

  // Format numbers for better readability
  const formatNumber = (value: number, type: string = 'default') => {
    if (type === 'currency') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(value);
    }
    if (type === 'percentage') {
      return `${(value * 100).toFixed(1)}%`;
    }
    if (type === 'decimal') {
      return value.toFixed(2);
    }
    return new Intl.NumberFormat('en-US').format(value);
  };

  // Get analysis method display info
  const getAnalysisInfo = (method?: EmulativeAnalysisMethod) => {
    switch (method) {
      case EmulativeAnalysisMethod.COMPARISON_ANALYSIS:
        return {
          title: 'Comparison Analysis',
          description: 'Compare key metrics across different groups or periods',
          icon: BarChart3,
          color: 'bg-blue-100 text-blue-800'
        };
      case EmulativeAnalysisMethod.TREND_ANALYSIS:
        return {
          title: 'Trend Analysis',
          description: 'Observe metric trends and patterns over time',
          icon: TrendingUp,
          color: 'bg-green-100 text-green-800'
        };
      case EmulativeAnalysisMethod.DISTRIBUTION_ANALYSIS:
        return {
          title: 'Distribution Analysis',
          description: 'Understand data distribution characteristics and proportions',
          icon: PieChartIcon,
          color: 'bg-purple-100 text-purple-800'
        };
      default:
        return {
          title: 'Data Analysis',
          description: 'Deep insights into business data',
          icon: Activity,
          color: 'bg-gray-100 text-gray-800'
        };
    }
  };



  // Get dimension display name in English
  const getDimensionDisplayName = (dimension: MetricDimension) => {
    const nameMap: { [key: string]: string } = {
      'product_type': 'Product Type',
      'age_group': 'Age Group',
      'region': 'Region',
      'channel': 'Channel',
      'time_period': 'Time Period',
      'customer_segment': 'Customer Segment',
      'risk_level': 'Risk Level',
      'policy_duration': 'Policy Duration',
      'underwriting__main_entry_age': 'Entry Age',
      'underwriting__main_job_category': 'Job Category',
      'main_entry_age': 'Entry Age'
    };
    return nameMap[dimension.qualified_name] || dimension.description || dimension.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Determine if metric is currency-related
  const isCurrencyMetric = (name: string) => {
    return name.includes('premium') || name.includes('cost') || name.includes('value') || name.includes('profit');
  };

  // Determine if metric is percentage-related
  const isPercentageMetric = (name: string) => {
    return name.includes('rate') || name.includes('ratio') || name.includes('margin');
  };

  // Custom tooltip formatter
  const customTooltipFormatter = (value: any, name: string, props: any) => {
    const metricName = props.payload?.metricName || name;
    let formattedValue = value;
    
    if (isCurrencyMetric(metricName)) {
      formattedValue = formatNumber(value, 'currency');
    } else if (isPercentageMetric(metricName)) {
      formattedValue = formatNumber(value / 100, 'percentage');
    } else if (typeof value === 'number') {
      formattedValue = formatNumber(value);
    }
    
    return [formattedValue, name];
  };

  // Professional color palette for insurance business
  const businessColors = {
    primary: ['#1e40af', '#3b82f6', '#60a5fa', '#93c5fd', '#dbeafe'],
    success: ['#059669', '#10b981', '#34d399', '#6ee7b7', '#d1fae5'],
    warning: ['#d97706', '#f59e0b', '#fbbf24', '#fde047', '#fef3c7'],
    danger: ['#dc2626', '#ef4444', '#f87171', '#fca5a5', '#fee2e2'],
    purple: ['#7c3aed', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ede9fe']
  };

  // Calculate key insights for the metric
  const calculateInsights = (chartData: any[], metric: MetricData) => {
    if (!chartData.length) return null;
    
    const numericColumns = metric.columns.slice(1);
    const insights: any = {};
    
    numericColumns.forEach(col => {
      const values = chartData.map(item => Number(item[col])).filter(v => !isNaN(v));
      if (values.length > 0) {
        const max = Math.max(...values);
        const min = Math.min(...values);
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        const total = values.reduce((a, b) => a + b, 0);
        
        insights[col] = { max, min, avg, total, count: values.length };
      }
    });
    
    return insights;
  };

  // Enhanced chart component with dimension awareness
  const getChartComponent = (metric: MetricData) => {
    // Add safety checks for metric data
    if (!metric || !metric.name || !metric.dimensions || !Array.isArray(metric.dimensions)) {
      return (
        <Card key={metric?.name || 'error'} className="shadow-sm border-l-4 border-l-red-500">
          <CardContent className="flex flex-col items-center justify-center h-64 text-center">
            <div className="p-4 rounded-full bg-red-100 mb-4">
              <AlertCircle className="h-8 w-8 text-red-400" />
            </div>
            <h3 className="text-lg font-semibold text-red-700 mb-2">Data Format Error</h3>
            <p className="text-red-500 mb-1">Metric data format is incorrect</p>
            <p className="text-sm text-red-400">Please check data source or contact support</p>
          </CardContent>
        </Card>
      );
    }
    // console.log('metric', metric);

    const dimInfo = getDimensionInfo(metric);
    const displayName = metric.name;
    const analysisInfo = getAnalysisInfo(analysisMethod);
    const IconComponent = analysisInfo.icon;
    // console.log('dimInfo', dimInfo);
    // Get available dimensions and measures for selection
    const availableDimensions = dimInfo.categories.concat(dimInfo.timeDimensions);
    const availableMeasures = dimInfo.measures;
    
    // Use selected dimensions or defaults
    const currentCategory = selectedDimensions[metric.name] ? 
      availableDimensions.find(d => d.qualified_name === selectedDimensions[metric.name]) || dimInfo.primaryCategory :
      dimInfo.primaryCategory;

    // console.log('availableMeasures', availableMeasures);

    const currentMeasure = selectedMeasures[metric.name] ?
      availableMeasures.find(m => m.qualified_name === selectedMeasures[metric.name]) || dimInfo.primaryMeasure :
      dimInfo.primaryMeasure;
    
    // console.log('currentCategory', currentCategory);
    // console.log('currentMeasure', currentMeasure);
    // Transform data with selected dimensions for grouping
    const chartData = transformDataForChart(metric, currentCategory, currentMeasure);
    const optimalChartType = getOptimalChartType(metric, analysisMethod, chartData);
    const insights = calculateInsights(chartData, metric);

    console.log('chartData', chartData);

    // If no chart data, show empty state
    if (!chartData || chartData.length === 0) {
      return (
        <Card key={metric.name} className="shadow-sm border-l-4 border-l-yellow-500">
          <CardContent className="flex flex-col items-center justify-center h-64 text-center">
            <div className="p-4 rounded-full bg-yellow-100 mb-4">
              <IconComponent className="h-8 w-8 text-yellow-400" />
            </div>
            <h3 className="text-lg font-semibold text-yellow-700 mb-2">{displayName}</h3>
            <p className="text-yellow-500 mb-1">No visualization data</p>
            <p className="text-sm text-yellow-400">No chart data available for this metric</p>
          </CardContent>
        </Card>
      );
    }
    
    // Enhanced dimension-aware chart rendering
    const renderChart = () => {
      switch (optimalChartType) {
        case 'line':
          return renderLineChart();
        case 'pie':
          return renderPieChart();
        case 'bar':
        default:
          return renderBarChart();
      }
    };

    // Render bar chart with dimension awareness
    const renderBarChart = () => {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <RechartBarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey={currentCategory.qualified_name}
              angle={-45}
              textAnchor="end"
              height={40}
              fontSize={10}
              tick={{ fontSize: 10 }}
            />
            <YAxis 
              tickFormatter={(value) => 
                isCurrencyMetric(metric.name) ? formatNumber(value, 'currency') :
                isPercentageMetric(metric.name) ? formatNumber(value / 100, 'percentage') :
                formatNumber(value)
              }
              fontSize={10}
              tick={{ fontSize: 10 }}
            />
            <Tooltip 
              formatter={customTooltipFormatter}
              labelStyle={{ color: '#374151', fontWeight: 'bold', fontSize: '12px' }}
              contentStyle={{ 
                backgroundColor: '#fff', 
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                fontSize: '12px'
              }}
            />
            <Bar 
              dataKey={currentMeasure.qualified_name} 
              fill={businessColors.primary[0]}
              radius={[4, 4, 0, 0]}
              name={currentMeasure.qualified_name}
            />
          </RechartBarChart>
        </ResponsiveContainer>
      );
    };

    // Render line chart with dimension awareness
    const renderLineChart = () => (
      <ResponsiveContainer width="100%" height="100%">
        <RechartLineChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 40 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey={dimInfo.timeDimensions[0]?.qualified_name || currentCategory.qualified_name}
            angle={-45}
            textAnchor="end"
            height={40}
            fontSize={10}
            tick={{ fontSize: 10 }}
          />
          <YAxis 
            tickFormatter={(value) => 
              isCurrencyMetric(metric.name) ? formatNumber(value, 'currency') :
              isPercentageMetric(metric.name) ? formatNumber(value / 100, 'percentage') :
              formatNumber(value)
            }
            fontSize={10}
            tick={{ fontSize: 10 }}
          />
          <Tooltip 
            formatter={customTooltipFormatter}
            labelStyle={{ color: '#374151', fontWeight: 'bold', fontSize: '12px' }}
            contentStyle={{ 
              backgroundColor: '#fff', 
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              fontSize: '12px'
            }}
          />
          <Line 
            type="monotone" 
            dataKey={currentMeasure.qualified_name} 
            stroke={businessColors.success[0]} 
            strokeWidth={2}
            activeDot={{ r: 4, fill: businessColors.success[0] }}
            dot={{ r: 3, fill: businessColors.success[0] }}
            name={currentMeasure.qualified_name}
          />
        </RechartLineChart>
      </ResponsiveContainer>
    );

    // Render pie chart with dimension awareness
    const renderPieChart = () => (
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
            outerRadius={80}
            innerRadius={30}
            fill="#8884d8"
            dataKey={currentMeasure.qualified_name}
            nameKey={currentCategory.qualified_name}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={businessColors.purple[index % businessColors.purple.length]} />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value, name) => [
              isCurrencyMetric(metric.name) ? formatNumber(Number(value), 'currency') :
              isPercentageMetric(metric.name) ? formatNumber(Number(value) / 100, 'percentage') :
              formatNumber(Number(value)),
              getDimensionDisplayName(currentMeasure)
            ]}
            contentStyle={{ 
              backgroundColor: '#fff', 
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              fontSize: '12px'
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    );

    return (
      <Card key={metric.name} className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${analysisInfo.color}`}>
                <IconComponent className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold">{displayName}</CardTitle>
                <CardDescription className="text-sm text-gray-600">
                  {analysisInfo.description}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDrillDownData({ metric, chartData, currentCategory, currentMeasure });
                  setShowDrillDown(true);
                }}
                className="h-8 px-3 text-xs"
              >
                <Drill className="h-3 w-3 mr-1" />
                Drill Down
              </Button>
              <Badge variant="outline" className="text-xs">
                {analysisInfo.title}
              </Badge>
            </div>
          </div>
          
          {/* Dimension Selection Controls */}
          <div className="flex gap-4 mt-4">
            {availableDimensions.length > 1 && (
              <div className="flex-1">
                <label className="text-xs text-gray-500 mb-1 block">Category</label>
                <Select 
                  value={selectedDimensions[metric.name] || dimInfo.primaryCategory.qualified_name} 
                  onValueChange={(value) => setSelectedDimensions(prev => ({...prev, [metric.name]: value}))}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableDimensions.map(dim => (
                      <SelectItem key={dim.qualified_name} value={dim.qualified_name} className="text-xs">
                        {getDimensionDisplayName(dim)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full">
            {renderChart()}
          </div>
          {insights && (
            <div className="mt-4 pt-3 border-t border-gray-200">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Key Insights</h4>
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(insights).slice(0, 2).map(([key, value]: [string, any]) => (
                  <div key={key} className="text-center">
                    <div className="text-xs text-gray-500 mb-1">
                      {key}
                    </div>
                    <div className="text-sm font-semibold text-gray-900">
                      {isCurrencyMetric(key) ? formatNumber(value.avg, 'currency') :
                       isPercentageMetric(key) ? formatNumber(value.avg / 100, 'percentage') :
                       formatNumber(value.avg, 'decimal')}
                    </div>
                    <div className="text-xs text-gray-400">
                      Average
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (!metricsData || metricsData.length === 0) {
    const analysisInfo = getAnalysisInfo(analysisMethod);
    const IconComponent = analysisInfo.icon;
    
    return (
      <Card className="shadow-sm">
        <CardContent className="flex flex-col items-center justify-center h-64 text-center">
          <div className="p-4 rounded-full bg-gray-100 mb-4">
            <IconComponent className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No Data Available</h3>
          <p className="text-gray-500 mb-1">No {analysisInfo.title.toLowerCase()} data available</p>
          <p className="text-sm text-gray-400">Please ensure analysis data is loaded or select another analysis method</p>
          <div className="mt-4">
            <Badge variant="outline" className="text-gray-500">
              {analysisInfo.title}
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {metricsData.map(metric => getChartComponent(metric))}
      
      {showDrillDown && drillDownData && (
         <DrillDownPanel
           metricId={drillDownData.metric.name}
           metricName={drillDownData.metric.name}
           isOpen={showDrillDown}
           onClose={() => setShowDrillDown(false)}
           onDrillDown={(dimension, value) => {
             console.log('Drill down:', dimension, value);
             // Here you can implement additional drill-down logic
             // such as updating filters or navigating to detailed views
           }}
         />
       )}
    </div>
  );
};

export default DataAnalysisTab;
