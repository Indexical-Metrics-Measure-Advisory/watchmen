import { useState, useCallback, useRef, useEffect } from "react";
import ForceGraph2D from "react-force-graph-2d";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Filter,
  Database,
  Server,
  Settings,
  CheckCircle,
  AlertCircle,
  XCircle
} from "lucide-react";

interface GraphNode {
  id: string;
  name: string;
  type: 'product' | 'tenant' | 'quality' | 'customization';
  status?: 'production' | 'development' | 'deprecated';
  quality?: number;
  val?: number;
  color?: string;
}

interface GraphLink {
  source: string;
  target: string;
  type: 'owns' | 'uses' | 'customizes' | 'depends';
  value?: number;
}

export function AssetMap() {
  const fgRef = useRef<any>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [filterType, setFilterType] = useState<string>("all");
  const [highlightNodes, setHighlightNodes] = useState(new Set());
  const [highlightLinks, setHighlightLinks] = useState(new Set());
  const [hoverNode, setHoverNode] = useState<GraphNode | null>(null);

  // Graph data representing the entire data product ecosystem
  const graphData = {
    nodes: [
      // Data Products
      { id: 'dp-001', name: 'User Behavior', type: 'product', status: 'production', quality: 96, val: 30, color: '#3b82f6' },
      { id: 'dp-002', name: 'Sales Analytics', type: 'product', status: 'production', quality: 95, val: 28, color: '#10b981' },
      { id: 'dp-003', name: 'Customer Profile', type: 'product', status: 'development', quality: 87, val: 22, color: '#f59e0b' },
      { id: 'dp-004', name: 'Supply Chain', type: 'product', status: 'production', quality: 94, val: 26, color: '#3b82f6' },
      { id: 'dp-005', name: 'Marketing Campaign', type: 'product', status: 'deprecated', quality: 78, val: 18, color: '#6b7280' },
      
      // Tenants
      { id: 'tenant-cn', name: 'China Production', type: 'tenant', val: 25, color: '#8b5cf6' },
      { id: 'tenant-us', name: 'US Production', type: 'tenant', val: 25, color: '#8b5cf6' },
      { id: 'tenant-eu', name: 'Europe Production', type: 'tenant', val: 25, color: '#8b5cf6' },
      { id: 'tenant-jp', name: 'Japan Production', type: 'tenant', val: 25, color: '#8b5cf6' },
      
      // Quality Dimensions
      { id: 'q-complete', name: 'Completeness', type: 'quality', val: 15, color: '#ec4899' },
      { id: 'q-accuracy', name: 'Accuracy', type: 'quality', val: 15, color: '#ec4899' },
      { id: 'q-timely', name: 'Timeliness', type: 'quality', val: 15, color: '#ec4899' },
      { id: 'q-consistent', name: 'Consistency', type: 'quality', val: 15, color: '#ec4899' },
      
      // Customizations
      { id: 'cust-001', name: 'Schema Extension', type: 'customization', val: 12, color: '#f97316' },
      { id: 'cust-002', name: 'Localization', type: 'customization', val: 12, color: '#f97316' },
      { id: 'cust-003', name: 'GDPR Compliance', type: 'customization', val: 12, color: '#f97316' },
      { id: 'cust-004', name: 'Data Retention', type: 'customization', val: 12, color: '#f97316' },
    ] as GraphNode[],
    links: [
      // Products to Tenants
      { source: 'dp-001', target: 'tenant-cn', type: 'owns', value: 3 },
      { source: 'dp-001', target: 'tenant-us', type: 'owns', value: 3 },
      { source: 'dp-002', target: 'tenant-cn', type: 'owns', value: 3 },
      { source: 'dp-002', target: 'tenant-eu', type: 'owns', value: 3 },
      { source: 'dp-003', target: 'tenant-us', type: 'owns', value: 2 },
      { source: 'dp-004', target: 'tenant-jp', type: 'owns', value: 3 },
      { source: 'dp-005', target: 'tenant-cn', type: 'owns', value: 1 },
      
      // Products to Quality
      { source: 'dp-001', target: 'q-complete', type: 'depends', value: 2 },
      { source: 'dp-001', target: 'q-accuracy', type: 'depends', value: 2 },
      { source: 'dp-002', target: 'q-timely', type: 'depends', value: 2 },
      { source: 'dp-003', target: 'q-consistent', type: 'depends', value: 2 },
      
      // Customizations to Products
      { source: 'cust-001', target: 'dp-001', type: 'customizes', value: 2 },
      { source: 'cust-002', target: 'dp-002', type: 'customizes', value: 2 },
      { source: 'cust-003', target: 'dp-001', type: 'customizes', value: 2 },
      { source: 'cust-004', target: 'dp-003', type: 'customizes', value: 2 },
      
      // Customizations to Tenants
      { source: 'cust-001', target: 'tenant-cn', type: 'uses', value: 1 },
      { source: 'cust-002', target: 'tenant-cn', type: 'uses', value: 1 },
      { source: 'cust-003', target: 'tenant-eu', type: 'uses', value: 1 },
      { source: 'cust-004', target: 'tenant-us', type: 'uses', value: 1 },
    ] as GraphLink[],
  };

  const filteredData = (() => {
    if (filterType === "all") {
      return { nodes: graphData.nodes, links: graphData.links };
    }
    
    // Filter nodes by type
    const nodes = graphData.nodes.filter(n => n.type === filterType);
    const nodeIds = new Set(nodes.map(n => n.id));
    
    // Only include links where BOTH source and target exist in filtered nodes
    const links = graphData.links.filter(l => {
      return nodeIds.has(l.source) && nodeIds.has(l.target);
    });
    
    return { nodes, links };
  })();

  const handleNodeClick = useCallback((node: GraphNode) => {
    setSelectedNode(node);
    
    // Highlight connected nodes and links
    const connectedNodes = new Set();
    const connectedLinks = new Set();
    
    graphData.links.forEach((link: any) => {
      if (link.source.id === node.id || link.source === node.id) {
        connectedNodes.add(typeof link.target === 'object' ? link.target.id : link.target);
        connectedLinks.add(link);
      }
      if (link.target.id === node.id || link.target === node.id) {
        connectedNodes.add(typeof link.source === 'object' ? link.source.id : link.source);
        connectedLinks.add(link);
      }
    });
    
    setHighlightNodes(connectedNodes);
    setHighlightLinks(connectedLinks);
  }, [graphData.links]);

  const handleNodeHover = useCallback((node: GraphNode | null) => {
    setHoverNode(node);
  }, []);

  const paintNode = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const label = node.name;
    const fontSize = 12 / globalScale;
    const nodeColor = node.color || '#999';
    
    // Draw node circle
    ctx.beginPath();
    ctx.arc(node.x, node.y, node.val / 2, 0, 2 * Math.PI, false);
    ctx.fillStyle = highlightNodes.has(node.id) || hoverNode?.id === node.id 
      ? '#fbbf24' 
      : nodeColor;
    ctx.fill();
    
    // Draw border for selected or hovered nodes
    if (selectedNode?.id === node.id || hoverNode?.id === node.id) {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3 / globalScale;
      ctx.stroke();
    }
    
    // Draw status indicator for data products
    if (node.type === 'product' && node.status) {
      const iconSize = 8 / globalScale;
      ctx.beginPath();
      ctx.arc(node.x + node.val / 2 - iconSize / 2, node.y - node.val / 2 + iconSize / 2, iconSize / 2, 0, 2 * Math.PI, false);
      ctx.fillStyle = node.status === 'production' ? '#10b981' : 
                      node.status === 'development' ? '#f59e0b' : '#ef4444';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1 / globalScale;
      ctx.stroke();
    }
    
    // Draw label
    ctx.font = `${fontSize}px Sans-Serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#1f2937';
    ctx.fillText(label, node.x, node.y + node.val / 2 + fontSize + 2);
  }, [selectedNode, highlightNodes, hoverNode]);

  const paintLink = useCallback((link: any, ctx: CanvasRenderingContext2D) => {
    const isHighlighted = highlightLinks.has(link);
    
    ctx.strokeStyle = isHighlighted ? '#fbbf24' : 
                      link.type === 'owns' ? '#3b82f6' :
                      link.type === 'customizes' ? '#f97316' :
                      link.type === 'depends' ? '#ec4899' : '#94a3b8';
    ctx.lineWidth = isHighlighted ? 3 : (link.value || 1);
    ctx.globalAlpha = isHighlighted ? 1 : 0.4;
    
    ctx.beginPath();
    ctx.moveTo(link.source.x, link.source.y);
    ctx.lineTo(link.target.x, link.target.y);
    ctx.stroke();
    
    ctx.globalAlpha = 1;
  }, [highlightLinks]);

  const handleZoomIn = () => {
    if (fgRef.current) {
      fgRef.current.zoom(1.5, 400);
    }
  };

  const handleZoomOut = () => {
    if (fgRef.current) {
      fgRef.current.zoom(0.75, 400);
    }
  };

  const handleCenter = () => {
    if (fgRef.current) {
      fgRef.current.zoomToFit(400);
    }
  };

  useEffect(() => {
    // Center the graph on mount
    setTimeout(() => {
      handleCenter();
    }, 100);
  }, []);

  const getNodeIcon = (type: string) => {
    switch(type) {
      case 'product': return <Database className="w-4 h-4" />;
      case 'tenant': return <Server className="w-4 h-4" />;
      case 'customization': return <Settings className="w-4 h-4" />;
      default: return <CheckCircle className="w-4 h-4" />;
    }
  };

  const getStatusIcon = (status?: string) => {
    switch(status) {
      case 'production': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'development': return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      case 'deprecated': return <XCircle className="w-4 h-4 text-gray-600" />;
      default: return null;
    }
  };

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Global Asset Map</h2>
          <p className="text-gray-500 mt-1">Interactive visualization of data product ecosystem and relationships</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" size="sm" onClick={handleZoomOut}>
            <ZoomOut className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleZoomIn}>
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleCenter}>
            <Maximize2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Graph Visualization */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Network Graph</CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant={filterType === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterType("all")}
                  >
                    All
                  </Button>
                  <Button
                    variant={filterType === "product" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterType("product")}
                  >
                    Products
                  </Button>
                  <Button
                    variant={filterType === "tenant" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterType("tenant")}
                  >
                    Tenants
                  </Button>
                  <Button
                    variant={filterType === "customization" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterType("customization")}
                  >
                    Customizations
                  </Button>
                </div>
              </div>
              <CardDescription>Click on nodes to explore relationships and dependencies</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100">
                <ForceGraph2D
                  ref={fgRef}
                  graphData={filteredData}
                  nodeLabel="name"
                  nodeCanvasObject={paintNode}
                  linkCanvasObject={paintLink}
                  onNodeClick={handleNodeClick}
                  onNodeHover={handleNodeHover}
                  width={800}
                  height={600}
                  cooldownTicks={100}
                  onEngineStop={() => fgRef.current?.zoomToFit(400)}
                  linkDirectionalParticles={2}
                  linkDirectionalParticleWidth={link => highlightLinks.has(link) ? 4 : 0}
                  d3AlphaDecay={0.02}
                  d3VelocityDecay={0.3}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Details Panel */}
        <div className="space-y-6">
          {/* Selected Node Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Node Details</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedNode ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white"
                      style={{ backgroundColor: selectedNode.color }}
                    >
                      {getNodeIcon(selectedNode.type)}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{selectedNode.name}</h4>
                      <p className="text-sm text-gray-500 capitalize">{selectedNode.type}</p>
                    </div>
                  </div>

                  {selectedNode.status && (
                    <div className="flex items-center gap-2">
                      {getStatusIcon(selectedNode.status)}
                      <span className="text-sm capitalize">{selectedNode.status}</span>
                    </div>
                  )}

                  {selectedNode.quality && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">Quality Score</span>
                        <span className="text-sm font-medium text-gray-900">{selectedNode.quality}%</span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-green-500 to-blue-500 rounded-full" 
                          style={{ width: `${selectedNode.quality}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  <div className="pt-3 border-t">
                    <p className="text-xs text-gray-500 mb-2">Connected to {highlightNodes.size} nodes</p>
                    <Badge variant="outline" className="text-xs">{selectedNode.id}</Badge>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Filter className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Click a node to see details</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Legend */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Legend</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs font-medium text-gray-700 mb-2">Node Types</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                    <span className="text-xs text-gray-600">Data Products</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-purple-500"></div>
                    <span className="text-xs text-gray-600">Tenants</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-pink-500"></div>
                    <span className="text-xs text-gray-600">Quality Dimensions</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-orange-500"></div>
                    <span className="text-xs text-gray-600">Customizations</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t">
                <p className="text-xs font-medium text-gray-700 mb-2">Link Types</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-0.5 bg-blue-500"></div>
                    <span className="text-xs text-gray-600">Ownership</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-0.5 bg-orange-500"></div>
                    <span className="text-xs text-gray-600">Customization</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-0.5 bg-pink-500"></div>
                    <span className="text-xs text-gray-600">Dependency</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t">
                <p className="text-xs font-medium text-gray-700 mb-2">Status</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span className="text-xs text-gray-600">Production</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                    <span className="text-xs text-gray-600">Development</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-gray-500"></div>
                    <span className="text-xs text-gray-600">Deprecated</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total Nodes</span>
                <span className="font-medium text-gray-900">{graphData.nodes.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total Links</span>
                <span className="font-medium text-gray-900">{graphData.links.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Data Products</span>
                <span className="font-medium text-gray-900">
                  {graphData.nodes.filter(n => n.type === 'product').length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Tenants</span>
                <span className="font-medium text-gray-900">
                  {graphData.nodes.filter(n => n.type === 'tenant').length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Customizations</span>
                <span className="font-medium text-gray-900">
                  {graphData.nodes.filter(n => n.type === 'customization').length}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}