import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Play, Save, Plus, Trash2, GripVertical, Activity, Beaker, Lightbulb, Zap, Mail, Webhook, Bell, Workflow, CheckCircle2, XCircle, AlertTriangle, Check, ChevronsUpDown, Target, Layers } from 'lucide-react';
import { GlobalAlertRule, AlertCondition, AlertAction } from '@/model/biAnalysis';
import { metricsService } from '@/services/metricsService';
import { MetricType } from '@/model/Metric';
import { cn } from '@/lib/utils';

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
  const [open, setOpen] = useState(false);
  const selectedMetric = metrics.find(m => m.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {selectedMetric ? selectedMetric.name : "Select Metric..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search metric..." />
          <CommandList>
            <CommandEmpty>No metric found.</CommandEmpty>
            <CommandGroup>
              {metrics.map((metric) => (
                <CommandItem
                  key={metric.id}
                  value={metric.name}
                  onSelect={() => {
                    onChange(metric.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === metric.id ? "opacity-100" : "opacity-0"
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
  const [activeTab, setActiveTab] = useState("config");
  const [metrics, setMetrics] = useState<MetricType[]>([]);
  const [testResult, setTestResult] = useState<{ triggered: boolean; message: string } | null>(null);
  const [testValue, setTestValue] = useState<number>(0);
  const [config, setConfig] = useState<GlobalAlertRule>({
    id: '',
    enabled: true,
    condition: { operator: '>', value: 0 },
    nextAction: { type: 'notification' },
    actions: [],
    conditions: [],
    conditionLogic: 'and',
    name: '',
    priority: 'medium',
    description: ''
  });

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const data = await metricsService.getMetrics();
        setMetrics(data);
      } catch (error) {
        console.error("Failed to fetch metrics", error);
      }
    };
    fetchMetrics();
  }, []);

  useEffect(() => {
    if (open) {
      if (rule) {
        // Editing existing rule
        const initialConfig = {
          ...rule,
          conditions: rule.conditions || [{
            metricId: '',
            operator: rule.condition.operator,
            value: rule.condition.value
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
          condition: { operator: '>', value: 0 },
          nextAction: { type: 'notification' },
          actions: [],
          conditions: [{ metricId: '', operator: '>', value: 0 }],
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

  const handleActionChange = (index: number, field: keyof AlertAction, value: any) => {
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
        { metricId: '', operator: '>', value: 0 }
      ]
    }));
  };

  const handleRemoveCondition = (index: number) => {
    setConfig(prev => ({
      ...prev,
      conditions: prev.conditions?.filter((_, i) => i !== index)
    }));
  };

  const handleConditionChange = (index: number, field: keyof AlertCondition, value: any) => {
    setConfig(prev => {
      const newConditions = [...(prev.conditions || [])];
      newConditions[index] = { ...newConditions[index], [field]: value };
      
      // Sync legacy condition if it's the first one
      let legacyCondition = prev.condition;
      if (index === 0) {
        if (field === 'operator') legacyCondition = { ...legacyCondition, operator: value };
        if (field === 'value') legacyCondition = { ...legacyCondition, value: Number(value) };
      }

      return {
        ...prev,
        conditions: newConditions,
        condition: legacyCondition
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
    // Simulate test logic
    const isTriggered = config.conditions?.every(c => {
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
    }) ?? false;

    setTestResult({
      triggered: isTriggered,
      message: isTriggered 
        ? `Alert triggered! Value ${testValue} meets all conditions.` 
        : `Alert not triggered. Value ${testValue} does not meet conditions.`
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{rule ? 'Edit Alert Rule' : 'Create Alert Rule'}</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="config">
              <Activity className="w-4 h-4 mr-2" />
              Rule Configuration
            </TabsTrigger>
            <TabsTrigger value="test">
              <Beaker className="w-4 h-4 mr-2" />
              Test Rule
            </TabsTrigger>
            <TabsTrigger value="action">
              <Zap className="w-4 h-4 mr-2" />
              Action & Delivery
            </TabsTrigger>
          </TabsList>

          <TabsContent value="config" className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Rule Name</Label>
                <Input 
                  value={config.name} 
                  onChange={(e) => setConfig({...config, name: e.target.value})}
                  placeholder="e.g. High Revenue Alert"
                />
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select 
                  value={config.priority} 
                  onValueChange={(val: any) => setConfig({...config, priority: val})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea 
                value={config.description} 
                onChange={(e) => setConfig({...config, description: e.target.value})}
                placeholder="Describe the purpose of this alert rule..."
              />
            </div>

            <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Trigger Conditions</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Logic:</span>
                  <Select 
                    value={config.conditionLogic} 
                    onValueChange={(val: any) => setConfig({...config, conditionLogic: val})}
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
                        handleConditionChange(index, 'metricId', val);
                        const m = metrics.find(x => x.id === val);
                        if (m) handleConditionChange(index, 'metricName', m.name);
                      }}
                      metrics={metrics}
                    />
                    <Select 
                      value={condition.operator} 
                      onValueChange={(val: any) => handleConditionChange(index, 'operator', val)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value=">">&gt; Greater than</SelectItem>
                        <SelectItem value="<">&lt; Less than</SelectItem>
                        <SelectItem value=">=">&ge; Greater or equal</SelectItem>
                        <SelectItem value="<=">&le; Less or equal</SelectItem>
                        <SelectItem value="==">= Equals</SelectItem>
                        <SelectItem value="!=">&ne; Not equals</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input 
                      type="number" 
                      value={condition.value} 
                      onChange={(e) => handleConditionChange(index, 'value', e.target.value)}
                    />
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleRemoveCondition(index)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))}

              <Button variant="outline" size="sm" onClick={handleAddCondition} className="w-full">
                <Plus className="w-4 h-4 mr-2" /> Add Condition
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-0.5">
                <Label>Rule Status</Label>
                <p className="text-sm text-muted-foreground">Enable or disable this alert rule</p>
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
                Test Configuration
              </h3>
              <div className="flex items-end gap-4">
                <div className="flex-1 space-y-2">
                  <Label>Simulate Metric Value</Label>
                  <Input 
                    type="number" 
                    value={testValue}
                    onChange={(e) => setTestValue(Number(e.target.value))}
                    placeholder="Enter a value to test..."
                  />
                </div>
                <Button onClick={runTest}>
                  <Play className="w-4 h-4 mr-2" />
                  Run Test
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
                  <p className="font-medium">{testResult.triggered ? "Alert Triggered" : "No Alert Triggered"}</p>
                  <p className="text-sm opacity-90">{testResult.message}</p>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="action" className="py-4 space-y-4">
            <Tabs defaultValue="config" className="w-full">
              <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent gap-2">
                <TabsTrigger 
                  value="config" 
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-t-md px-4 py-2 border border-b-0"
                >
                  <Target className="w-4 h-4 mr-2" />
                  Suggested Action Config
                </TabsTrigger>
                <TabsTrigger 
                  value="types"
                  className="data-[state=active]:bg-muted rounded-t-md px-4 py-2 border border-b-0"
                >
                  <Layers className="w-4 h-4 mr-2" />
                  Action Type Management
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="config" className="pt-4 space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium flex items-center">
                    <Target className="w-5 h-5 mr-2 text-primary" />
                    Suggested Action Config
                  </h3>
                  <Button onClick={handleAddAction} size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Action
                  </Button>
                </div>

                {config.actions?.map((action, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-4 bg-muted/10 relative">
                    <div className="flex justify-between items-center">
                       <div className="flex items-center gap-2">
                          <div className="bg-primary/10 p-2 rounded-full">
                             <Bell className="w-4 h-4 text-primary" />
                          </div>
                          <span className="font-medium bg-secondary px-2 py-1 rounded text-sm">Action #{index + 1}</span>
                       </div>
                       <Button variant="ghost" size="icon" onClick={() => handleRemoveAction(index)} className="absolute top-4 right-4">
                         <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                       </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Action Type</Label>
                        <Select 
                          value={action.type} 
                          onValueChange={(val: any) => handleActionChange(index, 'type', val)}
                        >
                          <SelectTrigger>
                             {action.type === 'notification' && <Bell className="w-4 h-4 mr-2" />}
                             {action.type === 'email' && <Mail className="w-4 h-4 mr-2" />}
                             {action.type === 'webhook' && <Webhook className="w-4 h-4 mr-2" />}
                             {action.type === 'process' && <Workflow className="w-4 h-4 mr-2" />}
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="notification">
                              <div className="flex items-center"><Bell className="w-4 h-4 mr-2"/> Notification</div>
                            </SelectItem>
                            <SelectItem value="email">
                              <div className="flex items-center"><Mail className="w-4 h-4 mr-2"/> Email</div>
                            </SelectItem>
                            <SelectItem value="webhook">
                              <div className="flex items-center"><Webhook className="w-4 h-4 mr-2"/> Webhook</div>
                            </SelectItem>
                            <SelectItem value="process">
                              <div className="flex items-center"><Workflow className="w-4 h-4 mr-2"/> Process</div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Risk Level</Label>
                        <Select 
                          value={action.riskLevel || 'medium'} 
                          onValueChange={(val: any) => handleActionChange(index, 'riskLevel', val)}
                        >
                          <SelectTrigger>
                             <div className={cn("px-2 py-0.5 rounded text-xs font-medium", 
                                action.riskLevel === 'low' ? "bg-green-100 text-green-700" :
                                action.riskLevel === 'medium' ? "bg-yellow-100 text-yellow-700" :
                                action.riskLevel === 'high' ? "bg-orange-100 text-orange-700" :
                                "bg-red-100 text-red-700"
                             )}>
                               {action.riskLevel === 'low' ? 'Low Risk' : 
                                action.riskLevel === 'medium' ? 'Medium Risk' :
                                action.riskLevel === 'high' ? 'High Risk' : 'Critical Risk'}
                             </div>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low Risk</SelectItem>
                            <SelectItem value="medium">Medium Risk</SelectItem>
                            <SelectItem value="high">High Risk</SelectItem>
                            <SelectItem value="critical">Critical Risk</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Action Name</Label>
                      <Input 
                        value={action.name || ''} 
                        onChange={(e) => handleActionChange(index, 'name', e.target.value)}
                        placeholder="e.g. Send High Payment Warning"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Execution Content</Label>
                      <Textarea 
                        value={action.content || ''} 
                        onChange={(e) => handleActionChange(index, 'content', e.target.value)}
                        placeholder="Describe what this action will do..."
                        className="min-h-[80px]"
                      />
                    </div>

                    <div className="space-y-2">
                       <Label className="flex items-center text-primary">
                          <Activity className="w-4 h-4 mr-2" />
                          Expected Effect
                       </Label>
                       <Input 
                         value={action.expectedEffect || ''} 
                         onChange={(e) => handleActionChange(index, 'expectedEffect', e.target.value)}
                         placeholder="e.g. Alert 24h in advance, reduce loss by 15%"
                       />
                    </div>
                  </div>
                ))}
                
                {(!config.actions || config.actions.length === 0) && (
                  <div className="text-center py-8 text-muted-foreground border rounded-lg border-dashed">
                    No actions configured. Click "Add Action" to start.
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="types">
                 <div className="text-center py-12 text-muted-foreground">
                   Action Type Management coming soon...
                 </div>
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" />
            Save Rule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
