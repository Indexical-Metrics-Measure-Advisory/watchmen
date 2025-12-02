import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Send,
  Bot,
  User,
  Sparkles,
  BarChart3,
  LineChart as LineChartIcon,
  Table as TableIcon,
  FileText,
  MoreVertical,
  RefreshCw,
  Share2,
  Brain,
  TrendingUp,
  Lightbulb,
  ChevronDown,
  Plus,
  History,
  Settings,
  MessageSquare,
  X,
  Download,
  Copy,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Textarea } from '@/components/ui/textarea';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { useSidebar } from '@/contexts/SidebarContext';

// Types
interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: MessageMetadata;
  charts?: ChartDescriptor[];
  data?: any[];
  insights?: string[];
  recommendations?: string[];
}

interface ChartDescriptor {
  type: 'line' | 'bar' | 'pie';
  title: string;
  data: any[];
  xKey: string;
  yKey: string;
}

interface MessageMetadata {
  metricName?: string;
  period?: string;
  dimensions?: string[];
  intent?: 'analysis' | 'query' | 'exploration';
}

interface Assistant {
  id: string;
  name: string;
  role: string;
  avatar?: string;
}

interface MetricQuery {
  metric?: string;
  dimensions?: string[];
  period?: string;
  filters?: Record<string, any>;
}

// --- Helper Functions (Mock Logic) ---

const parseNaturalLanguage = (query: string): MetricQuery => {
  const queryLower = query.toLowerCase();
  const result: MetricQuery = {};

  if (queryLower.includes('sales') || queryLower.includes('revenue') || queryLower.includes('premium')) {
    result.metric = 'Total Written Premium';
  } else if (queryLower.includes('claims') || queryLower.includes('loss')) {
    result.metric = 'Claims Ratio';
  } else if (queryLower.includes('retention') || queryLower.includes('renew')) {
    result.metric = 'Customer Retention Rate';
  } else {
    result.metric = 'General Business Performance';
  }

  if (queryLower.includes('last month') || queryLower.includes('30 days')) {
    result.period = 'Last 30 Days';
  } else if (queryLower.includes('last year') || queryLower.includes('ytd')) {
    result.period = 'Year to Date';
  } else {
    result.period = 'Last 12 Months';
  }

  const dimensions = [];
  if (queryLower.includes('product') || queryLower.includes('line')) dimensions.push('Product Line');
  if (queryLower.includes('region') || queryLower.includes('location')) dimensions.push('Region');
  if (queryLower.includes('channel') || queryLower.includes('agent')) dimensions.push('Sales Channel');
  
  if (dimensions.length === 0) dimensions.push('Time');
  result.dimensions = dimensions;

  return result;
};

const generateMockData = (metric: string, period: string, dimensions: string[]) => {
  const data = [];
  const now = new Date();
  const points = period === 'Last 30 Days' ? 30 : 12;

  for (let i = 0; i < points; i++) {
    const date = new Date(now);
    if (period === 'Last 30 Days') {
      date.setDate(date.getDate() - (points - i - 1));
    } else {
      date.setMonth(date.getMonth() - (points - i - 1));
    }

    const baseValue = metric.includes('Premium') ? 1000000 : metric.includes('Ratio') ? 60 : 85;
    const randomFactor = Math.random() * 0.2 - 0.1; // +/- 10%
    const value = Math.round(baseValue * (1 + randomFactor));

    data.push({
      date: period === 'Last 30 Days' ? date.toLocaleDateString() : date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' }),
      value: value,
      formatted: metric.includes('Premium') 
        ? `$${(value / 1000).toFixed(1)}k` 
        : `${value}%`
    });
  }
  return data;
};

const generateInsights = (metric: string, data: any[]) => {
  const insights = [
    `${metric} shows a positive trend over the selected period.`,
    `There was a significant spike in activity during the mid-period.`,
    `Performance is currently 5% above the target baseline.`
  ];
  return insights;
};

const generateRecommendations = (metric: string) => {
  return [
    `Investigate the top performing regions to replicate success.`,
    `Consider adjusting pricing strategy for underperforming segments.`,
    `Schedule a review meeting with the sales team.`
  ];
};

const generateSummaryReport = (messages: Message[]) => {
  // Mock report generation
  console.log("Generating report from", messages.length, "messages");
  alert("Analysis Report has been generated and downloaded.");
};


// --- Components ---

// Memoized content renderer with variant-aware colors
const MessageContent: React.FC<{ content: string; variant?: 'user' | 'assistant' }> = React.memo(({ content, variant = 'assistant' }) => {
  const lines = useMemo(() => content.split('\n'), [content]);
  const isUser = variant === 'user';
  const paragraphClass = isUser ? 'text-white/95' : 'text-muted-foreground';
  const headingClass = isUser ? 'text-white' : 'text-foreground';
  return (
    <div className={`prose prose-sm max-w-none ${isUser ? 'prose-invert' : 'dark:prose-invert'}`}>
      {lines.map((line, index) => {
        if (line.startsWith('**') && line.endsWith('**')) {
          return <h3 key={index} className={`font-semibold mt-3 mb-1 ${headingClass}`}>{line.slice(2, -2)}</h3>;
        }
        if (line.startsWith('# ')) {
          return <h1 key={index} className={`text-xl font-bold mt-4 mb-2 ${headingClass}`}>{line.slice(2)}</h1>;
        }
        if (line.startsWith('## ')) {
          return <h2 key={index} className={`text-lg font-semibold mt-3 mb-2 ${headingClass}`}>{line.slice(3)}</h2>;
        }
        if (line.startsWith('### ')) {
          return <h3 key={index} className={`text-base font-semibold mt-2 mb-1 ${headingClass}`}>{line.slice(4)}</h3>;
        }
        if (line.startsWith('• ')) {
          return <li key={index} className={`${paragraphClass} ml-4`}>{line.slice(2)}</li>;
        }
        return line ? <p key={index} className={`${paragraphClass} mb-1 leading-relaxed`}>{line}</p> : <div key={index} className="h-2" />;
      })}
    </div>
  );
});

// Dynamic Chart Loader
type RechartsModule = typeof import('recharts');
const ChartRenderer: React.FC<{ chart: ChartDescriptor }> = React.memo(({ chart }) => {
  const [lib, setLib] = useState<RechartsModule | null>(null);

  useEffect(() => {
    let mounted = true;
    import('recharts').then((mod) => {
      if (mounted) setLib(mod);
    });
    return () => {
      mounted = false;
    };
  }, []);

  if (!lib) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground bg-muted/20 rounded-lg animate-pulse">
        <div className="flex flex-col items-center gap-2">
          <BarChart3 className="w-8 h-8 opacity-50" />
          <span className="text-sm">Loading visualization...</span>
        </div>
      </div>
    );
  }
  const { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, BarChart, Bar, Legend } = lib;

  return (
    <div className="h-72 w-full mt-4 mb-2">
      <ResponsiveContainer width="100%" height="100%">
        {chart.type === 'bar' ? (
          <BarChart data={chart.data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="opacity-10" />
            <XAxis 
              dataKey="date" 
              stroke="currentColor" 
              className="text-xs opacity-50" 
              tickLine={false} 
              axisLine={false} 
            />
            <YAxis 
              stroke="currentColor" 
              className="text-xs opacity-50" 
              tickLine={false} 
              axisLine={false} 
              tickFormatter={(value) => `${value}`}
            />
            <Tooltip 
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              cursor={{ fill: 'currentColor', opacity: 0.1 }}
            />
            <Legend />
            <Bar 
              dataKey="value" 
              name={chart.title} 
              fill="#3b82f6" 
              radius={[4, 4, 0, 0]} 
              barSize={30}
            />
          </BarChart>
        ) : (
          <LineChart data={chart.data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="opacity-10" />
            <XAxis 
              dataKey="date" 
              stroke="currentColor" 
              className="text-xs opacity-50" 
              tickLine={false} 
              axisLine={false}
            />
            <YAxis 
              stroke="currentColor" 
              className="text-xs opacity-50" 
              tickLine={false} 
              axisLine={false}
            />
            <Tooltip 
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="value" 
              name={chart.title}
              stroke="#3b82f6" 
              strokeWidth={3} 
              dot={{ r: 4, strokeWidth: 2 }}
              activeDot={{ r: 6, strokeWidth: 0 }}
            />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
});

// --- Main Page Component ---

const ChatPage: React.FC = () => {
  const { collapsed } = useSidebar();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [selectedAssistantId, setSelectedAssistantId] = useState<string | null>(null);
  const [assistantModalOpen, setAssistantModalOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [inputRows, setInputRows] = useState(1);

  // Load assistants
  useEffect(() => {
    // Mock assistants
    const mockAssistants: Assistant[] = [
      { id: '1', name: 'Sales Analyst', role: 'Sales Performance', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix' },
      { id: '2', name: 'Risk Assessor', role: 'Underwriting Risk', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka' },
      { id: '3', name: 'Claims Specialist', role: 'Claims Processing', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mark' },
    ];
    setAssistants(mockAssistants);

    const savedId = localStorage.getItem('selectedAssistantId');
    if (savedId && mockAssistants.find(a => a.id === savedId)) {
      setSelectedAssistantId(savedId);
    } else {
      setAssistantModalOpen(true);
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const selectedAssistant = assistants.find(a => a.id === selectedAssistantId);

  const handleSendMessage = async (text: string = inputValue) => {
    if (!text.trim() || !selectedAssistant) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: text,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setInputRows(1);
    setIsLoading(true);

    // Simulate AI processing
    setTimeout(() => {
      const queryInfo = parseNaturalLanguage(text);
      const mockData = generateMockData(queryInfo.metric || 'Data', queryInfo.period || 'Period', queryInfo.dimensions || []);
      const insights = generateInsights(queryInfo.metric || 'Metric', mockData);
      const recommendations = generateRecommendations(queryInfo.metric || 'Metric');

      const responseMsg: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: `I've analyzed the **${queryInfo.metric}** for **${queryInfo.period}**. \n\nHere is what I found based on your request. The data indicates some interesting patterns regarding ${queryInfo.dimensions?.join(' and ')}.`,
        timestamp: new Date(),
        metadata: {
          metricName: queryInfo.metric,
          period: queryInfo.period,
          dimensions: queryInfo.dimensions,
          intent: 'analysis'
        },
        charts: [{
          type: 'line',
          title: `${queryInfo.metric} Trend`,
          data: mockData,
          xKey: 'date',
          yKey: 'value'
        }],
        data: mockData,
        insights: insights,
        recommendations: recommendations
      };

      setMessages(prev => [...prev, responseMsg]);
      setIsLoading(false);
    }, 1500);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearHistory = () => {
    if (confirm('Are you sure you want to clear the conversation history?')) {
      setMessages([]);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Could add toast notification here
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
      <Sidebar className="hidden md:flex" />
      <div className={`flex-1 flex flex-col h-screen overflow-hidden transition-all duration-300 ${collapsed ? 'md:pl-20' : 'md:pl-56'}`}>
        <Header />
        <main className="flex-1 overflow-hidden flex flex-col relative">
          {/* --- Chat Header (Toolbar) --- */}
          <header className="flex-none h-14 border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10 px-4 md:px-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 dark:bg-blue-900/30 rounded-lg p-1.5 text-blue-600 dark:text-blue-400">
                <Brain className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-medium text-sm text-slate-800 dark:text-slate-100 leading-tight">Assistant Context</h2>
                <div className="flex items-center text-xs text-slate-500 dark:text-slate-400">
                  <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${selectedAssistant ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                  {selectedAssistant ? selectedAssistant.name : 'Select Assistant'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {assistants.length > 0 && (
                <Select 
                  value={selectedAssistantId ?? ''} 
                  onValueChange={(val) => { setSelectedAssistantId(val); localStorage.setItem('selectedAssistantId', val); }}
                >
                  <SelectTrigger className="w-[180px] h-8 text-xs hidden md:flex bg-transparent border-slate-200 dark:border-slate-800 focus:ring-0">
                    <SelectValue placeholder="Switch Assistant" />
                  </SelectTrigger>
                  <SelectContent>
                    {assistants.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        <div className="flex items-center gap-2">
                          <Avatar className="w-4 h-4">
                            <AvatarImage src={a.avatar} />
                            <AvatarFallback>{a.name[0]}</AvatarFallback>
                          </Avatar>
                          {a.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500" onClick={() => generateSummaryReport(messages)} disabled={messages.length === 0}>
                      <FileText className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Generate Report</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Chat Options</DropdownMenuLabel>
                  <DropdownMenuItem onClick={clearHistory}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Clear History
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setAssistantModalOpen(true)}>
                    <Settings className="w-4 h-4 mr-2" />
                    Assistant Settings
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* --- Main Chat Area --- */}
          <div className="flex-1 overflow-hidden relative flex flex-col">
            <ScrollArea className="flex-1 p-4 md:p-6">
              <div className="max-w-4xl mx-auto space-y-6 pb-4">
                
                {/* Empty State */}
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-8 animate-in fade-in duration-500">
                    <div className="relative">
                      <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full"></div>
                      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-xl relative border border-slate-100 dark:border-slate-800">
                        <Sparkles className="w-12 h-12 text-blue-600 dark:text-blue-400" />
                      </div>
                    </div>
                    <div className="space-y-2 max-w-md">
                      <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                        How can I help you analyze today?
                      </h2>
                      <p className="text-slate-500 dark:text-slate-400">
                        I can visualize metrics, analyze trends, and provide actionable insights from your data.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl px-4">
                      {[
                        "Show sales performance for the last quarter",
                        "Analyze customer retention trends",
                        "What are the top loss drivers this month?",
                        "Compare current revenue vs last year"
                      ].map((q, i) => (
                        <Button 
                          key={i} 
                          variant="outline" 
                          className="h-auto py-4 px-4 justify-start text-left bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 group transition-all"
                          onClick={() => handleSendMessage(q)}
                        >
                          <MessageSquare className="w-4 h-4 mr-3 text-blue-500 group-hover:scale-110 transition-transform" />
                          <span className="truncate">{q}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Messages */}
                {messages.map((message) => (
                  <div 
                    key={message.id} 
                    className={`flex gap-4 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {/* Assistant Avatar */}
                    {message.type === 'assistant' && (
                      <Avatar className="w-8 h-8 mt-1 border border-slate-200 dark:border-slate-700 shadow-sm">
                        {selectedAssistant?.avatar ? (
                          <AvatarImage src={selectedAssistant.avatar} />
                        ) : (
                          <AvatarFallback className="bg-blue-100 text-blue-600">AI</AvatarFallback>
                        )}
                      </Avatar>
                    )}

                    <div className={`flex flex-col max-w-[85%] md:max-w-[75%] space-y-2 ${message.type === 'user' ? 'items-end' : 'items-start'}`}>
                      {/* Message Bubble */}
                      <div 
                        className={`
                          px-5 py-3.5 rounded-2xl shadow-sm text-sm md:text-base
                          ${message.type === 'user' 
                            ? 'bg-blue-600 text-white rounded-br-none' 
                            : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-bl-none text-slate-800 dark:text-slate-100'}
                        `}
                      >
                        <MessageContent content={message.content} variant={message.type} />
                        
                        {/* Interactive Elements for Assistant */}
                        {message.type === 'assistant' && (
                          <div className="mt-4 space-y-4">
                            {/* Metadata Badges */}
                            {message.metadata && (
                              <div className="flex flex-wrap gap-2 mb-3">
                                {message.metadata.metricName && (
                                  <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200">
                                    <BarChart3 className="w-3 h-3 mr-1" />
                                    {message.metadata.metricName}
                                  </Badge>
                                )}
                                {message.metadata.period && (
                                  <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200">
                                    <History className="w-3 h-3 mr-1" />
                                    {message.metadata.period}
                                  </Badge>
                                )}
                              </div>
                            )}

                            {/* Analysis Card */}
                            {(message.charts || message.data || message.insights) && (
                              <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden bg-slate-50/50 dark:bg-slate-900/50">
                                <Tabs defaultValue="chart" className="w-full">
                                  <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                                    <TabsList className="h-8 bg-slate-100 dark:bg-slate-800">
                                      <TabsTrigger value="chart" className="text-xs h-6"><LineChartIcon className="w-3 h-3 mr-1.5"/> Chart</TabsTrigger>
                                      <TabsTrigger value="data" className="text-xs h-6"><TableIcon className="w-3 h-3 mr-1.5"/> Data</TabsTrigger>
                                      <TabsTrigger value="insights" className="text-xs h-6"><Sparkles className="w-3 h-3 mr-1.5"/> Insights</TabsTrigger>
                                    </TabsList>
                                    <div className="flex gap-1">
                                      <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-blue-500">
                                        <Download className="w-3.5 h-3.5" />
                                      </Button>
                                      <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-blue-500">
                                        <Share2 className="w-3.5 h-3.5" />
                                      </Button>
                                    </div>
                                  </div>
                                  
                                  <div className="p-4 bg-white dark:bg-slate-900 min-h-[300px]">
                                    <TabsContent value="chart" className="mt-0 h-full">
                                      {message.charts && message.charts.length > 0 ? (
                                        <ChartRenderer chart={message.charts[0]} />
                                      ) : (
                                        <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">No chart data available</div>
                                      )}
                                    </TabsContent>
                                    
                                    <TabsContent value="data" className="mt-0">
                                      {message.data && message.data.length > 0 ? (
                                        <ScrollArea className="h-[300px] w-full rounded-md border border-slate-100 dark:border-slate-800">
                                          <div className="p-0">
                                            <table className="w-full text-sm">
                                              <thead className="bg-slate-50 dark:bg-slate-800/50 sticky top-0 z-10">
                                                <tr>
                                                  {Object.keys(message.data[0]).map(key => (
                                                    <th key={key} className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 capitalize">
                                                      {key}
                                                    </th>
                                                  ))}
                                                </tr>
                                              </thead>
                                              <tbody>
                                                {message.data.map((row, i) => (
                                                  <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-50 dark:border-slate-800/50 last:border-0">
                                                    {Object.values(row).map((val: any, j) => (
                                                      <td key={j} className="px-4 py-3 text-slate-700 dark:text-slate-300 font-mono text-xs">
                                                        {val}
                                                      </td>
                                                    ))}
                                                  </tr>
                                                ))}
                                              </tbody>
                                            </table>
                                          </div>
                                        </ScrollArea>
                                      ) : (
                                        <div className="text-center py-8 text-muted-foreground">No tabular data available</div>
                                      )}
                                    </TabsContent>

                                    <TabsContent value="insights" className="mt-0 space-y-4">
                                      {message.insights && (
                                        <div className="space-y-3">
                                          <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                            <TrendingUp className="w-4 h-4 text-green-500" /> Key Findings
                                          </h4>
                                          <div className="grid gap-2">
                                            {message.insights.map((insight, idx) => (
                                              <div key={idx} className="bg-green-50 dark:bg-green-900/10 p-3 rounded-lg border border-green-100 dark:border-green-900/20 text-sm text-slate-700 dark:text-slate-300 flex gap-3">
                                                <span className="flex-none w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 flex items-center justify-center text-xs font-bold">
                                                  {idx + 1}
                                                </span>
                                                {insight}
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                      
                                      {message.recommendations && (
                                        <div className="space-y-3 pt-2">
                                          <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                            <Lightbulb className="w-4 h-4 text-amber-500" /> Recommendations
                                          </h4>
                                          <div className="grid gap-2">
                                            {message.recommendations.map((rec, idx) => (
                                              <div key={idx} className="bg-amber-50 dark:bg-amber-900/10 p-3 rounded-lg border border-amber-100 dark:border-amber-900/20 text-sm text-slate-700 dark:text-slate-300 flex gap-3">
                                                <Check className="flex-none w-5 h-5 text-amber-600 dark:text-amber-500 mt-0.5" />
                                                {rec}
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </TabsContent>
                                  </div>
                                </Tabs>
                              </Card>
                            )}
                          </div>
                        )}
                        
                        <div className="flex items-center justify-end gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="text-[10px] text-slate-400">
                            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            onClick={() => copyToClipboard(message.content)}
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* User Avatar */}
                    {message.type === 'user' && (
                      <Avatar className="w-8 h-8 mt-1 bg-blue-600 text-white">
                        <AvatarFallback><User className="w-4 h-4" /></AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                ))}

                {/* Loading Indicator */}
                {isLoading && (
                  <div className="flex gap-4">
                    <Avatar className="w-8 h-8 mt-1 border border-slate-200 dark:border-slate-700">
                      {selectedAssistant?.avatar ? (
                        <AvatarImage src={selectedAssistant.avatar} />
                      ) : (
                        <AvatarFallback>AI</AvatarFallback>
                      )}
                    </Avatar>
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-5 py-4 rounded-2xl rounded-bl-none shadow-sm flex items-center gap-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                      </div>
                      <span className="text-xs text-slate-400 ml-2 font-medium">Analyzing data...</span>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="p-4 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-t border-slate-200 dark:border-slate-800">
              <div className="max-w-4xl mx-auto relative">
                <div className="relative flex items-end gap-2 bg-slate-100 dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all shadow-sm">
                  <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-400 hover:text-blue-500 mb-0.5 rounded-lg">
                    <Plus className="w-5 h-5" />
                  </Button>
                  
                  <Textarea
                    value={inputValue}
                    onChange={(e) => {
                      setInputValue(e.target.value);
                      const rows = Math.min(5, e.target.value.split('\n').length);
                      setInputRows(rows);
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask about your insurance metrics..."
                    className="flex-1 min-h-[40px] max-h-[120px] bg-transparent border-none focus-visible:ring-0 resize-none py-2.5 px-2 text-sm md:text-base scrollbar-hide"
                    style={{ height: `${Math.max(40, inputRows * 24)}px` }}
                  />
                  
                  <Button 
                    onClick={() => handleSendMessage()} 
                    disabled={!inputValue.trim() || isLoading}
                    className={`h-9 w-9 mb-0.5 rounded-lg transition-all ${inputValue.trim() ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'}`}
                    size="icon"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
                <div className="text-center mt-2">
                  <p className="text-[10px] text-slate-400">
                    AI can make mistakes. Please verify critical data.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Assistant Selection Modal */}
      <Dialog open={assistantModalOpen} onOpenChange={setAssistantModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Choose Your Analysis Assistant</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {assistants.map((assistant) => (
              <div
                key={assistant.id}
                className={`flex items-center gap-4 p-3 rounded-lg border cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-slate-900 ${
                  selectedAssistantId === assistant.id 
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-500' 
                    : 'border-slate-200 dark:border-slate-800'
                }`}
                onClick={() => setSelectedAssistantId(assistant.id)}
              >
                <Avatar className="h-12 w-12 border-2 border-white dark:border-slate-950 shadow-sm">
                  <AvatarImage src={assistant.avatar} />
                  <AvatarFallback>{assistant.name[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h4 className="font-semibold text-sm">{assistant.name}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{assistant.role}</p>
                </div>
                {selectedAssistantId === assistant.id && (
                  <div className="h-6 w-6 bg-blue-500 rounded-full flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={() => setAssistantModalOpen(false)} disabled={!selectedAssistantId}>
              Start Analysis
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ChatPage;
