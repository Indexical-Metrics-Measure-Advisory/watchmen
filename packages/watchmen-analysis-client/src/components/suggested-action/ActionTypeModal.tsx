import React, { useState, useEffect } from 'react';
import { ActionType, ActionTypeParameter } from '@/model/suggestedAction';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from 'lucide-react';

interface ActionTypeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: ActionType | null;
  onSave: (type: ActionType) => void;
}

export const ActionTypeModal: React.FC<ActionTypeModalProps> = ({
  open,
  onOpenChange,
  type,
  onSave
}) => {
  const [formData, setFormData] = useState<Partial<ActionType>>({
    name: '',
    code: '',
    description: '',
    category: '',
    requiresApproval: false,
    enabled: true,
    parameters: []
  });

  const [newParameter, setNewParameter] = useState<Partial<ActionTypeParameter>>({
    name: '',
    type: 'string',
    required: false,
    description: ''
  });

  useEffect(() => {
    if (open) {
      if (type) {
        setFormData({ ...type, parameters: type.parameters || [] });
      } else {
        setFormData({
            id: '',
            name: '',
            code: '',
            description: '',
            category: '',
            requiresApproval: false,
            enabled: true,
            parameters: []
        });
      }
      setNewParameter({ name: '', type: 'string', required: false, description: '' });
    }
  }, [open, type]);

  const handleSave = () => {
    if (!formData.name || !formData.code || !formData.category) return;
    onSave(formData as ActionType);
    onOpenChange(false);
  };

  const handleAddParameter = () => {
    if (!newParameter.name) return;
    
    const param: ActionTypeParameter = {
        name: newParameter.name,
        type: (newParameter.type as any) || 'string',
        required: newParameter.required || false,
        description: newParameter.description || ''
    };

    setFormData(prev => ({
        ...prev,
        parameters: [...(prev.parameters || []), param]
    }));

    setNewParameter({ name: '', type: 'string', required: false, description: '' });
  };

  const handleRemoveParameter = (index: number) => {
    setFormData(prev => ({
        ...prev,
        parameters: (prev.parameters || []).filter((_, i) => i !== index)
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{type ? 'Edit Action Type' : 'New Action Type'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
            {/* Basic Info Section */}
            <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground border-b pb-2">Basic Information</h3>
                <div className="space-y-2">
                  <Label>Type Name *</Label>
                  <Input 
                    value={formData.name} 
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g. Email Notification"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Code *</Label>
                        <Input 
                            value={formData.code} 
                            onChange={(e) => setFormData({...formData, code: e.target.value})}
                            placeholder="e.g. email_notification"
                            disabled={!!type} 
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Category *</Label>
                        <Select
                            value={formData.category}
                            onValueChange={(value) => setFormData({ ...formData, category: value })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Notification">Notification</SelectItem>
                                <SelectItem value="API Call">API Call</SelectItem>
                                <SelectItem value="Data Modification">Data Modification</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea 
                    value={formData.description} 
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Description of this action type..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="space-y-0.5">
                            <Label>Requires Approval</Label>
                            <p className="text-xs text-muted-foreground">Manual approval required</p>
                        </div>
                        <Switch 
                            checked={formData.requiresApproval}
                            onCheckedChange={(checked) => setFormData({...formData, requiresApproval: checked})}
                        />
                    </div>

                    <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="space-y-0.5">
                            <Label>Enabled</Label>
                            <p className="text-xs text-muted-foreground">Available for new actions</p>
                        </div>
                        <Switch 
                            checked={formData.enabled}
                            onCheckedChange={(checked) => setFormData({...formData, enabled: checked})}
                        />
                    </div>
                </div>
            </div>

            {/* Parameters Section */}
            <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                    <h3 className="text-sm font-medium text-muted-foreground">Parameter Configuration</h3>
                </div>
                
                {/* Add New Parameter */}
                <div className="p-4 bg-muted/50 rounded-lg space-y-4">
                    <div className="grid grid-cols-12 gap-3">
                        <div className="col-span-4 space-y-2">
                            <Label className="text-xs">Param Name</Label>
                            <Input 
                                value={newParameter.name}
                                onChange={(e) => setNewParameter({...newParameter, name: e.target.value})}
                                placeholder="e.g. recipient_email"
                                className="h-8"
                            />
                        </div>
                        <div className="col-span-3 space-y-2">
                            <Label className="text-xs">Type</Label>
                            <Select 
                                value={newParameter.type} 
                                onValueChange={(v) => setNewParameter({...newParameter, type: v as any})}
                            >
                                <SelectTrigger className="h-8">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="string">String</SelectItem>
                                    <SelectItem value="number">Number</SelectItem>
                                    <SelectItem value="boolean">Boolean</SelectItem>
                                    <SelectItem value="email">Email</SelectItem>
                                    <SelectItem value="url">URL</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                         <div className="col-span-3 space-y-2">
                            <Label className="text-xs">Required</Label>
                            <div className="flex items-center h-8">
                                <Switch 
                                    checked={newParameter.required}
                                    onCheckedChange={(c) => setNewParameter({...newParameter, required: c})}
                                    className="scale-75 origin-left"
                                />
                            </div>
                        </div>
                        <div className="col-span-2 flex items-end">
                            <Button 
                                onClick={handleAddParameter} 
                                disabled={!newParameter.name}
                                size="sm"
                                className="w-full h-8"
                            >
                                <Plus className="h-4 w-4" /> Add
                            </Button>
                        </div>
                    </div>
                    <div className="space-y-2">
                         <Label className="text-xs">Description</Label>
                         <Input 
                            value={newParameter.description}
                            onChange={(e) => setNewParameter({...newParameter, description: e.target.value})}
                            placeholder="Parameter description..."
                            className="h-8"
                         />
                    </div>
                </div>

                {/* Parameters List */}
                <div className="space-y-2">
                    {formData.parameters && formData.parameters.length > 0 ? (
                        formData.parameters.map((param, index) => (
                            <div key={index} className="flex items-center justify-between p-3 border rounded-lg bg-background">
                                <div className="flex items-center gap-4">
                                    <div className="bg-primary/10 text-primary px-2 py-1 rounded text-xs font-mono">
                                        {param.type}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-sm">{param.name}</span>
                                            {param.required && <span className="text-xs text-red-500">*Required</span>}
                                        </div>
                                        {param.description && <p className="text-xs text-muted-foreground">{param.description}</p>}
                                    </div>
                                </div>
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => handleRemoveParameter(index)}
                                    className="h-8 w-8 p-0 text-muted-foreground hover:text-red-600"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-6 text-muted-foreground text-sm border border-dashed rounded-lg">
                            No parameters configured for this action type.
                        </div>
                    )}
                </div>
            </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={!formData.name || !formData.code || !formData.category}>Save Action Type</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};