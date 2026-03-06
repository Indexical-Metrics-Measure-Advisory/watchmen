import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Badge } from "../ui/badge";
import { Checkbox } from "../ui/checkbox";
import { Space, Topic } from "./model/BusinessDomain";

interface CreateSpaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateSpace: (data: Space) => void;
  onUpdateSpace?: (data: Space) => void;
  editingSpace?: Space | null;
  availableTopics?: Topic[];
}

export function CreateSpaceDialog({ 
  open, 
  onOpenChange, 
  onCreateSpace, 
  onUpdateSpace, 
  editingSpace,
  availableTopics = []
}: CreateSpaceDialogProps) {
  const [formData, setFormData] = useState<Space>({
    id: '',
    name: '',
    description: '',
    type: 'data_mart',
    topics: [],
    subjects: 0,
  });

  useEffect(() => {
    if (editingSpace) {
      setFormData(editingSpace);
    } else {
      setFormData({
        id: '',
        name: '',
        description: '',
        type: 'data_mart',
        topics: [],
        subjects: 0,
      });
    }
  }, [editingSpace, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const spaceData: Space = {
      ...formData,
      id: editingSpace ? editingSpace.id : `space-${Date.now()}`,
    };

    if (editingSpace) {
      onUpdateSpace?.(spaceData);
    } else {
      onCreateSpace(spaceData);
    }

    setFormData({
      id: '',
      name: '',
      description: '',
      type: 'data_mart',
      topics: [],
      subjects: 0,
    });
    onOpenChange(false);
  };

  const handleToggleTopic = (topicName: string) => {
    const topics = formData.topics.includes(topicName)
      ? formData.topics.filter(t => t !== topicName)
      : [...formData.topics, topicName];
    
    setFormData({ ...formData, topics });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{editingSpace ? 'Edit Space' : 'Create Space'}</DialogTitle>
          <DialogDescription>
            {editingSpace 
              ? 'Update the space (data mart) information' 
              : 'Create a new space (data mart or connected space) for analytical datasets'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <Label htmlFor="name">Space Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Policy Analytics Mart, Customer 360 Space"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                placeholder="Describe the purpose of this space, what analytics it supports..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Space Type *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value as Space['type'] })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="data_mart">📊 Data Mart - Aggregated analytics</SelectItem>
                    <SelectItem value="connected">🔗 Connected Space - Real-time joined data</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subjects">Number of Subjects *</Label>
                <Input
                  id="subjects"
                  type="number"
                  min="0"
                  placeholder="e.g., 12"
                  value={formData.subjects}
                  onChange={(e) => setFormData({ ...formData, subjects: parseInt(e.target.value) || 0 })}
                  required
                />
                <p className="text-xs text-gray-500">
                  Pre-built analytical subjects
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Source Topics ({formData.topics.length} selected)</Label>
              <div className="border rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto">
                {availableTopics.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No topics available. Create topics first.
                  </p>
                ) : (
                  availableTopics.map((topic) => (
                    <div key={topic.id} className="flex items-start space-x-2">
                      <Checkbox
                        id={`topic-${topic.id}`}
                        checked={formData.topics.includes(topic.name)}
                        onCheckedChange={() => handleToggleTopic(topic.name)}
                      />
                      <label
                        htmlFor={`topic-${topic.id}`}
                        className="text-sm flex-1 cursor-pointer"
                      >
                        <div className="font-medium">{topic.name}</div>
                        <div className="text-xs text-gray-500">{topic.description}</div>
                      </label>
                    </div>
                  ))
                )}
              </div>
              <p className="text-xs text-gray-500">
                Select which topics are used to build this space
              </p>
            </div>

            {formData.topics.length > 0 && (
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm font-medium text-blue-900 mb-2">Selected Topics:</p>
                <div className="flex flex-wrap gap-1">
                  {formData.topics.map((topicName, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {topicName}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{editingSpace ? 'Save Changes' : 'Create Space'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
