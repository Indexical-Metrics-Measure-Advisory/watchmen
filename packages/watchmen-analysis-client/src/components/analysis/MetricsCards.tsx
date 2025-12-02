
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface MetricsCardsProps {
  confidence: number;
  pValue: number;
  analysisData: {
    sampleSize: number;
    duration: string;
  };
  lastAnalysis: {
    date: string;
    daysAgo: string;
  };
  significanceLabel: string;
}

const MetricsCards: React.FC<MetricsCardsProps> = ({
  confidence,
  pValue,
  analysisData,
  lastAnalysis,
  significanceLabel
}) => {
  return (
    <div className="grid grid-cols-4 gap-4 mb-4">
      <Card className="bg-muted/60 shadow-none">
        <CardContent className="p-4">
          <div className="text-sm text-muted-foreground mb-1">Confidence</div>
          <div className="text-2xl font-medium mb-2">{confidence}%</div>
          <Progress value={confidence} className="h-1.5" />
        </CardContent>
      </Card>
      
      <Card className="bg-muted/60 shadow-none">
        <CardContent className="p-4">
          <div className="text-sm text-muted-foreground mb-1">Significance</div>
          <div className="text-2xl font-medium mb-2">p={pValue}</div>
          <div className="text-xs text-green-600">{significanceLabel}</div>
        </CardContent>
      </Card>
      
      <Card className="bg-muted/60 shadow-none">
        <CardContent className="p-4">
          <div className="text-sm text-muted-foreground mb-1">Analysis Data Size</div>
          <div className="text-2xl font-medium mb-2">{analysisData.sampleSize}</div>
          <div className="text-xs text-muted-foreground">{analysisData.duration}</div>
        </CardContent>
      </Card>
      
      <Card className="bg-muted/60 shadow-none">
        <CardContent className="p-4">
          <div className="text-sm text-muted-foreground mb-1">Last Analysis</div>
          <div className="text-2xl font-medium mb-2">{lastAnalysis.date}</div>
          <div className="text-xs text-muted-foreground">{lastAnalysis.daysAgo}</div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MetricsCards;
