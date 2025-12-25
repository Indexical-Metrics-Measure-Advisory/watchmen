import React, { useState, useEffect } from 'react';
import { SuggestedAction, ActionType, ActionExecutionMode, ActionPriority, ActionRiskLevel } from '@/model/suggestedAction';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Bell, Zap, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface SuggestedActionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: SuggestedAction | null;
  types: ActionType[];
  onSave: (action: SuggestedAction) => void;
}

export const SuggestedActionModal: React.FC<SuggestedActionModalProps> = ({
  open,
  onOpenChange,
  action,
  types,
  onSave
}) => {
  const [formData, setFormData] = useState<Partial<SuggestedAction>>({
    name: '',
    description: '',
    expectedOutcome: '',
    conditions: [],
    enabled: true,
    riskLevel: 'low',
    priority: 'medium',
    executionMode: 'auto'
  });

  const [conditionInput, setConditionInput] = useState('');

  useEffect(() => {
    if (open) {
      if (action) {
        setFormData({ ...action });
      } else {
        setFormData({
            id: '',
            name: '',
            description: '',
            expectedOutcome: '',
            conditions: [],
            enabled: true,
            riskLevel: 'low',
            priority: 'medium',
            executionMode: 'auto',
            typeId: types[0]?.id || ''
        });
      }
    }
  }, [open, action, types]);

  const handleSave = () => {
    if (!formData.name || !formData.typeId) return;
    onSave(formData as SuggestedAction);
    onOpenChange(false);
  };

  const addCondition = () => {
    if (conditionInput.trim()) {
      setFormData(prev => ({
        ...prev,
        conditions: [...(prev.conditions || []), conditionInput.trim()]
      }));
      setConditionInput('');
    }
  };

  const removeCondition = (index: number) => {
    setFormData(prev => ({
      ...prev,
      conditions: prev.conditions?.filter((_, i) => i !== index)
    }));
  };

  const selectedType = types.find(t => t.id === formData.typeId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{action ? 'Edit Suggested Action' : 'New Suggested Action'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Action Name *</Label>
              <Input 
                value={formData.name} 
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Enter action name"
              />
            </div>
            <div className="space-y-2">
              <Label>Action Type</Label>
              <Select 
                value={formData.typeId} 
                onValueChange={(val) => setFormData({...formData, typeId: val})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {types.map(t => (
                    <SelectItem key={t.id} value={t.id}>
                        <div className="flex items-center gap-2">
                            {t.code === 'notification' ? <Bell className="h-4 w-4"/> : <Zap className="h-4 w-4"/>}
                            {t.name}
                        </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <div className="p-2 border rounded-md bg-muted/20 text-sm">
                {selectedType?.category || 'Select a type first'}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Risk Level</Label>
              <Select 
                value={formData.riskLevel} 
                onValueChange={(val: ActionRiskLevel) => setFormData({...formData, riskLevel: val})}
              >
                <SelectTrigger>
                  <SelectValue />
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
            <Label>Action Description *</Label>
            <Textarea 
              value={formData.description} 
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Detailed description of the action..."
              className="min-h-[80px]"
            />
          </div>

          <div className="space-y-2">
            <Label>Expected Outcome</Label>
            <Input 
              value={formData.expectedOutcome} 
              onChange={(e) => setFormData({...formData, expectedOutcome: e.target.value})}
              placeholder="Describe expected business impact..."
            />
          </div>

          <div className="space-y-2">
            <Label>Trigger Conditions</Label>
            <div className="flex gap-2">
              <Input 
                value={conditionInput}
                onChange={(e) => setConditionInput(e.target.value)}
                placeholder="Add trigger condition..."
                onKeyDown={(e) => e.key === 'Enter' && addCondition()}
              />
              <Button onClick={addCondition} variant="outline" size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.conditions?.map((condition, index) => (
                <Badge key={index} variant="secondary" className="pl-2 pr-1 py-1 gap-1">
                  {condition}
                  <button onClick={() => removeCondition(index)} className="hover:text-red-600">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
                <Label>Execution Mode</Label>
                <Select 
                    value={formData.executionMode} 
                    onValueChange={(val: ActionExecutionMode) => setFormData({...formData, executionMode: val})}
                >
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="auto">⚡ Automatic Execution</SelectItem>
                        <SelectItem value="manual">👤 Manual Execution</SelectItem>
                        <SelectItem value="approval">🕒 Requires Approval</SelectItem>
                    </SelectContent>
                </Select>
             </div>
             <div className="space-y-2">
                <Label>Priority</Label>
                <Select 
                    value={formData.priority} 
                    onValueChange={(val: ActionPriority) => setFormData({...formData, priority: val})}
                >
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="low">Low Priority</SelectItem>
                        <SelectItem value="medium">Medium Priority</SelectItem>
                        <SelectItem value="high">High Priority</SelectItem>
                    </SelectContent>
                </Select>
             </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch 
                checked={formData.enabled}
                onCheckedChange={(checked) => setFormData({...formData, enabled: checked})}
            />
            <Label>Enable Immediately</Label>
          </div>

        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
