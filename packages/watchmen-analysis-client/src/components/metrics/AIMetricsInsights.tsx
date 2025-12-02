import React, { useState, useEffect } from 'react';
import { Brain, TrendingUp, AlertTriangle, CheckCircle, Lightbulb, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { generateMetricsInsights } from '@/services/metricsManagementService';

interface AIMetricsInsight {
  title: string;
  description: string;
  metrics: string[];
  recommendation?: string;
  priority: 'high' | 'medium' | 'low';
}

interface AIMetricsInsightsProps {
  metricNames?: string[];
  autoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
}

const AIMetricsInsights: React.FC<AIMetricsInsightsProps> = ({ 
  metricNames, 
  autoRefresh = false, 
  refreshInterval = 30000 
}) => {
  const [insights, setInsights] = useState<AIMetricsInsight[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadInsights = async () => {
    setIsLoading(true);
    try {
      const newInsights = await generateMetricsInsights(metricNames);
      setInsights(newInsights);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error loading AI insights:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInsights();
  }, [metricNames]);

  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(loadInsights, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'medium':
        return <TrendingUp className="h-4 w-4 text-yellow-500" />;
      case 'low':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Lightbulb className="h-4 w-4 text-blue-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-500" />
              AI-Generated Insights
            </CardTitle>
            <div className="flex items-center gap-2">
              {lastUpdated && (
                <span className="text-sm text-gray-500">
                  Updated: {lastUpdated.toLocaleTimeString()}
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={loadInsights}
                disabled={isLoading}
                className="flex items-center gap-1"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && insights.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
              <span className="ml-2 text-gray-600">Generating AI insights...</span>
            </div>
          ) : (
            <div className="space-y-4">
              {insights.map((insight, index) => (
                <Card key={index} className="border-l-4 border-l-purple-500">
                  <CardContent className="pt-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          {getPriorityIcon(insight.priority)}
                          <h3 className="font-semibold text-lg">{insight.title}</h3>
                        </div>
                        <Badge 
                          variant="outline" 
                          className={getPriorityColor(insight.priority)}
                        >
                          {insight.priority.toUpperCase()} PRIORITY
                        </Badge>
                      </div>
                      
                      <p className="text-gray-700">{insight.description}</p>
                      
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-600">Related Metrics:</span>
                          <div className="flex flex-wrap gap-1">
                            {insight.metrics.map((metric, metricIndex) => (
                              <Badge key={metricIndex} variant="secondary" className="text-xs">
                                {metric}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        
                        {insight.recommendation && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <div className="flex items-start gap-2">
                              <Lightbulb className="h-4 w-4 text-blue-500 mt-0.5" />
                              <div>
                                <span className="text-sm font-medium text-blue-800">Recommendation:</span>
                                <p className="text-sm text-blue-700 mt-1">{insight.recommendation}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {insights.length === 0 && !isLoading && (
                <div className="text-center py-8 text-gray-500">
                  <Brain className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No insights available at the moment.</p>
                  <p className="text-sm">Try refreshing or check back later.</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AIMetricsInsights;