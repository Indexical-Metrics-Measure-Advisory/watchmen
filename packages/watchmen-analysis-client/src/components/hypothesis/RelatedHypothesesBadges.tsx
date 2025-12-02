
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { HypothesisType } from '@/model/Hypothesis';

interface RelatedHypothesesBadgesProps {
  relatedIds?: string[];
  allHypotheses: HypothesisType[];
  maxShow?: number;
}

const RelatedHypothesesBadges: React.FC<RelatedHypothesesBadgesProps> = ({ 
  relatedIds = [], 
  allHypotheses,
  maxShow = 2
}) => {
  if (!relatedIds?.length) return null;
  
  const relatedHypotheses = allHypotheses.filter(h => relatedIds.includes(h.id));
  
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {relatedHypotheses.slice(0, maxShow).map(hypothesis => (
        <Badge 
          key={hypothesis.id} 
          variant="outline" 
          className="bg-muted/50 text-xs whitespace-nowrap overflow-hidden text-ellipsis"
        >
          {hypothesis.title}
        </Badge>
      ))}
      {relatedHypotheses.length > maxShow && (
        <Badge variant="outline" className="bg-muted/50 text-xs">
          +{relatedHypotheses.length - maxShow}
        </Badge>
      )}
    </div>
  );
};

export default RelatedHypothesesBadges;
