import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  ReactFlow, 
  Background, 
  Controls, 
  MiniMap, 
  Node, 
  Edge,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
  MarkerType
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { useSidebar } from '@/contexts/SidebarContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, LayoutDashboard } from 'lucide-react';
import { getAllMetrics } from '@/services/metricsManagementService';
import { metricsService } from '@/services/metricsService';
import { MetricDefinition } from '@/model/metricsManagement';
import { BIChartCard } from '@/model/biAnalysis';
import { useLocation } from 'react-router-dom';

// A simple deterministic layout algorithm for trees/DAGs
const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'TB') => {
  const nodeWidth = 280;
  const nodeHeight = 160;
  const rankSep = 100;
  const nodeSep = 50;

  // Find root nodes (no incoming edges)
  const incomingCount: Record<string, number> = {};
  const childrenMap: Record<string, string[]> = {};
  
  nodes.forEach(n => {
    incomingCount[n.id] = 0;
    childrenMap[n.id] = [];
  });
  
  edges.forEach(e => {
    if (incomingCount[e.target] !== undefined) {
      incomingCount[e.target]++;
    }
    if (childrenMap[e.source]) {
      childrenMap[e.source].push(e.target);
    }
  });

  const roots = nodes.filter(n => incomingCount[n.id] === 0).map(n => n.id);
  if (roots.length === 0 && nodes.length > 0) roots.push(nodes[0].id); // Fallback for cycles

  const levels: string[][] = [];
  const visited = new Set<string>();

  // BFS to assign levels
  let currentLevel = [...roots];
  while (currentLevel.length > 0) {
    levels.push(currentLevel);
    currentLevel.forEach(id => visited.add(id));
    
    const nextLevel = new Set<string>();
    currentLevel.forEach(id => {
      childrenMap[id].forEach(childId => {
        if (!visited.has(childId)) {
          nextLevel.add(childId);
        }
      });
    });
    currentLevel = Array.from(nextLevel);
  }

  // Assign positions based on levels
  const layoutedNodes = nodes.map(node => {
    let levelIndex = levels.findIndex(level => level.includes(node.id));
    if (levelIndex === -1) levelIndex = 0; // Fallback
    
    const levelNodes = levels[levelIndex];
    const indexInLevel = levelNodes.indexOf(node.id);
    const levelWidth = levelNodes.length * nodeWidth + (levelNodes.length - 1) * nodeSep;
    
    const x = (indexInLevel * (nodeWidth + nodeSep)) - (levelWidth / 2);
    const y = levelIndex * (nodeHeight + rankSep);
    
    return {
      ...node,
      position: { x, y }
    };
  });

  return { nodes: layoutedNodes, edges };
};

// Custom Node Component
interface MetricNodeData {
  label: string;
  type: string;
  value: number | string;
  changePercent?: number;
  yoyPercent?: number;
  trend?: 'up' | 'down' | 'stable';
}

const MetricNode = ({ data }: { data: MetricNodeData }) => {
  const isPositive = data.trend === 'up';
  const isNeutral = data.trend === 'stable';

  return (
    <div className="relative">
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-muted-foreground !-top-1.5" />
      <Card className="w-[280px] shadow-md border-border bg-card">
        <CardHeader className="p-4 pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium truncate" title={data.label}>
              {data.label}
            </CardTitle>
            <Badge variant="secondary" className="text-[10px] capitalize">
              {data.type}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="flex flex-col gap-2">
            <div className="text-2xl font-bold">{data.value || 'N/A'}</div>
            
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">MoM</span>
                <span className={`flex items-center ${isPositive ? 'text-emerald-500' : isNeutral ? 'text-muted-foreground' : 'text-rose-500'}`}>
                  {isPositive ? <TrendingUp className="w-3 h-3 mr-1" /> : isNeutral ? <Minus className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                  {data.changePercent || '0'}%
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">YoY</span>
                <span className="flex items-center text-emerald-500">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  {data.yoyPercent || '0'}%
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-muted-foreground !-bottom-1.5" />
    </div>
  );
};

const nodeTypes = {
  metricNode: MetricNode,
};

const MetricDependencyTree: React.FC = () => {
  const { collapsed } = useSidebar();
  const location = useLocation();
  const targetMetricIds = useMemo(() => {
    const cards = location.state?.cards || [];
    return Array.from(new Set(cards.map((c: BIChartCard) => c.metricId).filter(Boolean))) as string[];
  }, [location.state?.cards]);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAndBuildGraph = async () => {
      setIsLoading(true);
      try {
        const allMetrics = await getAllMetrics();
        
        const newNodes: Node[] = [];
        const newEdges: Edge[] = [];
        
        // Build nodes
        allMetrics.forEach((metric) => {
          newNodes.push({
            id: metric.name,
            type: 'metricNode',
            data: {
              label: metric.label || metric.name,
              type: metric.type,
              value: 'Loading...',
              changePercent: 0,
              yoyPercent: 0,
              trend: 'stable',
            },
            position: { x: 0, y: 0 },
          });

          // Build edges based on dependencies
          const addEdge = (source: string, target: string, label?: string) => {
            if (source && target) {
              newEdges.push({
                id: `e-${source}-${target}`,
                source,
                target,
                label,
                animated: true,
                style: { stroke: '#94a3b8', strokeWidth: 2, strokeDasharray: '5,5' },
                markerEnd: {
                  type: MarkerType.ArrowClosed,
                  color: '#94a3b8',
                },
              });
            }
          };

          if (metric.type === 'ratio') {
            if (metric.type_params?.numerator?.name) {
              addEdge(metric.type_params.numerator.name, metric.name, 'Numerator');
            }
            if (metric.type_params?.denominator?.name) {
              addEdge(metric.type_params.denominator.name, metric.name, 'Denominator');
            }
          } else if (metric.type === 'derived') {
            metric.type_params?.metrics?.forEach((m) => {
              if (m.name) addEdge(m.name, metric.name);
            });
          } else if (metric.type === 'cumulative') {
            if (metric.type_params?.cumulative_type_params?.metric?.name) {
              addEdge(metric.type_params.cumulative_type_params.metric.name, metric.name);
            }
          } else if (metric.type === 'conversion') {
            if (metric.type_params?.conversion_type_params?.base_metric?.name) {
              addEdge(metric.type_params.conversion_type_params.base_metric.name, metric.name, 'Base');
            }
            if (metric.type_params?.conversion_type_params?.conversion_metric?.name) {
              addEdge(metric.type_params.conversion_type_params.conversion_metric.name, metric.name, 'Conversion');
            }
          }
        });

        let filteredNodes = newNodes;
        let filteredEdges = newEdges;

        if (targetMetricIds.length > 0) {
          const relevantIds = new Set<string>(targetMetricIds);
          
          const outEdges: Record<string, string[]> = {};
          const inEdges: Record<string, string[]> = {};
          
          newNodes.forEach(n => {
            outEdges[n.id] = [];
            inEdges[n.id] = [];
          });
          
          newEdges.forEach(e => {
            if (outEdges[e.source]) outEdges[e.source].push(e.target);
            if (inEdges[e.target]) inEdges[e.target].push(e.source);
          });
          
          // Find dependencies (ancestors) - Go backwards (what these metrics depend on)
          const queue = [...targetMetricIds];
          const visitedUp = new Set<string>(targetMetricIds);
          while(queue.length > 0) {
            const curr = queue.shift()!;
            (inEdges[curr] || []).forEach(parent => {
               if (!visitedUp.has(parent)) {
                 visitedUp.add(parent);
                 queue.push(parent);
                 relevantIds.add(parent);
               }
            });
          }
          
          filteredNodes = newNodes.filter(n => relevantIds.has(n.id));
          filteredEdges = newEdges.filter(e => relevantIds.has(e.source) && relevantIds.has(e.target));
        }

        // Apply Layout
        const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(filteredNodes, filteredEdges);
        
        // Fetch actual values for the layouted nodes
        const nodesWithValues = await Promise.all(
          layoutedNodes.map(async (node) => {
            try {
              const res = await metricsService.getMetricValue({ metric: node.id });
              let val: number | string = 'N/A';
              if (res && res.data && res.data.length > 0 && res.data[0].length > 0) {
                const fetchedVal = res.data[0][0];
                if (typeof fetchedVal === 'number') {
                  val = Number.isInteger(fetchedVal) ? fetchedVal : fetchedVal.toFixed(2);
                } else if (fetchedVal !== null && fetchedVal !== undefined) {
                  val = String(fetchedVal);
                }
              }
              
              return {
                ...node,
                data: {
                  ...node.data,
                  value: val,
                }
              };
            } catch (err) {
              console.error(`Failed to fetch value for metric ${node.id}:`, err);
              return {
                ...node,
                data: {
                  ...node.data,
                  value: 'Error',
                }
              };
            }
          })
        );
        
        setNodes(nodesWithValues);
        setEdges(layoutedEdges);
      } catch (error) {
        console.error('Failed to load metrics for tree:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAndBuildGraph();
  }, [setNodes, setEdges, targetMetricIds]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Sidebar />
      <div className={`${collapsed ? 'pl-20' : 'pl-56'} flex-1 flex flex-col transition-[padding] duration-300`}>
        <Header />
        
        <main className="flex-1 flex flex-col p-6 h-[calc(100vh-64px)]">
          <div className="flex items-center gap-4 mb-6 shrink-0">
            <div className="p-3 bg-primary/10 rounded-xl">
              <LayoutDashboard className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Metric Dependency Tree</h1>
              <p className="text-sm text-muted-foreground">
                {targetMetricIds.length > 0 
                  ? 'Showing dependencies for metrics in the current Analysis Dashboard' 
                  : 'Visualize relationships and data flow between all your metrics'}
              </p>
            </div>
          </div>

          <div className="flex-1 w-full h-full border rounded-xl overflow-hidden bg-muted/10 relative min-h-[500px]">
            {isLoading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="absolute inset-0" style={{ width: '100%', height: '100%' }}>
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  nodeTypes={nodeTypes}
                  fitView
                  attributionPosition="bottom-right"
                >
                  <Background color="#ccc" gap={16} />
                  <Controls />
                  <MiniMap 
                    nodeColor={(n) => {
                      return '#e2e8f0';
                    }}
                    maskColor="rgba(0, 0, 0, 0.1)"
                  />
                </ReactFlow>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default MetricDependencyTree;
