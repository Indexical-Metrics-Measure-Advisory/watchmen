import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { MetricType, MetricCategory } from '@/model/Metric';
import { MetricDefinition, Category, MetricTypeParams } from '@/model/metricsManagement';
import { getCategories } from '@/services/metricsManagementService';

interface MetricEditDialogProps {
  metric: MetricType;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (updatedMetric: MetricType) => void;
}

const MetricEditDialog: React.FC<MetricEditDialogProps> = ({
  metric,
  open,
  onOpenChange,
  onSave,
}) => {
  // Initialize with default values
  const initialMetric = {
    ...metric,
    value: metric.value ?? 0,
    change: metric.change ?? 0,
    valueReadable: metric.valueReadable || '',
    changeReadable: metric.changeReadable || '',
    description: metric.description || '',
    category: metric.category,
    categoryId: metric.categoryId
  };
  
  const [editedMetric, setEditedMetric] = useState<MetricType>(initialMetric);
  const [categories, setCategories] = useState<Category[]>([]);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [metricParams, setMetricParams] = useState<MetricTypeParams>({});

  useEffect(() => {
    setEditedMetric(initialMetric);
  }, [metric]);

  useEffect(() => {
    if (open) {
      loadCategories();
    }
  }, [open]);

  const loadCategories = async () => {
    try {
      const data = await getCategories();
      setCategories(data || []);
    } catch (error) {
      console.error('Failed to load categories', error);
    }
  };

  const handleSave = () => {
    const errors: Record<string, string> = {};
    if (!editedMetric.name) errors.name = "Metric name is required";
    // We might want to require categoryId, but if it's optional in MetricType, maybe not?
    // But the user emphasized using categoryId.
    if (!editedMetric.categoryId) errors.category = "Category is required";
    
    // MetricType doesn't have 'type' field like 'simple'/'ratio'. 
    // If we need to validate that, we can't unless we add it to MetricType.
    // For now, skipping 'type' validation as it's not on MetricType.
    
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    // Create a MetricDefinition-like object if needed, but onSave expects MetricType.
    // The caller (MetricCard) expects MetricType.
    // We should return the updated MetricType.
    
    onSave({
      ...editedMetric,
      // If the caller needs type_params or other MetricDefinition fields, they might be lost if not in MetricType.
      // But we'll stick to MetricType structure + categoryId.
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{metric ? 'Edit Metric' : 'Create New Metric'}</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {/* Basic Info Section */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="name" className="flex items-center gap-1">
                Metric Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={editedMetric.name}
                onChange={(e) => setEditedMetric({ ...editedMetric, name: e.target.value })}
                className={validationErrors.name ? "border-destructive" : ""}
                placeholder="e.g., Customer Retention Rate"
              />
              {validationErrors.name && <span className="text-xs text-destructive">{validationErrors.name}</span>}
            </div>

            <div className="col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={editedMetric.description || ''}
                onChange={(e) => setEditedMetric({ ...editedMetric, description: e.target.value })}
                placeholder="Brief description of what this metric measures"
                className="resize-none h-20"
              />
            </div>

            <div>
              <Label htmlFor="categoryId" className="flex items-center gap-1">
                Business Category <span className="text-destructive">*</span>
              </Label>
              <Select 
                value={editedMetric.categoryId} 
                onValueChange={(value) => setEditedMetric({ ...editedMetric, categoryId: value })}
              >
                <SelectTrigger id="categoryId" className={validationErrors.category ? "border-destructive" : ""}>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {validationErrors.category && <span className="text-xs text-destructive">{validationErrors.category}</span>}
            </div>

            <div>
              <Label htmlFor="metricCategory">Metric Nature</Label>
              <Select
                value={editedMetric.category}
                onValueChange={(value: MetricCategory) =>
                  setEditedMetric({ ...editedMetric, category: value })
                }
              >
                <SelectTrigger id="metricCategory">
                  <SelectValue placeholder="Select nature" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Volume">Volume</SelectItem>
                  <SelectItem value="Ratio">Ratio</SelectItem>
                  <SelectItem value="Average">Average</SelectItem>
                  <SelectItem value="Composition">Composition</SelectItem>
                  <SelectItem value="Change">Change</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="value" className="text-right">
              Value
            </Label>
            <Input
              id="value"
              type="number"
              value={editedMetric.value}
              className="col-span-3"
              onChange={(e) => setEditedMetric({ ...editedMetric, value: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="valueReadable" className="text-right">
              Display Value
            </Label>
            <Input
              id="valueReadable"
              value={editedMetric.valueReadable}
              className="col-span-3"
              onChange={(e) => setEditedMetric({ ...editedMetric, valueReadable: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="unit" className="text-right">
              Unit
            </Label>
            <Input
              id="unit"
              value={editedMetric.unit}
              className="col-span-3"
              onChange={(e) => setEditedMetric({ ...editedMetric, unit: e.target.value })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MetricEditDialog;
