import React, { useCallback, useMemo, useState, useEffect } from 'react';
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  ConnectionMode,
  Panel,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { RefreshCw, AlertCircle, Loader2, Eye, EyeOff, RotateCcw } from 'lucide-react';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { useFlowData } from '../../hooks/useFlowData';
import { nodeTypes } from './FlowNodes';
import { useToast } from '../../hooks/use-toast';
import { ModuleNodeData, ModelNodeData } from './FlowNodes';
import { CustomModuleEdge } from './CustomModuleEdge';

/**
 * ExecutionFlowDiagram component props interface
 * Defines all configurable properties for the component
 */
export interface ExecutionFlowDiagramProps {
  autoFetch?: boolean;
  onNodeClick?: (node: Node) => void;
  onConnect?: (connection: Connection) => void;
  height?: string | number;
  width?: string | number;
  showControls?: boolean;
  showMiniMap?: boolean;
  showBackground?: boolean;
  showRefreshButton?: boolean;
  className?: string;
}

/**
 * Component internal state interface
 * Manages expanded modules and animation states
 */
interface DiagramState {
  /** Set of currently expanded module IDs */
  expandedModules: Set<string>;
  /** Set of node IDs currently executing animations */
  animatingNodes: Set<string>;
  /** Set of module IDs highlighted by edge interactions */
  highlightedModules: Set<string>;
}

/**
 * Horizontal layout configuration interface
 * Defines all layout-related parameters
 */
interface HorizontalLayoutConfig {
  /** Horizontal spacing between modules */
  moduleSpacing: number;
  /** Vertical spacing between model nodes */
  modelVerticalSpacing: number;
  /** Horizontal offset from module to model */
  moduleToModelOffset: number;
  /** Layout starting position */
  startPosition: { x: number; y: number };
  /** Default node size */
  nodeSize: { width: number; height: number };
  /** Animation duration in milliseconds */
  animationDuration: number;
  /** Minimum distance between nodes */
  minNodeDistance: number;
  /** Edge margin */
  edgeMargin: number;
}

/**
 * Module layout information interface
 * Used to store module-related information during layout calculation
 */
interface ModuleLayoutInfo {
  /** Module node */
  module: Node<ModuleNodeData>;
  /** Number of models contained in the module */
  modelCount: number;
  /** Whether the module is expanded */
  isExpanded: boolean;
}

/**
 * Layout calculation result interface
 */
interface LayoutResult {
  /** Array of calculated nodes */
  nodes: Node[];
  /** Array of calculated edges */
  edges: Edge[];
}

/**
 * Module edge data interface for custom module-to-module edges.
 * Carries vertical offsets and rich metadata for hover/click interactions.
 */
interface ModuleEdgeData {
  type: 'module-dependency';
  level: number;
  sourceY: number;
  targetY: number;
  sourceId: string;
  targetId: string;
  sourceLabel?: string;
  targetLabel?: string;
  sourcePriority?: number;
  targetPriority?: number;
  onEdgeClick?: (sourceId: string, targetId: string) => void;
}

/**
 * Flow statistics interface
 */
interface FlowStatistics {
  /** Total number of modules */
  modules: number;
  /** Total number of models */
  models: number;
  /** Total number of connection edges */
  connections: number;
  /** Number of expanded modules */
  expanded: number;
}

/**
 * Horizontal layout configuration
 * Defines node spacing, starting position and other layout parameters
 */
const HORIZONTAL_LAYOUT: HorizontalLayoutConfig = {
  // Horizontal spacing between module nodes (increased to avoid overlap)
  moduleSpacing: 800,
  // Vertical spacing between model nodes (increased for better readability)
  modelVerticalSpacing: 200,
  // Horizontal offset from module to model (increased for clear separation)
  moduleToModelOffset: 300,
  // Starting position (adjusted to ensure complete display)
  startPosition: { x: 150, y: 250 },
  // Node size (used for layout calculation)
  nodeSize: { width: 220, height: 90 },
  // Animation duration
  animationDuration: 600,
  // Minimum node distance (prevent overlap)
  minNodeDistance: 120,
  // Edge margin
  edgeMargin: 50,
};

/**
 * Utility function to calculate horizontal layout positions
 * 
 * @param moduleNodes - Array of module nodes
 * @param expandedModules - Set of expanded module IDs
 * @param animatingNodes - Set of node IDs currently executing animations
 * @param getModelsByModule - Function to get model nodes by module ID
 * @returns Layout result containing calculated nodes and edges
 */
/**
 * Calculate horizontal layout for modules and models, and build edges.
 * Sorting strategy:
 * - Modules: ascending `priority`.
 * - Module-to-module edges: targets sorted by ascending `priority`; ties by DOM order (layout order).
 * - High-priority connections are rendered first and given more prominent styles.
 */
const calculateHorizontalLayout = (
  moduleNodes: Node<ModuleNodeData>[],
  expandedModules: Set<string>,
  animatingNodes: Set<string>,
  getModelsByModule: (moduleId: string) => Node<ModelNodeData>[],
  highlightedModules: Set<string>,
  onEdgeClick?: (sourceId: string, targetId: string) => void
): LayoutResult => {
  const layoutNodes: Node[] = [];
  const layoutEdges: Edge[] = [];
  
  // Sort module nodes by priority
  const sortedModules = [...moduleNodes].sort((a, b) => a.data.priority - b.data.priority);
  const moduleIndexMap = new Map<string, number>();
  sortedModules.forEach((m, idx) => moduleIndexMap.set(m.id, idx));
  
  // Calculate model count for each module, used for dynamic spacing adjustment
  const moduleModelCounts: ModuleLayoutInfo[] = sortedModules.map(module => ({
    module,
    modelCount: getModelsByModule(module.data.moduleId).length,
    isExpanded: expandedModules.has(module.data.moduleId)
  }));
  
  // Group modules by priority and stack vertically within each group
  const groupsMap = new Map<number, ModuleLayoutInfo[]>();
  moduleModelCounts.forEach(info => {
    const p = info.module.data.priority;
    const arr = groupsMap.get(p) || [];
    arr.push(info);
    groupsMap.set(p, arr);
  });

  const priorities = Array.from(groupsMap.keys()).sort((a, b) => a - b);
  const columnSpacing = Math.max(
    HORIZONTAL_LAYOUT.moduleSpacing,
    HORIZONTAL_LAYOUT.moduleToModelOffset + HORIZONTAL_LAYOUT.minNodeDistance
  );

  priorities.forEach((priorityValue, colIndex) => {
    const groupInfos = groupsMap.get(priorityValue)!;
    const columnX = HORIZONTAL_LAYOUT.startPosition.x + colIndex * columnSpacing;
    const totalHeight = (groupInfos.length - 1) * HORIZONTAL_LAYOUT.modelVerticalSpacing;
    const startY = HORIZONTAL_LAYOUT.startPosition.y - totalHeight / 2;

    groupInfos.forEach((moduleInfo, moduleIndex) => {
      const { module: moduleNode } = moduleInfo;
      const moduleY = startY + moduleIndex * HORIZONTAL_LAYOUT.modelVerticalSpacing;

      // Add module node (highlight-aware)
      const isHighlighted = highlightedModules.has(moduleNode.id) || highlightedModules.has(moduleNode.data.moduleId);
      const positionedModule: Node<ModuleNodeData> = {
        ...moduleNode,
        position: { x: columnX, y: moduleY },
        data: {
          ...moduleNode.data,
          isExpanded: expandedModules.has(moduleNode.data.moduleId),
          isAnimating: animatingNodes.has(moduleNode.id),
          childCount: getModelsByModule(moduleNode.data.moduleId).length,
        },
        style: {
          ...moduleNode.style,
          transition: `all ${HORIZONTAL_LAYOUT.animationDuration}ms ease-in-out`,
          zIndex: 10,
          boxShadow: isHighlighted ? '0 0 0 3px #f59e0b' : moduleNode.style?.boxShadow,
        },
      };
      layoutNodes.push(positionedModule);

      // If module is expanded, add its model nodes beneath/right of the module
      if (expandedModules.has(moduleNode.data.moduleId)) {
        const models = getModelsByModule(moduleNode.data.moduleId);
        const modelsTotalHeight = (models.length - 1) * HORIZONTAL_LAYOUT.modelVerticalSpacing;
        const modelsStartY = moduleY - modelsTotalHeight / 2;

        models.forEach((modelNode, modelIdx) => {
          const modelX = columnX + HORIZONTAL_LAYOUT.moduleToModelOffset;
          const modelY = modelsStartY + modelIdx * HORIZONTAL_LAYOUT.modelVerticalSpacing;

          const positionedModel: Node<ModelNodeData> = {
            ...modelNode,
            position: { x: modelX, y: modelY },
            data: {
              ...modelNode.data,
              level: 1,
              isAnimating: animatingNodes.has(modelNode.id),
            },
            style: {
              ...modelNode.style,
              transition: `all ${HORIZONTAL_LAYOUT.animationDuration}ms ease-in-out`,
              opacity: 1,
              zIndex: 5,
            },
          };

          layoutNodes.push(positionedModel);

          // Add connection edge from module to model
          layoutEdges.push({
            id: `edge-${moduleNode.id}-${modelNode.id}`,
            source: moduleNode.id,
            target: modelNode.id,
            sourceHandle: 'module-output',
            targetHandle: 'model-input',
            type: 'smoothstep',
            animated: false,
            style: { stroke: '#94a3b8', strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' },
            data: { type: 'module-model', level: 1 },
          });
        });
      }
    });
  });

  // Create priority-based edges: connect modules from each priority group to the next
  for (let gi = 0; gi < priorities.length - 1; gi++) {
    const currentGroup = groupsMap.get(priorities[gi])!;
    const nextGroup = groupsMap.get(priorities[gi + 1])!;

    currentGroup.forEach((srcInfo, idx) => {
      const srcModule = srcInfo.module;
      const targetIdx = Math.min(idx, nextGroup.length - 1);
      const tgtInfo = nextGroup[targetIdx];
      const tgtModule = tgtInfo.module;

      // Vertical offset tie-breaker: center-based spread within group
      const srcYOffset = (idx - (currentGroup.length - 1) / 2) * 20;
      const tgtYOffset = (targetIdx - (nextGroup.length - 1) / 2) * 20;

      const isHighPriority = srcModule.data.priority <= 1 || tgtModule.data.priority <= 1;
      const edgeStyle: React.CSSProperties = isHighPriority
        ? { stroke: '#1d4ed8', strokeWidth: 3 }
        : { stroke: '#3b82f6', strokeWidth: 2, strokeDasharray: '6,4' };

      const edgeData: ModuleEdgeData = {
        type: 'module-dependency',
        level: 0,
        sourceY: srcYOffset,
        targetY: tgtYOffset,
        sourceId: srcModule.id,
        targetId: tgtModule.id,
        sourceLabel: srcModule.data.label,
        targetLabel: tgtModule.data.label,
        sourcePriority: srcModule.data.priority,
        targetPriority: tgtModule.data.priority,
        onEdgeClick,
      };

      layoutEdges.push({
        id: `module-edge-${srcModule.id}-${tgtModule.id}`,
        source: srcModule.id,
        target: tgtModule.id,
        sourceHandle: 'module-output',
        targetHandle: 'module-input',
        type: 'custom-module-edge',
        animated: isHighPriority,
        style: edgeStyle,
        markerEnd: { type: MarkerType.ArrowClosed, color: edgeStyle.stroke as string },
        data: edgeData,
      });
    });
  }

  return { nodes: layoutNodes, edges: layoutEdges };
};

function ExecutionFlowDiagram(props: ExecutionFlowDiagramProps) {
  // console.log('=== EXECUTION FLOW DIAGRAM COMPONENT MOUNTED ===');

  const {
    autoFetch = true,
    onNodeClick,
    onConnect,
    height = 600,
    width = '100%',
    showControls = true,
    showMiniMap = true,
    showBackground = true,
    showRefreshButton = true,
    className = '',
  } = props;

  // ALL HOOKS MUST BE CALLED BEFORE ANY EARLY RETURNS
  const { toast } = useToast();
  const { isLoading, error, refetch, clearCache, getModuleNodes, getModelsByModule } = useFlowData(autoFetch);

  // Component state management
  const [state, setState] = useState<DiagramState>({
    expandedModules: new Set(),
    animatingNodes: new Set(),
    highlightedModules: new Set(),
  });

  // ReactFlow state management
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const edgeTypes = useMemo(() => ({
    'custom-module-edge': CustomModuleEdge,
  }), []);

  // Edge click interaction: highlight connected modules and auto-clear
  const handleEdgeClick = useCallback((sourceId: string, targetId: string) => {
    setState(prev => {
      const next = { ...prev };
      const setHL = new Set<string>(next.highlightedModules);
      setHL.add(sourceId);
      setHL.add(targetId);
      next.highlightedModules = setHL;
      return next;
    });
    window.setTimeout(() => {
      setState(prev => ({ ...prev, highlightedModules: new Set() }));
    }, 1200);
  }, []);

  // Calculate visible nodes and edges based on expansion state
  const visibleContent = useMemo(() => {
    // console.log('=== CALCULATING VISIBLE CONTENT ===');
    // console.log('Expanded modules:', state.expandedModules);

    const moduleNodes = getModuleNodes();
    // console.log('Available module nodes:', moduleNodes.length);

    const result = calculateHorizontalLayout(
      moduleNodes,
      state.expandedModules,
      state.animatingNodes,
      getModelsByModule,
      state.highlightedModules,
      handleEdgeClick
    );



    // result.nodes.forEach((node, index) => {
    //   console.log(`Node ${index + 1}:`, {
    //     id: node.id,
    //     type: node.type,
    //     position: node.position,
    //     data: node.data,
    //   });
    // });

    // result.edges.forEach((edge, index) => {
    //   console.log(`Edge ${index + 1}:`, {
    //     id: edge.id,
    //     source: edge.source,
    //     target: edge.target,
    //     type: edge.type,
    //     style: edge.style,
    //     label: edge.label,
    //     animated: edge.animated,
    //   });
    // });

    return result;
  }, [getModuleNodes, getModelsByModule, state.expandedModules, state.animatingNodes, state.highlightedModules]);

  // Update ReactFlow nodes and edges
  useEffect(() => {
    // console.log('=== UPDATING REACTFLOW STATE ===');
    // console.log('Current nodes count:', visibleContent.nodes.length);
    // console.log('Current edges count:', visibleContent.edges.length);
    
    // if (visibleContent.edges.length > 0) {
    // console.log('Sample edges being set:', visibleContent.edges.slice(0, 3));
    const timer = window.setTimeout(() => {
      setNodes(visibleContent.nodes);
      setEdges(visibleContent.edges);
      // console.log('ReactFlow state updated successfully');
    }, 120);
    return () => window.clearTimeout(timer);
  }, [visibleContent, setNodes, setEdges]);

  // Handle connections
  const handleConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge(params, eds));
      onConnect?.(params);
    },
    [setEdges, onConnect]
  );

  // Handle node click events
  const handleNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    const nodeData = node.data as ModuleNodeData | ModelNodeData;
    
    if (nodeData.type === 'module') {
      const moduleId = (nodeData as ModuleNodeData).moduleId;
      const isExpanded = state.expandedModules.has(moduleId);
      
      // Add animation state
      setState(prev => ({
        ...prev,
        animatingNodes: new Set([...prev.animatingNodes, node.id]),
      }));
      
      // Delay updating expansion state to achieve animation effect
      setTimeout(() => {
        setState(prev => {
          const newExpandedModules = new Set(prev.expandedModules);
          const newAnimatingNodes = new Set(prev.animatingNodes);
          
          if (isExpanded) {
            newExpandedModules.delete(moduleId);
          } else {
            newExpandedModules.add(moduleId);
          }
          
          newAnimatingNodes.delete(node.id);
          
          return {
            ...prev,
            expandedModules: newExpandedModules,
            animatingNodes: newAnimatingNodes,
          };
        });
      }, 300);

      // Trigger external click handler for modules
      onNodeClick?.(node);
    } else if (nodeData.type === 'model') {
      const modelData = nodeData as ModelNodeData;
      toast({
        title: `Model: ${modelData.label}`,
        description: (
          <div className="flex flex-col gap-1 mt-1">
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Raw Topic:</span>
              <span className="font-medium font-mono text-xs">{modelData.topicName || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Table Count:</span>
              <span className="font-medium">{modelData.childCount || 0}</span>
            </div>
          </div>
        ),
      });
      // Do NOT trigger external click handler for models to prevent toast override
    } else {
      // For other node types, trigger external handler
      onNodeClick?.(node);
    }
  }, [state, toast, onNodeClick]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    try {
      await refetch();
      toast({
        title: "Refresh Successful",
        description: "Flow diagram has been updated",
      });
    } catch (err) {
      toast({
        title: "Refresh Failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  }, [refetch, toast]);

  // Handle cache clearing
  const handleClearCache = useCallback(() => {
    clearCache();
    setState({
      expandedModules: new Set(),
      animatingNodes: new Set(),
      highlightedModules: new Set(),
    });
    toast({
      title: "Cache Cleared",
      description: "Next load will fetch latest data",
    });
  }, [clearCache, toast]);

  // Reset view
  const handleResetView = useCallback(() => {
    setState({
      expandedModules: new Set(),
      animatingNodes: new Set(),
      highlightedModules: new Set(),
    });
    toast({
      title: "View Reset",
      description: "Returned to module overview",
    });
  }, [toast]);

  // Mini map node color
  const miniMapNodeColor = useCallback((node: Node) => {
    switch (node.data.type) {
      case 'module': return '#3b82f6';
      case 'model': return '#10b981';
      default: return '#6b7280';
    }
  }, []);

  // Calculate statistics
  const stats = useMemo(() => {
    const moduleCount = nodes.filter(n => n.data.type === 'module').length;
    const modelCount = nodes.filter(n => n.data.type === 'model').length;
    
    return {
      modules: moduleCount,
      models: modelCount,
      connections: edges.length,
      expanded: state.expandedModules.size,
    };
  }, [nodes, edges, state.expandedModules]);

  // // Debug logging
  // useEffect(() => {
  //   console.log('=== COMPONENT RENDERED ===');
  //   console.log('Nodes:', nodes.length);
  //   console.log('Edges:', edges.length);
  //   console.log('First few edges:', edges.slice(0, 3));
  // }, [nodes, edges]);

  // console.log('[ExecutionFlowDiagram] Data from useFlowData:', {
  //   isLoading,
  //   error,
  //   moduleNodesCount: getModuleNodes().length,
  //   hasGetModelsByModule: typeof getModelsByModule === 'function'
  // });

  // NOW SAFE TO HAVE EARLY RETURNS AFTER ALL HOOKS
  // Loading state
  if (isLoading) {
    return (
      <div 
        className={`flex items-center justify-center bg-gray-50 border border-gray-200 rounded-lg ${className}`}
        style={{ height, width }}
      >
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <p className="text-sm text-gray-600">Loading execution flow diagram...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`p-4 ${className}`} style={{ height, width }}>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p>Error loading flow diagram: {error}</p>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" onClick={handleRefresh}>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Retry
                </Button>
                <Button variant="outline" size="sm" onClick={handleClearCache}>
                  Clear Cache
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div 
      className={`relative border border-gray-200 rounded-lg overflow-hidden ${className}`}
      style={{ height, width }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        connectionMode={ConnectionMode.Loose}
        fitView
        fitViewOptions={{ 
          padding: 0.2,
          includeHiddenNodes: false,
          minZoom: 0.1,
          maxZoom: 2,
        }}
        defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
        // Remove defaultEdgeOptions to let individual edge styles work
        nodesDraggable={true}
        nodesConnectable={false}
        elementsSelectable={true}
        onlyRenderVisibleElements={true}
        zoomOnScroll={true}
        zoomOnPinch={true}
        panOnScroll={false}
        zoomOnDoubleClick={false}
      >
        {showControls && <Controls showInteractive={false} />}
        
        {showMiniMap && (
          <MiniMap 
            nodeColor={miniMapNodeColor}
            nodeStrokeWidth={3}
            zoomable
            pannable
            style={{
              height: 120,
              width: 200,
            }}
            maskColor="rgba(0, 0, 0, 0.1)"
          />
        )}
        
        {showBackground && (
          <Background 
            variant={BackgroundVariant.Dots} 
            gap={25}
            size={1.5}
            color="#e5e7eb"
          />
        )}

        {/* Statistics panel */}
        <Panel position="top-left">
          <div className="bg-white p-3 rounded-lg shadow-lg border text-xs max-w-xs">
            <div className="font-semibold text-gray-700 mb-2 flex items-center">
              <Eye className="h-3 w-3 mr-1" />
              Flow Statistics
            </div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Modules:</span>
                <span className="text-blue-500">{stats.modules}</span>
              </div>
              <div className="flex justify-between">
                <span>Models:</span>
                <span className="text-green-500">{stats.models}</span>
              </div>
              <div className="flex justify-between">
                <span>Connections:</span>
                <span className="text-orange-500">{stats.connections}</span>
              </div>
              <div className="flex justify-between">
                <span>Expanded:</span>
                <span className="text-amber-500">{stats.expanded}</span>
              </div>
            </div>
          </div>
        </Panel>

        {/* Control panel */}
        {showRefreshButton && (
          <Panel position="top-right">
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button variant="ghost" size="sm" onClick={handleClearCache}>
                Clear Cache
              </Button>
              {state.expandedModules.size > 0 && (
                <Button variant="secondary" size="sm" onClick={handleResetView}>
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Reset View
                </Button>
              )}
            </div>
          </Panel>
        )}
      </ReactFlow>
    </div>
  );
};
export default ExecutionFlowDiagram;
export { ExecutionFlowDiagram };