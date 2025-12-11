import React from 'react';
import { Activity, Clock, Zap } from 'lucide-react';
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { cn } from '@/lib/utils';
import type { BIChartCard, AlertConfig, AlertCondition } from '@/model/biAnalysis';

export interface AlertCardProps {
  card: BIChartCard;
  data: any[];
}

const checkSingleCondition = (value: number, condition: { operator: string; value: number | string }) => {
  const threshold = Number(condition.value);
  switch (condition.operator) {
    case '>': return value > threshold;
    case '<': return value < threshold;
    case '>=': return value >= threshold;
    case '<=': return value <= threshold;
    case '==': return value === threshold;
    case '!=': return value !== threshold;
    default: return false;
  }
};

const checkAlert = (value: number, config: AlertConfig) => {
  if (config.conditions && config.conditions.length > 0) {
    const results = config.conditions.map(c => checkSingleCondition(value, c as any));
    if (config.conditionLogic === 'or') return results.some(r => r);
    return results.every(r => r);
  }
  return checkSingleCondition(value, config.condition);
};

export const AlertCard: React.FC<AlertCardProps> = ({ card, data }) => {
  const value = data.length > 0 ? (typeof data[0].value === 'number' ? data[0].value : 0) : 0;
  const alertConfig = card.alert;
  
  if (!alertConfig) {
    return <div className="flex items-center justify-center h-full text-muted-foreground">No alert configuration</div>;
  }

  const isTriggered = checkAlert(value, alertConfig);
  // Mock last trigger time for UI demo purposes, or use current time if triggered
  const lastTriggered = isTriggered ? "Just now" : "2 hours ago";
  const triggerCount = isTriggered ? 128 : 127;

  const priorityColor = {
    high: "bg-red-500/10 text-red-600 border-red-500/20",
    medium: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    low: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  };

  return (
    <div className="flex flex-col h-full justify-between p-1 w-full">
      {/* Header Section */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Activity className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="font-semibold text-lg tracking-tight leading-none mb-1">{alertConfig.name || card.title}</div>
            {alertConfig.description && (
               <div className="text-xs text-muted-foreground truncate max-w-[200px]" title={alertConfig.description}>
                 {alertConfig.description}
               </div>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
           <Switch checked={alertConfig.enabled} disabled aria-label="Toggle alert" />
           {alertConfig.priority && (
             <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-5", priorityColor[alertConfig.priority])}>
               {alertConfig.priority.toUpperCase()}
             </Badge>
           )}
        </div>
      </div>

      {/* Rule Condition Box */}
      <div className="bg-muted/40 p-3 rounded-md border border-border/40 font-mono text-xs mb-4 relative overflow-hidden group flex-1">
         <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary/50 group-hover:bg-primary transition-colors" />
         <div className="flex flex-col gap-2">
           <div className="flex items-center gap-2 mb-1">
             <span className="text-muted-foreground font-semibold">IF</span>
             {alertConfig.conditions && alertConfig.conditions.length > 1 && (
               <span className="text-[10px] font-bold text-muted-foreground uppercase bg-muted px-1 rounded border">
                 {alertConfig.conditionLogic || 'AND'}
               </span>
             )}
           </div>
           
           <div className="space-y-1.5">
             {(alertConfig.conditions && alertConfig.conditions.length > 0 ? alertConfig.conditions : [{ ...alertConfig.condition, field: card.metricId }]).map((cond: any, idx: number) => (
               <div key={idx} className="flex items-center gap-1.5 flex-wrap">
                 <span className="bg-background px-1.5 py-0.5 rounded border border-border shadow-sm text-foreground truncate max-w-[100px]" title={cond.field || card.metricId}>
                   {cond.field || card.metricId}
                 </span>
                 <span className="font-bold text-primary">{cond.operator}</span>
                 <span className="bg-background px-1.5 py-0.5 rounded border border-border shadow-sm text-foreground">
                   {cond.value}
                 </span>
               </div>
             ))}
           </div>

           <div className="flex items-center gap-2 mt-2 pt-2 border-t border-dashed border-border/50">
             <span className="text-muted-foreground font-semibold">THEN</span>
             <span className="flex items-center gap-1 text-foreground font-medium underline decoration-dashed underline-offset-4">
               <Zap className="w-3 h-3" />
               {alertConfig.nextAction?.type || 'Notification'}
             </span>
           </div>
         </div>
      </div>

      {/* Footer Stats */}
      <div className="flex items-center justify-between mt-auto pt-2">
        <div className="flex items-center gap-2">
          {isTriggered ? (
            <Badge variant="destructive" className="px-2 py-0.5 text-[10px] font-medium animate-pulse">
              Triggered
            </Badge>
          ) : (
            <Badge variant="outline" className="px-2 py-0.5 text-[10px] font-medium text-muted-foreground bg-muted/50">
              Normal
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
           <div className="flex items-center gap-1" title="Trigger Count">
              <span className="font-medium text-foreground">{triggerCount}</span>
              <span>triggers</span>
           </div>
           <div className="flex items-center gap-1" title="Last Triggered">
              <Clock className="w-3 h-3" />
              <span>{lastTriggered}</span>
           </div>
        </div>
      </div>
    </div>
  );
};
