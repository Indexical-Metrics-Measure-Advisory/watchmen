import React from 'react';
import { ChartCard } from '@/components/bi/ChartCard';
import type { BIChartCard, BICardSize, BIChartType } from '@/model/biAnalysis';
import type { AlertStatus } from '@/model/AlertConfig';
import { LayoutDashboard, PlusCircle, AlertCircle, BellPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ChartDataPoint = any;

interface AnalysisBoardProps {
  cards: BIChartCard[];
  cardDataMap: Record<string, ChartDataPoint[]>;
  onDragStart: (index: number) => (e: React.DragEvent<HTMLDivElement>) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (index: number) => (e: React.DragEvent<HTMLDivElement>) => void;
  onResize: (index: number, size: BICardSize) => void;
  onRemove: (index: number) => void;
  onUpdate?: (index: number, card: BIChartCard) => void;
  onAddAlert?: () => void;
  readOnly?: boolean;
  alertStatusMap?: Record<string, AlertStatus>;
  onAcknowledge?: (alertId: string) => void;
}

export const AnalysisBoard: React.FC<AnalysisBoardProps> = ({
  cards,
  cardDataMap,
  onDragStart,
  onDragOver,
  onDrop,
  onResize,
  onRemove,
  onUpdate,
  onAddAlert,
  readOnly = false,
  alertStatusMap,
  onAcknowledge,
}) => {
  const decideType = (data: ChartDataPoint[]): BIChartType => {
    if (!data || data.length === 0) return 'bar';
    
    const firstItem = data[0];
    const keys = Object.keys(firstItem).filter(k => k !== 'name' && k !== 'date' && k !== 'value' && k !== 'color');
    const hasDate = 'date' in firstItem;
    const hasValue = 'value' in firstItem;
    
    // Time series data
    if (hasDate) {
      // If we have multiple metrics/series over time
      if (keys.length > 0) {
        // If many series, line is cleaner than stacked bar
        return keys.length > 3 ? 'line' : 'stackedBar';
      }
      // Single metric over time -> Area chart looks better for trends
      return 'area';
    }

    // Categorical data with multiple series
    if (keys.length > 0) {
      return keys.length > 4 ? 'stackedBar' : 'groupedBar';
    }

    // Simple categorical data (name + value)
    if (data.length <= 5) {
      // Few items -> Pie chart is acceptable for distribution, but bar is safer. 
      // Let's use Bar for now as it's more precise, or Pie if it looks like a distribution (not implemented logic).
      // Let's stick to Bar but maybe 'pie' if explicitly requested? 
      // For auto-decision, Bar is safe.
      return 'bar'; 
    }

    return 'bar';
  };

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

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-500">
      <div className="flex items-center justify-between border-b pb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-primary/10 rounded-lg">
            <LayoutDashboard className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Analysis Dashboard</h2>
            <p className="text-sm text-muted-foreground">Visualize insights and patterns</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!readOnly && onAddAlert && (
            <Button variant="outline" size="sm" onClick={onAddAlert} className="gap-2 h-8">
              <BellPlus className="w-4 h-4" />
              Add Alert
            </Button>
          )}
          <div className="text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
            {cards.length} {cards.length === 1 ? 'Visualization' : 'Visualizations'}
          </div>
        </div>
      </div>
      
      {cards.length === 0 ? (
        <div className="min-h-[400px] flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed border-muted-foreground/20 rounded-xl bg-muted/5 hover:bg-muted/10 transition-colors gap-4">
          <div className="p-4 bg-background rounded-full shadow-sm">
            <PlusCircle className="w-8 h-8 text-primary/40" />
          </div>
          <div className="text-center space-y-1">
            <p className="font-medium text-lg text-foreground/80">Your dashboard is empty</p>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              Start by adding a new visualization card from the configuration panel above to analyze your data.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-6">
          {cards.map((card, index) => {
            const data = cardDataMap[card.id] ?? [];
            
            // If no dimensions selected for this card
            if ((!card.selection.dimensions || card.selection.dimensions.length === 0) && card.chartType !== 'alert') {
              return (
                <div key={card.id} className={cn("transition-all duration-200", sizeClass(card.size))}>
                   <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-muted-foreground border border-border/50 rounded-xl bg-card/30 p-8 text-center shadow-sm gap-3">
                     <AlertCircle className="w-8 h-8 text-muted-foreground/30" />
                     <div className="space-y-1">
                       <p className="font-medium text-foreground/80">Missing Configuration</p>
                       <p className="text-sm">Select dimensions and metrics to generate visualization</p>
                     </div>
                   </div>
                </div>
              );
            }
            
            const renderCard = { 
              ...card, 
              chartType: card.chartType === 'alert' ? 'alert' : decideType(data) 
            };
            
            return (
              <ChartCard
                key={card.id}
                card={renderCard}
                data={data}
                draggable={!readOnly}
                onDragStart={!readOnly ? onDragStart(index) : undefined}
                onDragOver={!readOnly ? onDragOver : undefined}
                onDrop={!readOnly ? onDrop(index) : undefined}
                onResize={!readOnly ? (size) => onResize(index, size) : undefined}
                onRemove={!readOnly ? () => onRemove(index) : undefined}
                onUpdate={!readOnly ? (updatedCard) => onUpdate?.(index, updatedCard) : undefined}
                alertStatus={alertStatusMap?.[card.id]}
                onAcknowledge={onAcknowledge}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AnalysisBoard;