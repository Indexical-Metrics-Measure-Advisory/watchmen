import { useState, useRef, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { 
  Database, 
  Globe, 
  Search, 
  GitBranch, 
  Package, 
  BarChart3, 
  FileText,
  Clock,
  CheckCircle,
  AlertTriangle,
  Server,
  Layers,
  Activity,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Building2,
  ArrowLeft,
  TrendingUp,
  Users,
  Briefcase,
  Shield,
  Wallet,
  AlertCircle,
  Book
} from "lucide-react";
import { 
  DataZone, DataNode, DataFlow, DataZoneFlow, 
  DATA_ZONES, DATAZONE_FLOWS, DATA_NODES, DATA_FLOWS 
} from "./model/LineageData";









type ViewMode = 'overview' | 'detail';

// Helper for smooth step path
const getSmoothStepPath = (x1: number, y1: number, x2: number, y2: number) => {
  const r = 20; // Corner radius
  const midY = (y1 + y2) / 2;
  const dy = y2 - y1;
  const dx = x2 - x1;

  // If vertical distance is small, use straight line
  if (Math.abs(dy) < 40) {
    return `M ${x1} ${y1} L ${x2} ${y2}`;
  }

  // Direction for horizontal segment
  const dirX = dx > 0 ? 1 : -1;
  // Limit radius by horizontal distance
  const effectiveR = Math.min(Math.abs(dx) / 2, r);
  
  // If almost vertical, use straight line
  if (Math.abs(dx) < 2) {
      return `M ${x1} ${y1} L ${x2} ${y2}`;
  }

  // Path: Vertical -> Arc -> Horizontal -> Arc -> Vertical
  // Note: We need to handle Up vs Down direction for the Y arc
  const dirY = dy > 0 ? 1 : -1;
  
  return [
    `M ${x1} ${y1}`,
    `L ${x1} ${midY - dirY * effectiveR}`,
    `Q ${x1} ${midY} ${x1 + dirX * effectiveR} ${midY}`,
    `L ${x2 - dirX * effectiveR} ${midY}`,
    `Q ${x2} ${midY} ${x2} ${midY + dirY * effectiveR}`,
    `L ${x2} ${y2}`
  ].join(' ');
};

export function DataLineageMap() {
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [selectedZone, setSelectedZone] = useState<DataZone | null>(null);
  const [selectedNode, setSelectedNode] = useState<DataNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [zoom, setZoom] = useState(0.6);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [nodePositions, setNodePositions] = useState<Map<string, { x: number; y: number }>>(new Map());
  const [zonePositions, setZonePositions] = useState<Map<string, { x: number; y: number }>>(new Map());

  // Get nodes for current view - memoized to prevent infinite loops
  const visibleNodes = useMemo(() => {
    return viewMode === 'detail' && selectedZone 
      ? DATA_NODES.filter(node => node.dataZoneId === selectedZone.id)
      : [];
  }, [viewMode, selectedZone]);

  const getZoneIcon = (iconName: string) => {
    switch(iconName) {
      case 'briefcase': return <Briefcase className="w-6 h-6" />;
      case 'trending': return <TrendingUp className="w-6 h-6" />;
      case 'users': return <Users className="w-6 h-6" />;
      case 'building': return <Building2 className="w-6 h-6" />;
      case 'shield': return <Shield className="w-6 h-6" />;
      case 'package': return <Package className="w-6 h-6" />;
      case 'wallet': return <Wallet className="w-6 h-6" />;
      case 'alert-circle': return <AlertCircle className="w-6 h-6" />;
      case 'file-text': return <FileText className="w-6 h-6" />;
      case 'database': return <Database className="w-6 h-6" />;
      case 'book': return <Book className="w-6 h-6" />;
      case 'globe': return <Globe className="w-6 h-6" />;
      default: return <Building2 className="w-6 h-6" />;
    }
  };

  const getZoneColor = (color: string, highlighted?: boolean) => {
    if (highlighted) return 'border-yellow-400 bg-yellow-50 shadow-xl scale-105';
    
    switch(color) {
      case 'blue': return 'border-blue-300 bg-blue-50 hover:border-blue-500 hover:shadow-lg';
      case 'purple': return 'border-purple-300 bg-purple-50 hover:border-purple-500 hover:shadow-lg';
      case 'orange': return 'border-orange-300 bg-orange-50 hover:border-orange-500 hover:shadow-lg';
      case 'green': return 'border-green-300 bg-green-50 hover:border-green-500 hover:shadow-lg';
      case 'indigo': return 'border-indigo-300 bg-indigo-50 hover:border-indigo-500 hover:shadow-lg';
      case 'cyan': return 'border-cyan-300 bg-cyan-50 hover:border-cyan-500 hover:shadow-lg';
      case 'red': return 'border-red-300 bg-red-50 hover:border-red-500 hover:shadow-lg';
      case 'gray': return 'border-gray-300 bg-gray-50 hover:border-gray-500 hover:shadow-lg';
      default: return 'border-gray-300 bg-gray-50 hover:border-gray-500 hover:shadow-lg';
    }
  };

  const getZoneBadgeColor = (color: string) => {
    switch(color) {
      case 'blue': return 'bg-blue-500';
      case 'purple': return 'bg-purple-500';
      case 'orange': return 'bg-orange-500';
      case 'green': return 'bg-green-500';
      case 'indigo': return 'bg-indigo-500';
      case 'cyan': return 'bg-cyan-500';
      case 'red': return 'bg-red-500';
      case 'gray': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getNodesByType = (type: string) => {
    return visibleNodes.filter(node => node.type === type);
  };

  const getConnectedNodes = (nodeId: string) => {
    const incoming = DATA_FLOWS.filter(f => f.to === nodeId).map(f => f.from);
    const outgoing = DATA_FLOWS.filter(f => f.from === nodeId).map(f => f.to);
    return { incoming, outgoing };
  };

  const isNodeHighlighted = (nodeId: string): boolean => {
    if (!selectedNode && !hoveredNode) return false;
    const targetNode = selectedNode?.id || hoveredNode;
    if (targetNode === nodeId) return true;
    
    const { incoming, outgoing } = getConnectedNodes(targetNode || '');
    return incoming.includes(nodeId) || outgoing.includes(nodeId);
  };

  const isFlowHighlighted = (flow: DataFlow): boolean => {
    if (!selectedNode && !hoveredNode) return false;
    const targetNode = selectedNode?.id || hoveredNode;
    return flow.from === targetNode || flow.to === targetNode;
  };

  const isZoneFlowHighlighted = (flow: DataZoneFlow): boolean => {
    if (!selectedZone && !hoveredNode) return false;
    const targetZone = selectedZone?.id || hoveredNode;
    return flow.from === targetZone || flow.to === targetZone;
  };

  const getNodeIcon = (category?: string) => {
    switch(category) {
      case 'database': return <Database className="w-4 h-4" />;
      case 'api': return <Globe className="w-4 h-4" />;
      case 'etl': return <GitBranch className="w-4 h-4" />;
      case 'transform': return <Layers className="w-4 h-4" />;
      case 'staging': return <Server className="w-4 h-4" />;
      case 'metric': return <BarChart3 className="w-4 h-4" />;
      case 'dataset': return <Package className="w-4 h-4" />;
      case 'report': return <FileText className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const getStatusIcon = (status?: string) => {
    switch(status) {
      case 'healthy': return <CheckCircle className="w-3 h-3 text-green-600" />;
      case 'warning': return <AlertTriangle className="w-3 h-3 text-yellow-600" />;
      case 'error': return <AlertTriangle className="w-3 h-3 text-red-600" />;
      default: return null;
    }
  };

  const getStatusColor = (status?: string) => {
    switch(status) {
      case 'healthy': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  const getNodeColor = (category?: string, highlighted?: boolean) => {
    if (highlighted) return 'border-yellow-400 bg-yellow-50 shadow-lg scale-105';
    
    switch(category) {
      case 'database': 
      case 'api': 
        return 'border-blue-200 bg-blue-50 hover:border-blue-400';
      case 'etl': 
      case 'transform': 
        return 'border-purple-200 bg-purple-50 hover:border-purple-400';
      case 'staging': 
        return 'border-orange-200 bg-orange-50 hover:border-orange-400';
      case 'metric': 
      case 'dataset': 
      case 'report': 
        return 'border-green-200 bg-green-50 hover:border-green-400';
      default: 
        return 'border-gray-200 bg-gray-50 hover:border-gray-400';
    }
  };

  // Helper to arrange nodes with heaviest in the middle
  const arrangeIdeally = <T extends { id: string }>(items: T[], weightFn: (item: T) => number): T[] => {
    const sorted = [...items].sort((a, b) => weightFn(b) - weightFn(a));
    const result: T[] = new Array(items.length);
    let left = Math.floor((items.length - 1) / 2);
    let right = left + 1;
    
    sorted.forEach((item, i) => {
      if (i % 2 === 0) {
        result[left] = item;
        left--;
      } else {
        result[right] = item;
        right++;
      }
    });
    return result;
  };

  // Calculate DataZone positions (Overview mode)
  useEffect(() => {
    if (viewMode === 'overview') {
      const positions = new Map<string, { x: number; y: number }>();
      
      const centerX = 1500;
      const startY = 300;
      const levelHeight = 400; // Vertical gap between levels
      const nodeSpacing = 450; // Horizontal gap between nodes

      // Define levels
      // Level 0: Core/Master (PTY, PRD, SC)
      // Level 1: Business Ops (PA, UW, PROP)
      // Level 2: Processing/Finance (CLM, BCP, ILP, PAC)
      // Level 3: Others
      const getZoneLevel = (zoneId: string) => {
        if (['cat-003', 'cat-005', 'cat-006'].includes(zoneId)) return 0;
        if (['cat-001', 'cat-007', 'cat-010'].includes(zoneId)) return 1;
        if (['cat-002', 'cat-004', 'cat-008', 'cat-009'].includes(zoneId)) return 2;
        return 3;
      };

      const levels: DataZone[][] = [[], [], [], []];
      DATA_ZONES.forEach(zone => {
        const level = getZoneLevel(zone.id);
        if (levels[level]) levels[level].push(zone);
        else levels[3].push(zone); // Fallback
      });

      // Arrange and position
      levels.forEach((levelZones, levelIndex) => {
        // Arrange: most nodes (nodeCount) in middle
        const arrangedZones = arrangeIdeally(levelZones, z => z.nodeCount);
        
        const count = arrangedZones.length;
        const levelWidth = (count - 1) * nodeSpacing;
        const startX = centerX - levelWidth / 2;

        arrangedZones.forEach((zone, index) => {
          const x = startX + index * nodeSpacing;
          const y = startY + levelIndex * levelHeight;
          positions.set(zone.id, { x, y });
        });
      });

      setZonePositions(positions);
    }
  }, [viewMode]);

  // Calculate node positions (Detail mode)
  useEffect(() => {
    if (viewMode === 'detail' && selectedZone) {
      const positions = new Map<string, { x: number; y: number }>();
      
      const layers = [
        visibleNodes.filter(node => node.type === 'source'),
        visibleNodes.filter(node => node.type === 'pipeline'),
        visibleNodes.filter(node => node.type === 'intermediate'),
        visibleNodes.filter(node => node.type === 'output'),
      ];

      const layerHeight = 300; // Vertical gap between layers
      const nodeWidth = 250;   // Horizontal gap between nodes
      const centerX = 800;     // Center of the view
      const startY = 150;      // Top margin

      layers.forEach((layer, layerIndex) => {
        // Calculate weight (connections) for sorting
        const getWeight = (node: DataNode) => {
           const incoming = DATA_FLOWS.filter(f => f.to === node.id).length;
           const outgoing = DATA_FLOWS.filter(f => f.from === node.id).length;
           return incoming + outgoing;
        };

        // Arrange nodes: heavily connected nodes in the middle
        const arrangedNodes = arrangeIdeally(layer, getWeight);

        const count = arrangedNodes.length;
        const layerWidth = (count - 1) * nodeWidth;
        const startX = centerX - layerWidth / 2;
        
        arrangedNodes.forEach((node, nodeIndex) => {
          const x = startX + nodeIndex * nodeWidth;
          const y = startY + layerIndex * layerHeight;
          positions.set(node.id, { x, y });
        });
      });

      setNodePositions(positions);
    }
  }, [viewMode, selectedZone, visibleNodes]);

  // Auto-center scroll view
  useEffect(() => {
    if (scrollRef.current) {
      const container = scrollRef.current;
      const { clientWidth, clientHeight } = container;
      
      let targetX = 0;
      let targetY = 0;

      if (viewMode === 'overview') {
        // Overview Center: X=1500, Y approx 800 (middle of content)
        targetX = 1500 - clientWidth / 2;
        targetY = 800 - clientHeight / 2;
      } else {
        // Detail Center: X=800, Y approx 600
        targetX = 800 - clientWidth / 2;
        targetY = 600 - clientHeight / 2;
      }

      // Small timeout to ensure layout is ready
      setTimeout(() => {
        container.scrollTo({
          left: Math.max(0, targetX),
          top: Math.max(0, targetY),
          behavior: 'smooth'
        });
      }, 100);
    }
  }, [viewMode]);

  const handleZoneClick = (zone: DataZone) => {
    setSelectedZone(zone);
    setViewMode('detail');
    setSelectedNode(null);
  };

  const handleBackToOverview = () => {
    setViewMode('overview');
    setSelectedZone(null);
    setSelectedNode(null);
    setHoveredNode(null);
    setSearchTerm("");
    setZoom(0.6);
  };

  // Render DataZone connections (Overview mode)
  const renderZoneConnections = () => {
    return (
      <svg 
        className="absolute inset-0 pointer-events-none" 
        style={{ width: '100%', height: '100%', zIndex: 1, overflow: 'visible' }}
      >
        <style>
          {`
            @keyframes flowAnimation {
              to {
                stroke-dashoffset: -20;
              }
            }
            .flow-line-animated {
              animation: flowAnimation 1s linear infinite;
            }
          `}
        </style>
        <defs>
          <marker
            id="zone-arrowhead"
            markerWidth="12"
            markerHeight="12"
            refX="10"
            refY="4"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M0,0 L0,8 L10,4 z" fill="#64748b" />
          </marker>
          <marker
            id="zone-arrowhead-highlighted"
            markerWidth="12"
            markerHeight="12"
            refX="10"
            refY="4"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M0,0 L0,8 L10,4 z" fill="#fbbf24" />
          </marker>
        </defs>
        
        {DATAZONE_FLOWS.map((flow, index) => {
          const fromPos = zonePositions.get(flow.from);
          const toPos = zonePositions.get(flow.to);
          
          if (!fromPos || !toPos) return null;
          
          const isHighlighted = isZoneFlowHighlighted(flow);
          const strokeColor = isHighlighted ? '#fbbf24' : '#64748b';
          const strokeWidth = isHighlighted ? 3 : 2;
          const opacity = isHighlighted ? 1 : (selectedZone ? 0.3 : 0.7);
          
          // Vertical layout connection logic
          const h = 80;  // Half height (approx)
          
          // Connect from bottom of source to top of target
          const startX = fromPos.x;
          const startY = fromPos.y + h;
          const endX = toPos.x;
          const endY = toPos.y - h;

          const path = getSmoothStepPath(startX, startY, endX, endY);
          
          // Calculate midpoint for label
          const midX = (startX + endX) / 2;
          const midY = (startY + endY) / 2;
          
          return (
            <g key={`${flow.from}-${flow.to}-${index}`}>
              <path
                d={path}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                fill="none"
                opacity={opacity}
                strokeDasharray={isHighlighted ? "5,5" : "none"}
                className={`transition-all duration-300 ${isHighlighted ? 'flow-line-animated' : ''}`}
                markerEnd={`url(#${isHighlighted ? 'zone-arrowhead-highlighted' : 'zone-arrowhead'})`}
              />
              
              {isHighlighted && (
                <g>
                  <rect
                    x={midX - 45}
                    y={midY - 12}
                    width="90"
                    height="24"
                    fill="white"
                    stroke="#fbbf24"
                    strokeWidth="2"
                    rx="6"
                  />
                  <text
                    x={midX}
                    y={midY + 4}
                    textAnchor="middle"
                    className="text-xs fill-gray-600"
                    style={{ fontSize: '11px' }}
                  >
                    {flow.flowCount} flows
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
    );
  };

  // Render node connections (Detail mode)
  const renderNodeConnections = () => {
    const relevantFlows = DATA_FLOWS.filter(flow => {
      const fromNode = DATA_NODES.find(n => n.id === flow.from);
      const toNode = DATA_NODES.find(n => n.id === flow.to);
      return fromNode?.dataZoneId === selectedZone?.id && toNode?.dataZoneId === selectedZone?.id;
    });

    return (
      <svg 
        className="absolute inset-0 pointer-events-none" 
        style={{ width: '100%', height: '100%', zIndex: 1, overflow: 'visible' }}
      >
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="10"
            refX="9"
            refY="3"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M0,0 L0,6 L9,3 z" fill="#94a3b8" />
          </marker>
          <marker
            id="arrowhead-highlighted"
            markerWidth="10"
            markerHeight="10"
            refX="9"
            refY="3"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M0,0 L0,6 L9,3 z" fill="#fbbf24" />
          </marker>
        </defs>
        
        {relevantFlows.map((flow, index) => {
          const fromPos = nodePositions.get(flow.from);
          const toPos = nodePositions.get(flow.to);
          
          if (!fromPos || !toPos) return null;
          
          const isHighlighted = isFlowHighlighted(flow);
          const strokeColor = isHighlighted ? '#fbbf24' : '#94a3b8';
          const strokeWidth = isHighlighted ? 2.5 : 1.5;
          const opacity = isHighlighted ? 1 : (selectedNode || hoveredNode ? 0.3 : 0.6);
          
          const nodeHalfHeight = 24; // Approx half height of node
          
          // Vertical flow: Top to Bottom
          const startX = fromPos.x;
          const startY = fromPos.y + nodeHalfHeight;
          const endX = toPos.x;
          const endY = toPos.y - nodeHalfHeight;
          
          const path = getSmoothStepPath(startX, startY, endX, endY);
          
          // Calculate midpoint
          const midX = (startX + endX) / 2;
          const midY = (startY + endY) / 2;

          return (
            <g key={`${flow.from}-${flow.to}-${index}`}>
              <path
                d={path}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                fill="none"
                opacity={opacity}
                markerEnd={`url(#${isHighlighted ? 'arrowhead-highlighted' : 'arrowhead'})`}
                className="transition-all duration-300"
              />
            </g>
          );
        })}
      </svg>
    );
  };

  const renderZone = (zone: DataZone) => {
    const pos = zonePositions.get(zone.id);
    if (!pos) return null;

    const isHighlighted = selectedZone?.id === zone.id || hoveredNode === zone.id;

    return (
      <div
        key={zone.id}
        className={`
          absolute w-80 p-6 rounded-xl border-3 cursor-pointer transition-all duration-300
          ${isHighlighted ? getZoneColor(zone.color, true) : getZoneColor(zone.color)}
        `}
        style={{
          left: `${pos.x - 160}px`,
          top: `${pos.y - 80}px`,
        }}
        onClick={() => handleZoneClick(zone)}
        onMouseEnter={() => setHoveredNode(zone.id)}
        onMouseLeave={() => setHoveredNode(null)}
      >
        <div className="flex items-start gap-4">
          <div className={`
            w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0
            ${getZoneBadgeColor(zone.color)} text-white shadow-lg
          `}>
            {getZoneIcon(zone.icon)}
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-gray-900">{zone.name}</h3>
                <p className="text-sm text-gray-600 mt-0.5">{zone.department}</p>
              </div>
              {getStatusIcon(zone.status)}
            </div>
            <p className="text-xs text-gray-500 mt-2 line-clamp-2">{zone.description}</p>
          </div>
        </div>
        
        <div className="mt-4 flex items-center justify-between text-sm">
          <div className="flex items-center gap-1 text-gray-600">
            <Activity className="w-4 h-4" />
            <span className="font-medium">{zone.nodeCount} nodes</span>
          </div>
        </div>
        
        <div className={`absolute -top-2 -right-2 w-4 h-4 rounded-full ${getStatusColor(zone.status)} border-2 border-white shadow-sm`}></div>
      </div>
    );
  };

  const renderNode = (node: DataNode) => {
    const pos = nodePositions.get(node.id);
    if (!pos) return null;

    const isHighlighted = isNodeHighlighted(node.id);
    const isSelected = selectedNode?.id === node.id;
    const isHovered = hoveredNode === node.id;

    return (
      <div
        key={node.id}
        className={`
          absolute w-48 p-3 rounded-lg border-2 cursor-pointer transition-all duration-300
          ${isSelected ? 'border-blue-500 bg-blue-50 shadow-xl z-[30] scale-110' : 
            isHighlighted ? getNodeColor(node.category, true) + ' z-[20]' :
            getNodeColor(node.category) + ' z-[10]'}
        `}
        style={{
          left: `${pos.x - 96}px`,
          top: `${pos.y - 55}px`,
        }}
        onClick={() => setSelectedNode(node)}
        onMouseEnter={() => setHoveredNode(node.id)}
        onMouseLeave={() => setHoveredNode(null)}
      >
        <div className="flex items-start gap-2">
          <div className={`
            w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
            ${node.category === 'database' || node.category === 'api' ? 'bg-blue-500 text-white' :
              node.category === 'etl' || node.category === 'transform' ? 'bg-purple-500 text-white' :
              node.category === 'staging' ? 'bg-orange-500 text-white' :
              'bg-green-500 text-white'}
          `}>
            {getNodeIcon(node.category)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-1">
              <h4 className="font-semibold text-xs text-gray-900 leading-tight">{node.name}</h4>
              {getStatusIcon(node.status)}
            </div>
            <p className="text-xs text-gray-600 mt-1 line-clamp-2">{node.description}</p>
          </div>
        </div>
        
        <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
          {node.lastUpdate && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {node.lastUpdate}
            </span>
          )}
        </div>
        
        <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${getStatusColor(node.status)} border-2 border-white`}></div>
      </div>
    );
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            {viewMode === 'detail' && (
              <Button variant="outline" size="sm" onClick={handleBackToOverview}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            )}
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">
                {viewMode === 'overview' ? 'Data Lineage Map' : `${selectedZone?.name} - Detail View`}
              </h2>
              <p className="text-gray-500 mt-1">
                {viewMode === 'overview' 
                  ? 'Cross-department data flow overview - Click a zone to explore'
                  : `Internal data flows within ${selectedZone?.department}`}
              </p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setZoom(Math.max(0.2, zoom - 0.1))}>
            <ZoomOut className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setZoom(0.6)}>
            <Maximize2 className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setZoom(Math.min(2.0, zoom + 0.1))}>
            <ZoomIn className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Main Visualization */}
        <div className="lg:col-span-4">
          <Card className="overflow-hidden border-0 shadow-lg ring-1 ring-slate-200">
            <CardContent className="p-0">
              <div 
                ref={containerRef}
                className="relative bg-slate-50 overflow-hidden"
                style={{ height: '700px' }}
              >
                <div 
                  ref={scrollRef}
                  className="w-full h-full overflow-auto"
                  style={{
                    backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)',
                    backgroundSize: '20px 20px',
                  }}
                >
                  <div style={{ 
                    transform: `scale(${zoom})`, 
                    transformOrigin: 'center top',
                    transition: 'transform 0.2s ease-out',
                    width: '100%',
                    height: '100%',
                    minWidth: '100%',
                    minHeight: '100%'
                  }}>
                {viewMode === 'overview' ? (
                  // Overview Mode - DataZones
                  <>
                    <div className="relative z-[5]" style={{ width: '100%', height: '2000px', minWidth: '3000px' }}>
                      {DATA_ZONES.map(zone => renderZone(zone))}
                    </div>
                    <div className="absolute inset-0 pointer-events-none z-[10]" style={{ width: '100%', height: '2000px', minWidth: '3000px' }}>
                      {renderZoneConnections()}
                    </div>
                  </>
                ) : (
                  // Detail Mode - Nodes within selected zone
                  <>
                    {/* Layer Headers - Vertical Layout */}
                    <div className="absolute top-0 left-4 bottom-0 w-32 flex flex-col pointer-events-none z-30 pt-[150px]">
                      <div className="h-[300px] relative">
                        <div className="absolute top-0 left-0">
                          <Badge className="bg-blue-500 hover:bg-blue-600 mb-1">Data Sources</Badge>
                          <p className="text-xs text-gray-500">{getNodesByType('source').length} sources</p>
                        </div>
                      </div>
                      <div className="h-[300px] relative">
                        <div className="absolute top-0 left-0">
                          <Badge className="bg-purple-500 hover:bg-purple-600 mb-1">Pipelines</Badge>
                          <p className="text-xs text-gray-500">{getNodesByType('pipeline').length} pipelines</p>
                        </div>
                      </div>
                      <div className="h-[300px] relative">
                        <div className="absolute top-0 left-0">
                          <Badge className="bg-orange-500 hover:bg-orange-600 mb-1">Intermediate</Badge>
                          <p className="text-xs text-gray-500">{getNodesByType('intermediate').length} tables</p>
                        </div>
                      </div>
                      <div className="h-[300px] relative">
                        <div className="absolute top-0 left-0">
                          <Badge className="bg-green-500 hover:bg-green-600 mb-1">Outputs</Badge>
                          <p className="text-xs text-gray-500">{getNodesByType('output').length} products</p>
                        </div>
                      </div>
                    </div>

                    <div className="relative z-[5]" style={{ width: '100%', height: '2000px', paddingTop: '80px', minWidth: '2000px' }}>
                      {visibleNodes.map(node => renderNode(node))}
                    </div>

                    <div className="absolute inset-0 pointer-events-none z-[10]" style={{ paddingTop: '80px', width: '100%', minWidth: '2000px' }}>
                      {renderNodeConnections()}
                    </div>
                  </>
                )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Details Panel */}
        <div className="space-y-4">
          {viewMode === 'overview' ? (
            // Overview Mode - Zone Details
            <Card>
              <CardHeader>
                <CardTitle className="text-base">DataZone Details</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedZone ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className={`
                        w-12 h-12 rounded-lg flex items-center justify-center
                        ${getZoneBadgeColor(selectedZone.color)} text-white
                      `}>
                        {getZoneIcon(selectedZone.icon)}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{selectedZone.name}</h4>
                        <p className="text-sm text-gray-500">{selectedZone.department}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-2 text-sm">
                      <div className="p-2 bg-slate-50 rounded">
                        <div className="text-gray-500 text-xs">Nodes</div>
                        <div className="font-medium">{selectedZone.nodeCount}</div>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">{selectedZone.description}</p>
                    <Button className="w-full" size="sm" onClick={() => setViewMode('detail')}>
                      View Nodes
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Globe className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>Select a DataZone to view details</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            // Detail Mode - Node Details
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Node Details</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedNode ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className={`
                        w-12 h-12 rounded-lg flex items-center justify-center
                        ${selectedNode.category === 'database' || selectedNode.category === 'api' ? 'bg-blue-500 text-white' :
                          selectedNode.category === 'etl' || selectedNode.category === 'transform' ? 'bg-purple-500 text-white' :
                          selectedNode.category === 'staging' ? 'bg-orange-500 text-white' :
                          'bg-green-500 text-white'}
                      `}>
                        {getNodeIcon(selectedNode.category)}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{selectedNode.name}</h4>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">{selectedNode.type}</Badge>
                          {getStatusIcon(selectedNode.status)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="p-2 bg-slate-50 rounded">
                        <div className="text-gray-500 text-xs">Last Update</div>
                        <div className="font-medium">{selectedNode.lastUpdate}</div>
                      </div>
                      {selectedNode.volume && (
                        <div className="p-2 bg-slate-50 rounded">
                          <div className="text-gray-500 text-xs">Volume</div>
                          <div className="font-medium">{selectedNode.volume}</div>
                        </div>
                      )}
                    </div>
                    
                    <p className="text-sm text-gray-600">{selectedNode.description}</p>
                    
                    <div className="pt-2 border-t">
                      <h5 className="text-xs font-semibold text-gray-900 mb-2">Lineage Stats</h5>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Upstream</span>
                          <span className="font-medium">{getConnectedNodes(selectedNode.id).incoming.length} nodes</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Downstream</span>
                          <span className="font-medium">{getConnectedNodes(selectedNode.id).outgoing.length} nodes</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Activity className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>Select a Node to view details</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
