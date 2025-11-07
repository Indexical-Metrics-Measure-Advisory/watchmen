import React, { memo } from 'react';
import { EdgeProps, getBezierPath, EdgeLabelRenderer } from 'reactflow';
import { RelationshipType } from '@/models/discovery.models';

interface RelationshipEdgeProps extends EdgeProps {
  data: {
    relationship: {
      id: string;
      name?: string;
      type: RelationshipType;
    };
  };
}

const RelationshipEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data
}: RelationshipEdgeProps) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  // Determine edge style based on relationship type
  const getEdgeStyle = () => {
    const baseStyle = { strokeWidth: 1.5 };
    
    switch (data.relationship.type) {
      case RelationshipType.ONE_TO_ONE:
        return { ...baseStyle, stroke: '#3b82f6' }; // blue
      case RelationshipType.ONE_TO_MANY:
        return { ...baseStyle, stroke: '#10b981' }; // green
      case RelationshipType.MANY_TO_MANY:
        return { ...baseStyle, stroke: '#8b5cf6' }; // purple
      default:
        return { ...baseStyle, stroke: '#6b7280' }; // gray
    }
  };

  // Get relationship icon based on type
  const getRelationshipIcon = () => {
    switch (data.relationship.type) {
      case RelationshipType.ONE_TO_ONE:
        return '1:1';
      case RelationshipType.ONE_TO_MANY:
        return '1:N';
      case RelationshipType.MANY_TO_MANY:
        return 'N:M';
      default:
        return '';
    }
  };

  return (
    <>
      <path
        id={id}
        style={{ ...style, ...getEdgeStyle() }}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={markerEnd}
      />
      
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          <div className="px-2 py-1 bg-white rounded-md border shadow-sm text-xs flex items-center gap-1">
            <span className="font-medium">{getRelationshipIcon()}</span>
            {data.relationship.name && (
              <span className="text-gray-600">{data.relationship.name}</span>
            )}
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
};

export default memo(RelationshipEdge);