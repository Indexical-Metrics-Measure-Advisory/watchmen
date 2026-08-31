import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { MetricDefinition, MetricVersion, MetricVersionOperationType } from '@/model/metricsManagement';
import { getMetricVersions, rollbackMetric } from '@/services/metricsManagementService';
import { useToast } from '@/hooks/use-toast';

/** Metric version history: lists every recorded version and rolls back with a required comment. */
interface MetricVersionHistoryDialogProps {
  metric: MetricDefinition | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** invoked after a successful rollback so the page can refresh the metric row */
  onRolledBack: (metric: MetricDefinition) => void;
}

const VersionOpBadge = ({ type }: { type: MetricVersionOperationType }) => {
  const { t } = useTranslation(['metricsManagement']);
  return type === 'rollback'
    ? <Badge variant="outline" className="border-orange-400 text-orange-600">{t('metricsManagement:versionOpTypeRollback')}</Badge>
    : <Badge variant="outline" className="border-emerald-500 text-emerald-600">{t('metricsManagement:versionOpTypePublish')}</Badge>;
};

const MetricVersionHistoryDialog: React.FC<MetricVersionHistoryDialogProps> = ({
  metric,
  open,
  onOpenChange,
  onRolledBack,
}) => {
  const { t } = useTranslation(['common', 'metricsManagement']);
  const { toast } = useToast();

  const [versions, setVersions] = useState<MetricVersion[]>([]);
  const [loading, setLoading] = useState(false);
  // null = no rollback in progress; number = restore that version; 'current' = just unpublish
  const [rollbackTarget, setRollbackTarget] = useState<number | 'current' | null>(null);
  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isPublished = metric?.publishStatus === 'published';

  const loadVersions = useCallback(async () => {
    if (!metric) return;
    setLoading(true);
    try {
      const page = await getMetricVersions(metric.name, 1, 100);
      setVersions(page.data || []);
    } catch (error) {
      console.error('Failed to load metric versions:', error);
      setVersions([]);
      toast({
        title: t('common:error'),
        description: t('metricsManagement:versionLoadFailed'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [metric, toast, t]);

  useEffect(() => {
    if (open) {
      setRollbackTarget(null);
      setComments('');
      setSubmitting(false);
      loadVersions();
    }
  }, [open, loadVersions]);

  const startRollback = (target: number | 'current') => {
    setRollbackTarget(target);
    setComments('');
  };

  const cancelRollback = () => {
    setRollbackTarget(null);
    setComments('');
  };

  const confirmRollback = async () => {
    if (!metric || rollbackTarget === null) return;
    const reason = comments.trim();
    if (!reason) return; // comments are required on rollback

    setSubmitting(true);
    try {
      const updated = await rollbackMetric(
        metric.name,
        reason,
        rollbackTarget === 'current' ? undefined : rollbackTarget,
      );
      toast({
        title: t('common:success'),
        description: t('metricsManagement:versionRollbackSuccess', { name: metric.name }),
      });
      onRolledBack(updated);
      setRollbackTarget(null);
      setComments('');
      await loadVersions();
    } catch (error) {
      console.error('Failed to roll back metric:', error);
      toast({
        title: t('common:error'),
        description: t('metricsManagement:versionRollbackFailed'),
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px]">
        <DialogHeader>
          <DialogTitle>{t('metricsManagement:versionHistoryTitle')}</DialogTitle>
          <DialogDescription>
            {t('metricsManagement:versionHistoryDescription', { name: metric?.label || metric?.name || '' })}
          </DialogDescription>
        </DialogHeader>

        {isPublished && rollbackTarget === null && (
          <div className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2">
            <span className="text-sm text-muted-foreground">{t('metricsManagement:versionRollbackHint')}</span>
            <Button size="sm" variant="outline" onClick={() => startRollback('current')}>
              {t('metricsManagement:versionRollbackCurrent')}
            </Button>
          </div>
        )}

        {rollbackTarget !== null && (
          <div className="space-y-2 rounded-md border p-3">
            <Label>
              {rollbackTarget === 'current'
                ? t('metricsManagement:versionRollbackReasonCurrent')
                : t('metricsManagement:versionRollbackReasonVersion', { version: rollbackTarget })}
            </Label>
            <Textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder={t('metricsManagement:versionRollbackReasonPlaceholder')}
              rows={3}
            />
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={confirmRollback} disabled={submitting || !comments.trim()}>
                {t('metricsManagement:versionRollbackConfirm')}
              </Button>
              <Button size="sm" variant="outline" onClick={cancelRollback} disabled={submitting}>
                {t('common:cancel')}
              </Button>
            </div>
          </div>
        )}

        <div className="max-h-[320px] overflow-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted">
              <tr className="text-left">
                <th className="px-3 py-2 font-medium">{t('metricsManagement:versionCol')}</th>
                <th className="px-3 py-2 font-medium">{t('metricsManagement:versionTypeCol')}</th>
                <th className="px-3 py-2 font-medium">{t('metricsManagement:versionCommentsCol')}</th>
                <th className="px-3 py-2 font-medium">{t('metricsManagement:versionOperatorCol')}</th>
                <th className="px-3 py-2 font-medium">{t('metricsManagement:versionTimeCol')}</th>
                {isPublished && <th className="px-3 py-2" />}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                    {t('common:loading')}
                  </td>
                </tr>
              )}
              {!loading && versions.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                    {t('metricsManagement:versionEmpty')}
                  </td>
                </tr>
              )}
              {!loading && versions.map((v) => (
                <tr key={v.id || v.versionNo} className="border-t">
                  <td className="px-3 py-2 font-medium">v{v.versionNo}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <VersionOpBadge type={v.operationType} />
                      {v.rollbackFromVersionNo != null && (
                        <span className="text-xs text-muted-foreground">
                          {t('metricsManagement:versionRollbackFrom', { version: v.rollbackFromVersionNo })}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="max-w-[180px] px-3 py-2">
                    <span className="line-clamp-2 text-muted-foreground">{v.comments || '-'}</span>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{v.createdBy || '-'}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {v.createdAt ? new Date(v.createdAt).toLocaleString() : '-'}
                  </td>
                  {isPublished && (
                    <td className="px-3 py-2 text-right">
                      {rollbackTarget === null && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => startRollback(v.versionNo)}
                        >
                          {t('metricsManagement:versionRestore')}
                        </Button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common:close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MetricVersionHistoryDialog;
