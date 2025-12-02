import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Play, Pause, Square, Activity, Users, TrendingUp, AlertTriangle, Settings } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface OnlineMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  status: 'good' | 'warning' | 'critical';
}

interface OnlineTest {
  id: string;
  name: string;
  status: 'running' | 'paused' | 'stopped';
  startTime: string;
  duration: string;
  participants: number;
  conversionRate: number;
  confidence: number;
}

const OnlineEvaluation = () => {
  const [isMonitoring, setIsMonitoring] = useState(true);
  const [metrics, setMetrics] = useState<OnlineMetric[]>([]);
  const [tests, setTests] = useState<OnlineTest[]>([]);
  const [selectedModel, setSelectedModel] = useState('model-v1');
  const [trafficSplit, setTrafficSplit] = useState(50);

  useEffect(() => {
    // 模拟实时指标数据
    const mockMetrics: OnlineMetric[] = [
      {
        id: '1',
        name: '响应时间',
        value: 245,
        unit: 'ms',
        trend: 'down',
        status: 'good'
      },
      {
        id: '2',
        name: '准确率',
        value: 94.2,
        unit: '%',
        trend: 'up',
        status: 'good'
      },
      {
        id: '3',
        name: '吞吐量',
        value: 1250,
        unit: 'req/min',
        trend: 'stable',
        status: 'good'
      },
      {
        id: '4',
        name: '错误率',
        value: 0.8,
        unit: '%',
        trend: 'up',
        status: 'warning'
      },
      {
        id: '5',
        name: 'CPU使用率',
        value: 78,
        unit: '%',
        trend: 'up',
        status: 'warning'
      },
      {
        id: '6',
        name: '内存使用率',
        value: 65,
        unit: '%',
        trend: 'stable',
        status: 'good'
      }
    ];

    const mockTests: OnlineTest[] = [
      {
        id: '1',
        name: '新推荐算法A/B测试',
        status: 'running',
        startTime: '2024-01-15 09:00:00',
        duration: '6天 14小时',
        participants: 12450,
        conversionRate: 15.8,
        confidence: 95.2
      },
      {
        id: '2',
        name: '界面优化测试',
        status: 'running',
        startTime: '2024-01-14 15:30:00',
        duration: '7天 19小时',
        participants: 8920,
        conversionRate: 12.3,
        confidence: 87.5
      },
      {
        id: '3',
        name: '定价策略测试',
        status: 'paused',
        startTime: '2024-01-12 10:15:00',
        duration: '3天 8小时',
        participants: 5630,
        conversionRate: 18.9,
        confidence: 92.1
      }
    ];

    setMetrics(mockMetrics);
    setTests(mockTests);

    // 模拟实时数据更新
    const interval = setInterval(() => {
      if (isMonitoring) {
        setMetrics(prev => prev.map(metric => ({
          ...metric,
          value: metric.value + (Math.random() - 0.5) * (metric.value * 0.1)
        })));
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isMonitoring]);

  const startNewTest = () => {
    const newTest: OnlineTest = {
      id: Date.now().toString(),
      name: '新建在线测试',
      status: 'running',
      startTime: new Date().toLocaleString('zh-CN'),
      duration: '0分钟',
      participants: 0,
      conversionRate: 0,
      confidence: 0
    };
    
    setTests(prev => [newTest, ...prev]);
    toast({
      title: "测试已启动",
      description: "新的在线A/B测试已成功启动。",
    });
  };

  const toggleMonitoring = () => {
    setIsMonitoring(!isMonitoring);
    toast({
      title: isMonitoring ? "监控已暂停" : "监控已启动",
      description: isMonitoring ? "实时监控已暂停" : "实时监控已恢复",
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Activity className="h-4 w-4 text-green-500" />;
      case 'paused':
        return <Pause className="h-4 w-4 text-yellow-500" />;
      case 'stopped':
        return <Square className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      running: 'default',
      paused: 'secondary',
      stopped: 'destructive'
    } as const;
    
    const labels = {
      running: '运行中',
      paused: '已暂停',
      stopped: '已停止'
    };
    
    return (
      <Badge variant={variants[status as keyof typeof variants]}>
        {labels[status as keyof typeof labels]}
      </Badge>
    );
  };

  const getMetricStatusColor = (status: string) => {
    switch (status) {
      case 'good':
        return 'text-green-600';
      case 'warning':
        return 'text-yellow-600';
      case 'critical':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down':
        return <TrendingUp className="h-4 w-4 text-red-500 rotate-180" />;
      case 'stable':
        return <div className="h-4 w-4 border-b-2 border-gray-400" />;
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">在线评估</h1>
          <p className="text-muted-foreground">
            实时监控模型性能和进行在线A/B测试
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant={isMonitoring ? "destructive" : "default"}
            onClick={toggleMonitoring}
            className="flex items-center gap-2"
          >
            {isMonitoring ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {isMonitoring ? '暂停监控' : '开始监控'}
          </Button>
          <Button onClick={startNewTest} className="flex items-center gap-2">
            <Play className="h-4 w-4" />
            新建测试
          </Button>
        </div>
      </div>

      <Tabs defaultValue="monitoring" className="space-y-4">
        <TabsList>
          <TabsTrigger value="monitoring">实时监控</TabsTrigger>
          <TabsTrigger value="abtests">A/B测试</TabsTrigger>
          <TabsTrigger value="config">配置管理</TabsTrigger>
        </TabsList>

        <TabsContent value="monitoring" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {metrics.map((metric) => (
              <Card key={metric.id}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{metric.name}</CardTitle>
                  <div className="flex items-center gap-1">
                    {getTrendIcon(metric.trend)}
                    {metric.status === 'warning' && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
                    {metric.status === 'critical' && <AlertTriangle className="h-4 w-4 text-red-500" />}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${getMetricStatusColor(metric.status)}`}>
                    {typeof metric.value === 'number' ? metric.value.toFixed(1) : metric.value}{metric.unit}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {isMonitoring ? '实时更新中' : '监控已暂停'}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>系统状态概览</CardTitle>
              <CardDescription>
                当前系统的整体运行状态和关键指标
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">系统健康度</span>
                  <div className="flex items-center gap-2">
                    <Progress value={92} className="w-32" />
                    <span className="text-sm text-green-600">92%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">服务可用性</span>
                  <div className="flex items-center gap-2">
                    <Progress value={99.8} className="w-32" />
                    <span className="text-sm text-green-600">99.8%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">数据质量</span>
                  <div className="flex items-center gap-2">
                    <Progress value={87} className="w-32" />
                    <span className="text-sm text-yellow-600">87%</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="abtests" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>进行中的A/B测试</CardTitle>
              <CardDescription>
                查看和管理当前正在进行的在线测试
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>测试名称</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>开始时间</TableHead>
                    <TableHead>运行时长</TableHead>
                    <TableHead>参与用户</TableHead>
                    <TableHead>转化率</TableHead>
                    <TableHead>置信度</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tests.map((test) => (
                    <TableRow key={test.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(test.status)}
                          {test.name}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(test.status)}</TableCell>
                      <TableCell>{test.startTime}</TableCell>
                      <TableCell>{test.duration}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {test.participants.toLocaleString()}
                        </div>
                      </TableCell>
                      <TableCell>{test.conversionRate.toFixed(1)}%</TableCell>
                      <TableCell>
                        <div className={`font-medium ${
                          test.confidence >= 95 ? 'text-green-600' : 
                          test.confidence >= 80 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {test.confidence.toFixed(1)}%
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {test.status === 'running' ? (
                            <Button variant="outline" size="sm">
                              <Pause className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button variant="outline" size="sm">
                              <Play className="h-4 w-4" />
                            </Button>
                          )}
                          <Button variant="outline" size="sm">
                            <Square className="h-4 w-4" />
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

        <TabsContent value="config" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  模型配置
                </CardTitle>
                <CardDescription>
                  配置在线评估使用的模型和参数
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="model-select">当前模型</Label>
                  <Select value={selectedModel} onValueChange={setSelectedModel}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择模型" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="model-v1">模型 v1.0</SelectItem>
                      <SelectItem value="model-v2">模型 v2.0</SelectItem>
                      <SelectItem value="model-v3">模型 v3.0 (Beta)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="traffic-split">流量分配 ({trafficSplit}%)</Label>
                  <Input
                    id="traffic-split"
                    type="range"
                    min="0"
                    max="100"
                    value={trafficSplit}
                    onChange={(e) => setTrafficSplit(Number(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>控制组: {100 - trafficSplit}%</span>
                    <span>实验组: {trafficSplit}%</span>
                  </div>
                </div>
                <Button className="w-full">应用配置</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>监控设置</CardTitle>
                <CardDescription>
                  配置监控阈值和告警规则
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="response-threshold">响应时间阈值 (ms)</Label>
                  <Input
                    id="response-threshold"
                    type="number"
                    placeholder="500"
                    defaultValue="500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="error-threshold">错误率阈值 (%)</Label>
                  <Input
                    id="error-threshold"
                    type="number"
                    placeholder="5"
                    defaultValue="5"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cpu-threshold">CPU使用率阈值 (%)</Label>
                  <Input
                    id="cpu-threshold"
                    type="number"
                    placeholder="80"
                    defaultValue="80"
                  />
                </div>
                <Button className="w-full">保存设置</Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default OnlineEvaluation;