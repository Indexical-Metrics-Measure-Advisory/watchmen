
import React, { useEffect, useState } from 'react';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { BusinessProblem } from "@/model/business";
import { Loader2 } from 'lucide-react';
import { businessService } from '@/services/businessService';
import { BusinessChallenge } from '@/model/business';

interface BusinessProblemFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: Partial<BusinessProblem>;
  onSubmit: (data: Partial<BusinessProblem>) => void;
  businessChallengeId?: string;
}

const BusinessProblemForm: React.FC<BusinessProblemFormProps> = ({
  open,
  onOpenChange,
  initialData,
  onSubmit,
  businessChallengeId
}) => {
  const [challenges, setChallenges] = useState<BusinessChallenge[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchChallenges = async () => {
      setIsLoading(true);
      try {
        const data = await businessService.getChallenges();
        setChallenges(data);
      } catch (error) {
        console.error('Error fetching challenges:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchChallenges();
  }, []);

  const [formData, setFormData] = useState<Partial<BusinessProblem>>(
    initialData || {
      title: '',
      description: '',
      status: 'open',
      hypothesisIds: [],
      ...(businessChallengeId ? { businessChallengeId } : {})
    }
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      if (!formData.title?.trim() || !formData.description?.trim()) {
        throw new Error('Please fill in all required fields');
      }

      const submissionData = {
        ...formData
      };

      await onSubmit(submissionData);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save problem');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    setFormData(initialData || {
      title: '',
      description: '',
      status: 'open',
      hypothesisIds: [],
      ...(businessChallengeId ? { businessChallengeId } : {})
    });
  }, [initialData, businessChallengeId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-panel sm:max-w-[500px] slide-enter">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{initialData?.id ? 'Edit Business Problem' : 'Create New Problem'}</DialogTitle>
            <DialogDescription>
              Define a business problem that needs to be solved
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 py-4">
            <div className="grid gap-2">
              <Label htmlFor="businessChallengeId">Business Challenge</Label>
              <Select
                value={formData.businessChallengeId}
                onValueChange={value => handleSelectChange('businessChallengeId', value)}
                disabled={isLoading || !!businessChallengeId}
              >
                <SelectTrigger id="businessChallengeId">
                  <SelectValue placeholder="Select a challenge" />
                </SelectTrigger>
                <SelectContent>
                  {challenges.map(challenge => (
                    <SelectItem key={challenge.id} value={challenge.id}>
                      {challenge.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="title">Problem Title</Label>
              <Input
                id="title"
                name="title"
                placeholder="Enter problem title..."
                value={formData.title}
                onChange={handleChange}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Problem Description</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Describe the business problem in detail..."
                value={formData.description}
                onChange={handleChange}
                rows={4}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={value => handleSelectChange('status', value)}
              >
                <SelectTrigger id="status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>


          </div>

          <DialogFooter>
            {error && <p className="text-sm text-destructive mb-2">{error}</p>}
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {initialData?.id ? 'Saving...' : 'Creating...'}
                </>
              ) : (
                initialData?.id ? 'Save Changes' : 'Create Problem'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default BusinessProblemForm;
