import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { DatabaseEntity, Column } from '@/models/discovery.models';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Key, KeyRound, AlertCircle } from 'lucide-react';

interface EntityNodeProps extends NodeProps {
  data: {
    entity: DatabaseEntity;
    selected?: boolean;
  };
}

const EntityNode = ({ data }: EntityNodeProps) => {
  const { entity } = data;
  
  return (
    <div className={`p-3 rounded-md border shadow-md bg-white w-64 ${data.selected ? 'ring-2 ring-blue-500' : ''}`}>
      {/* Top handle for incoming connections */}
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      
      {/* Entity header */}
      <div className="border-b pb-2 mb-2">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm truncate">{entity.name}</h3>
          <Badge variant="outline" className="text-xs">{entity.type}</Badge>
        </div>
        {entity.description && (
          <p className="text-xs text-gray-500 mt-1 truncate">{entity.description}</p>
        )}
      </div>
      
      {/* Column list */}
      <div className="space-y-1 max-h-40 overflow-y-auto text-xs">
        {entity.columns.map((column) => (
          <ColumnItem key={column.id} column={column} />
        ))}
      </div>
      
      {/* Bottom handle for outgoing connections */}
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </div>
  );
};

interface ColumnItemProps {
  column: Column;
}

const ColumnItem = ({ column }: ColumnItemProps) => {
  // Format the column type display
  const formatType = () => {
    let typeStr = column.type.name;
    if (column.type.size) typeStr += `(${column.type.size})`;
    else if (column.type.precision && column.type.scale) {
      typeStr += `(${column.type.precision},${column.type.scale})`;
    }
    return typeStr;
  };
  
  return (
    <TooltipProvider>
      <div className="flex items-center justify-between group hover:bg-gray-50 p-1 rounded">
        <div className="flex items-center gap-1">
          {column.isPrimaryKey && (
            <Tooltip>
              <TooltipTrigger>
                <Key className="h-3 w-3 text-amber-500" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Primary Key</p>
              </TooltipContent>
            </Tooltip>
          )}
          {column.isForeignKey && (
            <Tooltip>
              <TooltipTrigger>
                <KeyRound className="h-3 w-3 text-blue-500" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Foreign Key to {column.referencedColumn?.tableName}.{column.referencedColumn?.columnName}</p>
              </TooltipContent>
            </Tooltip>
          )}
          <span className="truncate">{column.name}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-gray-500 italic">{formatType()}</span>
          {!column.isNullable && (
            <Tooltip>
              <TooltipTrigger>
                <AlertCircle className="h-3 w-3 text-red-500" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Not Nullable</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
};

export default memo(EntityNode);