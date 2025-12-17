import { useState, useEffect, useCallback, useMemo } from 'react';
import { Node, Edge, MarkerType } from 'reactflow';
import { flowDataService, FlowRelationshipData } from '../services/flowDataService';
import { ModuleNodeData, ModelNodeData } from '../components/flow/FlowNodes';

// Hook state type
export interface UseFlowDataState {
  nodes: Node[];
  edges: Edge[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  clearCache: () => void;
  // Access methods
  getModuleNodes: () => Node<ModuleNodeData>[];
  getModelsByModule: (moduleId: string) => Node<ModelNodeData>[];
  getAllEdges: () => Edge[];
  // Relationship getters
  getModuleRelations: (moduleId: string) => Edge[];
  getModelRelations: (modelId: string) => Edge[];
}

// Layout configuration
const LAYOUT_CONFIG = {
  nodeSpacing: { x: 250, y: 120 },
  startPosition: { x: 100, y: 100 },
  moduleToModel: 200,
};

// Data cache interface
interface FlowDataCache {
  allNodes: Node[];
  allEdges: Edge[];
  moduleNodes: Node<ModuleNodeData>[];
  modelNodes: Node<ModelNodeData>[];
  // Relationship mapping cache
  moduleToModels: Map<string, Node<ModelNodeData>[]>;
  moduleRelations: Map<string, Edge[]>;
  modelRelations: Map<string, Edge[]>;
  // Priority-based module edges
  priorityEdges: Edge[];
}

export const useFlowData = (autoFetch = true): UseFlowDataState => {
  const [rawData, setRawData] = useState<FlowRelationshipData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use useMemo to cache transformed data to avoid unnecessary recomputation
  const dataCache = useMemo<FlowDataCache | null>(() => {
    if (!rawData) return null;

    // console.log('[useFlowData] Computing data cache from raw data:', {
    //   modules: rawData.modules.length,
    //   models: rawData.models.length
    // });

    const allNodes: Node[] = [];
    const allEdges: Edge[] = [];
    
    let nodeId = 0;
    const getNextId = () => `node-${++nodeId}`;
    
    // Group modules by priority and vertically stack module nodes
    const sortedModules = [...rawData.modules].sort((a, b) => (a.priority || 0) - (b.priority || 0));
    const modulesByPriority = new Map<number, typeof sortedModules>();
    sortedModules.forEach((m) => {
      const p = m.priority || 0;
      const arr = modulesByPriority.get(p) || [];
      arr.push(m);
      modulesByPriority.set(p, arr);
    });
    const priorities = Array.from(modulesByPriority.keys()).sort((a, b) => a - b);

    // Calculate table counts for each model
    const tableCountsByModel = new Map<string, number>();
    if (rawData.tables) {
      rawData.tables.forEach(table => {
        if (table.modelName) {
          const currentCount = tableCountsByModel.get(table.modelName) || 0;
          tableCountsByModel.set(table.modelName, currentCount + 1);
        }
      });
    }

    const moduleNodes: Node<ModuleNodeData>[] = [];
    const moduleNodesByPriority = new Map<number, Node<ModuleNodeData>[]>();

    priorities.forEach((p, colIndex) => {
      const group = modulesByPriority.get(p)!;
      const columnX = LAYOUT_CONFIG.startPosition.x + colIndex * LAYOUT_CONFIG.nodeSpacing.x * 1.5;
      const totalHeight = (group.length - 1) * LAYOUT_CONFIG.nodeSpacing.y;
      const startY = LAYOUT_CONFIG.startPosition.y - totalHeight / 2;

      const createdNodes: Node<ModuleNodeData>[] = group.map((module, idx) => {
        const id = getNextId();
        return {
          id,
          type: 'moduleNode',
          position: {
            x: columnX,
            y: startY + idx * LAYOUT_CONFIG.nodeSpacing.y,
          },
          data: {
            label: module.moduleName || module.name || `Module ${module.moduleId}`,
            type: 'module',
            priority: module.priority || 0,
            moduleId: module.moduleId,
            version: module.version,
            level: 0,
            isExpanded: false,
          } as ModuleNodeData,
        };
      });

      moduleNodes.push(...createdNodes);
      moduleNodesByPriority.set(p, createdNodes);
    });
    
    allNodes.push(...moduleNodes);
    
    // Sort models by priority
    const sortedModels = [...rawData.models].sort((a, b) => (a.priority || 0) - (b.priority || 0));
    
    // Create model nodes
    const modelNodes: Node<ModelNodeData>[] = sortedModels.map((model, index) => {
      const id = getNextId();
      return {
        id,
        type: 'modelNode',
        position: {
          x: LAYOUT_CONFIG.startPosition.x + (index % 4) * LAYOUT_CONFIG.nodeSpacing.x,
          y: LAYOUT_CONFIG.startPosition.y + LAYOUT_CONFIG.moduleToModel,
        },
        data: {
          label: model.modelName || model.name || `Model ${model.modelId}`,
          type: 'model',
          priority: model.priority || 0,
          modelId: model.modelId,
          moduleId: model.moduleId,
          dependOn: model.dependOn ? (Array.isArray(model.dependOn) ? model.dependOn.join(', ') : model.dependOn) : undefined,
          topicName: (model as any).rawTopicCode || model.rawTopicCode,
          level: 1,
          isExpanded: false,
          childCount: tableCountsByModel.get(model.modelName) || 0,
          parentModuleId: model.moduleId,
        } as ModelNodeData,
      };
    });
    
    allNodes.push(...modelNodes);
    
    // console.log('[useFlowData] Created nodes:', {
    //   modules: moduleNodes.length,
    //   models: modelNodes.length,
    //   moduleIds: moduleNodes.map(n => ({ id: n.id, moduleId: n.data.moduleId })),
    //   modelIds: modelNodes.map(n => ({ id: n.id, modelId: n.data.modelId, dependOn: n.data.dependOn }))
    // });
    
    // Create edges: models to modules
    modelNodes.forEach(modelNode => {
      if (modelNode.data.moduleId) {
        const relatedModule = moduleNodes.find(moduleNode => 
          moduleNode.data.moduleId === modelNode.data.moduleId
        );
        
        if (relatedModule) {
          allEdges.push({
            id: `edge-${modelNode.id}-${relatedModule.id}`,
            source: modelNode.id,
            target: relatedModule.id,
            sourceHandle: 'model-output',
            targetHandle: 'module-input',
            type: 'smoothstep',
            animated: true,
            style: { stroke: '#10b981', strokeWidth: 2 },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: '#10b981',
            },
            label: 'belongs to',
            labelStyle: { fontSize: 10, fill: '#10b981' },
            data: { 
              type: 'module-relation',
              level: 1,
              sourceType: 'model',
              targetType: 'module'
            },
          });
        }
      }
    });

    // Create edges: model dependencies
    modelNodes.forEach(modelNode => {
      const dependencies = modelNode.data.dependOn ? modelNode.data.dependOn.split(', ') : [];
      
      dependencies.forEach(depName => {
        const dependentModel = modelNodes.find(node => 
          node.data.label === depName ||
          node.data.modelId === depName
        );
        
        if (dependentModel) {
          allEdges.push({
            id: `edge-${dependentModel.id}-${modelNode.id}`,
            source: dependentModel.id,
            target: modelNode.id,
            sourceHandle: 'model-output',
            targetHandle: 'model-input',
            type: 'smoothstep',
            animated: false,
            style: { stroke: '#f59e0b', strokeWidth: 2, strokeDasharray: '5,5' },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: '#f59e0b',
            },
            label: 'depends on',
            labelStyle: { fontSize: 10, fill: '#f59e0b' },
            data: { 
              type: 'dependency',
              level: 1,
              sourceType: 'model',
              targetType: 'model'
            },
          });
        }
      });
    });

    // Create priority-based edges between modules (connect each priority group to the next)
    const priorityEdges: Edge[] = [];
    for (let gi = 0; gi < priorities.length - 1; gi++) {
      const currentGroup = moduleNodesByPriority.get(priorities[gi])!;
      const nextGroup = moduleNodesByPriority.get(priorities[gi + 1])!;

      currentGroup.forEach((srcNode, idx) => {
        const targetIdx = Math.min(idx, nextGroup.length - 1);
        const tgtNode = nextGroup[targetIdx];

        const isHighPriority = (srcNode.data.priority <= 1) || (tgtNode.data.priority <= 1);
        const strokeColor = isHighPriority ? '#1d4ed8' : '#3b82f6';

        priorityEdges.push({
          id: `module-edge-${srcNode.data.moduleId}-${tgtNode.data.moduleId}`,
          source: srcNode.id,
          target: tgtNode.id,
          sourceHandle: 'module-output',
          targetHandle: 'module-input',
          type: 'smoothstep',
          animated: isHighPriority,
          style: isHighPriority
            ? { stroke: strokeColor, strokeWidth: 3 }
            : { stroke: strokeColor, strokeWidth: 2, strokeDasharray: '6,4' },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: strokeColor,
          },
          label: 'priority',
          labelStyle: { fontSize: 12, fill: strokeColor, fontWeight: isHighPriority ? 'bold' : 'normal' },
          data: {
            type: 'module-dependency',
            level: 0,
            sourceType: 'module',
            targetType: 'module',
          },
        });
      });
    }

    // console.log('[useFlowData] Created edges:', {
    //   total: allEdges.length,
    //   byType: {
    //     'module-relation': allEdges.filter(e => e.data?.type === 'module-relation').length,
    //     'dependency': allEdges.filter(e => e.data?.type === 'dependency').length
    //   },
    //   edgeDetails: allEdges.map(e => ({
    //     id: e.id,
    //     source: e.source,
    //     target: e.target,
    //     type: e.data?.type
    //   }))
    // });

    // Validate that edge source and target nodes exist
    // console.log('[useFlowData] Edge validation:', {
    //   totalEdges: allEdges.length,
    //   totalNodes: allNodes.length,
    //   nodeIds: allNodes.map(n => n.id),
    //   invalidEdges: allEdges.filter(edge => {
    //     const sourceExists = allNodes.some(n => n.id === edge.source);
    //     const targetExists = allNodes.some(n => n.id === edge.target);
    //     return !sourceExists || !targetExists;
    //   }).map(edge => ({
    //     id: edge.id,
    //     source: edge.source,
    //     target: edge.target,
    //     sourceExists: allNodes.some(n => n.id === edge.source),
    //     targetExists: allNodes.some(n => n.id === edge.target)
    //   }))
    // });

    // Add priority module edges to the overall set (for relationship cache and default view)
    allEdges.push(...priorityEdges);

    // Build relationship mapping cache
    const moduleToModels = new Map<string, Node<ModelNodeData>[]>();
    const moduleRelations = new Map<string, Edge[]>();
    const modelRelations = new Map<string, Edge[]>();

    // Cache mapping from modules to models
    moduleNodes.forEach(moduleNode => {
      const relatedModels = modelNodes.filter(modelNode => 
        modelNode.data.moduleId === moduleNode.data.moduleId
      );
      moduleToModels.set(moduleNode.data.moduleId, relatedModels);
      
      // Cache edges related to modules
      const relatedEdges = allEdges.filter(edge => 
        edge.source === moduleNode.id ||
        edge.target === moduleNode.id || 
        relatedModels.some(model => model.id === edge.source || model.id === edge.target)
      );
      moduleRelations.set(moduleNode.data.moduleId, relatedEdges);
    });

    // Cache edges related to models
    modelNodes.forEach(modelNode => {
      const relatedEdges = allEdges.filter(edge => 
        edge.source === modelNode.id || edge.target === modelNode.id
      );
      modelRelations.set(modelNode.id, relatedEdges);
    });

    return {
      allNodes,
      allEdges,
      moduleNodes,
      modelNodes,
      moduleToModels,
      moduleRelations,
      modelRelations,
      priorityEdges,
    };
  }, [rawData]);

  // Exported nodes and edges (default shows modules and priority-based module connections)
  const { nodes, edges } = useMemo(() => {
    if (!dataCache) {
      return { nodes: [], edges: [] };
    }
    
    // console.log('[useFlowData] Default return values:', {
    //   nodeCount: dataCache.moduleNodes.length,
    //   edgeCount: dataCache.priorityEdges.length,
    //   allEdgesInCache: dataCache.allEdges.length,
    //   moduleEdgeDetails: dataCache.priorityEdges.map(e => ({ id: e.id, source: e.source, target: e.target })),
    //   allEdgeDetails: dataCache.allEdges.map(e => ({ id: e.id, source: e.source, target: e.target, type: e.data?.type }))
    // });
    
    return {
      nodes: dataCache.moduleNodes,
      edges: dataCache.priorityEdges,
    };
  }, [dataCache]);

  // Data access methods
  const getModuleNodes = useCallback(() => {
    return dataCache?.moduleNodes || [];
  }, [dataCache]);

  const getModelsByModule = useCallback((moduleId: string) => {
    return dataCache?.moduleToModels.get(moduleId) || [];
  }, [dataCache]);

  const getAllEdges = useCallback(() => {
    return dataCache?.allEdges || [];
  }, [dataCache]);

  const getModuleRelations = useCallback((moduleId: string) => {
    return dataCache?.moduleRelations.get(moduleId) || [];
  }, [dataCache]);

  const getModelRelations = useCallback((modelId: string) => {
    return dataCache?.modelRelations.get(modelId) || [];
  }, [dataCache]);

  // Fetch data
  const fetchData = useCallback(async () => {
    console.log('[useFlowData] Starting data fetch...');
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await flowDataService.getAllRelationshipData();
      // console.log('[useFlowData] Raw data received from service:', data);
      
      setRawData(data);
      // console.log('[useFlowData] Raw data set successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch flow data';
        console.error('[useFlowData] Error during fetch:', err);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
      // console.log('[useFlowData] Fetch completed');
    }
  }, []);

  // Refetch data
  const refetch = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  // Clear cache
  const clearCache = useCallback(() => {
    flowDataService.clearCache();
    setRawData(null);
  }, []);

  // Auto fetch data
  useEffect(() => {
    if (autoFetch) {
      fetchData();
    }
  }, [autoFetch, fetchData]);

  return {
    nodes,
    edges,
    isLoading,
    error,
    refetch,
    clearCache,
    getModuleNodes,
    getModelsByModule,
    getAllEdges,
    getModuleRelations,
    getModelRelations,
  };
};