import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Bot, CheckCircle, Clock, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

export type AIMonitoringLog = {
  id: string;
  type: 'challenge' | 'problem' | 'hypothesis' | 'metric' | 'suggestion';
  title: string;
  description: string;
  timestamp: string;
  status: 'success' | 'warning' | 'error' | 'info';
  value?: number;
  action?: string;
};

interface AIMonitoringDetailProps {
  logs: AIMonitoringLog[];
  challengeTitle: string;
  searchQuery?: string;
  selectedStatus?: string;
}

const typeIcons = {
  challenge: <Activity className="h-4 w-4" />,
  problem: <Zap className="h-4 w-4" />,
  hypothesis: <Bot className="h-4 w-4" />,
  metric: <CheckCircle className="h-4 w-4" />,
  suggestion: <Clock className="h-4 w-4" />,
};

const statusColors = {
  success: 'bg-green-100 text-green-800',
  warning: 'bg-yellow-100 text-yellow-800',
  error: 'bg-red-100 text-red-800',
  info: 'bg-blue-100 text-blue-800',
};

export const AIMonitoringDetail: React.FC<AIMonitoringDetailProps> = ({ 
  logs, 
  challengeTitle,
  searchQuery = '',
  selectedStatus = 'all'
}) => {
  const [activeTab, setActiveTab] = useState<'all' | AIMonitoringLog['type']>('all');

  const filteredLogs = logs
    .filter(log => {
      const matchesSearch = searchQuery.toLowerCase() === '' ||
        log.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = selectedStatus === 'all' || log.status === selectedStatus.toLowerCase();
      const matchesType = activeTab === 'all' || log.type === activeTab;
      
      return matchesSearch && matchesStatus && matchesType;
    });

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <span>AI Agent Execution Logs</span>
          <Badge variant="outline" className="ml-auto">
            {challengeTitle}
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {logs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No execution logs yet. AI agent will populate this section as it monitors.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex gap-4">
              <Button 
                variant={activeTab === 'all' ? 'outline' : 'ghost'} 
                size="sm"
                onClick={() => setActiveTab('all')}
              >
                All
              </Button>
              <Button 
                variant={activeTab === 'challenge' ? 'outline' : 'ghost'} 
                size="sm"
                onClick={() => setActiveTab('challenge')}
              >
                Challenges
              </Button>
              <Button 
                variant={activeTab === 'problem' ? 'outline' : 'ghost'} 
                size="sm"
                onClick={() => setActiveTab('problem')}
              >
                Problems
              </Button>
              <Button 
                variant={activeTab === 'hypothesis' ? 'outline' : 'ghost'} 
                size="sm"
                onClick={() => setActiveTab('hypothesis')}
              >
                Hypotheses
              </Button>
              <Button 
                variant={activeTab === 'metric' ? 'outline' : 'ghost'} 
                size="sm"
                onClick={() => setActiveTab('metric')}
              >
                Metrics
              </Button>
            </div>
            
            <Separator />
            
            <div className="space-y-4">
              {filteredLogs.map((log, index) => (
                <div key={log.id} className="relative flex gap-3 items-start group hover:bg-accent/5 p-4 rounded-lg transition-colors">
                  {/* Timeline connector */}
                  {index < logs.length - 1 && (
                    <div className="absolute left-[23px] top-[48px] w-[2px] h-[calc(100%-24px)] bg-accent/50" />
                  )}
                  
                  <div className="relative">
                    <div className="p-2.5 rounded-full bg-accent/10 border-2 border-accent group-hover:border-primary group-hover:bg-accent transition-colors">
                      {typeIcons[log.type]}
                    </div>
                  </div>
                  
                  <div className="flex-1 pt-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-medium text-base group-hover:text-primary transition-colors">
                        {log.title}
                      </h4>
                      <Badge 
                        className={`${statusColors[log.status]} px-2 py-0.5 rounded-full text-xs font-medium transition-opacity`}
                      >
                        {log.status.charAt(0).toUpperCase() + log.status.slice(1)}
                      </Badge>
                      {log.value !== undefined && (
                        <Badge variant="outline" className="ml-auto px-2 py-0.5">
                          Score: {log.value}
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                      {log.description}
                    </p>
                    
                    <div className="flex items-center justify-between mt-3">
                      <time className="text-xs text-muted-foreground/75 tabular-nums">
                        {new Date(log.timestamp).toLocaleString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </time>
                      
                      {log.action && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 px-3 text-xs font-medium hover:bg-accent/20"
                        >
                          {log.action}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AIMonitoringDetail;