import React from 'react';
import { Layers, GitBranch, Database, ChevronDown, ChevronRight } from 'lucide-react';
import { NodeProps, Handle, Position } from 'reactflow';

// Base node data interface
export interface BaseNodeData {
  label: string;
  type: 'module' | 'model' | 'table';
  level?: number;
  isExpanded?: boolean;
  isAnimating?: boolean;
  parentId?: string;
}

// Module node data interface
export interface ModuleNodeData extends BaseNodeData {
  type: 'module';
  priority: number;
  moduleId: string;
  version?: string;
  childCount?: number;
}

// Model node data interface
export interface ModelNodeData extends BaseNodeData {
  type: 'model';
  priority: number;
  modelId: string;
  moduleId?: string;
  dependOn?: string;
  topicName?: string;
  childCount?: number;
  parentModuleId?: string;
}

// Table node data interface
export interface TableNodeData extends BaseNodeData {
  type: 'table';
  configId: string;
  modelName: string;
  tableName?: string;
  parentModelId?: string;
  parentModuleId?: string;
}

// Common node styles
const getNodeStyles = (type: string, selected: boolean, level: number = 0, isAnimating: boolean = false) => {
  const baseStyles = "px-4 py-3 shadow-md rounded-lg border-2 transition-all duration-300 cursor-pointer hover:shadow-lg transform hover:scale-105";
  
  const typeStyles = {
    module: "bg-blue-50 border-blue-300 text-blue-800 hover:border-blue-400 hover:bg-blue-100",
    model: "bg-green-50 border-green-300 text-green-800 hover:border-green-400 hover:bg-green-100", 
    table: "bg-purple-50 border-purple-300 text-purple-800 hover:border-purple-400 hover:bg-purple-100"
  };
  
  const selectedStyles = {
    module: "border-blue-500 shadow-lg ring-2 ring-blue-200",
    model: "border-green-500 shadow-lg ring-2 ring-green-200",
    table: "border-purple-500 shadow-lg ring-2 ring-purple-200"
  };
  
  const animatingStyles = isAnimating ? "animate-pulse" : "";
  
  const typeStyle = typeStyles[type as keyof typeof typeStyles] || typeStyles.module;
  const selectedStyle = selected ? selectedStyles[type as keyof typeof selectedStyles] : "";
  
  return `${baseStyles} ${typeStyle} ${selectedStyle} ${animatingStyles}`;
};

// Module Node Component
const ModuleNodeComponent: React.FC<NodeProps<ModuleNodeData>> = ({ data, selected }) => {
  const hasChildren = (data.childCount || 0) > 0;
  const isAnimating = data.isAnimating || false;
  
  return (
    <div className={getNodeStyles('module', selected, data.level, isAnimating)}>
      {/* Input handle for incoming edges */}
      <Handle
        type="target"
        position={Position.Left}
        id="module-input"
        style={{ background: '#3b82f6', width: 8, height: 8 }}
      />
      
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Layers className="h-5 w-5 mr-2 text-blue-600 transition-transform duration-200" />
          <div>
            <div className="text-sm font-semibold text-blue-800 flex items-center">
              {data.label}
              {hasChildren && (
                <span className="ml-2 text-xs bg-blue-200 text-blue-700 px-2 py-0.5 rounded-full transition-all duration-200">
                  {data.childCount}
                </span>
              )}
            </div>
            <div className="text-xs text-blue-600">
              Module • Priority: {data.priority}
              {data.version && ` • v${data.version}`}
            </div>
          </div>
        </div>
        
        {hasChildren && (
          <div className="ml-2">
            {data.isExpanded ? (
              <ChevronDown className="h-4 w-4 text-blue-500 transition-transform duration-200 hover:scale-110" />
            ) : (
              <ChevronRight className="h-4 w-4 text-blue-500 transition-transform duration-200 hover:scale-110" />
            )}
          </div>
        )}
      </div>
      
      {/* Output handle for outgoing edges */}
      <Handle
        type="source"
        position={Position.Right}
        id="module-output"
        style={{ background: '#3b82f6', width: 8, height: 8 }}
      />
    </div>
  );
};

// Model Node Component
const ModelNodeComponent: React.FC<NodeProps<ModelNodeData>> = ({ data, selected }) => {
  const hasChildren = (data.childCount || 0) > 0;
  const hasDependency = Boolean(data.dependOn && data.dependOn.length > 0);
  const isAnimating = data.isAnimating || false;
  
  return (
    <div className={getNodeStyles('model', selected, data.level, isAnimating)}>
      {/* Input handle for incoming edges */}
      <Handle
        type="target"
        position={Position.Left}
        id="model-input"
        style={{ background: '#10b981', width: 8, height: 8 }}
      />
      
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <GitBranch className="h-5 w-5 mr-2 text-green-600 transition-transform duration-200" />
          <div>
            <div className="text-sm font-semibold text-green-800 flex items-center">
              {data.label}
              {hasChildren && (
                <span className="ml-2 text-xs bg-green-200 text-green-700 px-2 py-0.5 rounded-full transition-all duration-200">
                  {data.childCount}
                </span>
              )}
              {hasDependency && (
                <span className="ml-2 text-xs bg-yellow-200 text-yellow-700 px-2 py-0.5 rounded-full transition-all duration-200">
                  Dep
                </span>
              )}
            </div>
            <div className="text-xs text-green-600">
              Model • Priority: {data.priority}
              {data.modelId && ` • ID: ${data.modelId}`}
              {data.dependOn && ` • Dependencies: ${data.dependOn}`}
              {data.topicName && ` • Topic: ${data.topicName}`}
            </div>
          </div>
        </div>
        
        {hasChildren && (
          <div className="ml-2">
            {data.isExpanded ? (
              <ChevronDown className="h-4 w-4 text-green-500 transition-transform duration-200 hover:scale-110" />
            ) : (
              <ChevronRight className="h-4 w-4 text-green-500 transition-transform duration-200 hover:scale-110" />
            )}
          </div>
        )}
      </div>
      
      {/* Output handle for outgoing edges */}
      <Handle
        type="source"
        position={Position.Right}
        id="model-output"
        style={{ background: '#10b981', width: 8, height: 8 }}
      />
    </div>
  );
};

// Table Node Component
const TableNodeComponent: React.FC<NodeProps<TableNodeData>> = ({ data, selected }) => {
  return (
    <div className={getNodeStyles('table', selected, data.level)}>
      {/* Input handle for incoming edges */}
      <Handle
        type="target"
        position={Position.Left}
        id="table-input"
        style={{ background: '#9333ea', width: 8, height: 8 }}
      />
      
      <div className="flex items-center">
        <Database className="h-5 w-5 mr-2 text-purple-600" />
        <div>
          <div className="text-sm font-semibold text-purple-800">
            {data.label}
          </div>
          <div className="text-xs text-purple-600">
            Table • Model: {data.modelName}
            {data.tableName && ` • ${data.tableName}`}
          </div>
        </div>
      </div>
      
      {/* Output handle for outgoing edges */}
      <Handle
        type="source"
        position={Position.Right}
        id="table-output"
        style={{ background: '#9333ea', width: 8, height: 8 }}
      />
    </div>
  );
};

// Memoized components for performance
export const ModuleNode = React.memo(ModuleNodeComponent);
export const ModelNode = React.memo(ModelNodeComponent);
export const TableNode = React.memo(TableNodeComponent);

// Node types mapping for ReactFlow
export const nodeTypes = {
  moduleNode: ModuleNode,
  modelNode: ModelNode,
  tableNode: TableNode,
};