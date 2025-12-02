import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Dimension } from './DimensionSelector';
import { AlertIndicator } from './AlertIndicator';

interface ImportanceAnalysisProps {
  dimension: Dimension;
  factors: Array<{
    id: string;
    name: string;
    importance: number;
    correlation: number;
  }>;
}

const ImportanceAnalysis: React.FC<ImportanceAnalysisProps> = ({ dimension, factors }) => {

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Importance Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium mb-2">Key Factors</h4>
            <div className="space-y-3">
              {factors.map((factor, index) => (
                <div key={index} className="space-y-1">
                  <div className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2">
                      <span>{factor.name}</span>
                      <AlertIndicator
                        metricId={factor.id}
                        metricName={factor.name}
                        currentValue={factor.importance}
                        unit="%"
                      />
                    </div>
                    <span className="text-muted-foreground">{factor.importance.toFixed(1)}%</span>
                  </div>
                  <Progress value={factor.importance} className="h-2" />
                  <div className="text-xs text-muted-foreground">
                    Correlation: {(factor.correlation * 100).toFixed(1)}%
                  </div>
                </div>
              ))}
            </div>
          </div>

          {dimension.subDimensions && (
            <div>
              <h4 className="text-sm font-medium mb-2">Sub-dimension Impact</h4>
              <div className="space-y-3">
                {dimension.subDimensions.map((sub) => (
                  <div key={sub.id} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{sub.name}</span>
                      <span className="text-muted-foreground">{sub.importance.toFixed(1)}%</span>
                    </div>
                    <Progress value={sub.importance} className="h-2" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ImportanceAnalysis;