import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Bot, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';

interface AIMonitoringMetrics {
  validationScore: number;
  improvementCount: number;
  lastUpdated: string;
  status: 'active' | 'learning' | 'optimizing';
}

interface AIMonitoringDashboardProps {
  metrics: AIMonitoringMetrics;
  challengeTitle: string;
}

export const AIMonitoringDashboard: React.FC<AIMonitoringDashboardProps> = ({
  metrics,
  challengeTitle
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/10 text-green-500';
      case 'learning':
        return 'bg-blue-500/10 text-blue-500';
      case 'optimizing':
        return 'bg-yellow-500/10 text-yellow-500';
      default:
        return 'bg-gray-500/10 text-gray-500';
    }
  };

  return (
    <Card className="glass-card overflow-hidden hover:shadow-glass-hover transition-all">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm">AI Monitor</CardTitle>
          </div>
          <Badge
            variant="secondary"
            className={`${getStatusColor(metrics.status)} capitalize`}
          >
            {metrics.status}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Hypothesis Validation</span>
              <span className="text-sm text-muted-foreground">{metrics.validationScore}%</span>
            </div>
            <Progress value={metrics.validationScore} className="h-2" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <div>
                <div className="text-sm font-medium">{metrics.improvementCount}</div>
                <div className="text-xs text-muted-foreground">Improvements</div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-blue-500" />
              <div>
                <div className="text-sm font-medium">Active</div>
                <div className="text-xs text-muted-foreground">Monitoring</div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <AlertCircle className="h-3 w-3" />
            Last updated {new Date(metrics.lastUpdated).toLocaleDateString()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AIMonitoringDashboard;