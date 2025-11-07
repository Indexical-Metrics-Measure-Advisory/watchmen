import React from 'react';
import { DatabaseInsight } from '@/models/discovery.models';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, AlertTriangle, Info, Sparkles } from 'lucide-react';

interface DatabaseInsightsProps {
  insights: DatabaseInsight[];
  onInsightClick?: (insight: DatabaseInsight) => void;
}

const DatabaseInsights: React.FC<DatabaseInsightsProps> = ({ 
  insights, 
  onInsightClick 
}) => {
  // Get icon based on insight type
  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'suggestion':
        return <Lightbulb className="h-4 w-4 text-amber-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />;
      default:
        return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  // Get badge color based on insight type
  const getInsightBadgeVariant = (type: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (type) {
      case 'suggestion':
        return 'default';
      case 'warning':
        return 'destructive';
      case 'info':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  // Format confidence as percentage
  const formatConfidence = (confidence: number) => {
    return `${Math.round(confidence * 100)}%`;
  };

  return (
    <Card className="shadow-md border-t-4 border-t-blue-500">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-500" />
            AI-Generated Insights
          </CardTitle>
          <Badge variant="outline" className="bg-gradient-to-r from-purple-500 to-blue-500 text-white border-0">
            AI Enhanced
          </Badge>
        </div>
        <CardDescription>
          Automatically generated insights based on database structure analysis
        </CardDescription>
      </CardHeader>
      <CardContent>
        {insights.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            <p>No insights available yet. Run analysis to generate insights.</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
            {insights.map((insight) => (
              <div 
                key={insight.id} 
                className="p-3 bg-gray-50 rounded-lg border hover:bg-gray-100 transition-colors cursor-pointer"
                onClick={() => onInsightClick?.(insight)}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {getInsightIcon(insight.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-medium text-sm">{insight.title}</h4>
                      <div className="flex items-center gap-2">
                        <Badge variant={getInsightBadgeVariant(insight.type)}>
                          {insight.type}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {formatConfidence(insight.confidence)}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">{insight.description}</p>
                    {insight.relatedEntities && insight.relatedEntities.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {insight.relatedEntities.map((entity) => (
                          <Badge key={entity} variant="outline" className="text-xs">
                            {entity}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DatabaseInsights;