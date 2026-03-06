import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Button } from "../ui/button";
import { Layers, Database, Grid3x3, Tag, Users, Calendar, Link, FileText, Plus, Edit, Trash2, Network } from "lucide-react";
import { Catalog, Topic, Space } from "./model/BusinessDomain";

interface CatalogDetailPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  catalog: Catalog;
  allCatalogs?: Catalog[];
  onEditCatalog?: () => void;
  onEditTopic?: (topic: Topic) => void;
  onDeleteTopic?: (topicId: string) => void;
  onCreateTopic?: () => void;
  onEditSpace?: (space: Space) => void;
  onDeleteSpace?: (spaceId: string) => void;
  onCreateSpace?: () => void;
}

export function CatalogDetailPanel({ 
  open, 
  onOpenChange, 
  catalog, 
  allCatalogs = [], 
  onEditCatalog,
  onEditTopic, 
  onDeleteTopic, 
  onCreateTopic, 
  onEditSpace, 
  onDeleteSpace, 
  onCreateSpace 
}: CatalogDetailPanelProps) {
  const sensitivityConfig = {
    public: { label: 'Public', className: 'bg-green-100 text-green-700', icon: '🌍' },
    internal: { label: 'Internal', className: 'bg-blue-100 text-blue-700', icon: '🏢' },
    confidential: { label: 'Confidential', className: 'bg-orange-100 text-orange-700', icon: '🔒' },
    restricted: { label: 'Restricted', className: 'bg-red-100 text-red-700', icon: '🚨' },
  };

  const topicTypeConfig = {
    entity: { label: 'Entity', className: 'bg-blue-100 text-blue-700', icon: '📦' },
    event: { label: 'Event', className: 'bg-purple-100 text-purple-700', icon: '⚡' },
    aggregate: { label: 'Aggregate', className: 'bg-green-100 text-green-700', icon: '📊' },
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-full max-h-[90vh] overflow-y-auto p-0 gap-0 bg-white shadow-2xl border-0 sm:rounded-2xl">
        <DialogHeader className="p-8 pb-6 border-b border-slate-100 bg-white sticky top-0 z-10">
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <DialogTitle className="text-2xl font-bold text-slate-900 flex items-center gap-3 leading-tight tracking-tight">
                  <div className="p-2 bg-blue-50 rounded-xl flex-shrink-0">
                    <Layers className="w-6 h-6 text-blue-600" />
                  </div>
                  {catalog.name}
                </DialogTitle>
                <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                  <Badge className={`${sensitivityConfig[catalog.sensitivity].className} px-3 py-1 text-sm border-0 shadow-none font-medium`}>
                    {sensitivityConfig[catalog.sensitivity].icon} {sensitivityConfig[catalog.sensitivity].label}
                  </Badge>
                  {onEditCatalog && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="gap-2 h-9 px-4 rounded-full border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600 hover:text-slate-900 font-medium transition-all" 
                      onClick={onEditCatalog}
                    >
                      <Edit className="w-3.5 h-3.5" />
                      Edit Catalog
                    </Button>
                  )}
                </div>
              </div>
              <DialogDescription className="text-base text-slate-500 mt-4 leading-relaxed max-w-none">
                {catalog.description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="px-8 pb-8">
          <Tabs defaultValue="overview" className="mt-6">
            <TabsList className="w-full justify-start bg-slate-100/50 p-1 rounded-xl gap-1 h-auto mb-6 flex-wrap">
              <TabsTrigger 
                value="overview" 
                className="px-4 py-2 rounded-lg data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm text-slate-500 font-medium transition-all"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger 
                value="topics" 
                className="px-4 py-2 rounded-lg data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm text-slate-500 font-medium transition-all"
              >
                Topics <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-slate-100 text-xs text-slate-600 font-semibold">{catalog.topics.length}</span>
              </TabsTrigger>
              <TabsTrigger 
                value="spaces" 
                className="px-4 py-2 rounded-lg data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm text-slate-500 font-medium transition-all"
              >
                Spaces <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-slate-100 text-xs text-slate-600 font-semibold">{catalog.relatedSpaces.length}</span>
              </TabsTrigger>
              <TabsTrigger 
                value="relationships" 
                className="px-4 py-2 rounded-lg data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm text-slate-500 font-medium transition-all"
              >
                Relationships <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-slate-100 text-xs text-slate-600 font-semibold">{catalog.relatedDomains?.length || 0}</span>
              </TabsTrigger>
              <TabsTrigger 
                value="lineage" 
                className="px-4 py-2 rounded-lg data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm text-slate-500 font-medium transition-all"
              >
                Lineage
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6 mt-0 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
              {/* Metadata Card */}
              <Card className="border-slate-200 shadow-sm overflow-hidden">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4">
                  <CardTitle className="text-base font-semibold text-slate-900">Metadata Information</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        <Users className="w-3.5 h-3.5" />
                        Business Owner
                      </div>
                      <p className="text-sm font-medium text-slate-900 pl-5.5 truncate" title={catalog.owner}>{catalog.owner}</p>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        <Users className="w-3.5 h-3.5" />
                        Technical Owner
                      </div>
                      <p className="text-sm font-medium text-slate-900 pl-5.5 truncate" title={catalog.technicalOwner}>{catalog.technicalOwner}</p>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        <Calendar className="w-3.5 h-3.5" />
                        Created
                      </div>
                      <p className="text-sm font-medium text-slate-900 pl-5.5">{catalog.createdAt}</p>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        <Calendar className="w-3.5 h-3.5" />
                        Last Updated
                      </div>
                      <p className="text-sm font-medium text-slate-900 pl-5.5">{catalog.updatedAt}</p>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-100">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Business Tags</p>
                    <div className="flex flex-wrap gap-2">
                      {catalog.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary" className="px-2.5 py-1 bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200 transition-colors font-medium">
                          <Tag className="w-3 h-3 mr-1.5 text-slate-400" />
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Statistics Card */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow group">
                  <CardContent className="p-6 flex items-center gap-4">
                    <div className="p-3 bg-blue-50 rounded-xl group-hover:bg-blue-100 transition-colors">
                      <Database className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-slate-900">{catalog.topics.length}</div>
                      <div className="text-sm font-medium text-slate-500">Topics</div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow group">
                  <CardContent className="p-6 flex items-center gap-4">
                    <div className="p-3 bg-green-50 rounded-xl group-hover:bg-green-100 transition-colors">
                      <Grid3x3 className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-slate-900">{catalog.relatedSpaces.length}</div>
                      <div className="text-sm font-medium text-slate-500">Spaces</div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow group">
                  <CardContent className="p-6 flex items-center gap-4">
                    <div className="p-3 bg-purple-50 rounded-xl group-hover:bg-purple-100 transition-colors">
                      <FileText className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-slate-900">
                        {catalog.topics.reduce((sum, t) => sum + t.fields, 0)}
                      </div>
                      <div className="text-sm font-medium text-slate-500">Total Fields</div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

          <TabsContent value="topics" className="space-y-4 mt-0 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
            {catalog.topics.map((topic) => (
              <Card key={topic.id} className="border-slate-200 shadow-sm hover:shadow-md transition-shadow group">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0 pr-4">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="p-1.5 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                          <Database className="w-4 h-4 text-blue-600" />
                        </div>
                        <CardTitle className="text-lg font-bold text-slate-900 truncate">{topic.name}</CardTitle>
                        <Badge className={`${topicTypeConfig[topic.type].className} border-0 shadow-none px-2 py-0.5`}>
                          {topicTypeConfig[topic.type].icon} {topicTypeConfig[topic.type].label}
                        </Badge>
                      </div>
                      <CardDescription className="text-slate-500 line-clamp-2 leading-relaxed ml-9">{topic.description}</CardDescription>
                    </div>
                    <div className="flex gap-2 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      {onEditTopic && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-slate-400 hover:text-slate-900 hover:bg-slate-100"
                          onClick={() => onEditTopic(topic)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      )}
                      {onDeleteTopic && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                          onClick={() => onDeleteTopic(topic.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-6 pl-9">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Fields</p>
                      <p className="text-xl font-bold text-slate-900">{topic.fields}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Relationships</p>
                      <div className="flex flex-wrap gap-2">
                        {topic.relationships.map((rel, index) => (
                          <Badge key={index} variant="secondary" className="bg-slate-50 text-slate-600 border-slate-100 font-normal">
                            <Link className="w-3 h-3 mr-1.5 text-slate-400" />
                            {rel}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {onCreateTopic && (
              <button
                onClick={onCreateTopic}
                className="w-full p-8 border-2 border-dashed border-slate-200 rounded-xl hover:border-blue-400 hover:bg-blue-50/50 transition-all group flex flex-col items-center justify-center gap-3 text-slate-400 hover:text-blue-600"
              >
                <div className="p-3 bg-slate-50 rounded-full group-hover:bg-blue-100 transition-colors">
                  <Plus className="w-6 h-6" />
                </div>
                <span className="font-semibold">Add New Topic</span>
              </button>
            )}
          </TabsContent>

          <TabsContent value="spaces" className="space-y-4 mt-0 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
            {catalog.relatedSpaces.map((space) => (
              <Card key={space.id} className="border-slate-200 shadow-sm hover:shadow-md transition-shadow group">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0 pr-4">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="p-1.5 bg-green-50 rounded-lg group-hover:bg-green-100 transition-colors">
                          <Grid3x3 className="w-4 h-4 text-green-600" />
                        </div>
                        <CardTitle className="text-lg font-bold text-slate-900 truncate">{space.name}</CardTitle>
                        <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700 px-2 py-0.5">
                          {space.type === 'data_mart' ? '📊 Data Mart' : '🔗 Connected Space'}
                        </Badge>
                      </div>
                      <CardDescription className="text-slate-500 line-clamp-2 leading-relaxed ml-9">{space.description}</CardDescription>
                    </div>
                    <div className="flex gap-2 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      {onEditSpace && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-slate-400 hover:text-slate-900 hover:bg-slate-100"
                          onClick={() => onEditSpace(space)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      )}
                      {onDeleteSpace && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                          onClick={() => onDeleteSpace(space.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-6 pl-9">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Subjects</p>
                      <p className="text-xl font-bold text-slate-900">{space.subjects}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Source Topics</p>
                      <div className="flex flex-wrap gap-2">
                        {space.topics.map((topicName, index) => (
                          <Badge key={index} variant="secondary" className="bg-slate-50 text-slate-600 border-slate-100 font-normal">
                            <Database className="w-3 h-3 mr-1.5 text-slate-400" />
                            {topicName}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {onCreateSpace && (
              <button
                onClick={onCreateSpace}
                className="w-full p-8 border-2 border-dashed border-slate-200 rounded-xl hover:border-green-400 hover:bg-green-50/50 transition-all group flex flex-col items-center justify-center gap-3 text-slate-400 hover:text-green-600"
              >
                <div className="p-3 bg-slate-50 rounded-full group-hover:bg-green-100 transition-colors">
                  <Plus className="w-6 h-6" />
                </div>
                <span className="font-semibold">Add New Space</span>
              </button>
            )}
          </TabsContent>

          <TabsContent value="relationships" className="space-y-4 mt-0 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
             {(!catalog.relatedDomains || catalog.relatedDomains.length === 0) ? (
               <div className="text-center py-16 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                 <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                   <Network className="w-8 h-8 text-slate-400" />
                 </div>
                 <h3 className="text-lg font-semibold text-slate-900">No Relationships</h3>
                 <p className="text-slate-500 mt-1 max-w-sm mx-auto">This catalog has not been connected to any other domains yet.</p>
                 {onEditCatalog && (
                   <Button variant="outline" onClick={onEditCatalog} className="mt-6 border-slate-200">
                     Configure Relationships
                   </Button>
                 )}
               </div>
             ) : (
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {catalog.relatedDomains.map((rel, index) => {
                   const relatedCatalog = allCatalogs.find(c => c.id === rel.domainId);
                   return (
                     <Card key={index} className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                       <CardHeader className="pb-3">
                         <div className="flex items-start justify-between">
                           <div className="flex items-center gap-3">
                             <div className="p-2 bg-blue-50 rounded-lg">
                               <Layers className="w-5 h-5 text-blue-600" />
                             </div>
                             <div>
                               <CardTitle className="text-base font-semibold text-slate-900">
                                 {relatedCatalog ? relatedCatalog.name : rel.domainId}
                               </CardTitle>
                               {relatedCatalog && (
                                 <CardDescription className="line-clamp-1 text-xs mt-0.5">
                                   {relatedCatalog.description}
                                 </CardDescription>
                               )}
                             </div>
                           </div>
                           <Badge variant="outline" className="bg-slate-50">{rel.relationshipType}</Badge>
                         </div>
                       </CardHeader>
                       <CardContent>
                         <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                           {rel.description || "No description provided"}
                         </p>
                       </CardContent>
                     </Card>
                   );
                 })}
               </div>
             )}
          </TabsContent>

          <TabsContent value="lineage" className="mt-0 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg text-slate-900">Data Lineage</CardTitle>
                <CardDescription className="text-slate-500">
                  Visualization of data flow from Topics to Spaces
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-gradient-to-r from-blue-50/50 to-green-50/50 p-12 rounded-xl border border-slate-200">
                  <div className="text-center space-y-8">
                    <div className="flex items-center justify-center gap-12">
                      <div className="text-center relative group">
                        <div className="w-20 h-20 bg-white rounded-2xl shadow-sm border border-blue-100 flex items-center justify-center mx-auto mb-3 group-hover:-translate-y-1 transition-transform duration-300">
                          <Database className="w-8 h-8 text-blue-500" />
                        </div>
                        <p className="text-base font-semibold text-slate-900">Topics</p>
                        <p className="text-sm text-slate-500">{catalog.topics.length} entities</p>
                      </div>
                      
                      <div className="flex items-center pt-8 opacity-50">
                        <div className="w-24 h-px bg-slate-300"></div>
                        <div className="text-slate-300 mx-2">→</div>
                        <div className="w-24 h-px bg-slate-300"></div>
                      </div>

                      <div className="text-center relative group">
                        <div className="w-20 h-20 bg-white rounded-2xl shadow-sm border border-green-100 flex items-center justify-center mx-auto mb-3 group-hover:-translate-y-1 transition-transform duration-300">
                          <Grid3x3 className="w-8 h-8 text-green-500" />
                        </div>
                        <p className="text-base font-semibold text-slate-900">Spaces</p>
                        <p className="text-sm text-slate-500">{catalog.relatedSpaces.length} data marts</p>
                      </div>
                    </div>
                    
                    <p className="text-sm text-slate-500 max-w-lg mx-auto leading-relaxed">
                      Topics represent raw data entities, while Spaces are pre-aggregated analytical datasets built from multiple Topics.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}