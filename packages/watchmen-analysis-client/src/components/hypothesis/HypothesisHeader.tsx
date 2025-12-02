
import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus, ArrowLeft, Sparkles, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface HypothesisHeaderProps {
  selectedProblem?: {
    title: string;
    description: string;
  };
  selectedChallenge?: {
    title: string;
    description: string;
  };
  handleCreateHypothesis: (problemId?: string) => void;
  problemFilter: string;
  mode?: 'edit' | 'link';
  setMode: (mode: 'edit' | 'link') => void;
  onGenerateWithAI?: () => void;
  toggleAiAssistant?: () => void;
  showAiAssistant?: boolean;
  onGenerateAnalysis?: () => void;
  isGeneratingAnalysis?: boolean;
}

const HypothesisHeader: React.FC<HypothesisHeaderProps> = ({
  selectedProblem,
  selectedChallenge,
  handleCreateHypothesis,
  problemFilter,
  mode = 'link',
  setMode,
  onGenerateWithAI,
  toggleAiAssistant,
  onGenerateAnalysis,
  isGeneratingAnalysis,
}) => {
  const navigate = useNavigate();
  
  const handleCreate = () => {
    setMode('edit'); // Set to edit mode when creating a new hypothesis
    handleCreateHypothesis(problemFilter !== 'all' ? problemFilter : undefined);
  };
  
  return (
    <div className="flex justify-between items-center mb-6">
      <div>
        <div className="flex items-center gap-2">
          {selectedProblem && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="mr-2"
              onClick={() => {
                if (selectedChallenge) {
                  navigate('/challenges');
                } else {
                  navigate('/problems');
                }
              }}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to {selectedChallenge ? 'Business Challenges' : 'Business Problems'}
            </Button>
          )}
          <h1 className="text-2xl font-semibold">
            {selectedProblem ? `Hypotheses for "${selectedProblem.title}"` : 'Hypothesis'}
          </h1>
        </div>
        {selectedProblem && (
          <p className="text-sm text-muted-foreground mt-1">
            {selectedProblem.description}
          </p>
        )}
        {selectedChallenge && (
          <p className="text-xs text-muted-foreground mt-1">
            Part of challenge: {selectedChallenge.title}
          </p>
        )}
      </div>
      <div className="flex gap-2">
        {selectedProblem && onGenerateWithAI && (
          <Button 
            onClick={onGenerateWithAI} 
            variant="outline"
            className="hover-float"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Generate with AI
          </Button>
        )}
        {selectedProblem && onGenerateAnalysis && (
          <Button 
            onClick={onGenerateAnalysis}
            variant="outline"
            className="hover-float"
            disabled={isGeneratingAnalysis}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isGeneratingAnalysis ? 'animate-spin' : ''}`} />
            {isGeneratingAnalysis ? 'Generating...' : 'Generate Analysis'}
          </Button>
        )}
        <Button 
          onClick={handleCreate} 
          className="hover-float"
        >
          <Plus className="mr-2 h-4 w-4" />
          Create New Hypothesis
        </Button>
      </div>
    </div>
  );
};

export default HypothesisHeader;
