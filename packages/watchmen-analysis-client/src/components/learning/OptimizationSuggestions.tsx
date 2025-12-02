
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { HypothesisType } from '@/model/Hypothesis';
import { BusinessProblem } from "@/model/business";
import { OptimizationSuggestion } from '@/services/optimizationService';
import { Sparkles } from 'lucide-react';

// Add animation keyframes
const fadeInAnimation = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  .animate-fadeIn {
    animation: fadeIn 0.5s ease-in-out;
  }
  .animate-spin {
    animation: spin 1s linear infinite;
  }
`;

// Add style tag to head
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.innerHTML = fadeInAnimation;
  document.head.appendChild(style);
}

// Add an additional prop for businessProblem
interface OptimizationSuggestionsProps {
  hypothesis?: HypothesisType | null;
  businessProblem?: BusinessProblem | null;
  onApplySuggestion?: (suggestion: OptimizationSuggestion) => void;
  className?: string;
}

const OptimizationSuggestions: React.FC<OptimizationSuggestionsProps> = ({
  hypothesis,
  businessProblem,
  onApplySuggestion,
  className
}) => {
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [suggestions, setSuggestions] = React.useState<OptimizationSuggestion[]>([]);

  // Mock suggestions - in a real app, these would come from a service
  const mockSuggestions: OptimizationSuggestion[] = [
    {
      id: '1',
      title: 'Improve hypothesis clarity',
      description: 'Make the hypothesis more specific by including measurable outcomes.',
      confidence: 85,
      suggestionType: 'refine',
      createdAt: new Date().toISOString(),
      hypothesisId: hypothesis?.id || businessProblem?.id || '',
      basedOn: 'knowledge'
    },
    {
      id: '2',
      title: 'Consider additional metrics',
      description: 'Add customer satisfaction metrics to validate the hypothesis more thoroughly.',
      confidence: 72,
      suggestionType: 'extend',
      createdAt: new Date().toISOString(),
      hypothesisId: hypothesis?.id || businessProblem?.id || '',
      basedOn: 'feedback'
    }
  ];

  const handleRefresh = () => {
    setIsRefreshing(true);
    // 模拟API调用延迟
    setTimeout(() => {
      setSuggestions(mockSuggestions);
      setIsRefreshing(false);
    }, 1000);
  };

  React.useEffect(() => {
    setSuggestions(mockSuggestions);
  }, []);

  return (
    <Card className={`shadow-sm ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="text-base flex items-center">
            <Sparkles className="h-5 w-5 mr-2 text-primary" />
            Optimization Suggestions
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            className={`transition-all ${isRefreshing ? 'animate-spin' : 'hover:rotate-180'}`}
            disabled={isRefreshing}
          >
            <Sparkles className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {hypothesis 
              ? `Optimization suggestions for hypothesis: ${hypothesis.title}`
              : businessProblem
                ? `Optimization suggestions for business problem: ${businessProblem.title}`
                : 'No hypothesis or business problem selected.'}
          </p>
          
          {suggestions.map((suggestion) => (
            <div 
              key={suggestion.id} 
              className="p-4 bg-muted/50 rounded-md border transition-all duration-300 animate-fadeIn hover:bg-muted/70"
            >
              <h3 className="font-medium text-sm mb-1">{suggestion.title}</h3>
              <p className="text-sm text-muted-foreground mb-3">{suggestion.description}</p>
              <div className="flex justify-between items-center">
                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                  {suggestion.confidence}% confidence
                </span>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => onApplySuggestion && onApplySuggestion(suggestion)}
                >
                  Apply
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default OptimizationSuggestions;
