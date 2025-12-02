import React, { useState } from 'react';
import { Brain, MessageSquare, Lightbulb, Target, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import AIMetricsQuery from '@/components/metrics/AIMetricsQuery';
import AIMetricsInsights from '@/components/metrics/AIMetricsInsights';
import AIMetricsRecommendations from '@/components/metrics/AIMetricsRecommendations';
import { Message } from '@/components/ai/AIMessage';

const AIMetricsDemo: React.FC = () => {
  const [queryResults, setQueryResults] = useState<Message[]>([]);
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([
    'total_annual_premium_hkd',
    'total_policies_issued',
    'unique_customers',
    'multi_policy_rate'
  ]);

  const handleQueryResult = (result: Message) => {
    setQueryResults(prev => [result, ...prev.slice(0, 4)]); // Keep last 5 results
  };

  const handleRecommendationGenerated = (recommendation: Message) => {
    console.log('New recommendation generated:', recommendation);
  };

  const sampleQueries = [
    "How are our sales performing compared to last year?",
    "What's the trend in customer acquisition?",
    "Which channels are most effective?",
    "How can we improve our product mix?",
    "What are the key financial ratios we should focus on?"
  ];

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3">
          <Brain className="h-8 w-8 text-purple-500" />
          <h1 className="text-3xl font-bold text-gray-900">AI-Powered Metrics Analysis</h1>
        </div>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Leverage artificial intelligence to gain deep insights into your insurance metrics, 
          get natural language analysis, and receive actionable recommendations.
        </p>
        <div className="flex justify-center gap-2">
          <Badge variant="secondary" className="flex items-center gap-1">
            <MessageSquare className="h-3 w-3" />
            Natural Language Queries
          </Badge>
          <Badge variant="secondary" className="flex items-center gap-1">
            <Lightbulb className="h-3 w-3" />
            AI Insights
          </Badge>
          <Badge variant="secondary" className="flex items-center gap-1">
            <Target className="h-3 w-3" />
            Smart Recommendations
          </Badge>
        </div>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="query" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="query" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            AI Query
          </TabsTrigger>
          <TabsTrigger value="insights" className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            AI Insights
          </TabsTrigger>
          <TabsTrigger value="recommendations" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            AI Recommendations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="query" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <AIMetricsQuery onQueryResult={handleQueryResult} />
            </div>
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Sample Queries</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {sampleQueries.map((query, index) => (
                      <div key={index} className="p-2 bg-gray-50 rounded text-sm">
                        "{query}"
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              
              {queryResults.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Recent Queries</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {queryResults.map((result, index) => (
                        <div key={result.id} className="p-2 bg-blue-50 rounded text-xs">
                          <div className="font-medium text-blue-800">
                            Query #{queryResults.length - index}
                          </div>
                          <div className="text-blue-600 mt-1">
                            {result.timestamp.toLocaleTimeString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3">
              <AIMetricsInsights 
                metricNames={selectedMetrics}
                autoRefresh={false}
              />
            </div>
            <div>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Focus Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {selectedMetrics.map((metric, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {metric.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-3">
                    AI insights are generated based on these selected metrics and their patterns.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-6">
          <AIMetricsRecommendations 
            onRecommendationGenerated={handleRecommendationGenerated}
          />
        </TabsContent>
      </Tabs>

      {/* Features Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-500" />
            AI Features Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-green-500" />
                <h3 className="font-semibold">Natural Language Queries</h3>
              </div>
              <p className="text-sm text-gray-600">
                Ask questions about your metrics in plain English and get intelligent, 
                contextual responses with detailed analysis and insights.
              </p>
              <ul className="text-xs text-gray-500 space-y-1">
                <li>• Sales performance analysis</li>
                <li>• Customer behavior insights</li>
                <li>• Channel performance evaluation</li>
                <li>• Product mix optimization</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-yellow-500" />
                <h3 className="font-semibold">AI-Generated Insights</h3>
              </div>
              <p className="text-sm text-gray-600">
                Automatically discover patterns, trends, and anomalies in your metrics data 
                with prioritized insights and actionable recommendations.
              </p>
              <ul className="text-xs text-gray-500 space-y-1">
                <li>• Automated pattern detection</li>
                <li>• Priority-based insights</li>
                <li>• Trend analysis</li>
                <li>• Performance benchmarking</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-purple-500" />
                <h3 className="font-semibold">Smart Recommendations</h3>
              </div>
              <p className="text-sm text-gray-600">
                Get category-specific recommendations based on your metrics performance 
                with clear action items and expected outcomes.
              </p>
              <ul className="text-xs text-gray-500 space-y-1">
                <li>• Category-specific advice</li>
                <li>• Implementation timelines</li>
                <li>• Expected impact analysis</li>
                <li>• Strategic optimization</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AIMetricsDemo;