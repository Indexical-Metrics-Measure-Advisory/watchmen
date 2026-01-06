import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Mail, Save, Loader2 } from 'lucide-react';
import { Subscription } from '@/model/biAnalysis';
import { subscriptionService } from '@/services/subscriptionService';
import { useToast } from "@/components/ui/use-toast";

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
  const { toast } = useToast();

  const fetchSubscriptions = async () => {
    if (!analysisId) return;
    setLoading(true);
    try {
      const data = await subscriptionService.getSubscriptions(analysisId);
      setSubscriptions(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch subscriptions",
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
        toast({ title: "Success", description: "Subscription deleted" });
      } catch (error) {
        toast({ title: "Error", description: "Failed to delete subscription", variant: "destructive" });
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
        toast({ title: "Success", description: "Subscription created" });
      } else {
        await subscriptionService.updateSubscription(sub.id, sub);
        toast({ title: "Success", description: "Subscription updated" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to save subscription", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Scheduled Query Subscriptions</DialogTitle>
          <DialogDescription>
            Configure automated report delivery schedules.
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
                  No subscriptions configured.
                </div>
              )}

              {subscriptions.map((sub, index) => (
                <div key={sub.id} className="border rounded-lg p-4 space-y-4 bg-muted/20">
                  <div className="flex items-start gap-4 flex-col">
                    {/* Time and Date Row */}
                    <div className="flex gap-4 w-full">
                      <div className="space-y-2 flex-1">
                        <Label>Time</Label>
                        <Input
                          type="time"
                          value={sub.time || '09:00'}
                          onChange={(e) => handleUpdateSubscription(index, 'time', e.target.value)}
                        />
                      </div>
                      
                      {/* Conditional Render based on frequency */}
                      {sub.frequency === 'once' && (
                        <div className="space-y-2 flex-1">
                          <Label>Date</Label>
                          <Input
                            type="date"
                            value={sub.date || ''}
                            onChange={(e) => handleUpdateSubscription(index, 'date', e.target.value)}
                          />
                        </div>
                      )}

                      {(sub.frequency === 'week' || sub.frequency === 'biweekly') && (
                        <div className="space-y-2 flex-1">
                          <Label>Weekday</Label>
                          <Select
                            value={sub.weekday || '1'}
                            onValueChange={(val) => handleUpdateSubscription(index, 'weekday', val)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">Monday</SelectItem>
                              <SelectItem value="2">Tuesday</SelectItem>
                              <SelectItem value="3">Wednesday</SelectItem>
                              <SelectItem value="4">Thursday</SelectItem>
                              <SelectItem value="5">Friday</SelectItem>
                              <SelectItem value="6">Saturday</SelectItem>
                              <SelectItem value="0">Sunday</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {sub.frequency === 'month' && (
                        <div className="space-y-2 flex-1">
                          <Label>Day of Month</Label>
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
                          <Label>Month</Label>
                          <Select
                            value={sub.month || '1'}
                            onValueChange={(val) => handleUpdateSubscription(index, 'month', val)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="max-h-[200px]">
                              <SelectItem value="1">January</SelectItem>
                              <SelectItem value="2">February</SelectItem>
                              <SelectItem value="3">March</SelectItem>
                              <SelectItem value="4">April</SelectItem>
                              <SelectItem value="5">May</SelectItem>
                              <SelectItem value="6">June</SelectItem>
                              <SelectItem value="7">July</SelectItem>
                              <SelectItem value="8">August</SelectItem>
                              <SelectItem value="9">September</SelectItem>
                              <SelectItem value="10">October</SelectItem>
                              <SelectItem value="11">November</SelectItem>
                              <SelectItem value="12">December</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>

                    {/* Frequency Row */}
                    <div className="flex gap-4 w-full items-end">
                      <div className="space-y-2 flex-1">
                        <Label>Frequency</Label>
                        <Select
                          value={sub.frequency}
                          onValueChange={(val: any) => handleUpdateSubscription(index, 'frequency', val)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="once">Does not repeat</SelectItem>
                            <SelectItem value="day">Daily</SelectItem>
                            <SelectItem value="week">Weekly</SelectItem>
                            <SelectItem value="biweekly">Bi-weekly</SelectItem>
                            <SelectItem value="month">Monthly</SelectItem>
                            <SelectItem value="year">Yearly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex flex-col gap-2 pb-2">
                        <div className="flex items-center space-x-2">
                           <Switch
                             checked={sub.enabled}
                             onCheckedChange={(checked) => handleUpdateSubscription(index, 'enabled', checked)}
                           />
                           <span className="text-sm text-muted-foreground whitespace-nowrap">{sub.enabled ? 'Active' : 'Paused'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Recipients (Comma separated emails)</Label>
                    <div className="flex gap-2">
                      <Mail className="h-4 w-4 mt-3 text-muted-foreground" />
                      <Input
                        value={sub.recipients.join(', ')}
                        onChange={(e) => handleUpdateSubscription(index, 'recipients', e.target.value.split(',').map(s => s.trim()))}
                        placeholder="email@example.com, team@example.com"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="destructive" size="sm" onClick={() => handleDeleteSubscription(index)}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                    <Button variant="default" size="sm" onClick={() => handleSave(index)}>
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </Button>
                  </div>
                </div>
              ))}

              <Button onClick={handleAddSubscription} className="w-full" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Subscription
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
