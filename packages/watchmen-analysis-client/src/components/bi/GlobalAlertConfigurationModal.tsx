import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Play, Save, Plus, Trash2, GripVertical, Activity, Beaker, Lightbulb, Zap, Mail, Webhook, Bell, Workflow, CheckCircle2, XCircle, AlertTriangle, Check, ChevronsUpDown, Target } from 'lucide-react';
import { GlobalAlertRule, AlertCondition, AlertAction } from '@/model/biAnalysis';
import { metricsService } from '@/services/metricsService';
import { actionTypeService } from '@/services/actionTypeService';
import { suggestedActionService } from '@/services/suggestedActionService';
import { MetricType } from '@/model/Metric';
import { ActionType, SuggestedAction } from '@/model/suggestedAction';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface GlobalAlertConfigurationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule: GlobalAlertRule | null;
  onSave: (updatedRule: GlobalAlertRule) => void;
}

interface MetricSelectorProps {
  value: string;
  onChange: (value: string) => void;
  metrics: MetricType[];
}

const MetricSelector: React.FC<MetricSelectorProps> = ({ value, onChange, metrics }) => {
  const { t } = useTranslation('alertConfig');
  const [open, setOpen] = useState(false);
  // Match by name since AlertCondition.metricId stores metric name (not database ID)
  const selectedMetric = metrics.find(m => m.name === value || m.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {selectedMetric ? selectedMetric.name : t('globalRules.selectMetric')}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder={t('common:search')} />
          <CommandList>
            <CommandEmpty>{t('globalRules.noMetricFound')}</CommandEmpty>
            <CommandGroup>
              {metrics.map((metric) => (
                <CommandItem
                  key={metric.id}
                  value={metric.name}
                  onSelect={() => {
                    onChange(metric.name);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      (value === metric.name || value === metric.id) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {metric.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export const GlobalAlertConfigurationModal: React.FC<GlobalAlertConfigurationModalProps> = ({
  open,
  onOpenChange,
  rule,
  onSave
}) => {
  const { t } = useTranslation(['common', 'alertConfig']);
  const [activeTab, setActiveTab] = useState("config");
  const [metrics, setMetrics] = useState<MetricType[]>([]);
  const [actionTypes, setActionTypes] = useState<ActionType[]>([]);
  const [suggestedActions, setSuggestedActions] = useState<SuggestedAction[]>([]);
  const [testResult, setTestResult] = useState<{ triggered: boolean; message: string } | null>(null);
  const [testValue, setTestValue] = useState<string>('0');
  const [config, setConfig] = useState<GlobalAlertRule>({
    id: '',
    enabled: true,
    nextAction: { type: 'notification' },
    actions: [],
    conditions: [],
    conditionLogic: 'and',
    name: '',
    priority: 'medium',
    description: ''
  });

  // Fetch dictionary data lazily — the modal stays mounted on the page, so only
  // load metrics/action types/suggested actions the first time it is opened.
  const dictionariesLoadedRef = React.useRef(false);
  useEffect(() => {
    if (!open || dictionariesLoadedRef.current) return;
    dictionariesLoadedRef.current = true;
    const fetchMetrics = async () => {
      try {
        const [metricsData, actionTypesData, suggestedActionsData] = await Promise.all([
          metricsService.getMetrics(),
          actionTypeService.getActionTypes(),
          suggestedActionService.getSuggestedActions()
        ]);
        setMetrics(metricsData);
        setActionTypes(actionTypesData);
        setSuggestedActions(suggestedActionsData);
      } catch (error) {
        console.error("Failed to fetch data", error);
      }
    };
    fetchMetrics();
  }, [open]);

  useEffect(() => {
    if (open) {
      if (rule) {
        // Editing existing rule
        const initialConfig = {
          ...rule,
          conditions: rule.conditions || [{
            metricId: '',
            metricName: '',
            operator: '>',
            value: 0
          }],
          actions: rule.actions || (rule.nextAction ? [rule.nextAction] : []),
          nextAction: rule.nextAction || { type: 'notification' }
        };
        setConfig(initialConfig);
      } else {
        // Creating new rule
        setConfig({
          id: '',
          enabled: true,
          nextAction: { type: 'notification' },
          actions: [],
          conditions: [{ metricId: '', metricName: '', operator: '>', value: 0 }],
          conditionLogic: 'and',
          name: '',
          priority: 'medium',
          description: ''
        });
      }
      setTestResult(null);
    }
  }, [open, rule]);

  const handleAddAction = () => {
    setConfig(prev => ({
      ...prev,
      actions: [
        ...(prev.actions || []),
        { type: 'notification', riskLevel: 'medium', name: '', content: '', expectedEffect: '' }
      ]
    }));
  };

  const handleRemoveAction = (index: number) => {
    setConfig(prev => ({
      ...prev,
      actions: prev.actions?.filter((_, i) => i !== index)
    }));
  };

  const handleActionChange = (index: number, field: keyof AlertAction, value: AlertAction[keyof AlertAction]) => {
    setConfig(prev => {
      const newActions = [...(prev.actions || [])];
      newActions[index] = { ...newActions[index], [field]: value };
      return { ...prev, actions: newActions };
    });
  };

  const handleAddCondition = () => {
    setConfig(prev => ({
      ...prev,
      conditions: [
        ...(prev.conditions || []),
        { metricId: '', metricName: '', operator: '>', value: 0 }
      ]
    }));
  };

  const handleRemoveCondition = (index: number) => {
    setConfig(prev => ({
      ...prev,
      conditions: prev.conditions?.filter((_, i) => i !== index)
    }));
  };

  const handleConditionChange = (index: number, field: keyof AlertCondition, value: AlertCondition[keyof AlertCondition]) => {
    setConfig(prev => {
      const newConditions = [...(prev.conditions || [])];
      newConditions[index] = { ...newConditions[index], [field]: value };
      
      return {
        ...prev,
        conditions: newConditions
      };
    });
  };

  const handleSave = () => {
    // Ensure metricId is set for compatibility, using the first condition's metric if available
    const updatedConfig = {
      ...config
    };
    onSave(updatedConfig);
    onOpenChange(false);
  };

  const runTest = () => {
    const evaluate = (c: { operator: string; value: number | string }) => {
      const val = Number(testValue);
      const limit = Number(c.value);
      switch (c.operator) {
        case '>': return val > limit;
        case '<': return val < limit;
        case '>=': return val >= limit;
        case '<=': return val <= limit;
        case '==': return val === limit;
        case '!=': return val !== limit;
        default: return false;
      }
    };
    const conditions = config.conditions || [];
    const isTriggered = conditions.length > 0
      ? (config.conditionLogic === 'or' ? conditions.some(evaluate) : conditions.every(evaluate))
      : false;

    setTestResult({
      triggered: isTriggered,
      message: isTriggered
        ? t('alertConfig:globalRules.triggeredMessage', { value: testValue })
        : t('alertConfig:globalRules.notTriggeredMessage', { value: testValue })
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{rule ? t('alertConfig:globalRules.editTitle') : t('alertConfig:globalRules.createTitle')}</DialogTitle>
          <DialogDescription>
            {t('alertConfig:globalRules.subtitle')}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="config">
              <Activity className="w-4 h-4 mr-2" />
              {t('alertConfig:globalRules.configTab')}
            </TabsTrigger>
            <TabsTrigger value="test">
              <Beaker className="w-4 h-4 mr-2" />
              {t('alertConfig:globalRules.testTab')}
            </TabsTrigger>
            <TabsTrigger value="action">
              <Zap className="w-4 h-4 mr-2" />
              {t('alertConfig:globalRules.actionTab')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="config" className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('alertConfig:globalRules.ruleName')}</Label>
                <Input 
                  value={config.name} 
                  onChange={(e) => setConfig({...config, name: e.target.value})}
                  placeholder={t('alertConfig:globalRules.ruleNamePlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('alertConfig:globalRules.priority')}</Label>
                <Select 
                  value={config.priority} 
                  onValueChange={(val: GlobalAlertRule['priority']) => setConfig({...config, priority: val})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">{t('alertConfig:suggestedActions.lowRisk')}</SelectItem>
                    <SelectItem value="medium">{t('alertConfig:suggestedActions.mediumRisk')}</SelectItem>
                    <SelectItem value="high">{t('alertConfig:suggestedActions.highRisk')}</SelectItem>
                    <SelectItem value="critical">{t('alertConfig:suggestedActions.criticalRisk')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('alertConfig:globalRules.descriptionLabel')}</Label>
              <Textarea 
                value={config.description} 
                onChange={(e) => setConfig({...config, description: e.target.value})}
                placeholder={t('alertConfig:globalRules.descriptionPlaceholder')}
              />
            </div>

            <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">{t('alertConfig:globalRules.triggerConditions')}</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{t('alertConfig:globalRules.logicLabel')}</span>
                  <Select 
                    value={config.conditionLogic} 
                    onValueChange={(val: GlobalAlertRule['conditionLogic']) => setConfig({...config, conditionLogic: val})}
                  >
                    <SelectTrigger className="w-24 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="and">AND</SelectItem>
                      <SelectItem value="or">OR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {config.conditions?.map((condition, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-background rounded border">
                  <GripVertical className="w-4 h-4 text-muted-foreground cursor-move" />
                  <div className="flex-1 grid grid-cols-3 gap-2">
                    <MetricSelector
                      value={condition.metricId || ''}
                      onChange={(val) => {
                        // Store metric name in metricId (backend expects name, not database ID)
                        handleConditionChange(index, 'metricId', val);
                        handleConditionChange(index, 'metricName', val);
                      }}
                      metrics={metrics}
                    />
                    <Select 
                      value={condition.operator} 
                      onValueChange={(val: AlertCondition['operator']) => handleConditionChange(index, 'operator', val)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value=">">{t('alertConfig:globalRules.operatorOptions.gt')}</SelectItem>
                        <SelectItem value="<">{t('alertConfig:globalRules.operatorOptions.lt')}</SelectItem>
                        <SelectItem value=">=">{t('alertConfig:globalRules.operatorOptions.gte')}</SelectItem>
                        <SelectItem value="<=">{t('alertConfig:globalRules.operatorOptions.lte')}</SelectItem>
                        <SelectItem value="==">{t('alertConfig:globalRules.operatorOptions.eq')}</SelectItem>
                        <SelectItem value="!=">{t('alertConfig:globalRules.operatorOptions.ne')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="text"
                      value={condition.value}
                      onChange={(e) => handleConditionChange(index, 'value', e.target.value)}
                      placeholder={t('alertConfig:globalRules.thresholdPlaceholder')}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCondition();
                        }
                      }}
                    />
                  </div>
                  <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveCondition(index)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))}

              <Button type="button" variant="outline" size="sm" onClick={handleAddCondition} className="w-full">
                <Plus className="w-4 h-4 mr-2" /> {t('alertConfig:globalRules.addCondition')}
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-0.5">
                <Label>{t('alertConfig:globalRules.ruleStatus')}</Label>
                <p className="text-sm text-muted-foreground">{t('alertConfig:globalRules.ruleStatusHint')}</p>
              </div>
              <Switch 
                checked={config.enabled}
                onCheckedChange={(checked) => setConfig({...config, enabled: checked})}
              />
            </div>
          </TabsContent>

          <TabsContent value="test" className="py-4 space-y-4">
            <div className="p-4 border rounded-lg bg-muted/30">
              <h3 className="font-medium mb-4 flex items-center">
                <Beaker className="w-4 h-4 mr-2" />
                {t('alertConfig:globalRules.testTitle')}
              </h3>
              <div className="flex items-end gap-4">
                <div className="flex-1 space-y-2">
                  <Label>{t('alertConfig:globalRules.simulateValue')}</Label>
                  <Input
                    type="text"
                    value={testValue}
                    onChange={(e) => setTestValue(e.target.value)}
                    placeholder={t('alertConfig:globalRules.simulatePlaceholder')}
                  />
                </div>
                <Button onClick={runTest}>
                  <Play className="w-4 h-4 mr-2" />
                  {t('alertConfig:globalRules.runTest')}
                </Button>
              </div>
            </div>

            {testResult && (
              <div className={cn(
                "p-4 rounded-lg flex items-start gap-3",
                testResult.triggered ? "bg-red-50 text-red-900 border border-red-200" : "bg-green-50 text-green-900 border border-green-200"
              )}>
                {testResult.triggered ? (
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                )}
                <div>
                  <p className="font-medium">{testResult.triggered ? t('alertConfig:globalRules.triggeredResult') : t('alertConfig:globalRules.notTriggeredResult')}</p>
                  <p className="text-sm opacity-90">{testResult.message}</p>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="action" className="py-4 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium flex items-center">
                <Target className="w-5 h-5 mr-2 text-primary" />
                {t('alertConfig:globalRules.suggestedActionConfig')}
              </h3>
              <Button onClick={handleAddAction} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                {t('alertConfig:globalRules.addAction')}
              </Button>
            </div>

            {config.actions?.map((action, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-4 bg-muted/10 relative">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="bg-primary/10 p-2 rounded-full">
                          <Bell className="w-4 h-4 text-primary" />
                      </div>
                      <span className="font-medium bg-secondary px-2 py-1 rounded text-sm">{t('alertConfig:globalRules.actionIndex', { index: index + 1 })}</span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleRemoveAction(index)} className="absolute top-4 right-4">
                      <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                    </Button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('alertConfig:globalRules.suggestedAction')}</Label>
                    <Select 
                      value={action.suggestedActionId} 
                      onValueChange={(val: string) => {
                        const selectedAction = suggestedActions.find(sa => sa.id === val);
                        if (selectedAction) {
                            const actionType = actionTypes.find(t => t.id === selectedAction.typeId);
                            setConfig(prev => {
                                const newActions = [...(prev.actions || [])];
                                newActions[index] = {
                                    ...newActions[index],
                                    suggestedActionId: selectedAction.id,
                                    type: selectedAction.typeId,
                                    typeName: actionType?.name,
                                    name: selectedAction.name,
                                    executionMode: selectedAction.executionMode,
                                    riskLevel: selectedAction.riskLevel,
                                    content: selectedAction.description,
                                    expectedEffect: selectedAction.expectedOutcome,
                                    parameters: selectedAction.parameters
                                };
                                return { ...prev, actions: newActions };
                            });
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('alertConfig:globalRules.selectSuggestedAction')} />
                      </SelectTrigger>
                      <SelectContent>
                        {(suggestedActions || []).map(sa => {
                          const type = actionTypes.find(t => t.id === sa.typeId);
                          return (
                            <SelectItem key={sa.id} value={sa.id}>
                                <div className="flex items-center">
                                {type?.code === 'notification' ? <Bell className="w-4 h-4 mr-2"/> : 
                                type?.code === 'email' ? <Mail className="w-4 h-4 mr-2"/> :
                                type?.code === 'webhook' ? <Webhook className="w-4 h-4 mr-2"/> :
                                <Zap className="w-4 h-4 mr-2"/>}
                                {sa.name}
                                </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>{t('alertConfig:globalRules.riskLevel')}</Label>
                    <Select 
                      value={action.riskLevel || 'medium'} 
                      onValueChange={(val: AlertAction['riskLevel']) => handleActionChange(index, 'riskLevel', val)}
                    >
                      <SelectTrigger>
                          <div className={cn("px-2 py-0.5 rounded text-xs font-medium", 
                            action.riskLevel === 'low' ? "bg-green-100 text-green-700" :
                            action.riskLevel === 'medium' ? "bg-yellow-100 text-yellow-700" :
                            action.riskLevel === 'high' ? "bg-orange-100 text-orange-700" :
                            "bg-red-100 text-red-700"
                          )}>
                            {action.riskLevel === 'low' ? t('alertConfig:suggestedActions.lowRisk') : 
                            action.riskLevel === 'medium' ? t('alertConfig:suggestedActions.mediumRisk') :
                            action.riskLevel === 'high' ? t('alertConfig:suggestedActions.highRisk') : t('alertConfig:suggestedActions.criticalRisk')}
                          </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">{t('alertConfig:suggestedActions.lowRisk')}</SelectItem>
                        <SelectItem value="medium">{t('alertConfig:suggestedActions.mediumRisk')}</SelectItem>
                        <SelectItem value="high">{t('alertConfig:suggestedActions.highRisk')}</SelectItem>
                        <SelectItem value="critical">{t('alertConfig:suggestedActions.criticalRisk')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{t('alertConfig:globalRules.actionName')}</Label>
                  <Input 
                    value={action.name || ''} 
                    onChange={(e) => handleActionChange(index, 'name', e.target.value)}
                    placeholder={t('alertConfig:globalRules.actionNamePlaceholder')}
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t('alertConfig:globalRules.executionContent')}</Label>
                  <Textarea 
                    value={action.content || ''} 
                    onChange={(e) => handleActionChange(index, 'content', e.target.value)}
                    placeholder={t('alertConfig:globalRules.executionContentPlaceholder')}
                    className="min-h-[80px]"
                  />
                </div>

                <div className="space-y-2">
                    <Label className="flex items-center text-primary">
                      <Activity className="w-4 h-4 mr-2" />
                      {t('alertConfig:globalRules.expectedEffect')}
                    </Label>
                    <Input 
                      value={action.expectedEffect || ''} 
                      onChange={(e) => handleActionChange(index, 'expectedEffect', e.target.value)}
                      placeholder={t('alertConfig:globalRules.expectedEffectPlaceholder')}
                    />
                </div>
              </div>
            ))}
            
            {(!config.actions || config.actions.length === 0) && (
              <div className="text-center py-8 text-muted-foreground border rounded-lg border-dashed">
                {t('alertConfig:globalRules.noActions')}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('common:cancel')}</Button>
          <Button onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" />
            {t('alertConfig:globalRules.saveRule')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
