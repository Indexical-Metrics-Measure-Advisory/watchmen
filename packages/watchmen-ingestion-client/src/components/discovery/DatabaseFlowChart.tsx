import React, { useCallback, useEffect, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  useReactFlow,
  Panel,
  NodeTypes,
  EdgeTypes,
  MarkerType
} from 'reactflow';
import 'reactflow/dist/style.css';

import { DatabaseEntity, Relationship, EntityNode, RelationshipEdge } from '@/models/discovery.models';
import EntityNodeComponent from './EntityNode';
import RelationshipEdgeComponent from './RelationshipEdge';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, Maximize2, RefreshCw } from 'lucide-react';

interface DatabaseFlowChartProps {
  entities: DatabaseEntity[];
  relationships: Relationship[];
  onEntitySelect?: (entity: DatabaseEntity | null) => void;
  onRefresh?: () => void;
}

// Define custom node and edge types
const nodeTypes: NodeTypes = {
  entity: EntityNodeComponent,
};

const edgeTypes: EdgeTypes = {
  relationship: RelationshipEdgeComponent,
};

const DatabaseFlowChart: React.FC<DatabaseFlowChartProps> = ({
  entities,
  relationships,
  onEntitySelect,
  onRefresh
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const { fitView, zoomIn, zoomOut } = useReactFlow();

  // Convert entities to ReactFlow nodes
  const createNodes = useCallback((entities: DatabaseEntity[]): Node<any>[] => {
    return entities.map((entity, index) => {
      // Calculate position in a grid layout
      const posX = (index % 3) * 300 + 50;
      const posY = Math.floor(index / 3) * 300 + 50;
      
      return {
        id: entity.id,
        type: 'entity',
        data: { entity },
        position: { x: posX, y: posY },
      };
    });
  }, []);

  // Convert relationships to ReactFlow edges
  const createEdges = useCallback((relationships: Relationship[]): Edge<any>[] => {
    return relationships.map((relationship): Edge => ({
      id: relationship.id,
      source: relationship.sourceEntityId,
      target: relationship.targetEntityId,
      type: 'relationship',
      data: { relationship },
      markerEnd: {
        type: MarkerType.Arrow,
        width: 20,
        height: 20,
      },
    }));
  }, []);

  // Initialize nodes and edges when entities and relationships change
  useEffect(() => {
    if (entities.length > 0) {
      const newNodes = createNodes(entities);
      setNodes(newNodes);
    }
    
    if (relationships.length > 0) {
      const newEdges = createEdges(relationships);
      setEdges(newEdges);
    }
    
    // Fit view after a short delay to ensure nodes are rendered
    setTimeout(() => {
      fitView({ padding: 0.2 });
    }, 100);
  }, [entities, relationships, createNodes, createEdges, setNodes, setEdges, fitView]);

  // Handle node selection
  const handleNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    const entity = entities.find(e => e.id === node.id);
    if (entity && onEntitySelect) {
      onEntitySelect(entity);
      
      // Update nodes to highlight the selected node
      setNodes(nodes => nodes.map(n => ({
        ...n,
        data: {
          ...n.data,
          selected: n.id === node.id
        }
      })));
    }
  }, [entities, onEntitySelect, setNodes]);

  // Handle edge connection
  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge({
        ...connection,
        type: 'relationship',
        data: {
          relationship: {
            id: `temp-${connection.source}-${connection.target}`,
            type: 'one-to-many'
          }
        },
        markerEnd: {
          type: MarkerType.Arrow,
          width: 20,
          height: 20,
        },
      }, eds));
    },
    [setEdges]
  );

  // Handle background click to deselect
  const handlePaneClick = useCallback(() => {
    if (onEntitySelect) {
      onEntitySelect(null);
      
      // Clear selection highlight
      setNodes(nodes => nodes.map(n => ({
        ...n,
        data: {
          ...n.data,
          selected: false
        }
      })));
    }
  }, [onEntitySelect, setNodes]);

  return (
    <div className="h-[600px] border rounded-lg overflow-hidden bg-gray-50">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        attributionPosition="bottom-right"
      >
        <Background color="#f1f5f9" gap={16} />
        <Controls showInteractive={false} />
        <MiniMap 
          nodeStrokeWidth={3}
          zoomable 
          pannable
          nodeBorderRadius={2}
        />
        <Panel position="top-right">
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="icon" 
              className="bg-white" 
              onClick={() => zoomIn()}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              className="bg-white" 
              onClick={() => zoomOut()}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              className="bg-white" 
              onClick={() => fitView({ padding: 0.2 })}
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
            {onRefresh && (
              <Button 
                variant="outline" 
                size="icon" 
                className="bg-white" 
                onClick={onRefresh}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
};

export default DatabaseFlowChart;