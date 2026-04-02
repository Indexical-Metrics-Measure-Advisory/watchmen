import React from 'react';
import { Pencil } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { OntologyDomain, conceptTypeConfig, sensitivityConfig } from '@/model/ontology';

interface OntologyDomainDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  domain: OntologyDomain | null;
  onEdit: (domain: OntologyDomain) => void;
}

export const OntologyDomainDetailDialog: React.FC<OntologyDomainDetailDialogProps> = ({
  open,
  onOpenChange,
  domain,
  onEdit
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>{domain?.name ?? 'Ontology Domain'}</DialogTitle>
          <DialogDescription>{domain?.description}</DialogDescription>
        </DialogHeader>
        {domain && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-3">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle className="text-base">Overview</CardTitle>
                    <Button variant="outline" size="sm" className="gap-2" onClick={() => onEdit(domain)}>
                      <Pencil className="w-4 h-4" />
                      Edit
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Sensitivity</span>
                    <Badge className={`${sensitivityConfig[domain.sensitivity].className} border-0`}>
                      {sensitivityConfig[domain.sensitivity].icon} {sensitivityConfig[domain.sensitivity].label}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Status</span>
                    <span className="font-medium">{domain.status}</span>
                  </div>
                  <Separator />
                  <div className="space-y-1">
                    <div className="text-muted-foreground">Business Owner</div>
                    <div className="font-medium">{domain.owner}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-muted-foreground">Tech Owner</div>
                    <div className="font-medium">{domain.technicalOwner}</div>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <div className="text-muted-foreground">Tags</div>
                    <div className="flex flex-wrap gap-2">
                      {domain.tags.map(tag => (
                        <Badge key={tag} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                      {domain.tags.length === 0 && <span className="text-muted-foreground">-</span>}
                    </div>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <div className="text-muted-foreground">Domain Relationships</div>
                    <div className="space-y-2">
                      {(domain.relatedDomains ?? []).map(rel => (
                        <div key={`${rel.domainId}-${rel.relationshipType}`} className="rounded-md border px-3 py-2">
                          <div className="font-medium">{rel.relationshipType}</div>
                          <div className="text-xs text-muted-foreground mt-1">{rel.domainId}{rel.description ? ` · ${rel.description}` : ''}</div>
                        </div>
                      ))}
                      {(domain.relatedDomains ?? []).length === 0 && <span className="text-muted-foreground">-</span>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-2">
              <Tabs defaultValue="concepts">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="concepts">Concepts</TabsTrigger>
                  <TabsTrigger value="views">Semantic Views</TabsTrigger>
                </TabsList>
                <TabsContent value="concepts">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Ontology Concepts</CardTitle>
                      <CardDescription>{domain.concepts.length} concepts</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[48vh] pr-3">
                        <div className="space-y-3">
                          {domain.concepts.map(concept => (
                            <div key={concept.id} className="p-4 rounded-lg border bg-muted/20">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="font-semibold truncate">{concept.name}</div>
                                  <div className="text-sm text-muted-foreground mt-1">{concept.description}</div>
                                </div>
                                <Badge className={cn('border-0', conceptTypeConfig[concept.type].className)}>
                                  {conceptTypeConfig[concept.type].icon} {conceptTypeConfig[concept.type].label}
                                </Badge>
                              </div>
                              <div className="text-xs text-muted-foreground mt-3 flex flex-wrap gap-3">
                                <span>{concept.fields} attributes</span>
                                <span>{concept.relationships.length} linked concepts</span>
                              </div>
                              {concept.relationships.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-2">
                                  {concept.relationships.slice(0, 6).map(rel => (
                                    <Badge key={rel} variant="outline">
                                      {rel}
                                    </Badge>
                                  ))}
                                  {concept.relationships.length > 6 && (
                                    <Badge variant="outline">+{concept.relationships.length - 6}</Badge>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                          {domain.concepts.length === 0 && (
                            <div className="text-muted-foreground text-sm">No ontology concepts yet.</div>
                          )}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="views">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Semantic Views</CardTitle>
                      <CardDescription>{domain.semanticViews.length} views</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[48vh] pr-3">
                        <div className="space-y-3">
                          {domain.semanticViews.map(view => (
                            <div key={view.id} className="p-4 rounded-lg border bg-muted/20">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="font-semibold truncate">{view.name}</div>
                                  <div className="text-sm text-muted-foreground mt-1">{view.description}</div>
                                </div>
                                <Badge variant="outline">{view.type === 'data_mart' ? 'Data Mart' : 'Connected'}</Badge>
                              </div>
                              <div className="text-xs text-muted-foreground mt-3 flex flex-wrap gap-3">
                                <span>{view.subjects} subject areas</span>
                                <span>{view.topics.length} linked concepts</span>
                              </div>
                              {view.topics.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-2">
                                  {view.topics.slice(0, 8).map(concept => (
                                    <Badge key={concept} variant="secondary">
                                      {concept}
                                    </Badge>
                                  ))}
                                  {view.topics.length > 8 && <Badge variant="secondary">+{view.topics.length - 8}</Badge>}
                                </div>
                              )}
                            </div>
                          ))}
                          {domain.semanticViews.length === 0 && (
                            <div className="text-muted-foreground text-sm">No semantic views yet.</div>
                          )}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
