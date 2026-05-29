import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Mail, Save, Loader2, Play } from 'lucide-react';
import { Subscription } from '@/model/biAnalysis';
import { subscriptionService } from '@/services/subscriptionService';
import { useToast } from "@/components/ui/use-toast";
import { useTranslation } from 'react-i18next';

interface SubscriptionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  analysisId: string;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
  open,
  onOpenChange,
  analysisId
}) => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(false);
  const [runningId, setRunningId] = useState<string | null>(null);
  const { toast } = useToast();
  const { t } = useTranslation(['common', 'biAnalysis']);

  const fetchSubscriptions = async () => {
    if (!analysisId) return;
    setLoading(true);
    try {
      const data = await subscriptionService.getSubscriptions(analysisId);
      setSubscriptions(data);
    } catch (error) {
      toast({
        title: t('common:error'),
        description: t('biAnalysis:subscription.fetchFailed'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchSubscriptions();
    }
  }, [open, analysisId]);

  const handleAddSubscription = () => {
    const newSub: Subscription = {
      id: `temp-${Date.now()}`,
      analysisId,
      frequency: 'once',
      recipients: [],
      enabled: true,
      time: '09:00',
      date: new Date().toISOString().split('T')[0]
    };
    setSubscriptions([...subscriptions, newSub]);
  };

  const handleDeleteSubscription = async (index: number) => {
    const sub = subscriptions[index];
    if (!sub.id.startsWith('temp-')) {
      try {
        await subscriptionService.deleteSubscription(sub.id);
        toast({ title: t('common:success'), description: t('biAnalysis:subscription.deleted') });
      } catch (error) {
        toast({ title: t('common:error'), description: t('biAnalysis:subscription.deleteFailed'), variant: "destructive" });
        return;
      }
    }
    const newSubs = [...subscriptions];
    newSubs.splice(index, 1);
    setSubscriptions(newSubs);
  };

  const handleUpdateSubscription = (index: number, field: keyof Subscription, value: any) => {
    const newSubs = [...subscriptions];
    newSubs[index] = { ...newSubs[index], [field]: value };
    setSubscriptions(newSubs);
  };

  const handleSave = async (index: number) => {
    const sub = subscriptions[index];
    try {
      if (sub.id.startsWith('temp-')) {
        const created = await subscriptionService.createSubscription(sub);
        const newSubs = [...subscriptions];
        newSubs[index] = created;
        setSubscriptions(newSubs);
        toast({ title: t('common:success'), description: t('biAnalysis:subscription.created') });
      } else {
        await subscriptionService.updateSubscription(sub.id, sub);
        toast({ title: t('common:success'), description: t('biAnalysis:subscription.updated') });
      }
    } catch (error) {
      toast({ title: t('common:error'), description: t('biAnalysis:subscription.saveFailed'), variant: "destructive" });
    }
  };

  const handleRunSubscription = async (index: number) => {
    const sub = subscriptions[index];
    if (sub.id.startsWith('temp-')) return;
    
    setRunningId(sub.id);
    try {
      await subscriptionService.runSubscription(sub.id);
      toast({ title: t('common:success'), description: t('biAnalysis:subscription.triggered') });
    } catch (error) {
      toast({ title: t('common:error'), description: t('biAnalysis:subscription.runFailed'), variant: "destructive" });
    } finally {
      setRunningId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('biAnalysis:subscription.title')}</DialogTitle>
          <DialogDescription>
            {t('biAnalysis:subscription.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {subscriptions.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  {t('biAnalysis:subscription.empty')}
                </div>
              )}

              {subscriptions.map((sub, index) => (
                <div key={sub.id} className="border rounded-lg p-4 space-y-4 bg-muted/20">
                  <div className="flex items-start gap-4 flex-col">
                    {/* Time and Date Row */}
                    <div className="flex gap-4 w-full">
                      <div className="space-y-2 flex-1">
                        <Label>{t('biAnalysis:subscription.time')}</Label>
                        <Input
                          type="time"
                          value={sub.time || '09:00'}
                          onChange={(e) => handleUpdateSubscription(index, 'time', e.target.value)}
                        />
                      </div>
                      
                      {/* Conditional Render based on frequency */}
                      {sub.frequency === 'once' && (
                        <div className="space-y-2 flex-1">
                          <Label>{t('biAnalysis:subscription.date')}</Label>
                          <Input
                            type="date"
                            value={sub.date || ''}
                            onChange={(e) => handleUpdateSubscription(index, 'date', e.target.value)}
                          />
                        </div>
                      )}

                      {(sub.frequency === 'week' || sub.frequency === 'biweekly') && (
                        <div className="space-y-2 flex-1">
                          <Label>{t('biAnalysis:subscription.weekday')}</Label>
                          <Select
                            value={sub.weekday || '1'}
                            onValueChange={(val) => handleUpdateSubscription(index, 'weekday', val)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">{t('biAnalysis:subscription.weekdays.1')}</SelectItem>
                              <SelectItem value="2">{t('biAnalysis:subscription.weekdays.2')}</SelectItem>
                              <SelectItem value="3">{t('biAnalysis:subscription.weekdays.3')}</SelectItem>
                              <SelectItem value="4">{t('biAnalysis:subscription.weekdays.4')}</SelectItem>
                              <SelectItem value="5">{t('biAnalysis:subscription.weekdays.5')}</SelectItem>
                              <SelectItem value="6">{t('biAnalysis:subscription.weekdays.6')}</SelectItem>
                              <SelectItem value="0">{t('biAnalysis:subscription.weekdays.0')}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {sub.frequency === 'month' && (
                        <div className="space-y-2 flex-1">
                          <Label>{t('biAnalysis:subscription.dayOfMonth')}</Label>
                          <Select
                            value={String(sub.dayOfMonth || '1')}
                            onValueChange={(val) => handleUpdateSubscription(index, 'dayOfMonth', parseInt(val))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="max-h-[200px]">
                              {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                                <SelectItem key={d} value={String(d)}>{d}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {sub.frequency === 'year' && (
                        <div className="space-y-2 flex-1">
                          <Label>{t('biAnalysis:subscription.month')}</Label>
                          <Select
                            value={sub.month || '1'}
                            onValueChange={(val) => handleUpdateSubscription(index, 'month', val)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="max-h-[200px]">
                              <SelectItem value="1">{t('biAnalysis:subscription.months.1')}</SelectItem>
                              <SelectItem value="2">{t('biAnalysis:subscription.months.2')}</SelectItem>
                              <SelectItem value="3">{t('biAnalysis:subscription.months.3')}</SelectItem>
                              <SelectItem value="4">{t('biAnalysis:subscription.months.4')}</SelectItem>
                              <SelectItem value="5">{t('biAnalysis:subscription.months.5')}</SelectItem>
                              <SelectItem value="6">{t('biAnalysis:subscription.months.6')}</SelectItem>
                              <SelectItem value="7">{t('biAnalysis:subscription.months.7')}</SelectItem>
                              <SelectItem value="8">{t('biAnalysis:subscription.months.8')}</SelectItem>
                              <SelectItem value="9">{t('biAnalysis:subscription.months.9')}</SelectItem>
                              <SelectItem value="10">{t('biAnalysis:subscription.months.10')}</SelectItem>
                              <SelectItem value="11">{t('biAnalysis:subscription.months.11')}</SelectItem>
                              <SelectItem value="12">{t('biAnalysis:subscription.months.12')}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>

                    {/* Frequency Row */}
                    <div className="flex gap-4 w-full items-end">
                      <div className="space-y-2 flex-1">
                        <Label>{t('biAnalysis:subscription.frequency')}</Label>
                        <Select
                          value={sub.frequency}
                          onValueChange={(val: any) => handleUpdateSubscription(index, 'frequency', val)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="once">{t('biAnalysis:subscription.frequencyLabel.once')}</SelectItem>
                            <SelectItem value="day">{t('biAnalysis:subscription.frequencyLabel.day')}</SelectItem>
                            <SelectItem value="week">{t('biAnalysis:subscription.frequencyLabel.week')}</SelectItem>
                            <SelectItem value="biweekly">{t('biAnalysis:subscription.frequencyLabel.biweekly')}</SelectItem>
                            <SelectItem value="month">{t('biAnalysis:subscription.frequencyLabel.month')}</SelectItem>
                            <SelectItem value="year">{t('biAnalysis:subscription.frequencyLabel.year')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex flex-col gap-2 pb-2">
                        <div className="flex items-center space-x-2">
                           <Switch
                             checked={sub.enabled}
                             onCheckedChange={(checked) => handleUpdateSubscription(index, 'enabled', checked)}
                           />
                           <span className="text-sm text-muted-foreground whitespace-nowrap">{sub.enabled ? t('biAnalysis:subscription.active') : t('biAnalysis:subscription.paused')}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                           <Switch
                             checked={sub.onlyOnAlertTriggered ?? false}
                             onCheckedChange={(checked) => handleUpdateSubscription(index, 'onlyOnAlertTriggered', checked)}
                           />
                           <span className="text-xs text-muted-foreground whitespace-nowrap">{t('biAnalysis:subscription.onlyOnAlert')}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>{t('biAnalysis:subscription.recipients')}</Label>
                    <div className="flex gap-2">
                      <Mail className="h-4 w-4 mt-3 text-muted-foreground" />
                      <Input
                        value={sub.recipients.join(', ')}
                        onChange={(e) => handleUpdateSubscription(index, 'recipients', e.target.value.split(',').map(s => s.trim()))}
                        placeholder={t('biAnalysis:subscription.recipientsPlaceholder')}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      onClick={() => handleRunSubscription(index)}
                      disabled={sub.id.startsWith('temp-') || runningId === sub.id}
                    >
                      {runningId === sub.id ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4 mr-2" />
                      )}
                      {t('biAnalysis:subscription.testRun')}
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDeleteSubscription(index)}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      {t('biAnalysis:subscription.delete')}
                    </Button>
                    <Button variant="default" size="sm" onClick={() => handleSave(index)}>
                      <Save className="h-4 w-4 mr-2" />
                      {t('biAnalysis:subscription.save')}
                    </Button>
                  </div>
                </div>
              ))}

              <Button onClick={handleAddSubscription} className="w-full" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                {t('biAnalysis:subscription.addSubscription')}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
