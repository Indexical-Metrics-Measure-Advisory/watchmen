import React from 'react';
import { Activity, PlayCircle, AlertTriangle, CheckCircle2, Clock, ChevronDown, ChevronUp, BarChart3, Loader2 } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from '@/lib/utils';
import type { BIChartCard, AlertConfig, AlertAction, AlertCondition, GlobalAlertRule } from '@/model/biAnalysis';
import type { AlertStatus } from '@/model/AlertConfig';
import { globalAlertService } from '@/services/globalAlertService';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

export interface AlertCardProps {
  card: BIChartCard;
  data: Array<{ value?: unknown }>;
  alertStatus?: AlertStatus;
  onAcknowledge?: (alertId: string) => void;
}

type AckHistoryItem = {
  acknowledgeReason?: string;
  acknowledgedBy?: string;
  acknowledgedAt: string;
};

// ── Alert history cache: every alert card used to fire 2 requests on mount.
// Short TTL (aligned with the card query cache) + in-flight dedupe.
const ALERT_HISTORY_CACHE_TTL = 30_000;

type AlertHistoryData = {
  stats: { total: number; byReason: Record<string, number>; lastAcknowledgedAt?: string; lastAcknowledgedBy?: string } | null;
  history: AckHistoryItem[];
};

const alertHistoryCache = new Map<string, { data: AlertHistoryData; timestamp: number }>();
const alertHistoryInFlight = new Map<string, Promise<AlertHistoryData | null>>();

const loadAlertHistory = (ruleId: string): Promise<AlertHistoryData | null> => {
  const cached = alertHistoryCache.get(ruleId);
  if (cached && Date.now() - cached.timestamp < ALERT_HISTORY_CACHE_TTL) {
    return Promise.resolve(cached.data);
  }
  const existing = alertHistoryInFlight.get(ruleId);
  if (existing) {
    return existing;
  }
  const request = (async () => {
    try {
      const [stats, history] = await Promise.all([
        globalAlertService.getAlertInstanceStatistics(ruleId),
        globalAlertService.getAlertInstanceHistory(ruleId),
      ]);
      const data: AlertHistoryData = { stats, history };
      alertHistoryCache.set(ruleId, { data, timestamp: Date.now() });
      return data;
    } catch (err) {
      console.error('Failed to fetch alert history:', err);
      return null;
    } finally {
      alertHistoryInFlight.delete(ruleId);
    }
  })();
  alertHistoryInFlight.set(ruleId, request);
  return request;
};

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
    const results = config.conditions.map(c => checkSingleCondition(value, c));
    if (config.conditionLogic === 'or') return results.some(r => r);
    return results.every(r => r);
  }
  return false;
};

const PRIORITY_COLOR: Record<string, string> = {
  critical: "bg-destructive/10 text-destructive border-destructive/20",
  high: "bg-red-500/10 text-red-600 border-red-500/20",
  medium: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  low: "bg-blue-500/10 text-blue-600 border-blue-500/20",
};

const isManualExecutionAction = (action: AlertAction): boolean => {
  if (action.executionMode === 'manual' || action.executionMode === 'approval') {
    return true;
  }
  if (action.suggestedAction?.executionMode === 'manual' || action.suggestedAction?.executionMode === 'approval') {
    return true;
  }
  if (action.actionType?.requiresApproval) {
    return true;
  }
  return false;
};

const RISK_COLOR: Record<string, string> = {
  critical: "bg-destructive text-destructive-foreground",
  high: "bg-red-500 text-white",
  medium: "bg-amber-500 text-white",
  low: "bg-blue-500 text-white",
};

export const AlertCard = React.memo(({ card, data, alertStatus, onAcknowledge }: AlertCardProps) => {
  const value = data.length > 0 ? (typeof data[0].value === 'number' ? data[0].value : 0) : 0;
  const alertConfig = card.alert;
  const isAcknowledged = alertStatus?.acknowledged;
  const { toast } = useToast();
  const { t } = useTranslation('biAnalysis');
  const ackReasonLabel = React.useCallback(
    (reason?: string) => reason ? t(`acknowledgeDialog.reasons.${reason}`, { defaultValue: reason }) : '',
    [t]
  );
  const [showDetails, setShowDetails] = React.useState(!isAcknowledged);
  const [showHistory, setShowHistory] = React.useState(false);
  const [ackStats, setAckStats] = React.useState<{ total: number; byReason: Record<string, number>; lastAcknowledgedAt?: string; lastAcknowledgedBy?: string } | null>(null);
  const [ackHistory, setAckHistory] = React.useState<AckHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = React.useState(false);
  const [executingActionIdx, setExecutingActionIdx] = React.useState<number | null>(null);
  const [localActionExecuted, setLocalActionExecuted] = React.useState<boolean>(!!alertStatus?.actionExecuted);

  const handleExecuteAction = React.useCallback(async (actionIdx: number) => {
    if (!alertStatus?.id) return;
    setExecutingActionIdx(actionIdx);
    try {
      await globalAlertService.executeAlertActions(alertStatus.id);
      setLocalActionExecuted(true);
      toast({
        title: t('alertCard.actionExecutedTitle'),
        description: t('alertCard.actionExecutedDescription')
      });
    } catch (e) {
      console.error('Failed to execute action:', e);
      toast({
        title: t('alertCard.actionFailedTitle'),
        description: t('alertCard.actionFailedDescription'),
        variant: 'destructive'
      });
    } finally {
      setExecutingActionIdx(null);
    }
  }, [alertStatus?.id, toast, t]);

  React.useEffect(() => {
    setShowDetails(!isAcknowledged);
  }, [isAcknowledged]);

  React.useEffect(() => {
    setLocalActionExecuted(!!alertStatus?.actionExecuted);
  }, [alertStatus?.actionExecuted]);

  const alertRuleId = (alertConfig as GlobalAlertRule | undefined)?.id || alertStatus?.ruleId;

  React.useEffect(() => {
    if (!alertRuleId) return;

    let alive = true;
    setLoadingHistory(true);
    void loadAlertHistory(alertRuleId).then(result => {
      if (!alive) return;
      if (result) {
        setAckStats(result.stats);
        setAckHistory(result.history);
      }
      setLoadingHistory(false);
    });
    return () => {
      alive = false;
    };
  }, [alertRuleId, alertStatus?.ruleId, alertStatus?.acknowledged]);

  const isTriggeredLocal = alertConfig?.enabled ? checkAlert(value, alertConfig) : false;
  const isTriggered = alertConfig?.enabled ? (alertStatus ? alertStatus.triggered : isTriggeredLocal) : false;

  const pendingManualActions = React.useMemo<AlertAction[]>(() => {
    const instanceActions = (alertStatus?.actions || []) as AlertAction[];
    if (instanceActions && instanceActions.length > 0) {
      const normalizedInstanceActions = instanceActions
        .filter(() => !localActionExecuted)
        .map((instanceAction): AlertAction => {
          const configAction = alertConfig?.actions?.find(a => a.type === instanceAction.type || a.name === instanceAction.name);
          const executionMode = instanceAction.executionMode
            || configAction?.executionMode
            || instanceAction.suggestedAction?.executionMode;

          return {
            type: instanceAction.type,
            name: instanceAction.name || configAction?.name || t('alertCard.defaultActionName'),
            riskLevel: instanceAction.riskLevel || configAction?.riskLevel || 'medium',
            executionMode,
            content: instanceAction.content || configAction?.content,
            parameters: instanceAction.parameters || configAction?.parameters,
            expectedEffect: instanceAction.expectedEffect || configAction?.expectedEffect,
            typeName: instanceAction.actionType?.name || configAction?.typeName,
            suggestedAction: instanceAction.suggestedAction,
            actionType: instanceAction.actionType,
          };
        });

      const actionableInstanceActions = normalizedInstanceActions.filter(a => isManualExecutionAction(a));

      if (actionableInstanceActions.length > 0) {
        return actionableInstanceActions;
      }
    }
    const configActions = alertConfig?.actions;
    if (configActions && configActions.length > 0) {
      return configActions.filter(a => isManualExecutionAction(a));
    }
    if (alertConfig?.nextAction && isManualExecutionAction(alertConfig.nextAction as AlertAction)) {
      return [alertConfig.nextAction];
    }
    return [{
      type: 'notification',
      name: t('alertCard.defaultActionName'),
      riskLevel: 'medium',
      executionMode: 'manual',
      content: t('alertCard.defaultActionContent')
    }];
  }, [alertConfig?.actions, alertConfig?.nextAction, alertStatus?.actions, localActionExecuted, t]);

  const actions = pendingManualActions;

  const hasPendingManualActions = React.useMemo(() => {
    return actions.length > 0;
  }, [actions]);

  const pendingManualCount = React.useMemo(() => {
    return actions.length;
  }, [actions]);

  if (!alertConfig) {
    return <div className="flex items-center justify-center h-full text-muted-foreground">{t('alertCard.noConfig')}</div>;
  }

  const ackButtonText = hasPendingManualActions
    ? t('alertCard.confirmAndSend', { count: pendingManualCount })
    : t('alertCard.acknowledgeAlert');

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
           {alertConfig.priority && (
             <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-5", PRIORITY_COLOR[alertConfig.priority])}>
               {alertConfig.priority.toUpperCase()}
             </Badge>
           )}
        </div>
      </div>

      {/* Rule Condition Box - Shown when NOT triggered */}
      {!isTriggered && (
        <div className="bg-muted/40 p-3 rounded-md border border-border/40 text-xs mb-auto relative overflow-hidden group">
           <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary/50 group-hover:bg-primary transition-colors" />
           <div className="flex flex-col gap-1.5">
            {(alertConfig.conditions || []).map((cond: AlertCondition, idx: number) => {
              const metricLabel = cond.metricName || (cond as { field?: string }).field || cond.metricId || card.metricId;
              const operatorLabel = t(`alertCard.operators.${cond.operator}`, { defaultValue: cond.operator });
              return (
                <div key={idx} className="flex items-baseline gap-1.5 flex-wrap leading-relaxed">
                  {idx > 0 && (
                    <span className="font-semibold text-muted-foreground uppercase">
                      {alertConfig.conditionLogic === 'or' ? t('alertCard.logicOr') : t('alertCard.logicAnd')}
                    </span>
                  )}
                  <span>
                    {t(idx === 0 ? 'alertCard.conditionFirst' : 'alertCard.conditionNext', {
                      metric: metricLabel,
                      operator: operatorLabel,
                      value: cond.value,
                    })}
                  </span>
                </div>
              );
            })}
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
                        <span className="font-medium text-sm">{t('alertCard.acknowledged')}</span>
                        <span className="text-[10px] opacity-80">{t('alertCard.acknowledgedBy', { name: alertStatus?.acknowledgedBy || t('alertCard.fallbackUser') })}</span>
                     </div>
                 </div>
                 <Button variant="ghost" size="sm" onClick={() => setShowDetails(!showDetails)} className="h-7 text-xs px-2 hover:bg-emerald-500/20 hover:text-emerald-700">
                     {showDetails ? t('alertCard.hideDetails') : t('alertCard.showDetails')}
                 </Button>
             </div>
          ) : (
             <div className="flex items-center gap-2 px-1">
                <AlertTriangle className="w-4 h-4 text-destructive" />
                <span className="text-sm font-semibold text-destructive">{t('alertCard.triggered')}</span>
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
                           <Badge variant="destructive" className="text-[10px] h-4 px-1">{t('alertCard.triggeredBadge')}</Badge> : 
                           <Badge variant="outline" className="text-[10px] h-4 px-1">{t('alertCard.safe')}</Badge>
                         }
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-[10px] text-muted-foreground">
                         <div>{t('alertCard.currentValueLabel')}: <span className="font-mono text-foreground">{result.currentValue}</span></div>
                         <div>{t('alertCard.thresholdLabel')}: <span className="font-mono text-foreground">{result.operator} {result.value}</span></div>
                      </div>
                   </div>
                 ))}
               </div>
            )}

            {/* Pending Manual Actions Warning */}
            {hasPendingManualActions && (
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md p-2 text-xs">
                <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-medium">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{t('alertCard.pendingManual', { count: pendingManualCount })}</span>
                </div>
                <div className="text-[10px] text-amber-600 dark:text-amber-500 mt-0.5 ml-5">
                  {t('alertCard.pendingManualHint')}
                </div>
              </div>
            )}

            {/* Acknowledge Button */}
            {alertStatus && isTriggered && !isAcknowledged && (
              <div className="mb-2">
                <Button
                  size="sm"
                  variant={hasPendingManualActions ? "default" : "outline"}
                  className={cn(
                    "w-full h-7 text-xs gap-1.5",
                    hasPendingManualActions
                      ? "bg-amber-500 hover:bg-amber-600 text-white border-amber-500"
                      : "border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                  )}
                  onClick={() => onAcknowledge && onAcknowledge(alertStatus.id)}
                >
                  {hasPendingManualActions ? <Activity className="w-3.5 h-3.5" /> : null}
                  {ackButtonText}
                </Button>
              </div>
            )}
            
            {actions.map((action, idx) => (
              <div key={idx} className="bg-muted/30 border rounded-md p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", RISK_COLOR[action.riskLevel || 'low'])}>
                      {(action.riskLevel || 'low').toUpperCase()}
                    </Badge>
                    <span className="font-medium text-sm">{action.name || t('alertCard.suggestedAction')}</span>
                   </div>
                  <Badge variant="secondary" className="text-[10px]" title={action.type}>
                    {action.typeName || (action.type.length > 20 || (/^\d+$/.test(action.type) && action.type.length > 15) ? t('alertCard.actionFallback') : action.type)}
                  </Badge>
                </div>
                
                {action.content && (
                  <div className="bg-background/50 p-2 rounded border border-dashed space-y-1">
                    <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{t('alertCard.descriptionLabel')}</div>
                    <p className="text-xs text-muted-foreground">
                      {action.content}
                    </p>
                  </div>
                )}

                {action.parameters && Object.keys(action.parameters).length > 0 && (
                  <div className="bg-background/50 p-2 rounded border border-dashed space-y-1">
                     <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{t('alertCard.parameters')}</div>
                     <div className="grid gap-1">
                        {Object.entries(action.parameters).map(([key, value]) => {
                          const isSensitive = /password|secret|token|api_key|credential|auth|private_key/i.test(key);
                          const displayValue = isSensitive ? '••••••••' : (typeof value === 'object' ? JSON.stringify(value) : String(value ?? ''));
                          return (
                           <div key={key} className="flex text-[10px]">
                              <span className="text-muted-foreground w-24 shrink-0 truncate" title={key}>{key}</span>
                              <span className="font-mono text-foreground truncate flex-1" title={isSensitive ? '***' : (typeof value === 'object' ? JSON.stringify(value) : String(value))}>
                                {displayValue}
                              </span>
                           </div>
                          );
                        })}
                     </div>
                  </div>
                )}

                {action.expectedEffect && (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>{t('alertCard.expectedEffect', { effect: action.expectedEffect })}</span>
                  </div>
                )}

                {isManualExecutionAction(action) && (
                  <Button
                    size="sm"
                    className="w-full gap-2 mt-2"
                    variant={action.riskLevel === 'medium' ? "default" : "destructive"}
                    onClick={() => handleExecuteAction(idx)}
                    disabled={executingActionIdx === idx}
                  >
                    {executingActionIdx === idx ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <PlayCircle className="w-4 h-4" />
                    )}
                    {action.executionMode === 'approval' ? t('alertCard.requestExecution') : t('alertCard.executeManually')}
                  </Button>
                )}
              </div>
            ))}
            
            {actions.length === 0 && (
              <div className="text-center p-4 text-xs text-muted-foreground border border-dashed rounded-md">
                {t('alertCard.noActions')}
              </div>
            )}
          </div>
          )}
        </div>
      )}

      {/* ACK History Section - Always visible if data exists */}
      <div className="mt-2 empty:hidden">
        {loadingHistory ? (
          <div className="flex items-center justify-center py-4 text-xs text-muted-foreground bg-muted/5 rounded-md border border-dashed">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2" />
            {t('alertCard.loadingHistory')}
          </div>
        ) : ackStats && ackStats.total > 0 ? (
          <div className="border rounded-md bg-card overflow-hidden">
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-8 text-xs flex items-center justify-between px-3 hover:bg-muted/50 rounded-none border-b"
              onClick={() => setShowHistory(!showHistory)}
            >
              <div className="flex items-center gap-2">
                <BarChart3 className="h-3.5 w-3.5 text-primary" />
                <span className="font-medium">{t('alertCard.ackHistory')}</span>
                <Badge variant="secondary" className="h-4 px-1.5 text-[10px] bg-primary/10 text-primary border-none">{ackStats.total}</Badge>
              </div>
              {showHistory ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </Button>

            {showHistory && (
              <div className="p-3 space-y-3 animate-in slide-in-from-top-2 duration-200">
                {/* Statistics Summary */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    <span>{t('alertCard.statistics')}</span>
                    {ackStats.lastAcknowledgedAt && (
                      <span className="normal-case font-normal flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5" />
                        {formatDistanceToNow(new Date(ackStats.lastAcknowledgedAt), { addSuffix: true })}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(ackStats.byReason).filter(([, count]) => count > 0).map(([reason, count]) => (
                      <div key={reason} className="flex items-center justify-between bg-muted/30 p-1.5 rounded border border-border/50">
                        <span className="text-[10px] text-muted-foreground">{ackReasonLabel(reason)}</span>
                        <span className="text-[10px] font-bold">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent History List */}
                {ackHistory.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{t('alertCard.recentLogs')}</div>
                    <div className="space-y-1.5">
                      {ackHistory.slice(0, 3).map((item: AckHistoryItem, idx: number) => (
                        <div key={idx} className="flex flex-col gap-1 text-[10px] bg-muted/20 p-2 rounded border border-border/40">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <Badge variant="outline" className="h-4 px-1 text-[9px] capitalize border-emerald-500/30 text-emerald-600 bg-emerald-50/50">
                                {ackReasonLabel(item.acknowledgeReason)}
                              </Badge>
                              <span className="text-muted-foreground truncate max-w-[80px]" title={item.acknowledgedBy}>{item.acknowledgedBy}</span>
                            </div>
                            <span className="text-muted-foreground/70">
                              {formatDistanceToNow(new Date(item.acknowledgedAt), { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* Footer Stats */}
      <div className="flex items-center justify-between mt-auto pt-2 border-t">
        <div className="flex items-center gap-2">
          {isTriggered ? (
             isAcknowledged ? (
               <Badge variant="outline" className="px-2 py-0.5 text-[10px] font-medium text-emerald-600 bg-emerald-50 border-emerald-200">
                 {t('alertCard.resolved')}
               </Badge>
             ) : (
               <Badge variant="destructive" className="px-2 py-0.5 text-[10px] font-medium">
                 {t('alertCard.active')}
               </Badge>
             )
          ) : (
            <Badge variant="outline" className="px-2 py-0.5 text-[10px] font-medium text-muted-foreground bg-muted/50">
              {t('alertCard.normal')}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
});
