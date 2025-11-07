import React, { useState } from 'react';
import { EdgeProps, getBezierPath } from 'reactflow';

export function CustomModuleEdge(props: EdgeProps) {
  const {
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    markerEnd,
    data,
    animated,
  } = props;
  const [hovered, setHovered] = useState(false);

  const sourceYWithOffset = sourceY + (data?.sourceY || 0);
  const targetYWithOffset = targetY + (data?.targetY || 0);

  const [edgePath] = getBezierPath({
    sourceX,
    sourceY: sourceYWithOffset,
    sourcePosition,
    targetX,
    targetY: targetYWithOffset,
    targetPosition,
  });

  const baseStrokeWidth = (style as any)?.strokeWidth ?? 2;
  const pathStyle = {
    ...style,
    strokeWidth: hovered ? baseStrokeWidth + 1 : baseStrokeWidth,
    cursor: 'pointer',
  } as React.CSSProperties;

  const details = data
    ? `${data.sourceLabel ?? data.sourceId} → ${data.targetLabel ?? data.targetId}` +
      (data.sourcePriority != null && data.targetPriority != null
        ? ` (priority: ${data.sourcePriority} → ${data.targetPriority})`
        : '')
    : undefined;

  return (
    <path
      style={pathStyle}
      className={`react-flow__edge-path${animated ? ' animated' : ''}`}
      d={edgePath}
      markerEnd={markerEnd}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => data?.onEdgeClick?.(data.sourceId, data.targetId)}
    >
      {details && <title>{details}</title>}
    </path>
  );
}