
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, XCircle, FlaskConical } from 'lucide-react';
import { DataExplain } from '@/model/analysis';



interface HypothesisTestingTabProps {
  dataExplanations?: DataExplain[];
  onRunAnalysis?: () => void;
  isAnalyzing?: boolean;
}

const HypothesisTestingTab: React.FC<HypothesisTestingTabProps> = ({ dataExplanations = [], onRunAnalysis, isAnalyzing }) => {
  if (dataExplanations.length === 0) {
    return (
      <Card className="shadow-none">
        <CardContent className="flex flex-col items-center justify-center h-64 text-center">
          <div className="p-4 rounded-full bg-muted mb-4">
            <FlaskConical className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Not validated yet</h3>
          <p className="text-sm text-muted-foreground mb-4">Run the analysis first to validate this hypothesis.</p>
          {onRunAnalysis && (
            <Button onClick={onRunAnalysis} disabled={isAnalyzing}>
              {isAnalyzing ? 'Analyzing...' : 'Run Analysis'}
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {dataExplanations.map((explain, index) => (
        <Card key={index} className="shadow-none">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Hypothesis Validation</CardTitle>
              <div className="flex items-center gap-2">
                {typeof explain.confidence === 'number' && (
                  <div className="flex items-center gap-1.5" title={`System confidence: ${explain.confidence}%`}>
                    <Progress value={explain.confidence} className="h-1.5 w-16" />
                    <span className="text-xs text-muted-foreground">{explain.confidence}%</span>
                  </div>
                )}
                {explain.hypothesisValidationFlag === true ? (
                  <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    Validated
                  </Badge>
                ) : explain.hypothesisValidationFlag === false ? (
                  <Badge className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">
                    <XCircle className="mr-1 h-3 w-3" />
                    Rejected
                  </Badge>
                ) : (
                  <Badge variant="outline">Not Validated</Badge>
                )}
              </div>
            </div>
            {explain.hypothesisValidation && (
              <CardDescription>{explain.hypothesisValidation}</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {explain.keyMetricChange && (
                <div className="p-3 bg-muted/50 rounded-md">
                  <h4 className="font-medium mb-2">Key Metric Changes</h4>
                  <p className="text-sm text-muted-foreground">{explain.keyMetricChange}</p>
                </div>
              )}
              {explain.summaryFinding && (
                <div className="p-3 bg-muted/50 rounded-md">
                  <h4 className="font-medium mb-2">Summary Findings</h4>
                  <p className="text-sm text-muted-foreground">{explain.summaryFinding}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default HypothesisTestingTab;
