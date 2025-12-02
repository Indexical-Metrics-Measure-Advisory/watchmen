
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ThumbsUp, ThumbsDown, MessageSquare } from 'lucide-react';
import { HypothesisType } from '@/model/Hypothesis';
import { BusinessProblem } from "@/model/business";
import { feedbackService } from '@/services/feedbackService';
import { useToast } from '@/components/ui/use-toast';

interface FeedbackCollectorProps {
  hypothesis?: HypothesisType | null;
  businessProblem?: BusinessProblem | null;
  onFeedbackSubmitted?: () => void;
}

const FeedbackCollector: React.FC<FeedbackCollectorProps> = ({
  hypothesis,
  businessProblem,
  onFeedbackSubmitted,
}) => {
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [outcome, setOutcome] = useState<'success' | 'failure' | 'neutral'>('neutral');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCommentField, setShowCommentField] = useState(false);
  const { toast } = useToast();

  const handleRatingClick = (value: number) => {
    setRating(value);
    
    // Automatically set outcome based on rating
    if (value >= 4) {
      setOutcome('success');
    } else if (value <= 2) {
      setOutcome('failure');
    } else {
      setOutcome('neutral');
    }
    
    setShowCommentField(true);
  };

  const handleOutcomeChange = (newOutcome: 'success' | 'failure' | 'neutral') => {
    setOutcome(newOutcome);
  };

  const handleSubmit = async () => {
    if (rating === null) {
      toast({
        title: "Error",
        description: "Please provide a rating first",
        variant: "destructive"
      });
      return;
    }

    
    try {
      setIsSubmitting(true);
      
      await feedbackService.addFeedback({
        hypothesisId: hypothesis?.id || businessProblem?.id,
        rating,
        comment,
        outcome
      });
      
      toast({
        title: "Feedback Submitted",
        description: "Thank you for your feedback. It will help us improve the hypothesis."
      });
      
      // Reset form
      setRating(null);
      setComment('');
      setOutcome('neutral');
      setShowCommentField(false);
      
      // Notify parent component
      if (onFeedbackSubmitted) {
        onFeedbackSubmitted();
      }
    } catch (error) {
      toast({
        title: "Submission Failed",
        description: "Unable to submit your feedback. Please try again later.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Provide Hypothesis Feedback</CardTitle>
        <CardDescription>
          How would you rate the hypothesis "<span className="font-medium">{hypothesis?.title || businessProblem?.title}</span>"?
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pb-3">
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium mb-2">Rating</h4>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((value) => (
                <Button
                  key={value}
                  variant={rating === value ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleRatingClick(value)}
                  className="w-10 h-10"
                >
                  {value}
                </Button>
              ))}
            </div>
          </div>
          
          {showCommentField && (
            <>
              <div>
                <h4 className="text-sm font-medium mb-2">Outcome</h4>
                <div className="flex gap-2">
                  <Button
                    variant={outcome === 'success' ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleOutcomeChange('success')}
                    className="flex items-center gap-1"
                  >
                    <ThumbsUp className="h-4 w-4" />
                    <span>Success</span>
                  </Button>
                  <Button
                    variant={outcome === 'neutral' ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleOutcomeChange('neutral')}
                    className="flex items-center gap-1"
                  >
                    <MessageSquare className="h-4 w-4" />
                    <span>Neutral</span>
                  </Button>
                  <Button
                    variant={outcome === 'failure' ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleOutcomeChange('failure')}
                    className="flex items-center gap-1"
                  >
                    <ThumbsDown className="h-4 w-4" />
                    <span>Failure</span>
                  </Button>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium mb-2">Comments (Optional)</h4>
                <Textarea
                  placeholder="What specific feedback do you have about this hypothesis?"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                />
              </div>
            </>
          )}
        </div>
      </CardContent>
      
      <CardFooter>
        {showCommentField && (
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || rating === null}
            className="w-full"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Submit Feedback
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default FeedbackCollector;
