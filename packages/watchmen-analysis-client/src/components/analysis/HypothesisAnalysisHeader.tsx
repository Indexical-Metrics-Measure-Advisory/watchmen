
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, RefreshCw, GitGraph } from 'lucide-react';
import StatusIcon from './StatusIcon';
import { cn } from '@/lib/utils';
import { HypothesisType } from '@/model/Hypothesis';
import { useNavigate } from 'react-router-dom';

interface HypothesisAnalysisHeaderProps {
  hypothesis: HypothesisType;
}

const HypothesisAnalysisHeader: React.FC<HypothesisAnalysisHeaderProps> = ({ hypothesis }) => {
  const navigate = useNavigate();
  
  const handleViewGraph = () => {
    navigate(`/graph?hypothesis=${hypothesis.id}`);
  };
  
  return (
    <div>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <StatusIcon status={hypothesis.status} />
              <Badge className={cn(
                hypothesis.status === 'validated' && "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
                hypothesis.status === 'rejected' && "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
                hypothesis.status === 'testing' && "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
                hypothesis.status === 'drafted' && "bg-muted text-muted-foreground"
              )}>
                {hypothesis.status === 'validated' && 'Validated'}
                {hypothesis.status === 'rejected' && 'Rejected'}
                {hypothesis.status === 'testing' && 'Testing'}
                {hypothesis.status === 'drafted' && 'Draft'}
              </Badge>
            </div>
            <CardTitle className="text-xl">{hypothesis.title}</CardTitle>
            <CardDescription className="mt-2">{hypothesis.description}</CardDescription>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex items-center gap-1"
              onClick={handleViewGraph}
            >
              <GitGraph className="h-4 w-4" />
              Graph View
            </Button>
            <Button variant="outline" size="sm" className="flex items-center gap-1">
              <Download className="h-4 w-4" />
              Export Analysis
            </Button>
            <Button size="sm" className="flex items-center gap-1">
              <RefreshCw className="h-4 w-4" />
              Update Analysis
            </Button>
          </div>
        </div>
      </CardHeader>
    </div>
  );
};

export default HypothesisAnalysisHeader;
