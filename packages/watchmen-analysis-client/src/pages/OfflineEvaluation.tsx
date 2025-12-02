import React, { useState, useEffect } from 'react';
import { useSidebar } from '@/contexts/SidebarContext';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Play, Download, FileText, BarChart3, CheckCircle, XCircle, Clock, Settings, Database, TestTube } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface EvaluationResult {
  id: string;
  name: string;
  status: 'completed' | 'running' | 'failed';
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  createdAt: string;
  duration: string;
  scenario?: string;
  dataset?: string;
}

interface Scenario {
  id: string;
  name: string;
  description: string;
  type: 'hypothesis_validation' | 'model_testing' | 'performance_benchmark';
}

interface Dataset {
  id: string;
  name: string;
  description: string;
  size: number;
  format: string;
  lastUpdated: string;
}

interface EvaluationConfig {
  name: string;
  description: string;
  scenarioId: string;
  datasetIds: string[];
  metrics: string[];
  parameters: {
    batchSize: number;
    testSplit: number;
    crossValidation: boolean;
    randomSeed: number;
  };
}

const OfflineEvaluation = () => {
  const { collapsed } = useSidebar();
  const [evaluations, setEvaluations] = useState<EvaluationResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [config, setConfig] = useState<EvaluationConfig>({
    name: '',
    description: '',
    scenarioId: '',
    datasetIds: [],
    metrics: ['accuracy', 'precision', 'recall', 'f1Score'],
    parameters: {
      batchSize: 32,
      testSplit: 0.2,
      crossValidation: false,
      randomSeed: 42
    }
  });

  useEffect(() => {
    // 模拟加载历史评估结果
    const mockEvaluations: EvaluationResult[] = [
      {
        id: '1',
        name: 'Model Performance Benchmark Test',
        status: 'completed',
        accuracy: 0.92,
        precision: 0.89,
        recall: 0.94,
        f1Score: 0.91,
        createdAt: '2024-01-15 14:30:00',
        duration: '45 minutes',
        scenario: 'Performance Benchmark Test',
        dataset: 'Insurance Dataset v2.1'
      },
      {
        id: '2',
        name: 'Hypothesis Validation Accuracy Assessment',
        status: 'completed',
        accuracy: 0.87,
        precision: 0.85,
        recall: 0.89,
        f1Score: 0.87,
        createdAt: '2024-01-14 10:15:00',
        duration: '32 minutes',
        scenario: 'Hypothesis Validation',
        dataset: 'Customer Behavior Dataset'
      },
      {
        id: '3',
        name: 'Data Quality Assessment',
        status: 'failed',
        accuracy: 0,
        precision: 0,
        recall: 0,
        f1Score: 0,
        createdAt: '2024-01-13 16:45:00',
        duration: '12 minutes',
        scenario: 'Data Quality Check',
        dataset: 'Historical Transaction Data'
      }
    ];
    setEvaluations(mockEvaluations);

    // 模拟加载场景数据
    const mockScenarios: Scenario[] = [
      {
        id: '1',
        name: 'Hypothesis Validation',
        description: 'Validate the accuracy and reliability of business hypotheses',
        type: 'hypothesis_validation'
      },
      {
        id: '2',
        name: 'Model Performance Testing',
        description: 'Evaluate the overall performance of machine learning models',
        type: 'model_testing'
      },
      {
        id: '3',
        name: 'Performance Benchmark Testing',
        description: 'Compare performance against industry standards',
        type: 'performance_benchmark'
      }
    ];
    setScenarios(mockScenarios);

    // 模拟加载数据集
    const mockDatasets: Dataset[] = [
      {
        id: '1',
        name: 'Insurance Dataset v2.1',
        description: 'Contains customer information, policy data, and claims records',
        size: 125000,
        format: 'CSV',
        lastUpdated: '2024-01-10'
      },
      {
        id: '2',
        name: 'Customer Behavior Dataset',
        description: 'Customer interaction and behavior pattern data',
        size: 89000,
        format: 'JSON',
        lastUpdated: '2024-01-12'
      },
      {
        id: '3',
        name: 'Historical Transaction Data',
        description: 'Transaction history records from the past 5 years',
        size: 250000,
        format: 'Parquet',
        lastUpdated: '2024-01-08'
      }
    ];
    setDatasets(mockDatasets);
  }, []);

  const startEvaluation = async () => {
    setIsRunning(true);
    setProgress(0);
    
    // 模拟评估进度
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsRunning(false);
          toast({
            title: "Evaluation Completed",
            description: "Offline evaluation has been successfully completed and results have been saved.",
          });
          
          // 添加新的评估结果
          const selectedScenario = scenarios.find(s => s.id === config.scenarioId);
          const selectedDatasets = datasets.filter(d => config.datasetIds.includes(d.id));
          
          const newEvaluation: EvaluationResult = {
            id: Date.now().toString(),
            name: config.name || 'New Offline Evaluation',
            status: 'completed',
            accuracy: 0.88 + Math.random() * 0.1,
            precision: 0.85 + Math.random() * 0.1,
            recall: 0.87 + Math.random() * 0.1,
            f1Score: 0.86 + Math.random() * 0.1,
            createdAt: new Date().toLocaleString('en-US'),
            duration: `${Math.floor(Math.random() * 30 + 20)} minutes`,
            scenario: selectedScenario?.name,
            dataset: selectedDatasets.map(d => d.name).join(', ')
          };
          
          setEvaluations(prev => [newEvaluation, ...prev]);
          return 100;
        }
        return prev + Math.random() * 10;
      });
    }, 1000);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'running':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      completed: 'default',
      running: 'secondary',
      failed: 'destructive'
    } as const;
    
    const labels = {
      completed: 'Completed',
      running: 'Running',
      failed: 'Failed'
    };
    
    return (
      <Badge variant={variants[status as keyof typeof variants]}>
        {labels[status as keyof typeof labels]}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className={`${collapsed ? 'pl-20' : 'pl-56'} min-h-screen transition-all duration-300`}>
        <Header />
        <main className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Offline Evaluation</h1>
          <p className="text-muted-foreground">
            Perform offline performance evaluation and benchmarking for models and algorithms
          </p>
        </div>
        <Button 
          onClick={startEvaluation} 
          disabled={isRunning}
          className="flex items-center gap-2"
        >
          <Play className="h-4 w-4" />
          {isRunning ? 'Evaluating...' : 'Start New Evaluation'}
        </Button>
      </div>

      {isRunning && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Evaluation in Progress
            </CardTitle>
            <CardDescription>
              Offline evaluation is running, please wait...
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="config" className="space-y-4">
        <TabsList>
          <TabsTrigger value="config">Evaluation Configuration</TabsTrigger>
          <TabsTrigger value="results">Evaluation Results</TabsTrigger>
          <TabsTrigger value="metrics">Performance Metrics</TabsTrigger>
          <TabsTrigger value="reports">Detailed Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Basic Configuration
                </CardTitle>
                <CardDescription>
                  Configure basic information and parameters for evaluation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="eval-name">Evaluation Name</Label>
                  <Input
                    id="eval-name"
                    placeholder="Enter evaluation name"
                    value={config.name}
                    onChange={(e) => setConfig(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="eval-description">Evaluation Description</Label>
                  <Textarea
                    id="eval-description"
                    placeholder="Describe the purpose and content of this evaluation"
                    value={config.description}
                    onChange={(e) => setConfig(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="scenario-select">Evaluation Scenario</Label>
                  <Select value={config.scenarioId} onValueChange={(value) => setConfig(prev => ({ ...prev, scenarioId: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select evaluation scenario" />
                    </SelectTrigger>
                    <SelectContent>
                      {scenarios.map((scenario) => (
                        <SelectItem key={scenario.id} value={scenario.id}>
                          <div className="flex items-center gap-2">
                            <TestTube className="h-4 w-4" />
                            <div>
                              <div className="font-medium">{scenario.name}</div>
                              <div className="text-xs text-muted-foreground">{scenario.description}</div>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Dataset Selection
                </CardTitle>
                <CardDescription>
                  Select datasets for evaluation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {datasets.map((dataset) => (
                    <div key={dataset.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                      <Checkbox
                        id={`dataset-${dataset.id}`}
                        checked={config.datasetIds.includes(dataset.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setConfig(prev => ({
                              ...prev,
                              datasetIds: [...prev.datasetIds, dataset.id]
                            }));
                          } else {
                            setConfig(prev => ({
                              ...prev,
                              datasetIds: prev.datasetIds.filter(id => id !== dataset.id)
                            }));
                          }
                        }}
                      />
                      <div className="grid gap-1.5 leading-none">
                        <label
                          htmlFor={`dataset-${dataset.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {dataset.name}
                        </label>
                        <p className="text-xs text-muted-foreground">
                          {dataset.description}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{dataset.size.toLocaleString()} records</span>
                          <span>•</span>
                          <span>{dataset.format}</span>
                          <span>•</span>
                          <span>Updated on {dataset.lastUpdated}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Evaluation Metrics</CardTitle>
                <CardDescription>
                  Select evaluation metrics to calculate
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { id: 'accuracy', label: 'Accuracy', description: 'Proportion of correct predictions' },
                  { id: 'precision', label: 'Precision', description: 'Proportion of actual positives among predicted positives' },
                  { id: 'recall', label: 'Recall', description: 'Proportion of correctly predicted actual positives' },
                  { id: 'f1Score', label: 'F1 Score', description: 'Harmonic mean of precision and recall' }
                ].map((metric) => (
                  <div key={metric.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`metric-${metric.id}`}
                      checked={config.metrics.includes(metric.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setConfig(prev => ({
                            ...prev,
                            metrics: [...prev.metrics, metric.id]
                          }));
                        } else {
                          setConfig(prev => ({
                            ...prev,
                            metrics: prev.metrics.filter(m => m !== metric.id)
                          }));
                        }
                      }}
                    />
                    <div className="grid gap-1.5 leading-none">
                      <label
                        htmlFor={`metric-${metric.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {metric.label}
                      </label>
                      <p className="text-xs text-muted-foreground">
                        {metric.description}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Advanced Parameters</CardTitle>
                <CardDescription>
                  Configure advanced parameters for evaluation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="batch-size">Batch Size</Label>
                    <Input
                      id="batch-size"
                      type="number"
                      value={config.parameters.batchSize}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        parameters: { ...prev.parameters, batchSize: Number(e.target.value) }
                      }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="test-split">Test Split Ratio</Label>
                    <Input
                      id="test-split"
                      type="number"
                      step="0.1"
                      min="0.1"
                      max="0.5"
                      value={config.parameters.testSplit}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        parameters: { ...prev.parameters, testSplit: Number(e.target.value) }
                      }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="random-seed">Random Seed</Label>
                  <Input
                    id="random-seed"
                    type="number"
                    value={config.parameters.randomSeed}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      parameters: { ...prev.parameters, randomSeed: Number(e.target.value) }
                    }))}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="cross-validation"
                    checked={config.parameters.crossValidation}
                    onCheckedChange={(checked) => setConfig(prev => ({
                      ...prev,
                      parameters: { ...prev.parameters, crossValidation: !!checked }
                    }))}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <label
                      htmlFor="cross-validation"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Enable Cross Validation
                    </label>
                    <p className="text-xs text-muted-foreground">
                      Use K-fold cross validation to improve evaluation reliability
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Historical Evaluation Results</CardTitle>
              <CardDescription>
                View historical records and results of all offline evaluations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Evaluation Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Scenario</TableHead>
                    <TableHead>Dataset</TableHead>
                    <TableHead>Accuracy</TableHead>
                    <TableHead>Precision</TableHead>
                    <TableHead>Recall</TableHead>
                    <TableHead>F1 Score</TableHead>
                    <TableHead>Created Time</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {evaluations.map((evaluation) => (
                    <TableRow key={evaluation.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(evaluation.status)}
                          {evaluation.name}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(evaluation.status)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {evaluation.scenario || '-'}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-32">
                        <div className="text-xs text-muted-foreground truncate" title={evaluation.dataset}>
                          {evaluation.dataset || '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        {evaluation.status === 'completed' ? 
                          `${(evaluation.accuracy * 100).toFixed(1)}%` : '-'
                        }
                      </TableCell>
                      <TableCell>
                        {evaluation.status === 'completed' ? 
                          `${(evaluation.precision * 100).toFixed(1)}%` : '-'
                        }
                      </TableCell>
                      <TableCell>
                        {evaluation.status === 'completed' ? 
                          `${(evaluation.recall * 100).toFixed(1)}%` : '-'
                        }
                      </TableCell>
                      <TableCell>
                        {evaluation.status === 'completed' ? 
                          `${(evaluation.f1Score * 100).toFixed(1)}%` : '-'
                        }
                      </TableCell>
                      <TableCell>{evaluation.createdAt}</TableCell>
                      <TableCell>{evaluation.duration}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm">
                            <FileText className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Accuracy</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">89.5%</div>
                <p className="text-xs text-muted-foreground">
                  +2.1% from last month
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Precision</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">87.0%</div>
                <p className="text-xs text-muted-foreground">
                  +1.5% from last month
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Recall</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">91.5%</div>
                <p className="text-xs text-muted-foreground">
                  +3.2% from last month
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average F1 Score</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">89.0%</div>
                <p className="text-xs text-muted-foreground">
                  +2.3% from last month
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Detailed Evaluation Reports</CardTitle>
              <CardDescription>
                Download and view detailed evaluation analysis reports
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Comprehensive Model Performance Report</h4>
                    <p className="text-sm text-muted-foreground">Detailed analysis of all evaluation metrics</p>
                  </div>
                  <Button variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Download PDF
                  </Button>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Performance Trend Analysis</h4>
                    <p className="text-sm text-muted-foreground">Trend analysis charts of historical performance data</p>
                  </div>
                  <Button variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Download Excel
                  </Button>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Error Analysis Report</h4>
                    <p className="text-sm text-muted-foreground">Detailed error case analysis and improvement recommendations</p>
                  </div>
                  <Button variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Download PDF
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
        </main>
      </div>
    </div>
  );
};

export default OfflineEvaluation;