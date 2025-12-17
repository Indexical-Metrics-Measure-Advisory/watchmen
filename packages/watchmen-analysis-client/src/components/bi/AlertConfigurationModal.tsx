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
import { Play, Save, Plus, Trash2, GripVertical, Activity, Beaker, Lightbulb, Zap, Mail, Webhook, Bell, Workflow, CheckCircle2, XCircle, Check, ChevronsUpDown, Target, Layers } from 'lucide-react';
import { BIChartCard, AlertConfig, AlertCondition, AlertAction } from '@/model/biAnalysis';
import { metricsService } from '@/services/metricsService';
import { MetricType } from '@/model/Metric';
import { cn } from '@/lib/utils';

interface AlertConfigurationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card: BIChartCard;
  onSave: (updatedCard: BIChartCard) => void;
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

export const AlertConfigurationModal: React.FC<AlertConfigurationModalProps> = ({
  open,
  onOpenChange,
  card,
  onSave
}) => {
  const [activeTab, setActiveTab] = useState("config");
  const [metrics, setMetrics] = useState<MetricType[]>([]);
  const [testResult, setTestResult] = useState<{ triggered: boolean; message: string } | null>(null);
  const [testValue, setTestValue] = useState<number>(0);
  const [config, setConfig] = useState<AlertConfig>({
    enabled: true,
    condition: { operator: '>', value: 0 },
    nextAction: { type: 'notification' },
    conditions: [],
    conditionLogic: 'and',
    name: '',
    priority: 'medium',
    description: '',
    ...card.alert
  });

  // Initialize conditions if empty but legacy condition exists
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
      const initialConfig = {
        enabled: true,
        condition: { operator: '>', value: 0 },
        nextAction: { type: 'notification' },
        conditionLogic: 'and',
        name: card.title || '',
        priority: 'medium',
        description: '',
        ...card.alert,
        actions: card.alert?.actions || (card.alert?.nextAction ? [card.alert.nextAction] : [])
      } as AlertConfig;

      if (!initialConfig.conditions || initialConfig.conditions.length === 0) {
        initialConfig.conditions = [{
          metricId: card.metricId,
          metricName: card.title || card.metricId,
          operator: initialConfig.condition.operator,
          value: initialConfig.condition.value
        }];
      }

      if (!initialConfig.nextAction) {
        initialConfig.nextAction = { type: 'notification' };
      }
      
      if (!initialConfig.actions) {
        initialConfig.actions = [];
      }

      setConfig(initialConfig);
      setTestResult(null);
    }
  }, [open, card]);

  const handleAddCondition = () => {
    setConfig(prev => ({
      ...prev,
      conditions: [
        ...(prev.conditions || []),
        { metricId: card.metricId, metricName: card.title || card.metricId, operator: '>', value: 0 }
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

      return { ...prev, conditions: newConditions, condition: legacyCondition };
    });
  };

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

  const runTest = () => {
    // Simple simulation logic
    let triggered = false;
    const logic = config.conditionLogic || 'and';
    
    if (config.conditions && config.conditions.length > 0) {
      const results = config.conditions.map(cond => {
        const val = Number(cond.value);
        switch (cond.operator) {
          case '>': return testValue > val;
          case '<': return testValue < val;
          case '>=': return testValue >= val;
          case '<=': return testValue <= val;
          case '==': return testValue === val;
          case '!=': return testValue !== val;
          default: return false;
        }
      });
      
      if (logic === 'and') {
        triggered = results.every(r => r);
      } else {
        triggered = results.some(r => r);
      }
    } else {
      // Fallback to legacy
      const val = Number(config.condition.value);
      switch (config.condition.operator) {
        case '>': triggered = testValue > val; break;
        case '<': triggered = testValue < val; break;
        case '>=': triggered = testValue >= val; break;
        case '<=': triggered = testValue <= val; break;
        case '==': triggered = testValue === val; break;
        case '!=': triggered = testValue !== val; break;
      }
    }

    setTestResult({
      triggered,
      message: triggered 
        ? `Rule triggered! The value ${testValue} meets the conditions.` 
        : `Rule did not trigger. The value ${testValue} does not meet the conditions.`
    });
    setActiveTab('test');
  };

  const handleSave = () => {
    const updatedCard = {
      ...card,
      alert: config
    };
    onSave(updatedCard);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 gap-0 bg-background border-border shadow-2xl">
        <div className="p-1">
          <Tabs defaultValue="config" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <TabsList className="grid w-[400px] grid-cols-3 bg-muted/50">
                <TabsTrigger value="config" className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <Activity className="w-4 h-4" />
                  Rule Config
                </TabsTrigger>
                <TabsTrigger value="test" className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <Beaker className="w-4 h-4" />
                  Rule Test
                </TabsTrigger>
                <TabsTrigger value="action" className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <Lightbulb className="w-4 h-4" />
                  Suggested Action
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="p-6 space-y-6">
              <TabsContent value="config" className="space-y-6 mt-0">
                
                {/* Rule Basic Info */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="rule-name">Rule Name</Label>
                    <Input 
                      id="rule-name" 
                      placeholder="Enter rule name" 
                      value={config.name} 
                      onChange={(e) => setConfig({...config, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority</Label>
                    <Select 
                      value={config.priority} 
                      onValueChange={(val: any) => setConfig({...config, priority: val})}
                    >
                      <SelectTrigger id="priority">
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">High Priority</SelectItem>
                        <SelectItem value="medium">Medium Priority</SelectItem>
                        <SelectItem value="low">Low Priority</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Rule Description</Label>
                  <Textarea 
                    id="description" 
                    placeholder="Describe the purpose and trigger scenario of this rule..." 
                    className="min-h-[80px] resize-none"
                    value={config.description}
                    onChange={(e) => setConfig({...config, description: e.target.value})}
                  />
                </div>

                {/* Trigger Conditions */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Label>Trigger Conditions</Label>
                      <Select 
                        value={config.conditionLogic} 
                        onValueChange={(val: any) => setConfig({...config, conditionLogic: val})}
                      >
                        <SelectTrigger className="w-[140px] h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="and">All met (AND)</SelectItem>
                          <SelectItem value="or">Any met (OR)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleAddCondition} className="h-8">
                      <Plus className="w-3.5 h-3.5 mr-1.5" />
                      Add Condition
                    </Button>
                  </div>

                  <div className="bg-muted/30 rounded-lg p-4 space-y-3 border border-border/50">
                    {config.conditions?.map((cond, index) => (
                      <div key={index} className="flex items-center gap-3 group">
                        {index > 0 && (
                          <div className="shrink-0 w-[50px] flex justify-center">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase bg-muted px-1.5 py-0.5 rounded">
                              {config.conditionLogic}
                            </span>
                          </div>
                        )}
                        <div className="flex-1 grid grid-cols-12 gap-3 items-center">
                           <div className="col-span-1 flex justify-center cursor-move text-muted-foreground/50 hover:text-foreground">
                             <GripVertical className="w-4 h-4" />
                           </div>
                           <div className="col-span-4">
                             <MetricSelector
                               value={cond.metricId || card.metricId}
                               onChange={(val) => {
                                 handleConditionChange(index, 'metricId', val);
                                 const m = metrics.find(x => x.id === val);
                                 if (m) handleConditionChange(index, 'metricName', m.name);
                               }}
                               metrics={metrics}
                             />
                           </div>
                           <div className="col-span-3">
                             <Select 
                               value={cond.operator} 
                               onValueChange={(val) => handleConditionChange(index, 'operator', val)}
                             >
                               <SelectTrigger>
                                 <SelectValue />
                               </SelectTrigger>
                               <SelectContent>
                                 <SelectItem value=">">Greater than {'>'}</SelectItem>
                                 <SelectItem value="<">Less than {'<'}</SelectItem>
                                 <SelectItem value=">=">Greater/Equal {'>='}</SelectItem>
                                 <SelectItem value="<=">Less/Equal {'<='}</SelectItem>
                                 <SelectItem value="==">Equals {'=='}</SelectItem>
                                 <SelectItem value="!=">Not Equals {'!='}</SelectItem>
                               </SelectContent>
                             </Select>
                           </div>
                           <div className="col-span-3">
                             <Input 
                               type="number" 
                               value={cond.value} 
                               onChange={(e) => handleConditionChange(index, 'value', e.target.value)}
                             />
                           </div>
                           <div className="col-span-1 flex justify-end">
                             <Button 
                               variant="ghost" 
                               size="icon" 
                               className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                               onClick={() => handleRemoveCondition(index)}
                             >
                               <Trash2 className="w-4 h-4" />
                             </Button>
                           </div>
                        </div>
                      </div>
                    ))}
                    
                    {(!config.conditions || config.conditions.length === 0) && (
                      <div className="text-center py-8 text-muted-foreground text-sm border-2 border-dashed border-border/50 rounded-lg">
                        No conditions configured. Click "Add Condition" to start.
                      </div>
                    )}
                  </div>
                </div>

                {/* Rule Status */}
                <div className="bg-primary/5 border border-primary/10 rounded-xl p-4 flex items-center justify-between">
                   <div className="flex items-center gap-3">
                     <div className="p-2 bg-primary/10 rounded-lg text-primary">
                       <Zap className="w-5 h-5" />
                     </div>
                     <div>
                       <div className="font-medium text-foreground">Rule Status</div>
                       <div className="text-sm text-muted-foreground">
                         {config.enabled ? "Rule is enabled and will trigger automatically" : "Rule is disabled and won't trigger"}
                       </div>
                     </div>
                   </div>
                   <Switch 
                     checked={config.enabled} 
                     onCheckedChange={(checked) => setConfig({...config, enabled: checked})}
                   />
                </div>

              </TabsContent>

              <TabsContent value="test" className="mt-0 min-h-[400px]">
                <div className="space-y-6">
                  <div className="bg-muted/30 p-4 rounded-lg border border-border/50">
                    <h3 className="font-medium mb-2 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-primary" />
                      Simulation Parameters
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Mock Metric Value</Label>
                        <Input 
                          type="number" 
                          value={testValue} 
                          onChange={(e) => setTestValue(Number(e.target.value))}
                          placeholder="Enter a value to test..."
                        />
                      </div>
                      <div className="flex items-end">
                        <Button onClick={runTest} className="w-full">
                          <Play className="w-4 h-4 mr-2" />
                          Run Simulation
                        </Button>
                      </div>
                    </div>
                  </div>

                  {testResult && (
                    <div className={cn(
                      "p-4 rounded-lg border flex items-start gap-3",
                      testResult.triggered 
                        ? "bg-destructive/10 border-destructive/20 text-destructive" 
                        : "bg-green-500/10 border-green-500/20 text-green-600"
                    )}>
                      {testResult.triggered ? (
                        <XCircle className="w-5 h-5 shrink-0 mt-0.5" />
                      ) : (
                        <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <div className="font-semibold">
                          {testResult.triggered ? "Alert Triggered" : "No Alert Triggered"}
                        </div>
                        <div className="text-sm opacity-90">
                          {testResult.message}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Current Conditions Logic</Label>
                    <div className="bg-muted p-3 rounded text-xs font-mono text-muted-foreground">
                      {config.conditionLogic === 'and' ? 'ALL' : 'ANY'} of the following:
                      <ul className="list-disc pl-4 mt-1 space-y-1">
                        {config.conditions?.map((c, i) => (
                          <li key={i}>
                            {c.metricName || c.metricId || 'Metric'} {c.operator} {c.value}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="action" className="mt-0 min-h-[400px]">
                <Tabs defaultValue="config" className="w-full">
                  <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent gap-2 mb-4">
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
                  
                  <TabsContent value="config" className="space-y-6">
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
            </div>

            <div className="flex items-center justify-between p-6 pt-2 bg-muted/5 border-t border-border">
              <Button variant="outline" className="w-[140px]" onClick={runTest}>
                <Play className="w-4 h-4 mr-2" />
                Test Rule
              </Button>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                <Button className="w-[140px]" onClick={handleSave}>
                  <Save className="w-4 h-4 mr-2" />
                  Save Rule
                </Button>
              </div>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};
