
import React from 'react';
import { Button } from '@/components/ui/button';
import { LineChart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const HypothesisNotFound: React.FC = () => {
  const navigate = useNavigate();
  
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <LineChart className="h-16 w-16 mb-4 text-muted-foreground opacity-40" />
      <h2 className="text-xl font-medium mb-2">Select a Hypothesis to Analyze</h2>
      <p className="text-muted-foreground text-center max-w-md">
        Choose a hypothesis from the management page or specify a hypothesis ID via URL query parameter to view detailed analysis results.
      </p>
      <Button className="mt-6" onClick={() => navigate('/hypotheses')}>
        Browse Hypotheses
      </Button>
    </div>
  );
};

export default HypothesisNotFound;
