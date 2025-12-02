
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowUpRight, Edit, Link, Sparkles } from 'lucide-react';
import { BusinessProblem } from "@/model/business";

interface BusinessProblemCardProps {
  businessProblem: BusinessProblem;
  onEdit: (id: string) => void;
  onAddHypothesis: (problemId: string) => void;
  onViewHypotheses: (problemId: string) => void;
  onGenerateHypothesis?: (problemId: string) => void; // New prop for AI generation
  hypothesesCount: number;
  aiAnswer?: string; 
}

const statusConfig = {
  open: { label: 'Unresolved', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
  in_progress: { label: 'In Progress', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' },
  resolved: { label: 'Resolved', color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
};

const BusinessProblemCard: React.FC<BusinessProblemCardProps> = ({
  businessProblem,
  onEdit,
  onAddHypothesis,
  onViewHypotheses,
  onGenerateHypothesis,
  hypothesesCount
}) => {
  const { id, title, description, status, createdAt } = businessProblem;
  const { label, color } = statusConfig[status];


  return (
    <Card className="glass-card overflow-hidden hover:shadow-glass-hover transition-all flex flex-col min-h-[400px]">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <Badge className={`mb-2 font-normal ${color}`}>{label}</Badge>
            <CardTitle className="text-base">{title}</CardTitle>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => onEdit(id)}>
              <Edit className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-grow">
        <CardDescription className="text-sm mb-4 line-clamp-2">{description}</CardDescription>
        
        {businessProblem.aiAnswer && (
          <div className="mb-4 p-3 bg-primary/5 rounded-lg border border-primary/10">
            <div className="text-sm font-medium mb-2 text-primary">AI Analysis:</div>
            <div className="text-sm text-muted-foreground">{businessProblem.aiAnswer}</div>
          </div>
        )}
        
        <div className="space-y-4">
          <div>
           
            <div className="flex flex-wrap gap-1">
              <Badge variant="outline" className="bg-background/50">
                {hypothesesCount} Hypotheses
              </Badge>
            </div>
          </div>

          {businessProblem.metrics && businessProblem.metrics.length > 0 && (
            <div>
              <div className="text-sm mb-2">Related Metrics ({businessProblem.metrics.length})</div>
              <div className="flex flex-wrap gap-1">
                {businessProblem.metrics.slice(0, 3).map((metric, index) => (
                  <Badge key={index} variant="outline" className="bg-background/50">
                    {metric}
                  </Badge>
                ))}
                {businessProblem.metrics.length > 3 && (
                  <Badge variant="outline" className="bg-background/50">
                    +{businessProblem.metrics.length - 3}
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="mt-auto pt-4 flex justify-between items-center">
        <div className="text-xs text-muted-foreground">
          Created on {new Date(createdAt).toLocaleDateString()}
        </div>
        <div className="flex gap-2">
          {onGenerateHypothesis && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs"
              onClick={() => onGenerateHypothesis(id)}
            >
              <Sparkles className="mr-1 h-3 w-3" />
              Generate
            </Button>
          )}
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-xs"
            onClick={() => onViewHypotheses(id)}
          >
            Hypotheses
            <ArrowUpRight className="ml-1 h-3 w-3" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

export default BusinessProblemCard;
