import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { ArrowUp, ArrowDown, BarChart2, BrainCircuit, CheckCircle, Clock, Play, RefreshCw, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { HypothesisType } from '@/model/Hypothesis';

interface AIExecuteMonitorProps {
  hypothesis?: HypothesisType;
  className?: string;
}

interface MetricUpdate {
  name: string;
  value: number;
  previousValue: number;
  change: number;
  timestamp: Date;
  status: 'positive' | 'negative' | 'neutral';
}

interface TestResult {
  id: string;
  timestamp: Date;
  status: 'running' | 'completed' | 'failed';
  confidence: number;
  pValue: number;
  metrics: string[];
}

interface AIAction {
  id: string;
  description: string;
  status: 'suggested' | 'implemented' | 'rejected';
  impact: 'high' | 'medium' | 'low';
  timestamp: Date;
  metrics: string[];
}

const AIExecuteMonitor: React.FC<AIExecuteMonitorProps> = ({ hypothesis, className }) => {
  const [activeTab, setActiveTab] = useState('metrics');
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  
  // Mock data for demonstration
  const [metricUpdates, setMetricUpdates] = useState<MetricUpdate[]>([
    {
      name: 'Customer Acquisition Rate',
      value: 12.5,
      previousValue: 10.2,
      change: 22.5,
      timestamp: new Date(Date.now() - 1000 * 60 * 5),
      status: 'positive'
    },
    {
      name: 'Conversion Rate',
      value: 3.8,
      previousValue: 4.2,
      change: -9.5,
      timestamp: new Date(Date.now() - 1000 * 60 * 15),
      status: 'negative'
    },
    {
      name: 'Age Distribution',
      value: 45.6,
      previousValue: 45.1,
      change: 1.1,
      timestamp: new Date(Date.now() - 1000 * 60 * 30),
      status: 'neutral'
    }
  ]);
  
  const [testResults, setTestResults] = useState<TestResult[]>([
    {
      id: 'test1',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
      status: 'completed',
      confidence: 78,
      pValue: 0.032,
      metrics: ['Customer Acquisition Rate', 'Conversion Rate']
    },
    {
      id: 'test2',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
      status: 'completed',
      confidence: 72,
      pValue: 0.041,
      metrics: ['Customer Acquisition Rate', 'Age Distribution']
    },
    {
      id: 'test3',
      timestamp: new Date(),
      status: 'running',
      confidence: 0,
      pValue: 0,
      metrics: ['Conversion Rate', 'Age Distribution']
    }
  ]);
  
  const [aiActions, setAiActions] = useState<AIAction[]>([
    {
      id: 'action1',
      description: 'Adjust marketing campaign targeting to focus on 45-60 age group',
      status: 'implemented',
      impact: 'high',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3),
      metrics: ['Customer Acquisition Rate', 'Age Distribution']
    },
    {
      id: 'action2',
      description: 'Optimize landing page for higher conversion rates',
      status: 'suggested',
      impact: 'medium',
      timestamp: new Date(Date.now() - 1000 * 60 * 30),
      metrics: ['Conversion Rate']
    },
    {
      id: 'action3',
      description: 'Implement A/B testing on product descriptions',
      status: 'rejected',
      impact: 'low',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5),
      metrics: ['Conversion Rate']
    }
  ]);

  // Simulate real-time monitoring
  useEffect(() => {
    if (!isMonitoring) return;
    
    const interval = setInterval(() => {
      // Update last updated timestamp
      setLastUpdated(new Date());
      
      // Simulate metric changes
      setMetricUpdates(prev => {
        const updated = [...prev];
        const randomIndex = Math.floor(Math.random() * updated.length);
        const randomChange = (Math.random() * 5) - 2.5; // Between -2.5 and 2.5
        
        updated[randomIndex] = {
          ...updated[randomIndex],
          previousValue: updated[randomIndex].value,
          value: +(updated[randomIndex].value + randomChange).toFixed(1),
          change: +(randomChange / updated[randomIndex].value * 100).toFixed(1),
          status: randomChange > 0 ? 'positive' : randomChange < 0 ? 'negative' : 'neutral',
          timestamp: new Date()
        };
        
        return updated;
      });
      
      // Occasionally update test results
      if (Math.random() > 0.7) {
        setTestResults(prev => {
          const updated = [...prev];
          // Complete a running test or add a new one
          const runningTest = updated.find(test => test.status === 'running');
          
          if (runningTest) {
            const index = updated.indexOf(runningTest);
            updated[index] = {
              ...runningTest,
              status: 'completed',
              confidence: Math.floor(Math.random() * 30) + 65, // 65-95
              pValue: +(Math.random() * 0.05).toFixed(3)
            };
          } else if (updated.length < 5) {
            updated.unshift({
              id: `test${Date.now()}`,
              timestamp: new Date(),
              status: 'running',
              confidence: 0,
              pValue: 0,
              metrics: hypothesis?.metrics?.slice(0, 2) || ['Metric 1', 'Metric 2']
            });
          }
          
          return updated;
        });
      }
      
      // Occasionally add AI actions
      if (Math.random() > 0.8 && aiActions.length < 5) {
        setAiActions(prev => {
          const actionDescriptions = [
            'Adjust pricing strategy based on customer segment response',
            'Implement targeted email campaign for high-value customers',
            'Optimize website conversion funnel',
            'Enhance mobile app user experience',
            'Develop loyalty program for 45-60 age segment'
          ];
          
          const randomDescription = actionDescriptions[Math.floor(Math.random() * actionDescriptions.length)];
          const impacts = ['high', 'medium', 'low'] as const;
          const randomImpact = impacts[Math.floor(Math.random() * impacts.length)];
          
          return [{
            id: `action${Date.now()}`,
            description: randomDescription,
            status: 'suggested',
            impact: randomImpact,
            timestamp: new Date(),
            metrics: hypothesis?.metrics?.slice(0, Math.floor(Math.random() * 3) + 1) || ['Metric 1']
          }, ...prev];
        });
      }
    }, 5000); // Update every 5 seconds
    
    return () => clearInterval(interval);
  }, [isMonitoring, hypothesis]);

  const toggleMonitoring = () => {
    setIsMonitoring(!isMonitoring);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'positive':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Positive <ArrowUp className="ml-1 h-3 w-3" /></Badge>;
      case 'negative':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Negative <ArrowDown className="ml-1 h-3 w-3" /></Badge>;
      case 'neutral':
        return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Neutral</Badge>;
      case 'running':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Running <RefreshCw className="ml-1 h-3 w-3 animate-spin" /></Badge>;
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Completed <CheckCircle className="ml-1 h-3 w-3" /></Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Failed <XCircle className="ml-1 h-3 w-3" /></Badge>;
      case 'suggested':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Suggested</Badge>;
      case 'implemented':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Implemented</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Rejected</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getImpactBadge = (impact: string) => {
    switch (impact) {
      case 'high':
        return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">High Impact</Badge>;
      case 'medium':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Medium Impact</Badge>;
      case 'low':
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">Low Impact</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card className={cn("glass-card flex flex-col h-full", className)}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <BrainCircuit className="h-4 w-4 text-primary" />
            AI Execute Monitor
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <div className="text-xs text-muted-foreground flex items-center">
              <Clock className="h-3 w-3 mr-1" />
              Last updated: {lastUpdated.toLocaleTimeString()}
            </div>
            <Button 
              variant={isMonitoring ? "destructive" : "default"} 
              size="sm"
              onClick={toggleMonitoring}
              className="h-7 text-xs"
            >
              {isMonitoring ? (
                <>
                  <XCircle className="h-3 w-3 mr-1" /> Stop
                </>
              ) : (
                <>
                  <Play className="h-3 w-3 mr-1" /> Start Monitoring
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0 flex-grow">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
          <TabsList className="grid grid-cols-3 mx-4 mt-2">
            <TabsTrigger value="metrics">Metrics</TabsTrigger>
            <TabsTrigger value="tests">Tests</TabsTrigger>
            <TabsTrigger value="actions">AI Actions</TabsTrigger>
          </TabsList>
          
          <ScrollArea className="h-[calc(100%-40px)] px-4 py-2">
            <TabsContent value="metrics" className="m-0 h-full">
              <div className="space-y-4">
                {metricUpdates.map((metric, index) => (
                  <Card key={index} className="p-3 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-medium">{metric.name}</div>
                      {getStatusBadge(metric.status)}
                    </div>
                    <div className="flex items-end gap-2 mb-2">
                      <div className="text-2xl font-semibold">{metric.value}</div>
                      <div className="text-sm text-muted-foreground">
                        {metric.change > 0 ? '+' : ''}{metric.change}% from {metric.previousValue}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Updated {metric.timestamp.toLocaleTimeString()}
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="tests" className="m-0 h-full">
              <div className="space-y-4">
                {testResults.map((test) => (
                  <Card key={test.id} className="p-3 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-medium">Hypothesis Test</div>
                      {getStatusBadge(test.status)}
                    </div>
                    
                    {test.status === 'completed' && (
                      <div className="mb-2">
                        <div className="flex justify-between mb-1">
                          <span className="text-sm">Confidence</span>
                          <span className="text-sm font-medium">{test.confidence}%</span>
                        </div>
                        <Progress value={test.confidence} className="h-1.5 mb-2" />
                        <div className="text-sm">p-value: {test.pValue}</div>
                      </div>
                    )}
                    
                    <div className="text-sm mb-2">
                      Metrics: {test.metrics.join(', ')}
                    </div>
                    
                    <div className="text-xs text-muted-foreground">
                      {test.status === 'running' ? 'Started' : 'Completed'} {test.timestamp.toLocaleTimeString()}
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="actions" className="m-0 h-full">
              <div className="space-y-4">
                {aiActions.map((action) => (
                  <Card key={action.id} className="p-3 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-medium">AI Recommendation</div>
                      <div className="flex gap-1">
                        {getImpactBadge(action.impact)}
                        {getStatusBadge(action.status)}
                      </div>
                    </div>
                    
                    <div className="text-sm mb-2">{action.description}</div>
                    
                    <div className="text-xs mb-1">
                      Affected metrics: {action.metrics.join(', ')}
                    </div>
                    
                    <div className="text-xs text-muted-foreground">
                      {action.timestamp.toLocaleTimeString()}
                    </div>
                    
                    {action.status === 'suggested' && (
                      <div className="flex gap-2 mt-2">
                        <Button size="sm" variant="outline" className="h-7 text-xs w-full">
                          <CheckCircle className="h-3 w-3 mr-1" /> Implement
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs w-full">
                          <XCircle className="h-3 w-3 mr-1" /> Reject
                        </Button>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default AIExecuteMonitor;