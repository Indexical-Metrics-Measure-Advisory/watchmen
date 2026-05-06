import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export type AcknowledgeReason = 'processed' | 'ignored' | 'escalated' | 'false_alarm' | 'maintenance' | 'other';

export const ACKNOWLEDGE_REASON_OPTIONS: { value: AcknowledgeReason; label: string }[] = [
  { value: 'processed', label: 'Processed' },
  { value: 'ignored', label: 'Ignored' },
  { value: 'escalated', label: 'Escalated' },
  { value: 'false_alarm', label: 'False Alarm' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'other', label: 'Other' },
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
          <DialogTitle>Acknowledge Alert</DialogTitle>
          <DialogDescription>
            Confirm that you have reviewed and are handling this alert.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Reason</Label>
            <Select value={reason} onValueChange={(v) => setReason(v as AcknowledgeReason)}>
              <SelectTrigger id="reason">
                <SelectValue placeholder="Select a reason..." />
              </SelectTrigger>
              <SelectContent>
                {ACKNOWLEDGE_REASON_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="interval">Mute Interval (Days)</Label>
            <Select value={intervalDays === '' ? '' : String(intervalDays)} onValueChange={(v) => setIntervalDays(v === '' ? '' : Number(v))}>
              <SelectTrigger id="interval">
                <SelectValue placeholder="Select days..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 day</SelectItem>
                <SelectItem value="3">3 days</SelectItem>
                <SelectItem value="7">7 days</SelectItem>
                <SelectItem value="14">14 days</SelectItem>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="90">90 days</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              How long before this alert can trigger again if the condition persists.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isSubmitting}>
            {isSubmitting ? 'Acknowledging...' : 'Acknowledge'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
