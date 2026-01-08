import React, { useEffect, useState } from 'react';
import { format, isValid } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { BIChartCard, BICardSize, BIChartType } from '@/model/biAnalysis';
import type { MetricFlowResponse } from '@/model/metricFlow';
import type { AlertStatus } from '@/model/AlertConfig';
import { AlertCard } from './AlertCard';
import { GripHorizontal, Trash2, Maximize2, Minimize2, BarChart2, Download, Table as TableIcon, LineChart as LineChartIcon, Sparkles, Copy, AlertTriangle, Settings, CheckCircle2, Activity } from 'lucide-react';
import { AlertConfigurationModal } from './AlertConfigurationModal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";

type RechartsModule = typeof import('recharts');

// Modern color palette
const COLORS = [
  '#3b82f6', // Blue
  '#8b5cf6', // Violet
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#f43f5e', // Rose
  '#6366f1', // Indigo
];

export interface ChartCardProps {
  card: BIChartCard;
  data: any[];
  sourceData?: MetricFlowResponse;
  onResize?: (size: BICardSize) => void;
  onRemove?: () => void;
  className?: string;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragOver?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop?: (e: React.DragEvent<HTMLDivElement>) => void;
  onUpdate?: (card: BIChartCard) => void;
  alertStatus?: AlertStatus;
  onAcknowledge?: (alertId: string) => void;
}

const sizeClass = (size: BICardSize) => {
  switch (size) {
    case 'sm':
      return 'col-span-12 md:col-span-6 lg:col-span-4';
    case 'md':
      return 'col-span-12 md:col-span-8 lg:col-span-6';
    case 'lg':
      return 'col-span-12';
  }
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover border border-border px-3 py-2 rounded-lg shadow-lg text-xs outline-none animate-in fade-in-0 zoom-in-95 z-50">
        <p className="font-semibold mb-1.5 text-popover-foreground">{label}</p>
        <div className="space-y-1">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2">
              <div 
                className="w-2 h-2 rounded-full shrink-0" 
                style={{ backgroundColor: entry.color }} 
              />
              <span className="text-muted-foreground">{entry.name}:</span>
              <span className="font-medium text-popover-foreground tabular-nums">
                {typeof entry.value === 'number' 
                  ? entry.value.toLocaleString(undefined, { maximumFractionDigits: 2 }) 
                  : entry.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

// Data Table Component
const DataTable: React.FC<{ data: any[], sourceData?: MetricFlowResponse }> = ({ data, sourceData }) => {
  // Prefer sourceData (raw response) if available
  if (sourceData && Array.isArray(sourceData.column_names) && Array.isArray(sourceData.data)) {
    const headers = sourceData.column_names;
    const rows = sourceData.data;

    if (rows.length === 0) {
      return <div className="flex items-center justify-center h-full text-muted-foreground text-sm">No data available</div>;
    }

    return (
      <ScrollArea className="h-full w-full rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10">
              {headers.map((header, idx) => (
                <TableHead key={idx} className="capitalize min-w-[100px]">
                  {header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, i) => (
              <TableRow key={i} className="hover:bg-muted/50">
                {row.map((cell, j) => (
                  <TableCell key={`${i}-${j}`} className="font-medium">
                    {typeof cell === 'number' 
                      ? cell.toLocaleString(undefined, { maximumFractionDigits: 2 })
                      : (cell === null || cell === undefined ? '-' : String(cell))}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    );
  }

  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-full text-muted-foreground text-sm">No data available</div>;
  }

  // Extract headers from the first data item
  // Exclude 'color' or internal fields if any, keep 'date'/'name' and values
  const headers = Object.keys(data[0]).filter(k => k !== 'color' && k !== 'fill');

  return (
    <ScrollArea className="h-full w-full rounded-md border">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10">
            {headers.map((header) => (
              <TableHead key={header} className="capitalize min-w-[100px]">
                {header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, i) => (
            <TableRow key={i} className="hover:bg-muted/50">
              {headers.map((header) => (
                <TableCell key={`${i}-${header}`} className="font-medium">
                  {typeof row[header] === 'number' 
                    ? row[header].toLocaleString(undefined, { maximumFractionDigits: 2 })
                    : row[header]}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );
};

export const ChartCard: React.FC<ChartCardProps> = ({
  card,
  data,
  onResize,
  onRemove,
  className,
  draggable,
  onDragStart,
  onDragOver,
  onDrop,
  onUpdate,
  alertStatus,
  onAcknowledge,
  sourceData,
}) => {
  const { toast } = useToast();
  const [lib, setLib] = useState<RechartsModule | null>(null);
  const [activeTab, setActiveTab] = useState<string>("chart");
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  const handleCopy = async () => {
    try {
      if (!data || data.length === 0) {
        toast({
          title: "No data",
          description: "There is no data to copy",
          variant: "destructive",
        });
        return;
      }

      // Extract headers from the first data item
      // Exclude 'color' or internal fields if any
      const headers = Object.keys(data[0]).filter(k => k !== 'color' && k !== 'fill');
      
      // Create TSV content (Tab Separated Values) which works well with Excel paste
      const headerRow = headers.join('\t');
      const rows = data.map(row => {
        return headers.map(header => {
          const val = row[header];
          // Handle null/undefined and escape tabs/newlines if necessary
          if (val === null || val === undefined) return '';
          return String(val).replace(/\t/g, ' ').replace(/\n/g, ' ');
        }).join('\t');
      });
      
      const tsvContent = [headerRow, ...rows].join('\n');

      await navigator.clipboard.writeText(tsvContent);
      toast({
        title: "Copied to Clipboard",
        description: "Data can be pasted directly into Excel",
      });
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Could not copy data to clipboard",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    let mounted = true;
    import('recharts').then(mod => mounted && setLib(mod));
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <Card
      className={cn(
        'transition-all duration-200 hover:shadow-lg hover:border-primary/20 flex flex-col h-full bg-card/50 backdrop-blur-sm group', 
        sizeClass(card.size), 
        className
      )}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <Tabs defaultValue="chart" value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
        <CardHeader className="p-3 pb-0 flex flex-row items-center justify-between space-y-0 border-b border-border/40 bg-muted/5 gap-2">
          
          <div className="flex items-center gap-2 overflow-hidden flex-1">
            {draggable && (
               <div className="cursor-grab text-muted-foreground/50 hover:text-foreground active:cursor-grabbing transition-colors" title="Drag to reorder">
                 <GripHorizontal className="h-5 w-5" />
               </div>
            )}
            
            {card.chartType !== 'alert' && (
              <TabsList className="h-8 bg-muted/50 p-0.5">
                <TabsTrigger 
                  value="chart" 
                  className="h-7 text-xs px-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  <LineChartIcon className="w-3.5 h-3.5 mr-1.5" />
                  Chart
                </TabsTrigger>
                <TabsTrigger 
                  value="data" 
                  className="h-7 text-xs px-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  <TableIcon className="w-3.5 h-3.5 mr-1.5" />
                  Data
                </TabsTrigger>
                <TabsTrigger 
                  value="insights" 
                  disabled
                  className="h-7 text-xs px-2.5 opacity-50 cursor-not-allowed"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                  Insights
                </TabsTrigger>
              </TabsList>
            )}
            
            {/* Optional: Show title next to tabs if there's space, or tooltip */}
            <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-muted-foreground ml-2 border-l pl-2 max-w-[200px]">
              <span className="truncate">{card.title}</span>
              {card.alert?.enabled && (
                <>
                  {alertStatus?.triggered ? (
                    alertStatus.acknowledged ? (
                      <div className="flex items-center gap-1 text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 px-1.5 py-0.5 rounded text-[10px] whitespace-nowrap flex-shrink-0" title="Alert Acknowledged">
                        <CheckCircle2 className="h-3 w-3" />
                        <span className="hidden xl:inline">Acked</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-destructive bg-destructive/10 px-1.5 py-0.5 rounded text-[10px] whitespace-nowrap flex-shrink-0 animate-pulse" title="Alert Triggered">
                        <AlertTriangle className="h-3 w-3" />
                        <span className="hidden xl:inline">Triggered</span>
                      </div>
                    )
                  ) : (
                    <div className="flex items-center gap-1 text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded text-[10px] whitespace-nowrap flex-shrink-0" title="Monitoring Active">
                      <Activity className="h-3 w-3" />
                      <span className="hidden xl:inline">Monitoring</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            {card.chartType === 'alert' && onUpdate && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsConfigOpen(true)} 
                className="h-7 w-7 text-muted-foreground hover:text-foreground" 
                title="Configure Rule"
              >
                <Settings className="h-3.5 w-3.5" />
              </Button>
            )}
            
            {card.chartType !== 'alert' && (
              <Button variant="ghost" size="icon" onClick={handleCopy} className="h-7 w-7 text-muted-foreground hover:text-foreground" title="Copy Data">
                <Copy className="h-3.5 w-3.5" />
              </Button>
            )}
            
            <div className="w-px h-4 bg-border mx-1" />

            {onResize && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                    <Maximize2 className="h-3.5 w-3.5" />
                    <span className="sr-only">Resize</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onResize('sm')}>
                    <Minimize2 className="mr-2 h-4 w-4" /> Small
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onResize('md')}>
                    <BarChart2 className="mr-2 h-4 w-4" /> Medium
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onResize('lg')}>
                    <Maximize2 className="mr-2 h-4 w-4" /> Large
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {onRemove && (
              <Button variant="ghost" size="icon" onClick={onRemove} className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                <Trash2 className="h-3.5 w-3.5" />
                <span className="sr-only">Remove</span>
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-4 pt-4 flex-1 min-h-[250px] relative overflow-hidden">
          <TabsContent value="chart" className="h-full w-full mt-0 data-[state=active]:flex flex-col">
            {!lib ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground animate-pulse gap-2">
                <BarChart2 className="w-8 h-8 opacity-20" />
                <span className="text-xs font-medium">Loading visualization...</span>
              </div>
            ) : (
              <div className="h-full w-full min-h-[250px]">
                <Chart lib={lib} card={card} data={data} onUpdate={onUpdate} alertStatus={alertStatus} onAcknowledge={onAcknowledge} />
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="data" className="h-full w-full mt-0 overflow-hidden">
            <DataTable data={data} sourceData={sourceData} />
          </TabsContent>
        </CardContent>
      </Tabs>

      {onUpdate && (
        <AlertConfigurationModal 
          open={isConfigOpen} 
          onOpenChange={setIsConfigOpen} 
          card={card} 
          onSave={onUpdate} 
        />
      )}
    </Card>
  );
};


// Helper hook for axis configuration
const useChartAxis = (card: BIChartCard, data: any[]) => {
  const isTime = data.length > 0 && typeof data[0].date === 'string';
  const xKey = isTime ? 'date' : 'name';

  const formatTimeAxis = (value: any) => {
    if (!isTime || !value) return value;

    const granularity = card.selection?.timeGranularity;

    if (typeof value === 'string') {
      // Handle Year specifically to avoid timezone shifts for "YYYY" string
      if (granularity === 'year' && /^\d{4}$/.test(value)) {
        return value;
      }
      
      // Handle Quarter specifically for "YYYY/Q" or "YYYY-Q" format (e.g. 2023/1, 2023-2)
      if (granularity === 'quarter') {
        const quarterMatch = value.match(/^(\d{4})[-/](\d{1})$/);
        if (quarterMatch) {
          const year = parseInt(quarterMatch[1]);
          const quarter = parseInt(quarterMatch[2]);
          if (quarter >= 1 && quarter <= 4) {
             return format(new Date(year, (quarter - 1) * 3, 1), 'yyyy-QQQ');
          }
        }
      }
    }

    try {
      const date = new Date(value);
      if (!isValid(date)) return value;

      switch (granularity) {
        case 'year':
          return format(date, 'yyyy');
        case 'month':
          return format(date, 'yyyy-MM');
        case 'quarter':
          return format(date, 'yyyy-QQQ');
        case 'week':
          return format(date, 'yyyy-wo');
        case 'day':
          return format(date, 'MM-dd');
        case 'hour':
          return format(date, 'HH:mm');
        case 'minute':
          return format(date, 'HH:mm');
        default:
          return format(date, 'yyyy-MM-dd');
      }
    } catch (e) {
      return value;
    }
  };

  const commonXAxisProps = {
    dataKey: xKey,
    stroke: "#888888",
    fontSize: 12,
    tickLine: false,
    axisLine: false,
    tickMargin: 10,
    minTickGap: 30,
    dy: 5,
    tickFormatter: isTime ? formatTimeAxis : undefined
  };

  const commonYAxisProps = {
    stroke: "#888888",
    fontSize: 12,
    tickLine: false,
    axisLine: false,
    tickFormatter: (value: any) => `${value}`,
    width: 40,
  };

  const commonGridProps = {
    strokeDasharray: "3 3",
    vertical: false,
    stroke: "currentColor",
    className: "opacity-10 dark:opacity-20",
  };

  return { commonXAxisProps, commonYAxisProps, commonGridProps, isTime };
};

const KPIView = ({ data }: { data: any[] }) => {
  const value = data.length > 0 ? data[0].value : 0;
  const formattedValue = typeof value === 'number' 
    ? value.toLocaleString(undefined, { maximumFractionDigits: 2 })
    : value;
  
  return (
    <div className="flex flex-col items-center justify-center h-full w-full p-6 animate-in fade-in zoom-in-50 duration-500">
      <div className="text-4xl sm:text-5xl font-bold tracking-tight text-primary">
        {formattedValue}
      </div>
      <div className="mt-2 text-sm text-muted-foreground font-medium uppercase tracking-wider">
        Total Value
      </div>
    </div>
  );
};

const BarChartView = ({ lib, data, chartType, axisProps }: { lib: RechartsModule, data: any[], chartType: string, axisProps: any }) => {
  const { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Bar } = lib;
  const { commonXAxisProps, commonYAxisProps, commonGridProps, isTime } = axisProps;
  
  const isStacked = chartType === 'stackedBar';
  const isGrouped = chartType === 'groupedBar';
  
  // Data-to-viz: Use horizontal bars for long labels or many items (ranking)
  const isHorizontalLayout = !isTime && (
    data.length > 12 || 
    data.some(d => String(d.name || '').length > 10)
  );

  const keys = (isGrouped || isStacked) && data.length > 0 
    ? Object.keys(data[0]).filter(k => k !== 'name' && k !== 'date' && k !== 'value' && k !== 'fill' && k !== 'color') 
    : ['value'];

  // Adjust axis props for layout
  const xAxisProps = isHorizontalLayout 
    ? { ...commonYAxisProps, type: 'number' as const, dataKey: undefined, width: undefined, tickFormatter: undefined } 
    : commonXAxisProps;

  const yAxisProps = isHorizontalLayout
    ? { 
        ...commonXAxisProps, 
        type: 'category' as const, 
        width: 120, // Give more space for labels
        tickFormatter: (v: any) => typeof v === 'string' && v.length > 15 ? `${v.slice(0, 15)}...` : v
      }
    : commonYAxisProps;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart 
        data={data} 
        layout={isHorizontalLayout ? 'vertical' : 'horizontal'}
        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
      >
        <CartesianGrid {...commonGridProps} />
        <XAxis {...xAxisProps} />
        <YAxis {...yAxisProps} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'currentColor', opacity: 0.05 }} />
        {(isGrouped || isStacked) && <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} />}
        {keys.map((key, index) => (
          <Bar 
            key={key} 
            dataKey={key} 
            stackId={isStacked ? 'a' : undefined}
            fill={COLORS[index % COLORS.length]} 
            radius={
              isHorizontalLayout 
                ? (isStacked ? [0, 0, 0, 0] : [0, 4, 4, 0]) // Right rounded for horizontal
                : (isStacked ? [0, 0, 0, 0] : [4, 4, 0, 0]) // Top rounded for vertical
            }
            maxBarSize={60}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
};

const PieChartView = ({ lib, data }: { lib: RechartsModule, data: any[] }) => {
  const { ResponsiveContainer, PieChart, Tooltip, Legend, Pie, Cell } = lib;

  // Data-to-viz: Too many slices make pie charts unreadable. Group small slices into "Others".
  const processedData = React.useMemo(() => {
    if (data.length <= 8) return data;
    
    const sorted = [...data].sort((a, b) => (b.value || 0) - (a.value || 0));
    const top = sorted.slice(0, 7);
    const others = sorted.slice(7);
    
    if (others.length === 0) return top;
    
    const otherValue = others.reduce((sum, item) => sum + (item.value || 0), 0);
    return [
      ...top,
      { name: 'Others', value: otherValue }
    ];
  }, [data]);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: '12px' }} />
        <Pie 
          data={processedData} 
          dataKey="value" 
          nameKey="name" 
          cx="50%" 
          cy="50%" 
          innerRadius={60} 
          outerRadius={90} 
          paddingAngle={2}
          strokeWidth={2}
          stroke="hsl(var(--card))"
        >
          {processedData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
};

const AreaChartView = ({ lib, data, axisProps }: { lib: RechartsModule, data: any[], axisProps: any }) => {
  const { ResponsiveContainer, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, Area, Legend } = lib;
  const { commonXAxisProps, commonYAxisProps, commonGridProps } = axisProps;
  
  // Identify keys for multiple series
  const extractedKeys = data.length > 0 
    ? Object.keys(data[0]).filter(k => k !== 'name' && k !== 'date' && k !== 'value' && k !== 'fill' && k !== 'color') 
    : [];
  
  const keys = extractedKeys.length > 0 ? extractedKeys : ['value'];
  
  const hasMultipleSeries = keys.length > 1 || (keys.length === 1 && keys[0] !== 'value');

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          {keys.map((key, index) => (
            <linearGradient key={key} id={`colorValue-${index}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0}/>
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid {...commonGridProps} />
        <XAxis {...commonXAxisProps} />
        <YAxis {...commonYAxisProps} />
        <Tooltip content={<CustomTooltip />} />
        {hasMultipleSeries && <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />}
        {keys.map((key, index) => (
          <Area 
            key={key}
            type="monotone" 
            dataKey={key} 
            stroke={COLORS[index % COLORS.length]} 
            fillOpacity={1} 
            fill={`url(#colorValue-${index})`} 
            strokeWidth={2}
            activeDot={{ r: 4, strokeWidth: 0, fill: COLORS[index % COLORS.length] }}
            stackId="1" 
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
};

const LineChartView = ({ lib, data, axisProps }: { lib: RechartsModule, data: any[], axisProps: any }) => {
  const { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Line, Legend } = lib;
  const { commonXAxisProps, commonYAxisProps, commonGridProps } = axisProps;

  // Identify keys for multiple series
  const extractedKeys = data.length > 0 
    ? Object.keys(data[0]).filter(k => k !== 'name' && k !== 'date' && k !== 'value' && k !== 'fill' && k !== 'color') 
    : [];

  const keys = extractedKeys.length > 0 ? extractedKeys : ['value'];

  const hasMultipleSeries = keys.length > 1 || (keys.length === 1 && keys[0] !== 'value');

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid {...commonGridProps} />
        <XAxis {...commonXAxisProps} />
        <YAxis {...commonYAxisProps} />
        <Tooltip content={<CustomTooltip />} />
        {hasMultipleSeries && <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />}
        {keys.map((key, index) => (
          <Line 
            key={key}
            type="monotone" 
            dataKey={key} 
            stroke={COLORS[index % COLORS.length]} 
            strokeWidth={2.5} 
            dot={false}
            activeDot={{ r: 6, strokeWidth: 0, fill: COLORS[index % COLORS.length] }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
};

const Chart: React.FC<{ 
  lib: RechartsModule; 
  card: BIChartCard; 
  data: any[]; 
  onUpdate?: (card: BIChartCard) => void;
  alertStatus?: AlertStatus;
  onAcknowledge?: (alertId: string) => void;
}> = ({ lib, card, data, onUpdate, alertStatus, onAcknowledge }) => {
  const { type: chartType } = { type: card.chartType };
  const axisProps = useChartAxis(card, data);

  if (chartType === 'alert') {
    return <AlertCard card={card} data={data} onUpdate={onUpdate} alertStatus={alertStatus} onAcknowledge={onAcknowledge} />;
  }

  if (chartType === 'kpi') {
    return <KPIView data={data} />;
  }

  if (['bar', 'groupedBar', 'stackedBar'].includes(chartType)) {
    return <BarChartView lib={lib} data={data} chartType={chartType} axisProps={axisProps} />;
  }

  if (chartType === 'pie' && !axisProps.isTime) {
    return <PieChartView lib={lib} data={data} />;
  }

  if (chartType === 'area') {
    return <AreaChartView lib={lib} data={data} axisProps={axisProps} />;
  }

  // Default to line
  return <LineChartView lib={lib} data={data} axisProps={axisProps} />;
};

export default ChartCard;