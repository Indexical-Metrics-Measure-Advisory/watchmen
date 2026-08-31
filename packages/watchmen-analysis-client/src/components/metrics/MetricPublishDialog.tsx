import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { MetricDefinition } from '@/model/metricsManagement';

/** Confirmation dialog for publishing a metric: records an optional version note. */
interface MetricPublishDialogProps {
  metric: MetricDefinition | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (comments?: string) => void;
}

const MetricPublishDialog: React.FC<MetricPublishDialogProps> = ({ metric, open, onOpenChange, onConfirm }) => {
  const { t } = useTranslation(['common', 'metricsManagement']);
  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setComments('');
      setSubmitting(false);
    }
  }, [open]);

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await onConfirm(comments.trim() || undefined);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{t('metricsManagement:versionPublishTitle')}</DialogTitle>
          <DialogDescription>
            {t('metricsManagement:versionPublishDescription', {
              name: metric?.label || metric?.name || '',
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="metric-publish-comments">{t('metricsManagement:versionPublishComments')}</Label>
          <Textarea
            id="metric-publish-comments"
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder={t('metricsManagement:versionPublishCommentsPlaceholder')}
            rows={3}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            {t('common:cancel')}
          </Button>
          <Button onClick={handleConfirm} disabled={submitting}>
            {t('metricsManagement:versionPublishConfirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MetricPublishDialog;
