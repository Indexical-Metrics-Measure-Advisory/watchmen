import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "../ui/select";
import { Badge } from "../ui/badge";
import { X } from "lucide-react";
import { Topic, Catalog } from "./model/BusinessDomain";

interface CreateTopicDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateTopic: (data: Topic) => void;
  onUpdateTopic?: (data: Topic) => void;
  editingTopic?: Topic | null;
  existingTopics?: Topic[];
  availableCatalogs?: Catalog[];
}

export function CreateTopicDialog({ 
  open, 
  onOpenChange, 
  onCreateTopic, 
  onUpdateTopic, 
  editingTopic,
  existingTopics = [],
  availableCatalogs = []
}: CreateTopicDialogProps) {
  const [formData, setFormData] = useState<Topic>({
    id: '',
    name: '',
    description: '',
    type: 'entity',
    fields: 0,
    relationships: [],
  });

  const [newRelationship, setNewRelationship] = useState('');

  useEffect(() => {
    if (editingTopic) {
      setFormData(editingTopic);
    } else {
      setFormData({
        id: '',
        name: '',
        description: '',
        type: 'entity',
        fields: 0,
        relationships: [],
      });
    }
  }, [editingTopic, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const topicData: Topic = {
      ...formData,
      id: editingTopic ? editingTopic.id : `topic-${Date.now()}`,
    };

    if (editingTopic) {
      onUpdateTopic?.(topicData);
    } else {
      onCreateTopic(topicData);
    }

    setFormData({
      id: '',
      name: '',
      description: '',
      type: 'entity',
      fields: 0,
      relationships: [],
    });
    setNewRelationship('');
    onOpenChange(false);
  };

  const handleAddRelationship = () => {
    if (newRelationship.trim()) {
      setFormData({
        ...formData,
        relationships: [...formData.relationships, newRelationship.trim()]
      });
      setNewRelationship('');
    }
  };

  const handleRemoveRelationship = (index: number) => {
    setFormData({
      ...formData,
      relationships: formData.relationships.filter((_, i) => i !== index)
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{editingTopic ? 'Edit Topic' : 'Create Topic'}</DialogTitle>
          <DialogDescription>
            {editingTopic 
              ? 'Update the topic (data entity) information' 
              : 'Create a new topic (data entity) for this business domain catalog'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Topic Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Policy_Main, Customer, Transaction"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
              <p className="text-xs text-gray-500">
                Use clear, descriptive names. Typically in format: Entity_Name
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                placeholder="Describe what this topic represents, what data it contains..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Topic Type *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value as Topic['type'] })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entity">📦 Entity - Core data object</SelectItem>
                    <SelectItem value="event">⚡ Event - Time-based occurrence</SelectItem>
                    <SelectItem value="aggregate">📊 Aggregate - Summarized data</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fields">Number of Fields *</Label>
                <Input
                  id="fields"
                  type="number"
                  min="0"
                  placeholder="e.g., 45"
                  value={formData.fields}
                  onChange={(e) => setFormData({ ...formData, fields: parseInt(e.target.value) || 0 })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Relationships</Label>
              <div className="flex gap-2">
                <Select
                  value={newRelationship}
                  onValueChange={setNewRelationship}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select related topic or enter custom" />
                  </SelectTrigger>
                  <SelectContent>
                  <SelectItem value="custom">✏️ Enter custom relationship</SelectItem>
                  {availableCatalogs.length > 0 ? (
                    availableCatalogs.map((catalog) => (
                      <SelectGroup key={catalog.id}>
                        <SelectLabel className="text-xs font-semibold text-gray-500 px-2 py-1">
                          {catalog.name}
                        </SelectLabel>
                        {catalog.topics
                          .filter(t => t.id !== editingTopic?.id)
                          .map((topic) => (
                            <SelectItem key={topic.id} value={topic.name}>
                              {topic.name}
                            </SelectItem>
                          ))}
                      </SelectGroup>
                    ))
                  ) : (
                    existingTopics
                      .filter(t => t.id !== editingTopic?.id)
                      .map((topic) => (
                        <SelectItem key={topic.id} value={topic.name}>
                          {topic.name}
                        </SelectItem>
                      ))
                  )}
                </SelectContent>
                </Select>
                <Button type="button" onClick={handleAddRelationship} disabled={!newRelationship}>
                  Add
                </Button>
              </div>
              {newRelationship === 'custom' && (
                <Input
                  placeholder="Enter relationship name"
                  value={newRelationship === 'custom' ? '' : newRelationship}
                  onChange={(e) => setNewRelationship(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddRelationship();
                    }
                  }}
                />
              )}
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.relationships.map((rel, index) => (
                  <Badge key={index} variant="secondary" className="gap-1">
                    {rel}
                    <X 
                      className="w-3 h-3 cursor-pointer" 
                      onClick={() => handleRemoveRelationship(index)}
                    />
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-gray-500">
                Define which other topics this topic connects to (foreign keys, references)
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{editingTopic ? 'Save Changes' : 'Create Topic'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
