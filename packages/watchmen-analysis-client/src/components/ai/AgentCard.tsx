import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bot, MessageSquare, CheckCircle2, Clock, AlertCircle, ChevronDown, ChevronUp, Info, Loader2 } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

export interface AgentCapability {
  name: string;
  description: string;
  type: 'action' | 'knowledge' | 'communication';
}

export interface TaskStatus {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  createdAt: string;
  completedAt?: string;
  artifact?: {
    type: string;
    content: string;
  };
}

export interface AgentCardProps {
  name: string;
  description: string;
  role: 'client' | 'remote';
  capabilities: AgentCapability[];
  currentTask?: TaskStatus;
  onTaskAction?: (action: 'start' | 'stop' | 'retry', taskId: string) => void;
  onConnect?: () => void;
  onAnalyze: () => void;
  isConnected?: boolean;
  isConnecting?: boolean;
  version?: string;
  lastActive?: string;
  supportedContentTypes?: string[];
}

const AgentCard: React.FC<AgentCardProps> = ({
  name,
  description,
  role,
  capabilities,
  currentTask,
  onTaskAction,
  onConnect,
  onAnalyze,
  isConnected = false,
  isConnecting = false,
  version,
  lastActive,
  supportedContentTypes = [],
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const getStatusIcon = (status: TaskStatus['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-blue-500 animate-pulse" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getCapabilityColor = (type: AgentCapability['type']) => {
    switch (type) {
      case 'action':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'knowledge':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'communication':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  return (
    <Card className="glass-card overflow-hidden hover:shadow-glass-hover transition-all">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Bot className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium text-primary">
                {role === 'client' ? 'Client Agent' : 'Remote Agent'}
              </span>
              <Badge
                variant={isConnected ? 'default' : 'secondary'}
                className="text-xs"
              >
                {isConnected ? 'Connected' : 'Disconnected'}
              </Badge>
            </div>
            <CardTitle className="text-base">{name}</CardTitle>
          </div>
          <div className="flex gap-2">
          {onConnect && (
            <Button
              variant="outline"
              size="sm"
              onClick={onConnect}
              disabled={isConnecting}
              className="text-xs"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  Connecting...
                </>
              ) : isConnected ? (
                'Disconnect'
              ) : (
                'Connect'
              )}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={onAnalyze}
            className="text-xs"
            disabled={!onAnalyze}
          >
            Analyze
          </Button>
        </div>
        </div>
      </CardHeader>

      <CardContent>
        <CardDescription className="text-sm mb-4">{description}</CardDescription>

        <Collapsible open={showDetails} onOpenChange={setShowDetails}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full flex justify-between items-center mb-4">
              <span className="flex items-center gap-2">
                <Info className="h-4 w-4" />
                <span>Agent Details</span>
              </span>
              {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>

          <CollapsibleContent className="space-y-4 mb-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-medium mb-1">Version</h4>
                <p className="text-muted-foreground">{version || 'N/A'}</p>
              </div>
              <div>
                <h4 className="font-medium mb-1">Last Active</h4>
                <p className="text-muted-foreground">{lastActive ? new Date(lastActive).toLocaleString() : 'N/A'}</p>
              </div>
            </div>

            {supportedContentTypes.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Supported Content Types</h4>
                <div className="flex flex-wrap gap-2">
                  {supportedContentTypes.map((type, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {type}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {capabilities.length > 0 && capabilities.some(cap => cap.description) && (
              <div>
                <h4 className="font-medium mb-2">Capability Details</h4>
                <div className="space-y-2">
                  {capabilities.map((capability, index) => (
                    <div key={index} className="text-sm">
                      <p className="font-medium">{capability.name}</p>
                      <p className="text-muted-foreground text-xs">{capability.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>

        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium mb-2">Capabilities</h3>
            <div className="flex flex-wrap gap-2">
              {capabilities.map((capability, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className={`${getCapabilityColor(capability.type)}`}
                >
                  {capability.name}
                </Badge>
              ))}
            </div>
          </div>

          {currentTask && (
            <div>
              <h3 className="text-sm font-medium mb-2">Current Task</h3>
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(currentTask.status)}
                    <span className="text-sm font-medium">{currentTask.title}</span>
                  </div>
                  {onTaskAction && (
                    <div className="flex gap-2">
                      {currentTask.status === 'failed' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onTaskAction('retry', currentTask.id)}
                          className="text-xs"
                        >
                          Retry
                        </Button>
                      )}
                      {currentTask.status === 'in_progress' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onTaskAction('stop', currentTask.id)}
                          className="text-xs text-red-500"
                        >
                          Stop
                        </Button>
                      )}
                      {currentTask.status === 'pending' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onTaskAction('start', currentTask.id)}
                          className="text-xs"
                        >
                          Start
                        </Button>
                      )}
                    </div>
                  )}
                </div>
                {currentTask.artifact && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      <span>Latest Artifact: {currentTask.artifact.type}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="pt-0">
        <div className="text-xs text-muted-foreground">
          {currentTask
            ? `Last updated: ${new Date(currentTask.createdAt).toLocaleString()}`
            : `Created: ${new Date().toLocaleString()}`}
        </div>
      </CardFooter>
    </Card>
  );
};

export default AgentCard;