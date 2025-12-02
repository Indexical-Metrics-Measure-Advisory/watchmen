
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import HypothesisCard from '@/components/hypothesis/HypothesisCard';
import { HypothesisType } from '@/model/Hypothesis';
import { businessService } from '@/services/businessService';

interface HypothesisGridProps {
  hypotheses: HypothesisType[];
  onEdit: (id: string) => void;
  onViewMetrics: (id: string) => void;
  problemFilter: string;
  handleCreateHypothesis: (problemId?: string) => void;
  selectedProblem?: any;
  allHypotheses: HypothesisType[];
}

const HypothesisGrid: React.FC<HypothesisGridProps> = ({
  hypotheses,
  onEdit,
  onViewMetrics,
  problemFilter,
  handleCreateHypothesis,
  selectedProblem,
  allHypotheses,
}) => {
  const [businessProblems, setBusinessProblems] = useState<Record<string, { title: string }>>({});

  useEffect(() => {
    const fetchBusinessProblems = async () => {
      const problems: Record<string, { title: string }> = {};
      for (const hypothesis of hypotheses) {
        if (hypothesis.businessProblemId && !problems[hypothesis.businessProblemId]) {
          try {
            const problem = await businessService.getBusinessProblemById(hypothesis.businessProblemId);
            if (problem) {
              problems[hypothesis.businessProblemId] = { title: problem.title };
            }
          } catch (error) {
            console.error(`Error fetching business problem: ${error}`);
          }
        }
      }
      setBusinessProblems(problems);
    };

    fetchBusinessProblems();
  }, [hypotheses]);

  return (
    <div className="grid grid-cols-3 gap-6">
      {hypotheses.map(hypothesis => {
        const problemTitle = hypothesis.businessProblemId 
          ? businessProblems[hypothesis.businessProblemId]?.title
          : undefined;

        return (
          <HypothesisCard
            key={hypothesis.id}
            hypothesis={hypothesis}
            onEdit={onEdit}
            onViewMetrics={onViewMetrics}
            businessProblemTitle={problemFilter === 'all' ? problemTitle : undefined}
            allHypotheses={allHypotheses}
          />
        );
      })}
      
      {hypotheses.length === 0 && (
        <div className="col-span-3 text-center py-12">
          <p className="text-muted-foreground">
            {selectedProblem 
              ? `No hypotheses created for business problem "${selectedProblem.title}". Create a new hypothesis to start analysis.`
              : "No matching hypotheses found. Try adjusting filters or create a new hypothesis."}
          </p>
          <Button 
            onClick={() => handleCreateHypothesis(problemFilter !== 'all' ? problemFilter : undefined)} 
            variant="outline" 
            className="mt-4"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create New Hypothesis
          </Button>
        </div>
      )}
    </div>
  );
};

export default HypothesisGrid;
