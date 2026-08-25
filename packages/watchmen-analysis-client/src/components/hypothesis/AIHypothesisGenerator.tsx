
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Sparkles, Loader2 } from 'lucide-react';
import { aiHypothesisService } from '@/services/aiHypothesisService';
import { BusinessChallenge } from '@/model/business';

interface AIHypothesisGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessChallenge?: BusinessChallenge
  onGenerate: (data: { title: string; description: string; businessChallengeId?: string; analysisMethod?: string }) => void;
}

const AIHypothesisGenerator: React.FC<AIHypothesisGeneratorProps> = ({
  open,
  onOpenChange,
  businessChallenge,
  onGenerate,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedTitle, setGeneratedTitle] = useState('');
  const [generatedDescription, setGeneratedDescription] = useState('');
  const [generatedAnalysisMethod, setGeneratedAnalysisMethod] = useState<string | undefined>();

  const handleGenerate = async () => {
    if (!businessChallenge) return;
    
    setIsGenerating(true);
    try {
      const result = await aiHypothesisService.generateHypothesis(businessChallenge.id); 
      
      setGeneratedTitle(result.response.hypothesis);
      setGeneratedDescription(result.response.description);
      setGeneratedAnalysisMethod(result.response.analysisMethod);
    } catch (error) {
      console.error('Error generating hypothesis:', error);
      // TODO: Add error handling UI
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUseGenerated = () => {
    onGenerate({
      title: generatedTitle,
      description: generatedDescription,
      businessChallengeId: businessChallenge?.id,
      analysisMethod: generatedAnalysisMethod
    });
    onOpenChange(false);
    
    // Reset the form
    setGeneratedTitle('');
    setGeneratedDescription('');
    setGeneratedAnalysisMethod(undefined);
  };



  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-panel sm:max-w-[600px] slide-enter">
        <DialogHeader>
          <DialogTitle>Generate Hypothesis with AI</DialogTitle>
          <DialogDescription>
            Create a hypothesis based on the business challenge using AI assistance
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {businessChallenge && (
            <div className="bg-muted/50 p-4 rounded-md">
              <div className="font-medium">Business Challenge</div>
              <h3 className="text-sm font-medium mt-1">{businessChallenge.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{businessChallenge.description}</p>
            </div>
          )}

          {!isGenerating && !generatedTitle && (
            <div className="flex justify-center py-4">
              <Button onClick={handleGenerate}>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Hypothesis
              </Button>
            </div>
          )}

          {isGenerating && (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-sm text-muted-foreground">Generating hypothesis...</p>
            </div>
          )}

          {generatedTitle && !isGenerating && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="generated-title">Generated Title</Label>
                <Textarea
                  id="generated-title"
                  value={generatedTitle}
                  onChange={(e) => setGeneratedTitle(e.target.value)}
                  rows={2}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="generated-description">Generated Description</Label>
                <Textarea
                  id="generated-description"
                  value={generatedDescription}
                  onChange={(e) => setGeneratedDescription(e.target.value)}
                  rows={6}
                />
              </div>
              
              <div className="flex justify-end">
                <Button onClick={() => handleGenerate()} variant="outline" className="mr-2">
                  <Sparkles className="mr-2 h-4 w-4" />
                  Regenerate
                </Button>
                <Button onClick={handleUseGenerated}>
                  Use This Hypothesis
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AIHypothesisGenerator;
