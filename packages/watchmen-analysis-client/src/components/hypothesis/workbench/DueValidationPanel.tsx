import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Play } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { HypothesisType } from '@/model/Hypothesis';
import { analysis_service } from '@/services/analysisService';
import { ageInDays, isDueForValidation } from './utils';

interface DueValidationPanelProps {
  hypotheses: HypothesisType[];
  onRefresh: () => void;
}

const MAX_ITEMS = 5;

const DueValidationPanel: React.FC<DueValidationPanelProps> = ({ hypotheses, onRefresh }) => {
  const { t } = useTranslation('hypothesis');
  const { toast } = useToast();
  const [validatingId, setValidatingId] = useState<string | null>(null);

  const dueHypotheses = useMemo(() =>
    hypotheses
      .filter(isDueForValidation)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .slice(0, MAX_ITEMS),
  [hypotheses]);

  if (dueHypotheses.length === 0) {
    return null;
  }

  const handleValidateNow = async (id: string) => {
    setValidatingId(id);
    try {
      const result = await analysis_service.start_analysis(id);
      toast({
        title: result.hypothesisValidationFlag === true
          ? t('toast.validated')
          : result.hypothesisValidationFlag === false
            ? t('toast.rejected')
            : t('toast.analysisCompleted'),
        description: result.message,
      });
    } catch (error) {
      toast({
        title: t('toast.analysisFailed'),
        variant: 'destructive'
      });
    } finally {
      setValidatingId(null);
      onRefresh();
    }
  };

  return (
    <div className="glass-card rounded-lg p-4 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="h-4 w-4 text-amber-500" />
        <h2 className="text-sm font-semibold">{t('duePanel.title')}</h2>
        <span className="text-xs text-muted-foreground">{t('duePanel.subtitle')}</span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {dueHypotheses.map(hypothesis => (
          <div
            key={hypothesis.id}
            className="flex items-center gap-3 rounded-md border bg-background/50 px-3 py-2 min-w-[280px] shrink-0"
          >
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate" title={hypothesis.title}>
                {hypothesis.title}
              </div>
              <div className="flex items-center gap-1 mt-1 flex-wrap">
                <Badge variant="outline" className="bg-background/50 text-amber-600 dark:text-amber-400">
                  {t('duePanel.ageDays', { days: ageInDays(hypothesis) })}
                </Badge>
                {hypothesis.metrics.slice(0, 2).map((metric, index) => (
                  <Badge key={index} variant="outline" className="bg-background/50 max-w-[120px] truncate">
                    {metric}
                  </Badge>
                ))}
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="shrink-0"
              disabled={validatingId === hypothesis.id}
              onClick={() => handleValidateNow(hypothesis.id)}
            >
              <Play className="mr-1 h-3 w-3" />
              {validatingId === hypothesis.id ? '...' : t('duePanel.validateNow')}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DueValidationPanel;
