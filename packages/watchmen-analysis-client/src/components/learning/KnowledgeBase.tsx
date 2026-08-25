
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HypothesisType } from '@/model/Hypothesis';
import { BusinessChallenge } from "@/model/business";
import { BookOpen } from 'lucide-react';

interface KnowledgeBaseProps {
  relatedHypothesis?: HypothesisType | null;
  relatedBusinessChallenge?: BusinessChallenge | null;
  className?: string;
}

const KnowledgeBase: React.FC<KnowledgeBaseProps> = ({
  relatedHypothesis,
  relatedBusinessChallenge,
  className
}) => {
  return (
    <Card className={`shadow-sm ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center">
          <BookOpen className="h-5 w-5 mr-2 text-primary" />
          Knowledge Base
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {relatedHypothesis 
              ? `Showing knowledge related to hypothesis: ${relatedHypothesis.title}`
              : relatedBusinessChallenge
                ? `Showing knowledge related to business challenge: ${relatedBusinessChallenge.title}`
                : 'No related hypothesis or business challenge selected.'}
          </p>
          
          {/* Knowledge base content would go here */}
          <div className="p-4 bg-muted rounded-md text-center">
            <p>Knowledge base entries will be displayed here.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default KnowledgeBase;
