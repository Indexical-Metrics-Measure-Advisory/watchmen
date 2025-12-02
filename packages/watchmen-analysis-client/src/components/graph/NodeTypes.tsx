
import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { BrainCircuit, AlertCircle, Wrench } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// Challenge Node
export const ChallengeNode = memo(({ data, selected }: { data: any; selected?: boolean }) => {
  return (
    <div className={cn(
      "p-4 bg-cyan-100 dark:bg-cyan-900 border border-cyan-300 dark:border-cyan-700 rounded-md min-w-[180px] shadow-md transition-all duration-200",
      selected && "ring-2 ring-cyan-500 dark:ring-cyan-400 ring-offset-2 ring-offset-background scale-105"
    )}>
      <div className="flex items-start gap-2">
        <Wrench className="h-5 w-5 text-cyan-600 dark:text-cyan-400 mt-0.5 shrink-0" />
        <div>
          <div className="font-medium text-sm">{data.label}</div>
        </div>
      </div>
      
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-cyan-600" />
    </div>
  );
});

// Problem Node
export const ProblemNode = memo(({ data, selected }: { data: any; selected?: boolean }) => {
  return (
    <div className={cn(
      "p-4 bg-amber-100 dark:bg-amber-900 border border-amber-300 dark:border-amber-700 rounded-md min-w-[180px] shadow-md transition-all duration-200",
      selected && "ring-2 ring-amber-500 dark:ring-amber-400 ring-offset-2 ring-offset-background scale-105"
    )}>
      <div className="flex items-start gap-2">
        <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
        <div>
          <div className="font-medium text-sm">{data.label}</div>
          {data.status && (
            <Badge 
              variant="outline" 
              className={cn(
                "text-xs mt-2",
                data.status === 'open' && "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300",
                data.status === 'in_progress' && "bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300",
                data.status === 'resolved' && "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
              )}
            >
              {data.status === 'in_progress' ? 'In Progress' : data.status.charAt(0).toUpperCase() + data.status.slice(1)}
            </Badge>
          )}
        </div>
      </div>
      
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-amber-600" />
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-amber-600" />
    </div>
  );
});

// Hypothesis Node
export const HypothesisNode = memo(({ data, selected }: { data: any; selected?: boolean }) => {
  return (
    <div className={cn(
      "p-4 bg-indigo-100 dark:bg-indigo-900 border border-indigo-300 dark:border-indigo-700 rounded-md min-w-[180px] shadow-md transition-all duration-200",
      selected && "ring-2 ring-indigo-500 dark:ring-indigo-400 ring-offset-2 ring-offset-background scale-105"
    )}>
      <div className="flex items-start gap-2">
        <BrainCircuit className="h-5 w-5 text-indigo-600 dark:text-indigo-400 mt-0.5 shrink-0" />
        <div>
          <div className="font-medium text-sm">{data.label}</div>
          <div className="flex items-center gap-2 mt-2">
            <Badge 
              variant="outline" 
              className={cn(
                "text-xs",
                data.status === 'validated' && "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300",
                data.status === 'rejected' && "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300",
                data.status === 'testing' && "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300",
                data.status === 'drafted' && "bg-muted text-muted-foreground"
              )}
            >
              {data.status === 'validated' && 'Validated'}
              {data.status === 'rejected' && 'Rejected'}
              {data.status === 'testing' && 'Testing'}
              {data.status === 'drafted' && 'Draft'}
            </Badge>
            {data.confidence > 0 && (
              <span className="text-xs text-muted-foreground">
                {data.confidence}%
              </span>
            )}
          </div>
        </div>
      </div>
      
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-indigo-600" />
    </div>
  );
});
