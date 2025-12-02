import React, { useEffect, useState } from 'react';
import { ReactFlow, MiniMap, Controls, Background, useNodesState, useEdgesState, useReactFlow, ReactFlowProvider } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Node {
  id: string;
  name: string;
  importance: number;
  subNodes?: Node[];
}

interface MetricGraphProps {
  dimensions: Node[];
  selectedDimension: string[];
}

const MetricGraphInner: React.FC<MetricGraphProps> = ({ dimensions, selectedDimension }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const reactFlowInstance = useReactFlow();

  useEffect(() => {
    if (!dimensions.length) return;

    // 准备节点和边的数据
    const graphNodes = [];
    const graphEdges = [];

    // 处理节点和连接
    dimensions.forEach((dim, index) => {
      // 主维度节点
      graphNodes.push({
        id: dim.id,
        type: 'default',
        position: { x: 250, y: 100 + index * 100 },
        data: {
          label: dim.name,
          importance: dim.importance,
          isSelected: selectedDimension.includes(dim.id)
        },
        style: {
          background: selectedDimension.includes(dim.id) ? '#0088FE' : '#999',
          color: '#fff',
          border: '1px solid #fff',
          borderRadius: '50%',
          width: Math.max(40, Math.sqrt(dim.importance) * 4),
          height: Math.max(40, Math.sqrt(dim.importance) * 4)
        }
      });

      // 子节点
      if (dim.subNodes) {
        dim.subNodes.forEach((sub, subIndex) => {
          graphNodes.push({
            id: sub.id,
            type: 'default',
            position: { x: 450, y: 50 + (index * 100) + (subIndex * 50) },
            data: {
              label: sub.name,
              importance: sub.importance,
              isSelected: selectedDimension.includes(sub.id)
            },
            style: {
              background: selectedDimension.includes(sub.id) ? '#0088FE' : '#999',
              color: '#fff',
              border: '1px solid #fff',
              borderRadius: '50%',
              width: Math.max(30, Math.sqrt(sub.importance) * 3),
              height: Math.max(30, Math.sqrt(sub.importance) * 3)
            }
          });

          graphEdges.push({
            id: `${dim.id}-${sub.id}`,
            source: dim.id,
            target: sub.id,
            style: {
              stroke: '#999',
              strokeWidth: Math.sqrt(sub.importance)
            }
          });
        });
      }
    });

    setNodes(graphNodes);
    setEdges(graphEdges);
  }, [dimensions, selectedDimension]);

  const onNodeClick = (event: React.MouseEvent, node: any) => {
    setSelectedNode(node);
  };

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">指标关系图谱</CardTitle>
          {selectedNode && (
            <div className="flex items-center gap-2">
              <span className="text-sm">{selectedNode.data.label}</span>
              <Badge variant="secondary">
                {selectedNode.data.importance.toFixed(1)}%
              </Badge>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div style={{ height: 500 }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            fitView
          >
            <Controls />
            <MiniMap />
            <Background gap={12} size={1} />
          </ReactFlow>
        </div>
      </CardContent>
    </Card>
  );
};

const MetricGraph: React.FC<MetricGraphProps> = (props) => (
  <ReactFlowProvider>
    <MetricGraphInner {...props} />
  </ReactFlowProvider>
);

export default MetricGraph;