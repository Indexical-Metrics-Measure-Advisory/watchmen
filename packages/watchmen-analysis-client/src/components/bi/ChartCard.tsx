import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { BIChartCard, BICardSize } from '@/model/biAnalysis';
import type { MetricFlowResponse } from '@/model/metricFlow';
import type { AlertStatus } from '@/model/AlertConfig';
import { AlertCard } from './AlertCard';
import { GripHorizontal, Trash2, Maximize2, Minimize2, BarChart2, Table as TableIcon, LineChart as LineChartIcon, Sparkles, Copy, AlertTriangle, CheckCircle2, Activity } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import type { ChartDatum, RechartsModule } from './charts/types';
import { MAX_TIME_SERIES_POINTS, MAX_CATEGORY_POINTS, sampleDataByIndex } from './charts/utils';
import { DataTable } from './charts/DataTable';
import { useChartAxis } from './charts/useChartAxis';
import { KPIView, BarChartView, PieChartView, AreaChartView, LineChartView } from './charts/ChartViews';
import { useRechartsModule } from './charts/RechartsContext';

export type { ChartDatum, ChartDatumValue } from './charts/types';
export { DataTable } from './charts/DataTable';

export interface ChartCardProps {
  card: BIChartCard;
  data: ChartDatum[];
  sourceData?: MetricFlowResponse;
  onResize?: (size: BICardSize) => void;
  onRemove?: () => void;
  className?: string;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragOver?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop?: (e: React.DragEvent<HTMLDivElement>) => void;
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

type ChartInnerProps = {
  lib: RechartsModule;
  card: BIChartCard;
  data: ChartDatum[];
  sourceData?: MetricFlowResponse;
  alertStatus?: AlertStatus;
  onAcknowledge?: (alertId: string) => void;
};

const Chart = React.memo(({ lib, card, data, sourceData, alertStatus, onAcknowledge }: ChartInnerProps) => {
  const { type: chartType } = { type: card.chartType };
  
  const sampledData = useMemo(() => {
    if (data.length <= 1) return data;
    if (['line', 'area'].includes(chartType)) {
      return sampleDataByIndex(data, MAX_TIME_SERIES_POINTS);
    }
    if (['bar', 'groupedBar', 'stackedBar'].includes(chartType)) {
      return sampleDataByIndex(data, MAX_CATEGORY_POINTS);
    }
    return data;
  }, [chartType, data]);
  
  const axisProps = useChartAxis(card, sampledData);

  if (chartType === 'alert') {
    return <AlertCard card={card} data={data} alertStatus={alertStatus} onAcknowledge={onAcknowledge} />;
  }

  if (chartType === 'table') {
    return <DataTable data={data} sourceData={sourceData} />;
  }

  if (chartType === 'kpi') {
    return <KPIView data={sampledData} />;
  }

  if (['bar', 'groupedBar', 'stackedBar'].includes(chartType)) {
    return <BarChartView lib={lib} data={sampledData} chartType={chartType} axisProps={axisProps} />;
  }

  if (chartType === 'pie' && !axisProps.isTime) {
    return <PieChartView lib={lib} data={sampledData} />;
  }

  if (chartType === 'area') {
    return <AreaChartView lib={lib} data={sampledData} axisProps={axisProps} />;
  }

  // Default to line
  return <LineChartView lib={lib} data={sampledData} axisProps={axisProps} />;
});

export const ChartCard = React.memo(({
  card,
  data,
  onResize,
  onRemove,
  className,
  draggable,
  onDragStart,
  onDragOver,
  onDrop,
  alertStatus,
  onAcknowledge,
  sourceData,
}: ChartCardProps) => {
  const { toast } = useToast();
  const lib = useRechartsModule();
  const [activeTab, setActiveTab] = useState<string>("chart");
  
  const dimensionsCount = card.selection?.dimensions?.length || 0;
  const isTooManyDimensions = dimensionsCount > 5;
  const chartViewEnabled = activeTab === 'chart';
  const dataViewEnabled = activeTab === 'data';
  const copyEnabled = card.chartType !== 'alert' && data.length > 0;
  
  const copyHeaders = useMemo(
    () => (!data || data.length === 0 ? [] : Object.keys(data[0]).filter(k => k !== 'color' && k !== 'fill')),
    [data]
  );

  const handleCopy = async () => {
    try {
      if (!copyEnabled) {
        toast({
          title: "No data",
          description: "There is no data to copy",
          variant: "destructive",
        });
        return;
      }

      const headerRow = copyHeaders.join('\t');
      const rows = data.map(row => {
        return copyHeaders.map(header => {
          const val = row[header];
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

  return (
    <Card
      className={cn(
        'transition-shadow duration-200 hover:shadow-lg hover:border-primary/20 flex flex-col h-full bg-card group',
        sizeClass(card.size), 
        className
      )}
      style={{ contain: 'layout style paint' }}
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
                      <div className="flex items-center gap-1 text-destructive bg-destructive/10 px-1.5 py-0.5 rounded text-[10px] whitespace-nowrap flex-shrink-0" title="Alert Triggered">
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

        <CardContent className="p-4 pt-4 flex-1 min-h-[250px] relative overflow-hidden" style={{ contain: 'layout style paint' }}>
          <TabsContent value="chart" className="h-full w-full mt-0 data-[state=active]:flex flex-col">
            {chartViewEnabled && isTooManyDimensions ? (
               <div className="h-full w-full flex flex-col">
                 <div className="bg-yellow-50 dark:bg-yellow-900/20 p-2 text-xs text-yellow-600 dark:text-yellow-400 text-center border-b border-yellow-100 dark:border-yellow-900/30 mb-2 rounded-sm">
                   Chart hidden: Too many dimensions selected (max 5)
                 </div>
                 <div className="flex-1 overflow-hidden">
                    <DataTable data={data} sourceData={sourceData} />
                 </div>
               </div>
            ) : chartViewEnabled && !lib ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground gap-2">
                <BarChart2 className="w-8 h-8 opacity-20" />
                <span className="text-xs font-medium">Loading visualization...</span>
              </div>
            ) : chartViewEnabled ? (
              <div className="h-full w-full min-h-[250px]">
                <Chart 
                  lib={lib} 
                  card={card} 
                  data={data} 
                  sourceData={sourceData}
                  alertStatus={alertStatus} 
                  onAcknowledge={onAcknowledge} 
                />
              </div>
            ) : null}
          </TabsContent>
          
          <TabsContent value="data" className="h-full w-full mt-0 overflow-hidden">
            {dataViewEnabled ? <DataTable data={data} sourceData={sourceData} /> : null}
          </TabsContent>
        </CardContent>
      </Tabs>
    </Card>
  );
}, (prev, next) => (
  prev.card === next.card &&
  prev.data === next.data &&
  prev.sourceData === next.sourceData &&
  prev.onResize === next.onResize &&
  prev.onRemove === next.onRemove &&
  prev.className === next.className &&
  prev.draggable === next.draggable &&
  prev.onDragStart === next.onDragStart &&
  prev.onDragOver === next.onDragOver &&
  prev.onDrop === next.onDrop &&
  prev.alertStatus === next.alertStatus &&
  prev.onAcknowledge === next.onAcknowledge
));

export default ChartCard;