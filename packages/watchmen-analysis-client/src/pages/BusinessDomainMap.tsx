import React, { useMemo, useState } from 'react';
import { Search, Plus, Layers, Database, Grid3x3, Eye, Tag, Users, Sparkles, Network } from 'lucide-react';
import { useSidebar } from '@/contexts/SidebarContext';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { motion } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

type TopicType = 'entity' | 'event' | 'aggregate';
type SpaceType = 'connected' | 'data_mart';
type CatalogStatus = 'active' | 'deprecated';
type CatalogSensitivity = 'public' | 'internal' | 'confidential' | 'restricted';

interface Topic {
  id: string;
  name: string;
  description: string;
  type: TopicType;
  fields: number;
  relationships: string[];
}

interface Space {
  id: string;
  name: string;
  description: string;
  type: SpaceType;
  topics: string[];
  subjects: number;
}

interface DomainRelationship {
  domainId: string;
  relationshipType: string;
  description?: string;
}

interface Catalog {
  id: string;
  name: string;
  description: string;
  owner: string;
  technicalOwner: string;
  tags: string[];
  topics: Topic[];
  relatedSpaces: Space[];
  createdAt: string;
  updatedAt: string;
  status: CatalogStatus;
  sensitivity: CatalogSensitivity;
  relatedDomains?: DomainRelationship[];
}

const INITIAL_CATALOGS: Catalog[] = [
  {
    id: 'cat-001',
    name: 'Policy Business Management (PA)',
    description: 'Manages the entire lifecycle of policies from underwriting to termination.',
    owner: 'Insurance Business Team',
    technicalOwner: 'Data Platform Team',
    tags: ['Core Business', 'PII Sensitive', 'High Value', 'PA'],
    status: 'active',
    sensitivity: 'confidential',
    topics: [
      {
        id: 'topic-pa-001',
        name: 'DM_PA_POLICY_HIS',
        description: 'Policy basic information and status.',
        type: 'entity',
        fields: 45,
        relationships: ['DM_PTY_PERSON_HIS', 'DM_CLM_CLAIM_CASE_HIS']
      },
      {
        id: 'topic-pa-003',
        name: 'DM_PA_POLICY_CHANGE_HIS',
        description: 'Policy change events.',
        type: 'event',
        fields: 28,
        relationships: ['DM_PA_POLICY_HIS']
      }
    ],
    relatedSpaces: [
      {
        id: 'space-pa-001',
        name: 'Policy_Lifecycle_Wide',
        description: 'Policy lifecycle semantic layer.',
        type: 'connected',
        topics: ['DM_PA_POLICY_HIS', 'DM_PA_POLICY_CHANGE_HIS', 'DM_PTY_PERSON_HIS'],
        subjects: 8
      }
    ],
    relatedDomains: [
      { domainId: 'cat-003', relationshipType: 'Depends on' },
      { domainId: 'cat-002', relationshipType: 'Provides data to' }
    ],
    createdAt: '2024-01-15',
    updatedAt: '2024-12-20'
  },
  {
    id: 'cat-002',
    name: 'Claims Service Management (CLM)',
    description: 'Claims processing from reporting to payment completion.',
    owner: 'Claims Operations Team',
    technicalOwner: 'Data Engineering Team',
    tags: ['Core Business', 'Financial Critical', 'Real-time', 'CLM'],
    status: 'active',
    sensitivity: 'restricted',
    topics: [
      {
        id: 'topic-clm-001',
        name: 'DM_CLM_CLAIM_CASE_HIS',
        description: 'Claims case records and status.',
        type: 'entity',
        fields: 38,
        relationships: ['DM_PA_POLICY_HIS', 'DM_PTY_PERSON_HIS']
      },
      {
        id: 'topic-clm-002',
        name: 'DM_CLM_ASSESSMENT_HIS',
        description: 'Assessment aggregates for claims.',
        type: 'aggregate',
        fields: 25,
        relationships: ['DM_CLM_CLAIM_CASE_HIS']
      }
    ],
    relatedSpaces: [
      {
        id: 'space-clm-001',
        name: 'Claims_Analysis_Wide',
        description: 'Claims efficiency analysis mart.',
        type: 'data_mart',
        topics: ['DM_CLM_CLAIM_CASE_HIS', 'DM_CLM_ASSESSMENT_HIS', 'DM_PA_POLICY_HIS'],
        subjects: 6
      }
    ],
    relatedDomains: [{ domainId: 'cat-001', relationshipType: 'Depends on' }],
    createdAt: '2024-02-10',
    updatedAt: '2024-12-18'
  },
  {
    id: 'cat-003',
    name: 'Customer Information Management (PTY)',
    description: 'Master data for individual and corporate customers.',
    owner: 'CRM Team',
    technicalOwner: 'Data Platform Team',
    tags: ['Core Business', 'PII Sensitive', 'Master Data', 'PTY'],
    status: 'active',
    sensitivity: 'confidential',
    topics: [
      {
        id: 'topic-pty-001',
        name: 'DM_PTY_PERSON_HIS',
        description: 'Individual customer base data.',
        type: 'entity',
        fields: 52,
        relationships: ['DM_PA_POLICY_HIS', 'DM_CLM_CLAIM_CASE_HIS']
      }
    ],
    relatedSpaces: [
      {
        id: 'space-pty-001',
        name: 'Customer_360_Wide',
        description: 'Customer 360 semantic layer.',
        type: 'connected',
        topics: ['DM_PTY_PERSON_HIS', 'DM_PA_POLICY_HIS', 'DM_CLM_CLAIM_CASE_HIS'],
        subjects: 5
      }
    ],
    relatedDomains: [],
    createdAt: '2024-01-20',
    updatedAt: '2024-12-22'
  }
];

const sensitivityConfig: Record<CatalogSensitivity, { label: string; className: string; icon: string }> = {
  public: { label: 'Public', className: 'bg-green-100 text-green-700', icon: '🌍' },
  internal: { label: 'Internal', className: 'bg-blue-100 text-blue-700', icon: '🏢' },
  confidential: { label: 'Confidential', className: 'bg-orange-100 text-orange-700', icon: '🔒' },
  restricted: { label: 'Restricted', className: 'bg-red-100 text-red-700', icon: '🚨' }
};

const topicTypeConfig: Record<TopicType, { label: string; className: string; icon: string }> = {
  entity: { label: 'Entity', className: 'bg-blue-100 text-blue-700', icon: '📦' },
  event: { label: 'Event', className: 'bg-purple-100 text-purple-700', icon: '⚡' },
  aggregate: { label: 'Aggregate', className: 'bg-green-100 text-green-700', icon: '📊' }
};

interface DomainGraphProps {
  catalogs: Catalog[];
  onSelectCatalog: (catalog: Catalog) => void;
}

interface GraphNode {
  id: string;
  x: number;
  y: number;
  catalog: Catalog;
  color: string;
}

interface GraphLink {
  source: GraphNode;
  target: GraphNode;
  topics: { from: string; to: string }[];
  isDirect: boolean;
  relationshipDetails?: { type: string; description?: string }[];
}

const DomainGraph: React.FC<DomainGraphProps> = ({ catalogs, onSelectCatalog }) => {
  const nodes = useMemo<GraphNode[]>(() => {
    const width = 1000;
    const height = 760;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) - 90;

    return catalogs.map((catalog, index) => {
      const angle = (2 * Math.PI * index) / Math.max(catalogs.length, 1);
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      return {
        id: catalog.id,
        x,
        y,
        catalog,
        color: {
          public: '#22c55e',
          internal: '#3b82f6',
          confidential: '#f97316',
          restricted: '#ef4444'
        }[catalog.sensitivity]
      };
    });
  }, [catalogs]);

  const links = useMemo<GraphLink[]>(() => {
    const linkMap = new Map<string, GraphLink>();
    const topicToCatalogMap = new Map<string, string>();

    catalogs.forEach(c => c.topics.forEach(t => topicToCatalogMap.set(t.name, c.id)));

    catalogs.forEach(sourceCat => {
      const sourceNode = nodes.find(n => n.id === sourceCat.id);
      if (!sourceNode) return;

      sourceCat.topics.forEach(topic => {
        topic.relationships.forEach(relName => {
          const targetCatId = topicToCatalogMap.get(relName);
          if (!targetCatId || targetCatId === sourceCat.id) return;
          const targetNode = nodes.find(n => n.id === targetCatId);
          if (!targetNode) return;

          const linkId = [sourceCat.id, targetCatId].sort().join('-');
          if (!linkMap.has(linkId)) {
            linkMap.set(linkId, { source: sourceNode, target: targetNode, topics: [], isDirect: false });
          }
          linkMap.get(linkId)?.topics.push({ from: topic.name, to: relName });
        });
      });

      sourceCat.relatedDomains?.forEach(rel => {
        const targetNode = nodes.find(n => n.id === rel.domainId);
        if (!targetNode) return;

        const linkId = [sourceCat.id, rel.domainId].sort().join('-');
        if (!linkMap.has(linkId)) {
          linkMap.set(linkId, {
            source: sourceNode,
            target: targetNode,
            topics: [],
            isDirect: true,
            relationshipDetails: []
          });
        }

        const link = linkMap.get(linkId);
        if (!link) return;
        link.isDirect = true;
        link.relationshipDetails = link.relationshipDetails ?? [];
        link.relationshipDetails.push({ type: rel.relationshipType, description: rel.description });
      });
    });

    return Array.from(linkMap.values());
  }, [catalogs, nodes]);

  return (
    <div className="w-full h-[760px] bg-slate-50 rounded-xl border border-slate-200 relative overflow-hidden">
      <svg className="w-full h-full pointer-events-none" viewBox="0 0 1000 760" preserveAspectRatio="xMidYMid meet">
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="28" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
          </marker>
        </defs>
        {links.map((link, index) => (
          <g key={index}>
            <line
              x1={link.source.x}
              y1={link.source.y}
              x2={link.target.x}
              y2={link.target.y}
              stroke={link.isDirect ? '#94a3b8' : '#cbd5e1'}
              strokeWidth={Math.max(1, Math.min(link.topics.length + (link.isDirect ? 1 : 0), 5))}
              strokeDasharray={link.topics.length === 0 ? '5,5' : 'none'}
              markerEnd="url(#arrowhead)"
            />
            <line
              x1={link.source.x}
              y1={link.source.y}
              x2={link.target.x}
              y2={link.target.y}
              stroke="transparent"
              strokeWidth={24}
              className="pointer-events-auto cursor-pointer"
            >
              <title>
                {link.topics.length > 0
                  ? link.topics.map(t => `${t.from} → ${t.to}`).join('\n')
                  : link.relationshipDetails?.map(d => `${d.type}${d.description ? `: ${d.description}` : ''}`).join('\n') ||
                    'Direct domain relationship'}
              </title>
            </line>
          </g>
        ))}
      </svg>

      {nodes.map(node => (
        <motion.div
          key={node.id}
          className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
          style={{ left: `${(node.x / 1000) * 100}%`, top: `${(node.y / 760) * 100}%` }}
          onClick={() => onSelectCatalog(node.catalog)}
          whileHover={{ scale: 1.08 }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.25 }}
        >
          <div
            className="w-36 p-3 bg-white rounded-lg shadow-md border-2 transition-colors hover:border-blue-500 flex flex-col items-center gap-2"
            style={{ borderColor: node.color }}
          >
            <div className="font-semibold text-xs text-center text-slate-800 line-clamp-2">{node.catalog.name}</div>
            <div className="flex gap-1">
              <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 rounded text-slate-600">{node.catalog.topics.length} topics</span>
              <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 rounded text-slate-600">{node.catalog.relatedSpaces.length} spaces</span>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

const BusinessDomainMap: React.FC = () => {
  const { collapsed } = useSidebar();
  const { toast } = useToast();

  const [catalogs, setCatalogs] = useState<Catalog[]>(INITIAL_CATALOGS);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTag, setFilterTag] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'graph'>('graph');
  const [selectedCatalog, setSelectedCatalog] = useState<Catalog | null>(null);
  const [catalogDetailOpen, setCatalogDetailOpen] = useState(false);
  const [createCatalogOpen, setCreateCatalogOpen] = useState(false);
  const [aiPathOpen, setAiPathOpen] = useState(false);

  const allTags = useMemo(() => Array.from(new Set(catalogs.flatMap(c => c.tags))).sort(), [catalogs]);

  const filteredCatalogs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return catalogs.filter(catalog => {
      const matchesSearch = q.length === 0 || catalog.name.toLowerCase().includes(q) || catalog.description.toLowerCase().includes(q);
      const matchesTag = filterTag === 'all' || catalog.tags.includes(filterTag);
      return matchesSearch && matchesTag;
    });
  }, [catalogs, filterTag, searchQuery]);

  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    owner: '',
    technicalOwner: '',
    tags: '',
    status: 'active' as CatalogStatus,
    sensitivity: 'internal' as CatalogSensitivity
  });

  const openCatalogDetail = (catalog: Catalog) => {
    setSelectedCatalog(catalog);
    setCatalogDetailOpen(true);
  };

  const handleCreateCatalog = () => {
    const name = createForm.name.trim();
    const description = createForm.description.trim();
    if (name.length === 0 || description.length === 0) {
      toast({ title: 'Name and description are required', variant: 'destructive' });
      return;
    }

    const newCatalog: Catalog = {
      id: `cat-${String(catalogs.length + 1).padStart(3, '0')}`,
      name,
      description,
      owner: createForm.owner.trim() || 'Unknown',
      technicalOwner: createForm.technicalOwner.trim() || 'Unknown',
      tags: createForm.tags
        .split(',')
        .map(t => t.trim())
        .filter(Boolean),
      topics: [],
      relatedSpaces: [],
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
      status: createForm.status,
      sensitivity: createForm.sensitivity,
      relatedDomains: []
    };

    setCatalogs(prev => [...prev, newCatalog]);
    setCreateCatalogOpen(false);
    setCreateForm({
      name: '',
      description: '',
      owner: '',
      technicalOwner: '',
      tags: '',
      status: 'active',
      sensitivity: 'internal'
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className={`${collapsed ? 'pl-20' : 'pl-56'} min-h-screen transition-all duration-300`}>
        <Header />

        <main className="container py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-semibold">Business Domain Map</h1>
              <p className="text-muted-foreground mt-1">Semantic layer for AI-powered discovery and data mesh navigation</p>
            </div>
            <div className="flex flex-wrap gap-3 items-center">
              <div className="flex bg-muted/60 p-1 rounded-lg mr-1 h-10 border">
                <button
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2',
                    viewMode === 'grid'
                      ? 'bg-background text-foreground shadow-sm ring-1 ring-black/5'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Grid3x3 className="w-4 h-4" />
                  Grid
                </button>
                <button
                  onClick={() => setViewMode('graph')}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2',
                    viewMode === 'graph'
                      ? 'bg-background text-foreground shadow-sm ring-1 ring-black/5'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Network className="w-4 h-4" />
                  Graph
                </button>
              </div>
              <Button variant="outline" className="gap-2 h-10" onClick={() => setAiPathOpen(true)}>
                <Sparkles className="w-4 h-4 text-indigo-500" />
                AI Discovery Path
              </Button>
              <Button className="gap-2 h-10" onClick={() => setCreateCatalogOpen(true)}>
                <Plus className="w-4 h-4" />
                Create Catalog
              </Button>
            </div>
          </div>

          <div className="glass-card p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search catalogs by name or description..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="w-full md:w-64">
                <Select value={filterTag} onValueChange={setFilterTag}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by tag" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tags</SelectItem>
                    {allTags.map(tag => (
                      <SelectItem key={tag} value={tag}>
                        {tag}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Card className="mb-6">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <Network className="w-5 h-5 text-indigo-600" />
                </div>
                Three-Layer Architecture
              </CardTitle>
              <CardDescription>AI Agent discovery path: Catalog (Domain) → Topic (Entity) → Space (Data Mart)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-muted/30 p-5 rounded-xl border">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <Layers className="w-5 h-5 text-blue-600" />
                    </div>
                    <span className="text-2xl font-bold">{catalogs.length}</span>
                  </div>
                  <div className="font-semibold">Catalog (Domain)</div>
                  <div className="text-sm text-muted-foreground">Business domain nodes for discovery</div>
                </div>
                <div className="bg-muted/30 p-5 rounded-xl border">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2 bg-purple-50 rounded-lg">
                      <Database className="w-5 h-5 text-purple-600" />
                    </div>
                    <span className="text-2xl font-bold">{catalogs.reduce((sum, c) => sum + c.topics.length, 0)}</span>
                  </div>
                  <div className="font-semibold">Topic (Entity)</div>
                  <div className="text-sm text-muted-foreground">Entities and events with links</div>
                </div>
                <div className="bg-muted/30 p-5 rounded-xl border">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2 bg-emerald-50 rounded-lg">
                      <Grid3x3 className="w-5 h-5 text-emerald-600" />
                    </div>
                    <span className="text-2xl font-bold">{catalogs.reduce((sum, c) => sum + c.relatedSpaces.length, 0)}</span>
                  </div>
                  <div className="font-semibold">Space (Data Mart)</div>
                  <div className="text-sm text-muted-foreground">Semantic layers and marts</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {viewMode === 'graph' ? (
            <div className="bg-background rounded-xl border shadow-sm overflow-hidden">
              <DomainGraph catalogs={filteredCatalogs} onSelectCatalog={openCatalogDetail} />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredCatalogs.map(catalog => (
                <Card key={catalog.id} className="group hover:shadow-md transition-all border">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="p-1.5 bg-blue-50 rounded-md">
                            <Layers className="w-5 h-5 text-blue-600" />
                          </div>
                          <CardTitle className="text-lg">{catalog.name}</CardTitle>
                        </div>
                        <CardDescription className="line-clamp-2">{catalog.description}</CardDescription>
                      </div>
                      <Badge className={`${sensitivityConfig[catalog.sensitivity].className} border-0`}>
                        {sensitivityConfig[catalog.sensitivity].icon} {sensitivityConfig[catalog.sensitivity].label}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="grid grid-cols-2 gap-4 p-3 bg-muted/30 rounded-lg border">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-wide font-medium">
                          <Users className="w-3.5 h-3.5" />
                          Business Owner
                        </div>
                        <p className="font-semibold text-sm truncate pl-5">{catalog.owner}</p>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-wide font-medium">
                          <Users className="w-3.5 h-3.5" />
                          Tech Owner
                        </div>
                        <p className="font-semibold text-sm truncate pl-5">{catalog.technicalOwner}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {catalog.tags.map(tag => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          <Tag className="w-3 h-3 mr-1.5" />
                          {tag}
                        </Badge>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-semibold">
                          <Database className="w-4 h-4 text-purple-500" />
                          Topics <span className="text-muted-foreground font-normal">({catalog.topics.length})</span>
                        </div>
                        <div className="space-y-2">
                          {catalog.topics.slice(0, 3).map(topic => (
                            <div key={topic.id} className="flex items-center gap-2 text-sm">
                              <span
                                className={cn(
                                  'text-[10px] px-1.5 py-0.5 rounded',
                                  topicTypeConfig[topic.type].className
                                )}
                              >
                                {topicTypeConfig[topic.type].icon} {topicTypeConfig[topic.type].label}
                              </span>
                              <span className="font-medium truncate" title={topic.name}>
                                {topic.name}
                              </span>
                            </div>
                          ))}
                          {catalog.topics.length > 3 && (
                            <div className="text-xs text-muted-foreground font-medium">+{catalog.topics.length - 3} more...</div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-semibold">
                          <Grid3x3 className="w-4 h-4 text-emerald-500" />
                          Spaces <span className="text-muted-foreground font-normal">({catalog.relatedSpaces.length})</span>
                        </div>
                        <div className="space-y-2">
                          {catalog.relatedSpaces.slice(0, 3).map(space => (
                            <div key={space.id} className="flex items-center gap-2 text-sm">
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">
                                {space.type === 'data_mart' ? 'Mart' : 'Link'}
                              </span>
                              <span className="font-medium truncate" title={space.name}>
                                {space.name}
                              </span>
                            </div>
                          ))}
                          {catalog.relatedSpaces.length > 3 && (
                            <div className="text-xs text-muted-foreground font-medium">
                              +{catalog.relatedSpaces.length - 3} more...
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex pt-3 border-t opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => openCatalogDetail(catalog)}>
                        <Eye className="w-4 h-4" />
                        View Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {filteredCatalogs.length === 0 && (
            <Card className="mt-6">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Layers className="w-12 h-12 text-muted-foreground mb-4" />
                <div className="text-muted-foreground">No catalogs found</div>
                <div className="text-sm text-muted-foreground mt-1">Try adjusting your search or filters</div>
              </CardContent>
            </Card>
          )}
        </main>
      </div>

      <Dialog open={catalogDetailOpen} onOpenChange={setCatalogDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>{selectedCatalog?.name ?? 'Catalog'}</DialogTitle>
            <DialogDescription>{selectedCatalog?.description}</DialogDescription>
          </DialogHeader>
          {selectedCatalog && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 space-y-3">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Overview</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Sensitivity</span>
                      <Badge className={`${sensitivityConfig[selectedCatalog.sensitivity].className} border-0`}>
                        {sensitivityConfig[selectedCatalog.sensitivity].icon} {sensitivityConfig[selectedCatalog.sensitivity].label}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Status</span>
                      <span className="font-medium">{selectedCatalog.status}</span>
                    </div>
                    <Separator />
                    <div className="space-y-1">
                      <div className="text-muted-foreground">Business Owner</div>
                      <div className="font-medium">{selectedCatalog.owner}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-muted-foreground">Tech Owner</div>
                      <div className="font-medium">{selectedCatalog.technicalOwner}</div>
                    </div>
                    <Separator />
                    <div className="space-y-2">
                      <div className="text-muted-foreground">Tags</div>
                      <div className="flex flex-wrap gap-2">
                        {selectedCatalog.tags.map(tag => (
                          <Badge key={tag} variant="secondary">
                            {tag}
                          </Badge>
                        ))}
                        {selectedCatalog.tags.length === 0 && <span className="text-muted-foreground">-</span>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="lg:col-span-2">
                <Tabs defaultValue="topics">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="topics">Topics</TabsTrigger>
                    <TabsTrigger value="spaces">Spaces</TabsTrigger>
                  </TabsList>
                  <TabsContent value="topics">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">Topics</CardTitle>
                        <CardDescription>{selectedCatalog.topics.length} topics</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ScrollArea className="h-[48vh] pr-3">
                          <div className="space-y-3">
                            {selectedCatalog.topics.map(topic => (
                              <div key={topic.id} className="p-4 rounded-lg border bg-muted/20">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="font-semibold truncate">{topic.name}</div>
                                    <div className="text-sm text-muted-foreground mt-1">{topic.description}</div>
                                  </div>
                                  <Badge className={cn('border-0', topicTypeConfig[topic.type].className)}>
                                    {topicTypeConfig[topic.type].icon} {topicTypeConfig[topic.type].label}
                                  </Badge>
                                </div>
                                <div className="text-xs text-muted-foreground mt-3 flex flex-wrap gap-3">
                                  <span>{topic.fields} fields</span>
                                  <span>{topic.relationships.length} relationships</span>
                                </div>
                                {topic.relationships.length > 0 && (
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    {topic.relationships.slice(0, 6).map(rel => (
                                      <Badge key={rel} variant="outline">
                                        {rel}
                                      </Badge>
                                    ))}
                                    {topic.relationships.length > 6 && (
                                      <Badge variant="outline">+{topic.relationships.length - 6}</Badge>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                            {selectedCatalog.topics.length === 0 && (
                              <div className="text-muted-foreground text-sm">No topics yet.</div>
                            )}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  </TabsContent>
                  <TabsContent value="spaces">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">Spaces</CardTitle>
                        <CardDescription>{selectedCatalog.relatedSpaces.length} spaces</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ScrollArea className="h-[48vh] pr-3">
                          <div className="space-y-3">
                            {selectedCatalog.relatedSpaces.map(space => (
                              <div key={space.id} className="p-4 rounded-lg border bg-muted/20">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="font-semibold truncate">{space.name}</div>
                                    <div className="text-sm text-muted-foreground mt-1">{space.description}</div>
                                  </div>
                                  <Badge variant="outline">{space.type === 'data_mart' ? 'Data Mart' : 'Connected'}</Badge>
                                </div>
                                <div className="text-xs text-muted-foreground mt-3 flex flex-wrap gap-3">
                                  <span>{space.subjects} subjects</span>
                                  <span>{space.topics.length} topics</span>
                                </div>
                                {space.topics.length > 0 && (
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    {space.topics.slice(0, 8).map(topic => (
                                      <Badge key={topic} variant="secondary">
                                        {topic}
                                      </Badge>
                                    ))}
                                    {space.topics.length > 8 && <Badge variant="secondary">+{space.topics.length - 8}</Badge>}
                                  </div>
                                )}
                              </div>
                            ))}
                            {selectedCatalog.relatedSpaces.length === 0 && (
                              <div className="text-muted-foreground text-sm">No spaces yet.</div>
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

      <Dialog open={createCatalogOpen} onOpenChange={setCreateCatalogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Catalog</DialogTitle>
            <DialogDescription>Create a business domain catalog node for discovery.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="catalog-name">Name</Label>
                <Input
                  id="catalog-name"
                  value={createForm.name}
                  onChange={e => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Policy Domain"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="catalog-tags">Tags</Label>
                <Input
                  id="catalog-tags"
                  value={createForm.tags}
                  onChange={e => setCreateForm(prev => ({ ...prev, tags: e.target.value }))}
                  placeholder="comma separated"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="catalog-description">Description</Label>
              <Textarea
                id="catalog-description"
                value={createForm.description}
                onChange={e => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                rows={4}
                placeholder="Describe this business domain."
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="catalog-owner">Business Owner</Label>
                <Input
                  id="catalog-owner"
                  value={createForm.owner}
                  onChange={e => setCreateForm(prev => ({ ...prev, owner: e.target.value }))}
                  placeholder="team or person"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="catalog-tech-owner">Tech Owner</Label>
                <Input
                  id="catalog-tech-owner"
                  value={createForm.technicalOwner}
                  onChange={e => setCreateForm(prev => ({ ...prev, technicalOwner: e.target.value }))}
                  placeholder="team or person"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Sensitivity</Label>
                <Select
                  value={createForm.sensitivity}
                  onValueChange={value => setCreateForm(prev => ({ ...prev, sensitivity: value as CatalogSensitivity }))}
                >
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
                <Select
                  value={createForm.status}
                  onValueChange={value => setCreateForm(prev => ({ ...prev, status: value as CatalogStatus }))}
                >
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateCatalogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateCatalog}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={aiPathOpen} onOpenChange={setAiPathOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>AI Discovery Path</DialogTitle>
            <DialogDescription>Browse a step-by-step discovery path from domain to data mart.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="w-full">
              <Select
                value={selectedCatalog?.id ?? ''}
                onValueChange={value => {
                  const found = catalogs.find(c => c.id === value) ?? null;
                  setSelectedCatalog(found);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a catalog" />
                </SelectTrigger>
                <SelectContent>
                  {catalogs.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Catalog</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  {selectedCatalog ? (
                    <>
                      <div className="font-semibold">{selectedCatalog.name}</div>
                      <div className="text-muted-foreground">{selectedCatalog.description}</div>
                      <div className="pt-2 flex flex-wrap gap-2">
                        {selectedCatalog.tags.map(tag => (
                          <Badge key={tag} variant="secondary">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="text-muted-foreground">Select a catalog to start.</div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Topics</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[44vh] pr-3">
                    <div className="space-y-2">
                      {(selectedCatalog?.topics ?? []).map(topic => (
                        <div key={topic.id} className="p-3 rounded-lg border bg-muted/20">
                          <div className="flex items-center justify-between gap-2">
                            <div className="font-medium truncate">{topic.name}</div>
                            <Badge className={cn('border-0', topicTypeConfig[topic.type].className)}>
                              {topicTypeConfig[topic.type].label}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{topic.description}</div>
                        </div>
                      ))}
                      {(selectedCatalog?.topics ?? []).length === 0 && <div className="text-muted-foreground text-sm">-</div>}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Spaces</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[44vh] pr-3">
                    <div className="space-y-2">
                      {(selectedCatalog?.relatedSpaces ?? []).map(space => (
                        <div key={space.id} className="p-3 rounded-lg border bg-muted/20">
                          <div className="flex items-center justify-between gap-2">
                            <div className="font-medium truncate">{space.name}</div>
                            <Badge variant="outline">{space.type === 'data_mart' ? 'Mart' : 'Connected'}</Badge>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{space.description}</div>
                        </div>
                      ))}
                      {(selectedCatalog?.relatedSpaces ?? []).length === 0 && <div className="text-muted-foreground text-sm">-</div>}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BusinessDomainMap;
