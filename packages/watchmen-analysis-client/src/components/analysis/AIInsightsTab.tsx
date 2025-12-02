
import React, { useEffect, useState, useRef } from 'react';
import { Lightbulb, CheckCircle2, AlertCircle, ArrowUpRight, ArrowDown, ArrowUpRight as ArrowUpRightIcon, MessageSquare, History, Loader2 } from 'lucide-react';
import { useAnalysis } from '@/contexts/AnalysisContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import BusinessContextEditor from './BusinessContextEditor';
import { aiService } from '@/services/aiService';
import { InsightsData, KeyFindings, MetricComparison, RecommendedAction, ResearchSuggestion } from '@/model/insights';
import { DataExplain } from '@/model/analysis';

interface AIInsightsTabProps {
  dataExplanations?: DataExplain[];
}

// Stable hash function outside component to avoid recreationThe hypothesis is partially validated on every render
const createStableKey = (timestamp: string, content: string) => {
  return `${timestamp}-${content.slice(0, 50).replace(/\s+/g, '-')}`;
};

const AIInsightsTab: React.FC<AIInsightsTabProps> = ({ dataExplanations = [] }) => {
  // console.log(dataExplanations);
  const { hypothesis, analysisHistory, businessContext, addAnalysisHistory, isRefreshingInsights, refreshInsights } = useAnalysis();
  const [error, setError] = useState<string | null>(null);
  const processedHypothesisRef = useRef<string | null>(null);

  useEffect(() => {
    if (hypothesis && hypothesis.id !== processedHypothesisRef.current) {
      try {
        processedHypothesisRef.current = hypothesis.id;
        addAnalysisHistory({
          type: 'insight',
          content: 'Based on current data analysis and business context, AI has generated key findings and recommendations.'
        });
      } catch (err) {
        setError('Failed to update analysis history');
        console.error('Error adding analysis history:', err);
      }
    }
  }, [hypothesis, addAnalysisHistory]);

  const renderHistoryEntry = (entry: { timestamp: string; type: string; content: string }) => {
    const date = new Date(entry.timestamp);
    return (
      <div key={createStableKey(entry.timestamp, entry.content)} className="flex items-start gap-2 py-2 border-b border-border last:border-0">
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          {entry.type === 'insight' && <Lightbulb className="h-4 w-4 text-primary" />}
          {entry.type === 'feedback' && <MessageSquare className="h-4 w-4 text-primary" />}
          {entry.type === 'action' && <CheckCircle2 className="h-4 w-4 text-primary" />}
        </div>
        <div className="flex-1">
          <div className="text-sm text-muted-foreground">
            {date.toLocaleString()}
          </div>
          <div className="mt-1">{entry.content}</div>
        </div>
      </div>
    );
  };
  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg mb-4">
          {error}
        </div>
      )}
      {isRefreshingInsights ? (
        <div className="flex items-center justify-center p-8 bg-background/50 rounded-lg">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Refreshing analysis...</span>
        </div>
      ) : (
        <>
          {/* <BusinessContextEditor onRefreshInsights={refreshInsights} /> */}
          {/* Hypothesis Validation Insights */}
          {dataExplanations.map((explanation, index) => (
            <div key={index} className="space-y-4">
              <div className="glass-panel p-4 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "h-10 w-10 rounded-full flex items-center justify-center shrink-0",
                    explanation.hypothesisValidationFlag 
                      ? "bg-green-100 dark:bg-green-900" 
                      : "bg-red-100 dark:bg-red-900"
                  )}>
                    {explanation.hypothesisValidationFlag ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-medium mb-2">
                      Hypothesis {explanation.hypothesisValidationFlag ? 'Validated' : 'Not Validated'}
                    </h3>
                    <p className="text-muted-foreground">{explanation.hypothesisValidation}</p>
                  </div>
                </div>
              </div>
              
              <div className="glass-panel p-4 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0 dark:bg-blue-900">
                    <ArrowUpRight className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium mb-2">Key Metric Changes</h3>
                    <p className="text-muted-foreground">{explanation.keyMetricChange}</p>
                  </div>
                </div>
              </div>
              
              <div className="glass-panel p-4 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center shrink-0 dark:bg-purple-900">
                    <Lightbulb className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium mb-2">Summary Findings</h3>
                    <p className="text-muted-foreground">{explanation.summaryFinding}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {/* Fallback to default insights if no data explanations */}
          {/* {dataExplanations.length === 0 && (
            <div className="glass-panel p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Lightbulb className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-medium mb-2">Key Findings</h3>
                  <p className="text-muted-foreground">{insights.keyFindings.summary}</p>
                  
                  <div className="mt-4 p-3 bg-muted/50 rounded-md">
                    <h4 className="text-sm font-medium mb-2">{insights.keyFindings.metrics.title}</h4>
                    <div className="grid grid-cols-2 gap-4">
                      {insights.keyFindings.metrics.comparisons.map((comparison, index) => (
                        <div key={index}>
                          <div className="text-sm mb-1">{comparison.label}</div>
                          <div className="flex items-end gap-2">
                            <div className="text-2xl font-medium">{comparison.value}%</div>
                            <div className={cn(
                              "text-xs px-1.5 py-1 rounded-md flex items-center gap-1",
                              comparison.changeType === 'increase' 
                                ? "text-green-600 bg-green-50 dark:bg-green-950/40 dark:text-green-400"
                                : "text-red-600 bg-red-50 dark:bg-red-950/40 dark:text-red-400"
                            )}>
                              {comparison.changeType === 'increase' ? (
                                <ArrowUpRight className="h-3 w-3" />
                              ) : (
                                <ArrowDown className="h-3 w-3" />
                              )}
                              {comparison.changeType === 'increase' ? `${comparison.change}%` : 'Baseline'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )} */}
          
         
        </>
      )}
    </div>
  );
};

export default AIInsightsTab;
