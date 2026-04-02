import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import {
  OntologyConcept,
  OntologyConceptType,
  OntologyDomain,
  OntologyRelationship,
  OntologySensitivity,
  OntologyStatus,
  SemanticView,
  SemanticViewType
} from '@/model/ontology';

type EditorMode = 'create' | 'edit';

interface ConceptRow {
  id: string;
  name: string;
  type: OntologyConceptType;
  fields: string;
  description: string;
  relationshipsInput: string;
}

interface SemanticViewRow {
  id: string;
  name: string;
  type: SemanticViewType;
  subjects: string;
  description: string;
  conceptsInput: string;
}

interface RelationshipRow {
  id: string;
  domainId: string;
  relationshipType: string;
  description: string;
}

interface OntologyDomainEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: EditorMode;
  domain: OntologyDomain | null;
  existingDomains: OntologyDomain[];
  onSave: (domain: OntologyDomain) => void;
}

const makeRowId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const emptyConcept = (): ConceptRow => ({
  id: makeRowId('concept'),
  name: '',
  type: 'entity',
  fields: '0',
  description: '',
  relationshipsInput: ''
});

const emptySemanticView = (): SemanticViewRow => ({
  id: makeRowId('view'),
  name: '',
  type: 'connected',
  subjects: '0',
  description: '',
  conceptsInput: ''
});

const emptyRelationship = (): RelationshipRow => ({
  id: makeRowId('relationship'),
  domainId: '',
  relationshipType: '',
  description: ''
});

export const OntologyDomainEditorDialog: React.FC<OntologyDomainEditorDialogProps> = ({
  open,
  onOpenChange,
  mode,
  domain,
  existingDomains,
  onSave
}) => {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [owner, setOwner] = useState('');
  const [technicalOwner, setTechnicalOwner] = useState('');
  const [tags, setTags] = useState('');
  const [status, setStatus] = useState<OntologyStatus>('active');
  const [sensitivity, setSensitivity] = useState<OntologySensitivity>('internal');
  const [concepts, setConcepts] = useState<ConceptRow[]>([emptyConcept()]);
  const [semanticViews, setSemanticViews] = useState<SemanticViewRow[]>([emptySemanticView()]);
  const [relationships, setRelationships] = useState<RelationshipRow[]>([]);

  useEffect(() => {
    if (!open) return;

    if (mode === 'edit' && domain) {
      setName(domain.name);
      setDescription(domain.description);
      setOwner(domain.owner);
      setTechnicalOwner(domain.technicalOwner);
      setTags(domain.tags.join(', '));
      setStatus(domain.status);
      setSensitivity(domain.sensitivity);
      setConcepts(
        domain.concepts.length > 0
          ? domain.concepts.map(concept => ({
              id: concept.id,
              name: concept.name,
              type: concept.type,
              fields: String(concept.fields),
              description: concept.description,
              relationshipsInput: concept.relationships.join(', ')
            }))
          : [emptyConcept()]
      );
      setSemanticViews(
        domain.semanticViews.length > 0
          ? domain.semanticViews.map(view => ({
              id: view.id,
              name: view.name,
              type: view.type,
              subjects: String(view.subjects),
              description: view.description,
              conceptsInput: view.topics.join(', ')
            }))
          : [emptySemanticView()]
      );
      setRelationships(
        (domain.relatedDomains ?? []).length > 0
          ? (domain.relatedDomains ?? []).map(rel => ({
              id: makeRowId('relationship'),
              domainId: rel.domainId,
              relationshipType: rel.relationshipType,
              description: rel.description ?? ''
            }))
          : []
      );
      return;
    }

    setName('');
    setDescription('');
    setOwner('');
    setTechnicalOwner('');
    setTags('');
    setStatus('active');
    setSensitivity('internal');
    setConcepts([emptyConcept()]);
    setSemanticViews([emptySemanticView()]);
    setRelationships([]);
  }, [open, mode, domain]);

  const availableRelationshipTargets = useMemo(
    () => existingDomains.filter(item => item.id !== domain?.id),
    [existingDomains, domain?.id]
  );

  const updateConcept = (id: string, key: keyof ConceptRow, value: string) => {
    setConcepts(prev => prev.map(concept => (concept.id === id ? { ...concept, [key]: value } : concept)));
  };

  const updateSemanticView = (id: string, key: keyof SemanticViewRow, value: string) => {
    setSemanticViews(prev => prev.map(view => (view.id === id ? { ...view, [key]: value } : view)));
  };

  const updateRelationship = (id: string, key: keyof RelationshipRow, value: string) => {
    setRelationships(prev => prev.map(rel => (rel.id === id ? { ...rel, [key]: value } : rel)));
  };

  const parseList = (value: string) => value.split(',').map(item => item.trim()).filter(Boolean);

  const handleSave = () => {
    const trimmedName = name.trim();
    const trimmedDescription = description.trim();

    if (!trimmedName || !trimmedDescription) {
      toast({ title: 'Domain name and description are required', variant: 'destructive' });
      return;
    }

    const domainId = mode === 'edit' && domain ? domain.id : `cat-${String(existingDomains.length + 1).padStart(3, '0')}`;
    const today = new Date().toISOString().split('T')[0];

    const nextConcepts: OntologyConcept[] = concepts
      .filter(concept => concept.name.trim().length > 0)
      .map((concept, index) => ({
        id: concept.id || `${domainId}-concept-${index + 1}`,
        name: concept.name.trim(),
        type: concept.type,
        fields: Number(concept.fields) || 0,
        description: concept.description.trim(),
        relationships: parseList(concept.relationshipsInput)
      }));

    const nextViews: SemanticView[] = semanticViews
      .filter(view => view.name.trim().length > 0)
      .map((view, index) => ({
        id: view.id || `${domainId}-view-${index + 1}`,
        name: view.name.trim(),
        type: view.type,
        subjects: Number(view.subjects) || 0,
        description: view.description.trim(),
        topics: parseList(view.conceptsInput)
      }));

    const nextRelationships: OntologyRelationship[] = relationships
      .filter(rel => rel.domainId.trim().length > 0 && rel.relationshipType.trim().length > 0)
      .map(rel => ({
        domainId: rel.domainId.trim(),
        relationshipType: rel.relationshipType.trim(),
        description: rel.description.trim() || undefined
      }));

    onSave({
      id: domainId,
      name: trimmedName,
      description: trimmedDescription,
      owner: owner.trim() || 'Unknown',
      technicalOwner: technicalOwner.trim() || 'Unknown',
      tags: parseList(tags),
      status,
      sensitivity,
      concepts: nextConcepts,
      semanticViews: nextViews,
      relatedDomains: nextRelationships,
      createdAt: domain?.createdAt ?? today,
      updatedAt: today
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{mode === 'edit' ? 'Edit Ontology Domain' : 'Create Ontology Domain'}</DialogTitle>
          <DialogDescription>Use structured sections to maintain ontology metadata, concepts, views, and relationships.</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full flex-1 min-h-0 flex flex-col">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="concepts">Concepts</TabsTrigger>
            <TabsTrigger value="views">Views</TabsTrigger>
            <TabsTrigger value="relationships">Relationships</TabsTrigger>
          </TabsList>

          <div className="mt-4 flex-1 min-h-0">
            <TabsContent value="overview" className="h-full mt-0 data-[state=inactive]:hidden">
              <ScrollArea className="h-full pr-4">
                <div className="space-y-4 pb-4">
              <Card>
                <CardHeader>
                  <CardTitle>Domain Basics</CardTitle>
                  <CardDescription>Define the ontology domain scope and stewardship.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="domain-name">Domain Name</Label>
                      <Input id="domain-name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Policy Ontology Domain" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="domain-tags">Tags</Label>
                      <Input id="domain-tags" value={tags} onChange={e => setTags(e.target.value)} placeholder="comma separated" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="domain-description">Description</Label>
                    <Textarea
                      id="domain-description"
                      rows={4}
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      placeholder="Describe the semantic boundary and value of this ontology domain."
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="domain-owner">Business Owner</Label>
                      <Input id="domain-owner" value={owner} onChange={e => setOwner(e.target.value)} placeholder="team or person" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="domain-tech-owner">Tech Owner</Label>
                      <Input
                        id="domain-tech-owner"
                        value={technicalOwner}
                        onChange={e => setTechnicalOwner(e.target.value)}
                        placeholder="team or person"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Sensitivity</Label>
                      <Select value={sensitivity} onValueChange={value => setSensitivity(value as OntologySensitivity)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select sensitivity" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="public">🌍 Public</SelectItem>
                          <SelectItem value="internal">🏢 Internal</SelectItem>
                          <SelectItem value="confidential">🔒 Confidential</SelectItem>
                          <SelectItem value="restricted">🚨 Restricted</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select value={status} onValueChange={value => setStatus(value as OntologyStatus)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="deprecated">Deprecated</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="concepts" className="h-full mt-0 data-[state=inactive]:hidden">
              <ScrollArea className="h-full pr-4">
                <div className="space-y-4 pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold">Ontology Concepts</div>
                      <div className="text-sm text-muted-foreground">Maintain structured concept definitions instead of free-text rows.</div>
                    </div>
                    <Button variant="outline" className="gap-2" onClick={() => setConcepts(prev => [...prev, emptyConcept()])}>
                      <Plus className="w-4 h-4" />
                      Add Concept
                    </Button>
                  </div>
                  <div className="space-y-4">
                    {concepts.map((concept, index) => (
                      <Card key={concept.id}>
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between gap-3">
                            <CardTitle className="text-base">Concept {index + 1}</CardTitle>
                            <Button variant="ghost" size="sm" onClick={() => setConcepts(prev => prev.filter(item => item.id !== concept.id))}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="grid gap-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2 md:col-span-2">
                              <Label>Concept Name</Label>
                              <Input value={concept.name} onChange={e => updateConcept(concept.id, 'name', e.target.value)} placeholder="e.g., Policy" />
                            </div>
                            <div className="space-y-2">
                              <Label>Concept Type</Label>
                              <Select value={concept.type} onValueChange={value => updateConcept(concept.id, 'type', value)}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="entity">Ontology Class</SelectItem>
                                  <SelectItem value="event">Ontology Event</SelectItem>
                                  <SelectItem value="aggregate">Aggregate Concept</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Attribute Count</Label>
                              <Input value={concept.fields} onChange={e => updateConcept(concept.id, 'fields', e.target.value)} placeholder="0" />
                            </div>
                            <div className="space-y-2">
                              <Label>Related Concepts</Label>
                              <Input
                                value={concept.relationshipsInput}
                                onChange={e => updateConcept(concept.id, 'relationshipsInput', e.target.value)}
                                placeholder="comma separated concept names"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label>Description</Label>
                            <Textarea
                              rows={3}
                              value={concept.description}
                              onChange={e => updateConcept(concept.id, 'description', e.target.value)}
                              placeholder="Describe the concept semantics."
                            />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="views" className="h-full mt-0 data-[state=inactive]:hidden">
              <ScrollArea className="h-full pr-4">
                <div className="space-y-4 pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold">Semantic Views</div>
                      <div className="text-sm text-muted-foreground">Define reusable semantic views and their linked concepts.</div>
                    </div>
                    <Button variant="outline" className="gap-2" onClick={() => setSemanticViews(prev => [...prev, emptySemanticView()])}>
                      <Plus className="w-4 h-4" />
                      Add View
                    </Button>
                  </div>
                  <div className="space-y-4">
                    {semanticViews.map((view, index) => (
                      <Card key={view.id}>
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between gap-3">
                            <CardTitle className="text-base">View {index + 1}</CardTitle>
                            <Button variant="ghost" size="sm" onClick={() => setSemanticViews(prev => prev.filter(item => item.id !== view.id))}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="grid gap-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2 md:col-span-2">
                              <Label>View Name</Label>
                              <Input value={view.name} onChange={e => updateSemanticView(view.id, 'name', e.target.value)} placeholder="e.g., Customer 360" />
                            </div>
                            <div className="space-y-2">
                              <Label>View Type</Label>
                              <Select value={view.type} onValueChange={value => updateSemanticView(view.id, 'type', value)}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="connected">Connected</SelectItem>
                                  <SelectItem value="data_mart">Data Mart</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Subject Areas</Label>
                              <Input value={view.subjects} onChange={e => updateSemanticView(view.id, 'subjects', e.target.value)} placeholder="0" />
                            </div>
                            <div className="space-y-2">
                              <Label>Linked Concepts</Label>
                              <Input
                                value={view.conceptsInput}
                                onChange={e => updateSemanticView(view.id, 'conceptsInput', e.target.value)}
                                placeholder="comma separated concept names"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label>Description</Label>
                            <Textarea
                              rows={3}
                              value={view.description}
                              onChange={e => updateSemanticView(view.id, 'description', e.target.value)}
                              placeholder="Describe the view purpose and scope."
                            />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="relationships" className="h-full mt-0 data-[state=inactive]:hidden">
              <ScrollArea className="h-full pr-4">
                <div className="space-y-4 pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold">Domain Relationships</div>
                      <div className="text-sm text-muted-foreground">Link this domain to other domains using explicit predicates.</div>
                    </div>
                    <Button variant="outline" className="gap-2" onClick={() => setRelationships(prev => [...prev, emptyRelationship()])}>
                      <Plus className="w-4 h-4" />
                      Add Relationship
                    </Button>
                  </div>
                  <div className="space-y-4">
                    {relationships.length === 0 && (
                      <Card>
                        <CardContent className="py-8 text-sm text-muted-foreground">
                          No relationships yet. Add one to model inter-domain dependencies.
                        </CardContent>
                      </Card>
                    )}
                    {relationships.map((relationship, index) => (
                      <Card key={relationship.id}>
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between gap-3">
                            <CardTitle className="text-base">Relationship {index + 1}</CardTitle>
                            <Button variant="ghost" size="sm" onClick={() => setRelationships(prev => prev.filter(item => item.id !== relationship.id))}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="grid gap-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Target Domain</Label>
                              <Select value={relationship.domainId} onValueChange={value => updateRelationship(relationship.id, 'domainId', value)}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select target domain" />
                                </SelectTrigger>
                                <SelectContent>
                                  {availableRelationshipTargets.map(target => (
                                    <SelectItem key={target.id} value={target.id}>
                                      {target.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Predicate</Label>
                              <Input
                                value={relationship.relationshipType}
                                onChange={e => updateRelationship(relationship.id, 'relationshipType', e.target.value)}
                                placeholder="e.g., Depends on"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label>Description</Label>
                            <Textarea
                              rows={2}
                              value={relationship.description}
                              onChange={e => updateRelationship(relationship.id, 'description', e.target.value)}
                              placeholder="Optional description for the relationship."
                            />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>{mode === 'edit' ? 'Save Changes' : 'Create Domain'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
