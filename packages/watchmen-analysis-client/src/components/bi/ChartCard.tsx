import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { BIChartCard, BICardSize } from '@/model/biAnalysis';
import type { MetricFlowResponse } from '@/model/metricFlow';
import type { AlertStatus } from '@/model/AlertConfig';
import { AlertCard } from './AlertCard';
import { GripHorizontal, Trash2, Maximize2, Minimize2, BarChart2, Table as TableIcon, LineChart as LineChartIcon, Sparkles, Copy, AlertTriangle, CheckCircle2, Activity, Lightbulb } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import type { ChartDatum, RechartsModule } from './charts/types';
import { MAX_TIME_SERIES_POINTS, MAX_CATEGORY_POINTS, sampleDataByIndex } from './charts/utils';
import { DataTable } from './charts/DataTable';
import { useChartAxis } from './charts/useChartAxis';
import { KPIView, BarChartView, PieChartView, AreaChartView, LineChartView } from './charts/ChartViews';
import { useRechartsModule } from './charts/RechartsContext';
import { useMetricFormat, useMetricLabel, useMetricUnit } from './charts/useMetricFormat';

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
  onProposeHypothesis?: (card: BIChartCard) => void;
  hypothesisBadge?: { total: number; worstStatus: string };
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
  format?: string;
  unit?: string;
  alertStatus?: AlertStatus;
  onAcknowledge?: (alertId: string) => void;
  onProposeHypothesis?: (card: BIChartCard) => void;
};

const Chart = React.memo(({ lib, card, data, sourceData, format, unit, alertStatus, onAcknowledge, onProposeHypothesis }: ChartInnerProps) => {
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
    return <AlertCard card={card} data={data} alertStatus={alertStatus} onAcknowledge={onAcknowledge} onProposeHypothesis={onProposeHypothesis} />;
  }

  if (chartType === 'table') {
    return <DataTable data={data} sourceData={sourceData} />;
  }

  if (chartType === 'kpi') {
    return <KPIView data={sampledData} format={format} unit={unit} />;
  }

  if (['bar', 'groupedBar', 'stackedBar'].includes(chartType)) {
    return <BarChartView lib={lib} data={sampledData} chartType={chartType} axisProps={axisProps} format={format} unit={unit} />;
  }

  if (chartType === 'pie' && !axisProps.isTime) {
    return <PieChartView lib={lib} data={sampledData} format={format} unit={unit} />;
  }

  if (chartType === 'area') {
    return <AreaChartView lib={lib} data={sampledData} axisProps={axisProps} format={format} unit={unit} />;
  }

  // Default to line
  return <LineChartView lib={lib} data={sampledData} axisProps={axisProps} format={format} unit={unit} />;
});

// Hypothesis badge pill colors by worst status (mirrors the alert pill styling)
const HYPOTHESIS_STATUS_COLOR: Record<string, string> = {
  testing: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400',
  drafted: 'text-muted-foreground bg-muted',
  validated: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400',
  rejected: 'text-destructive bg-destructive/10',
};

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
  onProposeHypothesis,
  hypothesisBadge,
}: ChartCardProps) => {
  const { toast } = useToast();
  const { t } = useTranslation('biAnalysis');
  const navigate = useNavigate();
  const lib = useRechartsModule();
  const [activeTab, setActiveTab] = useState<string>("chart");
  // display label / format / unit configured on the metric (BIChartCard.metricId is the metric name)
  const metricLabel = useMetricLabel(card.metricId);
  const metricFormat = useMetricFormat(card.metricId);
  const metricUnit = useMetricUnit(card.metricId);
  
  const dimensionsCount = card.selection?.dimensions?.length || 0;
  const isTooManyDimensions = dimensionsCount > 5;
  const chartViewEnabled = activeTab === 'chart';
  const dataViewEnabled = activeTab === 'data';
  const copyEnabled = card.chartType !== 'alert' && data.length > 0;

  // card.title is "<metric name> · <time range>"; metricId itself is the metric name
  const titleSeparatorIndex = card.title.indexOf(' · ');
  const metricName = card.metricId || (titleSeparatorIndex > -1 ? card.title.slice(0, titleSeparatorIndex) : card.title);
  // label is the readable display name configured on the metric, shown on dashboards
  const displayName = metricLabel || metricName;
  const titleTimeRange = titleSeparatorIndex > -1 ? card.title.slice(titleSeparatorIndex + 3) : undefined;
  
  const copyHeaders = useMemo(
    () => (!data || data.length === 0 ? [] : Object.keys(data[0]).filter(k => k !== 'color' && k !== 'fill')),
    [data]
  );

  const handleCopy = async () => {
    try {
      if (!copyEnabled) {
        toast({
          title: t('chartCard.copyNoDataTitle'),
          description: t('chartCard.copyNoDataDescription'),
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
        title: t('chartCard.copiedTitle'),
        description: t('chartCard.copiedDescription'),
      });
    } catch (err) {
      toast({
        title: t('chartCard.copyFailedTitle'),
        description: t('chartCard.copyFailedDescription'),
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
                  {t('chartCard.chartTab')}
                </TabsTrigger>
                <TabsTrigger 
                  value="data" 
                  className="h-7 text-xs px-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  <TableIcon className="w-3.5 h-3.5 mr-1.5" />
                  {t('chartCard.dataTab')}
                </TabsTrigger>
                <TabsTrigger 
                  value="insights" 
                  disabled
                  className="h-7 text-xs px-2.5 opacity-50 cursor-not-allowed"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                  {t('chartCard.insightsTab')}
                </TabsTrigger>
              </TabsList>
            )}
            
            {(card.alert?.enabled || hypothesisBadge) && (
              <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-muted-foreground ml-2 border-l pl-2 max-w-[200px]">
                {card.alert?.enabled && (
                <>
                  {alertStatus?.triggered ? (
                    alertStatus.acknowledged ? (
                      <div className="flex items-center gap-1 text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 px-1.5 py-0.5 rounded text-[10px] whitespace-nowrap flex-shrink-0" title={t('chartCard.acked')}>
                        <CheckCircle2 className="h-3 w-3" />
                        <span className="hidden xl:inline">{t('chartCard.acked')}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-destructive bg-destructive/10 px-1.5 py-0.5 rounded text-[10px] whitespace-nowrap flex-shrink-0" title={t('chartCard.triggered')}>
                        <AlertTriangle className="h-3 w-3" />
                        <span className="hidden xl:inline">{t('chartCard.triggered')}</span>
                      </div>
                    )
                  ) : (
                    <div className="flex items-center gap-1 text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded text-[10px] whitespace-nowrap flex-shrink-0" title={t('chartCard.monitoring')}>
                      <Activity className="h-3 w-3" />
                      <span className="hidden xl:inline">{t('chartCard.monitoring')}</span>
                    </div>
                  )}
                </>
              )}
              {hypothesisBadge && hypothesisBadge.total > 0 && (
                <button
                  type="button"
                  className={cn(
                    "flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] whitespace-nowrap flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity",
                    HYPOTHESIS_STATUS_COLOR[hypothesisBadge.worstStatus] ?? HYPOTHESIS_STATUS_COLOR.drafted
                  )}
                  title={`${hypothesisBadge.total} hypothesis(es) — ${hypothesisBadge.worstStatus}`}
                  onClick={() => navigate(`/hypotheses?metric=${encodeURIComponent(card.metricId)}`)}
                >
                  <Lightbulb className="h-3 w-3" />
                  <span>{hypothesisBadge.total}</span>
                </button>
              )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            {card.chartType !== 'alert' && (
              <Button variant="ghost" size="icon" onClick={handleCopy} className="h-7 w-7 text-muted-foreground hover:text-foreground" title="Copy Data">
                <Copy className="h-3.5 w-3.5" />
              </Button>
            )}
            {card.chartType !== 'alert' && onProposeHypothesis && (
              <Button variant="ghost" size="icon" onClick={() => onProposeHypothesis(card)} className="h-7 w-7 text-muted-foreground hover:text-foreground" title="Propose hypothesis">
                <Lightbulb className="h-3.5 w-3.5" />
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
                    <Minimize2 className="mr-2 h-4 w-4" /> {t('chartCard.sizeSmall')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onResize('md')}>
                    <BarChart2 className="mr-2 h-4 w-4" /> {t('chartCard.sizeMedium')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onResize('lg')}>
                    <Maximize2 className="mr-2 h-4 w-4" /> {t('chartCard.sizeLarge')}
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

        <CardContent className="p-4 pt-4 flex-1 min-h-[250px] relative overflow-hidden flex flex-col" style={{ contain: 'layout style paint' }}>
          <div className="flex items-baseline gap-2 mb-2 shrink-0 overflow-hidden">
            <span className="text-sm font-semibold text-foreground truncate" title={displayName}>
              {displayName}
            </span>
            {titleTimeRange && (
              <span className="text-xs text-muted-foreground whitespace-nowrap">{titleTimeRange}</span>
            )}
          </div>
          <TabsContent value="chart" className="flex-1 min-h-0 w-full mt-0 data-[state=active]:flex flex-col">
            {chartViewEnabled && isTooManyDimensions ? (
               <div className="h-full w-full flex flex-col">
                 <div className="bg-yellow-50 dark:bg-yellow-900/20 p-2 text-xs text-yellow-600 dark:text-yellow-400 text-center border-b border-yellow-100 dark:border-yellow-900/30 mb-2 rounded-sm">
                   {t('chartCard.tooManyDimensions')}
                 </div>
                 <div className="flex-1 overflow-hidden">
                    <DataTable data={data} sourceData={sourceData} />
                 </div>
               </div>
            ) : chartViewEnabled && !lib ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground gap-2">
                <BarChart2 className="w-8 h-8 opacity-20" />
                <span className="text-xs font-medium">{t('chartCard.loadingVisualization')}</span>
              </div>
            ) : chartViewEnabled ? (
              <div className="h-full w-full min-h-[250px]">
                <Chart
                  lib={lib}
                  card={card}
                  data={data}
                  sourceData={sourceData}
                  format={metricFormat}
                  unit={metricUnit}
                  alertStatus={alertStatus}
                  onAcknowledge={onAcknowledge}
                  onProposeHypothesis={onProposeHypothesis}
                />
              </div>
            ) : null}
          </TabsContent>
          
          <TabsContent value="data" className="flex-1 min-h-0 w-full mt-0 overflow-hidden">
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
  prev.onAcknowledge === next.onAcknowledge &&
  prev.onProposeHypothesis === next.onProposeHypothesis &&
  prev.hypothesisBadge === next.hypothesisBadge
));

export default ChartCard;