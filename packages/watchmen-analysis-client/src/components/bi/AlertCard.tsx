import React from 'react';
import { Activity, Clock, Zap, PlayCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from '@/lib/utils';
import type { BIChartCard, AlertConfig, AlertAction } from '@/model/biAnalysis';

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
    critical: "bg-destructive/10 text-destructive border-destructive/20",
    high: "bg-red-500/10 text-red-600 border-red-500/20",
    medium: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    low: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  };

  const riskColor = {
    critical: "bg-destructive text-destructive-foreground",
    high: "bg-red-500 text-white",
    medium: "bg-amber-500 text-white",
    low: "bg-blue-500 text-white",
  };

  const actions: AlertAction[] = alertConfig.actions && alertConfig.actions.length > 0 
    ? alertConfig.actions 
    : (alertConfig.nextAction ? [alertConfig.nextAction] : []);

  return (
    <div className="flex flex-col h-full justify-between p-1 w-full gap-2">
      {/* Header Section */}
      <div className="flex items-start justify-between">
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
      {!isTriggered && (
        <div className="bg-muted/40 p-3 rounded-md border border-border/40 font-mono text-xs mb-auto relative overflow-hidden group">
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
           </div>
        </div>
      )}

      {/* Action Section - Only visible when triggered */}
      {isTriggered && (
        <div className="flex-1 flex flex-col gap-2 overflow-hidden">
          <div className="flex items-center gap-2 px-1">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            <span className="text-sm font-semibold text-destructive">Alert Triggered</span>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {actions.map((action, idx) => (
              <div key={idx} className="bg-muted/30 border rounded-md p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", riskColor[action.riskLevel || 'low'])}>
                      {(action.riskLevel || 'low').toUpperCase()}
                    </Badge>
                    <span className="font-medium text-sm">{action.name || 'Suggested Action'}</span>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">{action.type}</Badge>
                </div>
                
                {action.content && (
                  <p className="text-xs text-muted-foreground bg-background/50 p-2 rounded border border-dashed">
                    {action.content}
                  </p>
                )}

                {action.expectedEffect && (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Expected: {action.expectedEffect}</span>
                  </div>
                )}

                {(action.riskLevel === 'high' || action.riskLevel === 'critical') && (
                  <Button size="sm" className="w-full gap-2 mt-2" variant="destructive">
                    <PlayCircle className="w-4 h-4" />
                    Execute Manually
                  </Button>
                )}
              </div>
            ))}
            
            {actions.length === 0 && (
              <div className="text-center p-4 text-xs text-muted-foreground border border-dashed rounded-md">
                No specific actions configured
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer Stats */}
      <div className="flex items-center justify-between mt-auto pt-2 border-t">
        <div className="flex items-center gap-2">
          {isTriggered ? (
            <Badge variant="destructive" className="px-2 py-0.5 text-[10px] font-medium animate-pulse">
              Active
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
