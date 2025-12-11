import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Play, Save, Plus, Trash2, GripVertical, Activity, Beaker, Lightbulb, Zap, Mail, Webhook, Bell, Workflow, CheckCircle2, XCircle } from 'lucide-react';
import { BIChartCard, AlertConfig, AlertCondition, AlertAction } from '@/model/biAnalysis';
import { cn } from '@/lib/utils';

interface AlertConfigurationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card: BIChartCard;
  onSave: (updatedCard: BIChartCard) => void;
}

export const AlertConfigurationModal: React.FC<AlertConfigurationModalProps> = ({
  open,
  onOpenChange,
  card,
  onSave
}) => {
  const [activeTab, setActiveTab] = useState("config");
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
    if (open) {
      const initialConfig = {
        enabled: true,
        condition: { operator: '>', value: 0 },
        nextAction: { type: 'notification' },
        conditionLogic: 'and',
        name: card.title || '',
        priority: 'medium',
        description: '',
        ...card.alert
      } as AlertConfig;

      if (!initialConfig.conditions || initialConfig.conditions.length === 0) {
        initialConfig.conditions = [{
          field: card.metricId,
          operator: initialConfig.condition.operator,
          value: initialConfig.condition.value
        }];
      }

      if (!initialConfig.nextAction) {
        initialConfig.nextAction = { type: 'notification' };
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
        { field: card.metricId, operator: '>', value: 0 }
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

  const handleActionChange = (field: keyof AlertAction, value: any) => {
    setConfig(prev => ({
      ...prev,
      nextAction: {
        ...prev.nextAction,
        [field]: value
      }
    }));
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
                             <Select 
                               value={cond.field || card.metricId} 
                               onValueChange={(val) => handleConditionChange(index, 'field', val)}
                             >
                               <SelectTrigger>
                                 <SelectValue placeholder="Select Metric" />
                               </SelectTrigger>
                               <SelectContent>
                                 <SelectItem value={card.metricId}>{card.metricId} (Current)</SelectItem>
                                 <SelectItem value="loss_ratio">Loss Ratio</SelectItem>
                                 <SelectItem value="claim_count">Claim Count</SelectItem>
                                 <SelectItem value="premium_total">Total Premium</SelectItem>
                               </SelectContent>
                             </Select>
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
                            {c.field || 'Metric'} {c.operator} {c.value}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="action" className="mt-0 min-h-[400px]">
                <div className="space-y-6">
                  <div className="space-y-4">
                    <Label>Action Type</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {[
                        { id: 'notification', label: 'Notification', icon: Bell },
                        { id: 'email', label: 'Email', icon: Mail },
                        { id: 'webhook', label: 'Webhook', icon: Webhook },
                        { id: 'process', label: 'Process', icon: Workflow },
                      ].map((type) => (
                        <div 
                          key={type.id}
                          className={cn(
                            "cursor-pointer border rounded-lg p-4 flex flex-col items-center justify-center gap-2 hover:bg-muted/50 transition-colors",
                            config.nextAction.type === type.id 
                              ? "border-primary bg-primary/5 text-primary ring-1 ring-primary" 
                              : "border-border text-muted-foreground"
                          )}
                          onClick={() => handleActionChange('type', type.id)}
                        >
                          <type.icon className="w-6 h-6" />
                          <span className="text-xs font-medium">{type.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-border/50">
                    <div className="space-y-2">
                      <Label>
                        {config.nextAction.type === 'email' ? 'Recipient Email(s)' :
                         config.nextAction.type === 'webhook' ? 'Webhook URL' :
                         config.nextAction.type === 'process' ? 'Process ID' :
                         'Target User/Group'}
                      </Label>
                      <Input 
                        value={config.nextAction.target || ''} 
                        onChange={(e) => handleActionChange('target', e.target.value)}
                        placeholder={
                          config.nextAction.type === 'email' ? 'user@example.com' :
                          config.nextAction.type === 'webhook' ? 'https://api.example.com/webhook' :
                          config.nextAction.type === 'process' ? 'Process definition ID' :
                          'User ID or Group Name'
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>
                        {config.nextAction.type === 'webhook' ? 'Payload Template (JSON)' :
                         config.nextAction.type === 'process' ? 'Input Parameters (JSON)' :
                         'Message Template'}
                      </Label>
                      <Textarea 
                        value={config.nextAction.template || ''} 
                        onChange={(e) => handleActionChange('template', e.target.value)}
                        className="font-mono text-sm min-h-[120px]"
                        placeholder={
                          config.nextAction.type === 'webhook' ? '{\n  "alert": "${alert_name}",\n  "value": ${current_value}\n}' :
                          "Alert detected: ${alert_name}. Value is ${current_value}."
                        }
                      />
                      <p className="text-[10px] text-muted-foreground">
                        Available variables: <code className="bg-muted px-1 rounded">${`{alert_name}`}</code>, <code className="bg-muted px-1 rounded">${`{current_value}`}</code>, <code className="bg-muted px-1 rounded">${`{metric_name}`}</code>
                      </p>
                    </div>
                  </div>
                </div>
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
