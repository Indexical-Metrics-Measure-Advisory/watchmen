import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSidebar } from '@/contexts/SidebarContext';
import { AIMonitoringDetail, AIMonitoringLog } from '@/components/ai/AIMonitoringDetail';
import AIAnalysisAgent from '@/components/ai/AIAnalysisAgent';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bot, Filter, Search, Calendar as CalendarIcon, ArrowLeft, BrainCircuit } from 'lucide-react';
import { format } from 'date-fns';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';

interface AIMonitoringPageProps {}

const mockMetrics = {
  validationScore: 85,
  improvementCount: 12,
  lastUpdated: new Date().toISOString(),
  status: 'active' as const
};

const mockLogs:AIMonitoringLog[] = [
  {
    id: '1',
    type: 'challenge',
    title: 'New Business Challenge Detected',
    description: 'AI identified a potential business opportunity in customer retention patterns.',
    timestamp: new Date().toISOString(),
    status: 'info',
    value: 0.85
  },
  {
    id: '2',
    type: 'hypothesis',
    title: 'Hypothesis Generation',
    description: 'Generated 3 new hypotheses based on recent customer feedback analysis.',
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    status: 'success',
    value: 0.92
  }
];

const AIMonitoringPage: React.FC<AIMonitoringPageProps> = () => {
  const { collapsed } = useSidebar();
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const navigate = useNavigate();

  const handleBack = () => {
    navigate('/business-challenges');
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className={`${collapsed ? 'pl-20' : 'pl-56'} min-h-screen transition-all duration-300`}>
        <Header />
        <main className="container py-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBack}
                className="hover:bg-accent"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Bot className="h-8 w-8 text-primary" />
                AI Agent Monitoring
              </h1>
            </div>
          </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Execution History</CardTitle>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search logs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-[200px]"
                />
              </div>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-[140px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                {date ? format(date, 'PPP') : 'Pick a date'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="timeline" className="w-full">
            <TabsList>
              <TabsTrigger value="timeline">Timeline View</TabsTrigger>
              <TabsTrigger value="detailed">Detailed View</TabsTrigger>
              <TabsTrigger value="workflow">
                <BrainCircuit className="h-4 w-4 mr-2" />
                AI分析流程
              </TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>
            <TabsContent value="timeline" className="mt-4">
              <AIMonitoringDetail 
                logs={mockLogs} 
                challengeTitle="Customer Retention"
                searchQuery={searchQuery}
                selectedStatus={selectedStatus}
              />
            </TabsContent>
            <TabsContent value="workflow" className="mt-4">
              <AIAnalysisAgent 
                challengeId="challenge-1"
                onComplete={(result) => {
                  console.log('AI分析流程完成:', result);
                  // 这里可以处理分析完成后的结果
                }}
              />
            </TabsContent>
            <TabsContent value="detailed">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="md:col-span-2 mt-6">
                  <CardHeader>
                    <CardTitle className="text-lg">AI Agent Execution Steps</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 gap-4">
                        {/* Execution Steps List */}
                        <div className="space-y-4">
                          {/* Step 1: Configuration Integrity Check */}
                          <div className="flex items-start gap-3 p-3 rounded-lg border border-accent/30 hover:border-primary/50 transition-colors">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-medium">1</div>
                            <div className="flex-1">
                              <h4 className="font-medium text-base">Configuration Integrity Check</h4>
                              <p className="text-sm text-muted-foreground mt-1">Verify all necessary configuration parameters are complete to ensure AI agent runs properly</p>
                              <div className="mt-2 flex items-center">
                                <div className="w-full bg-accent/10 h-2 rounded-full overflow-hidden">
                                  <div className="bg-blue-500 h-full w-[100%] rounded-full"></div>
                                </div>
                                <span className="ml-2 text-xs font-medium">Complete</span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Step 2: Knowledge Base Similarity Comparison */}
                          <div className="flex items-start gap-3 p-3 rounded-lg border border-accent/30 hover:border-primary/50 transition-colors">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-medium">2</div>
                            <div className="flex-1">
                              <h4 className="font-medium text-base">Knowledge Base Similarity Comparison</h4>
                              <p className="text-sm text-muted-foreground mt-1">Analyze similarity between current issue and existing cases in knowledge base to find best matching references</p>
                              <div className="mt-2 flex items-center">
                                <div className="w-full bg-accent/10 h-2 rounded-full overflow-hidden">
                                  <div className="bg-blue-500 h-full w-[85%] rounded-full"></div>
                                </div>
                                <span className="ml-2 text-xs font-medium">85%</span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Step 3: Calculate Metrics */}
                          <div className="flex items-start gap-3 p-3 rounded-lg border border-accent/30 hover:border-primary/50 transition-colors">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-medium">3</div>
                            <div className="flex-1">
                              <h4 className="font-medium text-base">Calculate Metrics</h4>
                              <p className="text-sm text-muted-foreground mt-1">Calculate key business metrics based on collected data to provide quantitative basis for decision making</p>
                              <div className="mt-2 flex items-center">
                                <div className="w-full bg-accent/10 h-2 rounded-full overflow-hidden">
                                  <div className="bg-blue-500 h-full w-[70%] rounded-full"></div>
                                </div>
                                <span className="ml-2 text-xs font-medium">70%</span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Step 4: Validation Analysis */}
                          <div className="flex items-start gap-3 p-3 rounded-lg border border-accent/30 hover:border-primary/50 transition-colors">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-medium">4</div>
                            <div className="flex-1">
                              <h4 className="font-medium text-base">Validation Analysis</h4>
                              <p className="text-sm text-muted-foreground mt-1">Validate and analyze generated hypotheses, evaluate their feasibility and potential impact</p>
                              <div className="mt-2 flex items-center">
                                <div className="w-full bg-accent/10 h-2 rounded-full overflow-hidden">
                                  <div className="bg-blue-500 h-full w-[60%] rounded-full"></div>
                                </div>
                                <span className="ml-2 text-xs font-medium">60%</span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Step 5: Generate Self-Service Report */}
                          <div className="flex items-start gap-3 p-3 rounded-lg border border-accent/30 hover:border-primary/50 transition-colors">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-medium">5</div>
                            <div className="flex-1">
                              <h4 className="font-medium text-base">Generate Self-Service Report</h4>
                              <p className="text-sm text-muted-foreground mt-1">Automatically generate detailed analysis report including findings, recommendations and action plans</p>
                              <div className="mt-2 flex items-center">
                                <div className="w-full bg-accent/10 h-2 rounded-full overflow-hidden">
                                  <div className="bg-blue-500 h-full w-[40%] rounded-full"></div>
                                </div>
                                <span className="ml-2 text-xs font-medium">40%</span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Step 6: Record Chain of Thought */}
                          <div className="flex items-start gap-3 p-3 rounded-lg border border-accent/30 hover:border-primary/50 transition-colors">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-medium">6</div>
                            <div className="flex-1">
                              <h4 className="font-medium text-base">Record Chain of Thought</h4>
                              <p className="text-sm text-muted-foreground mt-1">Record complete thinking process of AI agent, providing transparent decision basis and traceability</p>
                              <div className="mt-2 flex items-center">
                                <div className="w-full bg-accent/10 h-2 rounded-full overflow-hidden">
                                  <div className="bg-blue-500 h-full w-[25%] rounded-full"></div>
                                </div>
                                <span className="ml-2 text-xs font-medium">25%</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            <TabsContent value="analytics">
              <div className="py-4">
                Advanced analytics and insights coming soon
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
          </main>
        </div>
      </div>
    );
};

export default AIMonitoringPage;