import React from 'react';
import { Activity, PlayCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from '@/lib/utils';
import type { BIChartCard, AlertConfig, AlertAction } from '@/model/biAnalysis';
import type { AlertStatus } from '@/model/AlertConfig';

export interface AlertCardProps {
  card: BIChartCard;
  data: any[];
  onUpdate?: (card: BIChartCard) => void;
  alertStatus?: AlertStatus;
  onAcknowledge?: (alertId: string) => void;
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
  return false;
};

export const AlertCard: React.FC<AlertCardProps> = ({ card, data, onUpdate, alertStatus, onAcknowledge }) => {
  const value = data.length > 0 ? (typeof data[0].value === 'number' ? data[0].value : 0) : 0;
  const alertConfig = card.alert;
  const isAcknowledged = alertStatus?.acknowledged;
  const [showDetails, setShowDetails] = React.useState(!isAcknowledged);

  React.useEffect(() => {
    setShowDetails(!isAcknowledged);
  }, [isAcknowledged]);
  
  if (!alertConfig) {
    return <div className="flex items-center justify-center h-full text-muted-foreground">No alert configuration</div>;
  }

  const handleToggle = (enabled: boolean) => {
    if (onUpdate && card.alert) {
      onUpdate({
        ...card,
        alert: {
          ...card.alert,
          enabled
        }
      });
    }
  };

  const isTriggeredLocal = alertConfig.enabled ? checkAlert(value, alertConfig) : false;
  const isTriggered = alertConfig.enabled ? (alertStatus ? alertStatus.triggered : isTriggeredLocal) : false;

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
           <Switch 
             checked={alertConfig.enabled} 
             onCheckedChange={handleToggle}
             disabled={!onUpdate}
             aria-label="Toggle alert" 
           />
           {alertConfig.priority && (
             <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-5", priorityColor[alertConfig.priority])}>
               {alertConfig.priority.toUpperCase()}
             </Badge>
           )}
        </div>
      </div>

      {/* Rule Condition Box - Shown when NOT triggered */}
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
               {(alertConfig.conditions || []).map((cond: any, idx: number) => {
                 const metricLabel = cond.metricName || cond.field || cond.metricId || card.metricId;
                 return (
                <div key={idx} className="flex items-center gap-1.5 flex-wrap">
                  <span className="bg-background px-1.5 py-0.5 rounded border border-border shadow-sm text-foreground" title={metricLabel}>
                    {metricLabel}
                  </span>
                  <span className="font-bold text-primary">{cond.operator}</span>
                  <span className="bg-background px-1.5 py-0.5 rounded border border-border shadow-sm text-foreground">
                    {cond.value}
                  </span>
                </div>
                 );
              })}
             </div>
           </div>
        </div>
      )}

      {/* Action Section - Only visible when triggered */}
      {isTriggered && (
        <div className="flex-1 flex flex-col gap-2 overflow-hidden">
          {isAcknowledged ? (
             <div className="flex items-center justify-between bg-emerald-500/10 p-3 rounded border border-emerald-500/20">
                 <div className="flex items-center gap-2 text-emerald-600">
                     <CheckCircle2 className="w-5 h-5" />
                     <div className="flex flex-col">
                        <span className="font-medium text-sm">Acknowledged</span>
                        <span className="text-[10px] opacity-80">by {alertStatus?.acknowledgedBy || 'User'}</span>
                     </div>
                 </div>
                 <Button variant="ghost" size="sm" onClick={() => setShowDetails(!showDetails)} className="h-7 text-xs px-2 hover:bg-emerald-500/20 hover:text-emerald-700">
                     {showDetails ? 'Hide Details' : 'Show Details'}
                 </Button>
             </div>
          ) : (
             <div className="flex items-center gap-2 px-1">
                <AlertTriangle className="w-4 h-4 text-destructive" />
                <span className="text-sm font-semibold text-destructive">Alert Triggered</span>
             </div>
          )}

          {(showDetails || !isAcknowledged) && (
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 animate-in slide-in-from-top-2 duration-200">
            {/* Detailed Condition Results */}
            {alertStatus?.conditionResults && alertStatus.conditionResults.length > 0 && (
               <div className="space-y-2 mb-2">
                 {alertStatus.conditionResults.map((result, idx) => (
                   <div key={idx} className="bg-muted/30 border rounded-md p-2 text-xs">
                      <div className="flex items-center justify-between mb-1">
                         <span className="font-medium truncate max-w-[120px]" title={result.metricName || result.metricId}>
                           {result.metricName || result.metricId}
                         </span>
                         {result.triggered ? 
                           <Badge variant="destructive" className="text-[10px] h-4 px-1">Triggered</Badge> : 
                           <Badge variant="outline" className="text-[10px] h-4 px-1">Safe</Badge>
                         }
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-[10px] text-muted-foreground">
                         <div>Curr: <span className="font-mono text-foreground">{result.currentValue}</span></div>
                         <div>Thr: <span className="font-mono text-foreground">{result.operator} {result.value}</span></div>
                      </div>
                   </div>
                 ))}
               </div>
            )}

            {/* Acknowledge Button */}
            {alertStatus && isTriggered && !isAcknowledged && (
              <div className="mb-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="w-full h-7 text-xs border-destructive/30 hover:bg-destructive/10 hover:text-destructive" 
                  onClick={() => onAcknowledge?.(alertStatus.id)}
                >
                   Acknowledge Alert
                </Button>
              </div>
            )}
            
            {actions.map((action, idx) => (
              <div key={idx} className="bg-muted/30 border rounded-md p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", riskColor[action.riskLevel || 'low'])}>
                      {(action.riskLevel || 'low').toUpperCase()}
                    </Badge>
                    <span className="font-medium text-sm">{action.name || 'Suggested Action'}</span>
                  </div>
                  <Badge variant="secondary" className="text-[10px]" title={action.type}>
                    {action.typeName || (action.type.length > 20 || (/^\d+$/.test(action.type) && action.type.length > 15) ? 'Action' : action.type)}
                  </Badge>
                </div>
                
                {action.content && (
                  <div className="bg-background/50 p-2 rounded border border-dashed space-y-1">
                    <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Description</div>
                    <p className="text-xs text-muted-foreground">
                      {action.content}
                    </p>
                  </div>
                )}

                {action.parameters && Object.keys(action.parameters).length > 0 && (
                  <div className="bg-background/50 p-2 rounded border border-dashed space-y-1">
                     <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Parameters</div>
                     <div className="grid gap-1">
                        {Object.entries(action.parameters).map(([key, value]) => (
                           <div key={key} className="flex text-[10px]">
                              <span className="text-muted-foreground w-24 shrink-0 truncate" title={key}>{key}</span>
                              <span className="font-mono text-foreground truncate flex-1" title={typeof value === 'object' ? JSON.stringify(value) : String(value)}>
                                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                              </span>
                           </div>
                        ))}
                     </div>
                  </div>
                )}

                {action.expectedEffect && (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Expected: {action.expectedEffect}</span>
                  </div>
                )}

                {(action.executionMode === 'manual' || action.executionMode === 'approval' || (!action.executionMode && (action.riskLevel === 'medium' || action.riskLevel === 'high' || action.riskLevel === 'critical'))) && (
                  <Button size="sm" className="w-full gap-2 mt-2" variant={action.riskLevel === 'medium' ? "default" : "destructive"}>
                    <PlayCircle className="w-4 h-4" />
                    {action.executionMode === 'approval' ? 'Request Execution' : 'Execute Manually'}
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
          )}
        </div>
      )}

      {/* Footer Stats */}
      <div className="flex items-center justify-between mt-auto pt-2 border-t">
        <div className="flex items-center gap-2">
          {isTriggered ? (
             isAcknowledged ? (
               <Badge variant="outline" className="px-2 py-0.5 text-[10px] font-medium text-emerald-600 bg-emerald-50 border-emerald-200">
                 Resolved
               </Badge>
             ) : (
               <Badge variant="destructive" className="px-2 py-0.5 text-[10px] font-medium animate-pulse">
                 Active
               </Badge>
             )
          ) : (
            <Badge variant="outline" className="px-2 py-0.5 text-[10px] font-medium text-muted-foreground bg-muted/50">
              Normal
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
};
