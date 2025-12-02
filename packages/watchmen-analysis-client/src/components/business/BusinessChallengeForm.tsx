
import React, { useEffect, useState } from 'react';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { BusinessChallenge } from "@/model/business";

interface BusinessChallengeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: Partial<BusinessChallenge>;
  onSubmit: (data: Partial<BusinessChallenge>) => void;
}

const BusinessChallengeForm: React.FC<BusinessChallengeFormProps> = ({
  open,
  onOpenChange,
  initialData,
  onSubmit
}) => {
  const [formData, setFormData] = useState<Partial<BusinessChallenge>>(
    initialData || {
      title: '',
      description: '',
      problemIds: [],
      datasetStartDate: '',
      datasetEndDate: ''
    }
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  useEffect(() => {
    setFormData(initialData || {
      title: '',
      description: '',
      problemIds: [],
      datasetStartDate: '',
      datasetEndDate: ''
    });
  }, [initialData])



  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-panel sm:max-w-[500px] slide-enter">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{initialData?.id ? 'Edit Business Challenge' : 'Create New Challenge'}</DialogTitle>
            <DialogDescription>
              Define a business challenge that needs to be addressed
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Challenge Title</Label>
              <Input
                id="title"
                name="title"
                placeholder="Enter challenge title..."
                value={formData.title}
                onChange={handleChange}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Challenge Description</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Describe the business challenge in detail..."
                value={formData.description}
                onChange={handleChange}
                rows={4}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="datasetStartDate">Dataset Start Date</Label>
              <Input
                id="datasetStartDate"
                name="datasetStartDate"
                type="date"
                value={formData.datasetStartDate}
                onChange={handleChange}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="datasetEndDate">Dataset End Date</Label>
              <Input
                id="datasetEndDate"
                name="datasetEndDate"
                type="date"
                value={formData.datasetEndDate}
                onChange={handleChange}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {initialData?.id ? 'Save Changes' : 'Create Challenge'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default BusinessChallengeForm;
