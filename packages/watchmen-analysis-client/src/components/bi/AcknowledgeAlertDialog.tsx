import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from 'react-i18next';

export type AcknowledgeReason = 'processed' | 'ignored' | 'escalated' | 'false_alarm' | 'maintenance' | 'other';

export const ACKNOWLEDGE_REASON_OPTIONS: AcknowledgeReason[] = [
  'processed',
  'ignored',
  'escalated',
  'false_alarm',
  'maintenance',
  'other',
];

interface AcknowledgeAlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason?: AcknowledgeReason, intervalDays?: number) => void;
  isSubmitting?: boolean;
}

export function AcknowledgeAlertDialog({
  open,
  onOpenChange,
  onConfirm,
  isSubmitting = false
}: AcknowledgeAlertDialogProps) {
  const { t } = useTranslation(['common', 'biAnalysis']);
  const [reason, setReason] = useState<AcknowledgeReason | ''>('');
  const [intervalDays, setIntervalDays] = useState<number | ''>(1);

  React.useEffect(() => {
    if (open) {
      setReason('');
      setIntervalDays(1);
    }
  }, [open]);

  const handleConfirm = () => {
    const parsedDays = intervalDays === '' ? undefined : Number(intervalDays);
    onConfirm(reason || undefined, parsedDays);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('biAnalysis:acknowledgeDialog.title')}</DialogTitle>
          <DialogDescription>
            {t('biAnalysis:acknowledgeDialog.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reason">{t('biAnalysis:acknowledgeDialog.reason')}</Label>
            <Select value={reason} onValueChange={(v) => setReason(v as AcknowledgeReason)}>
              <SelectTrigger id="reason">
                <SelectValue placeholder={t('biAnalysis:acknowledgeDialog.selectReason')} />
              </SelectTrigger>
              <SelectContent>
                {ACKNOWLEDGE_REASON_OPTIONS.map(opt => (
                  <SelectItem key={opt} value={opt}>
                    {t(`biAnalysis:acknowledgeDialog.reasons.${opt}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="interval">{t('biAnalysis:acknowledgeDialog.muteInterval')}</Label>
            <Select value={intervalDays === '' ? '' : String(intervalDays)} onValueChange={(v) => setIntervalDays(v === '' ? '' : Number(v))}>
              <SelectTrigger id="interval">
                <SelectValue placeholder={t('biAnalysis:acknowledgeDialog.selectDays')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">{t('biAnalysis:acknowledgeDialog.day', { count: 1 })}</SelectItem>
                <SelectItem value="3">{t('biAnalysis:acknowledgeDialog.day', { count: 3 })}</SelectItem>
                <SelectItem value="7">{t('biAnalysis:acknowledgeDialog.day', { count: 7 })}</SelectItem>
                <SelectItem value="14">{t('biAnalysis:acknowledgeDialog.day', { count: 14 })}</SelectItem>
                <SelectItem value="30">{t('biAnalysis:acknowledgeDialog.day', { count: 30 })}</SelectItem>
                <SelectItem value="90">{t('biAnalysis:acknowledgeDialog.day', { count: 90 })}</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {t('biAnalysis:acknowledgeDialog.muteIntervalHint')}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            {t('common:cancel')}
          </Button>
          <Button onClick={handleConfirm} disabled={isSubmitting}>
            {isSubmitting ? t('biAnalysis:acknowledgeDialog.acknowledging') : t('biAnalysis:acknowledgeDialog.acknowledge')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
