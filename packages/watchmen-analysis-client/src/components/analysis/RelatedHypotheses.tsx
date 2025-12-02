
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { RelatedHypothesis } from '@/model/Hypothesis';



interface RelatedHypothesesProps {
  hypotheses: RelatedHypothesis[];
  handleViewAnalysis: (id: string) => void;
}

const RelatedHypotheses: React.FC<RelatedHypothesesProps> = ({ hypotheses, handleViewAnalysis }) => {
  const navigate = useNavigate();
  
  return (
    <Card className="glass-card h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Related Hypotheses</CardTitle>
        <CardDescription>Other business hypotheses related to the current hypothesis</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {hypotheses.map(hypothesis => (
            <div 
              key={hypothesis.id}
              className="p-3 bg-muted/50 rounded-md hover:bg-muted/70 transition-colors cursor-pointer" 
              onClick={() => handleViewAnalysis(hypothesis.id)}
            >
              <h4 className="text-sm font-medium mb-1">{hypothesis.title}</h4>
              <p className="text-xs text-muted-foreground mb-2">
                {hypothesis.description}
              </p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{hypothesis.status.charAt(0).toUpperCase() + hypothesis.status.slice(1)}</Badge>
                  <span className="text-xs text-muted-foreground">
                    Confidence: {hypothesis.status === 'drafted' ? 'Not Tested' : `${hypothesis.confidence}%`}
                  </span>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-xs h-7"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleViewAnalysis(hypothesis.id);
                  }}
                >
                  View Analysis
                  <ArrowUpRight className="ml-1 h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default RelatedHypotheses;
