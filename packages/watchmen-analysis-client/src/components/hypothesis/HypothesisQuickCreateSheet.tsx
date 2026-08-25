import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart2, Bell, Lightbulb, Loader2, MessageSquare, PenLine, Sparkles } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToastAction } from '@/components/ui/toast';
import { useToast } from '@/components/ui/use-toast';
import type { HypothesisContext, HypothesisType } from '@/model/Hypothesis';
import type { BusinessChallenge } from '@/model/business';
import { EmulativeAnalysisMethod } from '@/model/analysis';
import { hypothesisService } from '@/services/hypothesisService';
import { aiHypothesisService } from '@/services/aiHypothesisService';
import { businessService } from '@/services/businessService';
import { analysis_service } from '@/services/analysisService';

export interface HypothesisQuickCreateSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context: HypothesisContext;
  /** When set, only this metric is preselected on open (must be one of context.metrics) */
  initialMetric?: string;
  onCreated?: (hypothesis: HypothesisType) => void;
}

const SOURCE_META: Record<HypothesisContext['source'], { icon: React.ElementType; label: string }> = {
  chart: { icon: BarChart2, label: 'From analysis board' },
  alert: { icon: Bell, label: 'From alert' },
  chat: { icon: MessageSquare, label: 'From chat' },
  manual: { icon: PenLine, label: 'Manual' },
};

const NO_CHALLENGE = 'none';
const ANALYSIS_METHODS = Object.values(EmulativeAnalysisMethod);

export const HypothesisQuickCreateSheet: React.FC<HypothesisQuickCreateSheetProps> = ({
  open,
  onOpenChange,
  context,
  initialMetric,
  onCreated,
}) => {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [analysisMethod, setAnalysisMethod] = useState<string>(EmulativeAnalysisMethod.TREND_ANALYSIS);
  const [businessChallengeId, setBusinessChallengeId] = useState<string>(NO_CHALLENGE);
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);
  const [metricsInput, setMetricsInput] = useState('');
  const [challenges, setChallenges] = useState<BusinessChallenge[]>([]);
  const [drafting, setDrafting] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const contextMetrics = context.metrics ?? [];

  // Reset the form every time the sheet opens, and load business challenges
  useEffect(() => {
    if (!open) return;
    setTitle('');
    setDescription('');
    setAnalysisMethod(EmulativeAnalysisMethod.TREND_ANALYSIS);
    setBusinessChallengeId(NO_CHALLENGE);
    // Preselect all context metrics, or only the originating card's metric
    setSelectedMetrics(
      initialMetric && (context.metrics ?? []).includes(initialMetric)
        ? [initialMetric]
        : (context.metrics ?? [])
    );
    setMetricsInput('');
    setDrafting(false);
    setSubmitting(false);

    let alive = true;
    businessService.getChallenges()
      .then(list => { if (alive) setChallenges(list ?? []); })
      .catch(e => console.warn('Failed to load business challenges.', e));
    return () => { alive = false; };
  }, [open, context, initialMetric]);

  const sourceMeta = SOURCE_META[context.source] ?? SOURCE_META.manual;
  const SourceIcon = sourceMeta.icon;
  const filterEntries = Object.entries(context.filters ?? {}).filter(([, v]) => v);

  const toggleMetric = (metric: string) => {
    setSelectedMetrics(prev =>
      prev.includes(metric) ? prev.filter(m => m !== metric) : [...prev, metric]
    );
  };

  const hasMetrics = contextMetrics.length > 0 ? selectedMetrics.length > 0 : metricsInput.trim().length > 0;

  const handleDraftWithAI = async () => {
    setDrafting(true);
    try {
      const draft = await aiHypothesisService.draftHypothesis(context);
      if (draft && draft.success) {
        if (draft.title) setTitle(draft.title);
        if (draft.description) setDescription(draft.description);
        if (draft.analysisMethod && (ANALYSIS_METHODS as string[]).includes(draft.analysisMethod)) {
          setAnalysisMethod(draft.analysisMethod);
        }
      } else {
        toast({ description: 'AI draft unavailable — fill in manually' });
      }
    } catch (e) {
      console.warn('AI draft unavailable.', e);
      toast({ description: 'AI draft unavailable — fill in manually' });
    } finally {
      setDrafting(false);
    }
  };

  const handleSubmit = async () => {
    const metrics = contextMetrics.length > 0
      ? contextMetrics.filter(m => selectedMetrics.includes(m))
      : metricsInput.split(',').map(m => m.trim()).filter(m => m.length > 0);
    if (metrics.length === 0) return;

    setSubmitting(true);
    try {
      const created = await hypothesisService.createHypothesis({
        title,
        description,
        status: 'drafted',
        confidence: 0,
        metrics,
        analysisMethod,
        businessChallengeId: businessChallengeId === NO_CHALLENGE ? undefined : businessChallengeId,
        context,
      });

      toast({
        title: 'Hypothesis created',
        description: created.title,
        action: (
          <ToastAction
            altText="Validate now"
            onClick={() => {
              void analysis_service.start_analysis(created.id)
                .catch(e => console.warn('Failed to start analysis.', e))
                .finally(() => navigate(`/analysis?hypothesis=${created.id}`));
            }}
          >
            Validate now
          </ToastAction>
        ),
      });

      onCreated?.(created);
      onOpenChange(false);
    } catch (e) {
      console.error('Failed to create hypothesis:', e);
      toast({
        title: 'Failed to create hypothesis',
        description: 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            Propose hypothesis
          </SheetTitle>
          <SheetDescription asChild>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-1.5 text-xs">
                <SourceIcon className="h-3.5 w-3.5" />
                <span>{sourceMeta.label}</span>
                {contextMetrics.length > 0 && (
                  <span className="font-medium text-foreground">
                    {contextMetrics.slice(0, 2).join(', ')}
                    {contextMetrics.length > 2 && ` +${contextMetrics.length - 2}`}
                  </span>
                )}
                {context.timeRange && <span className="text-muted-foreground">· {context.timeRange}</span>}
              </div>
              {(filterEntries.length > 0 || (context.dimensions?.length ?? 0) > 0) && (
                <div className="flex flex-wrap items-center gap-1">
                  {filterEntries.map(([key, value]) => (
                    <Badge key={key} variant="outline" className="text-[10px] px-1.5 py-0 h-5 font-normal">
                      {key}={value}
                    </Badge>
                  ))}
                  {(context.dimensions ?? []).map(dim => (
                    <Badge key={dim} variant="secondary" className="text-[10px] px-1.5 py-0 h-5 font-normal">
                      {dim}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="What do you think is happening?" />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe the expected behavior and why."
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label>Analysis method</Label>
            <Select value={analysisMethod} onValueChange={setAnalysisMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ANALYSIS_METHODS.map(method => (
                  <SelectItem key={method} value={method}>{method}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Related business challenge</Label>
            <Select value={businessChallengeId} onValueChange={setBusinessChallengeId}>
              <SelectTrigger>
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_CHALLENGE}>None</SelectItem>
                {challenges.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Metrics</Label>
            {contextMetrics.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {contextMetrics.map(metric => {
                  const selected = selectedMetrics.includes(metric);
                  return (
                    <Badge
                      key={metric}
                      variant={selected ? 'secondary' : 'outline'}
                      className={
                        selected
                          ? 'cursor-pointer'
                          : 'cursor-pointer text-muted-foreground/60 border-dashed hover:text-muted-foreground'
                      }
                      onClick={() => toggleMetric(metric)}
                    >
                      {metric}
                    </Badge>
                  );
                })}
              </div>
            ) : (
              <Input
                value={metricsInput}
                onChange={e => setMetricsInput(e.target.value)}
                placeholder="Metric name(s), comma separated"
              />
            )}
          </div>

          <Button variant="outline" onClick={handleDraftWithAI} disabled={drafting || submitting} className="gap-2">
            {drafting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {drafting ? 'Drafting…' : 'Draft with AI'}
          </Button>
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting || !title.trim() || !hasMetrics} className="gap-2">
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Create hypothesis
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

export default HypothesisQuickCreateSheet;
