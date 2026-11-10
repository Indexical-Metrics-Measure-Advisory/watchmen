import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TaskTargetKind, TaskTargetOption, TaskType } from '@/model';
import { taskTargetService } from '@/services/taskTargetService';

export const targetKindsByTaskType: Record<TaskType, { value: TaskTargetKind; label: string }[]> = {
  collector_online: [
    { value: 'collector_module', label: 'Collector Module' },
    { value: 'collector_model', label: 'Collector Model' },
    { value: 'collector_table', label: 'Collector Table' }
  ],
  collector_batch: [{ value: 'collector_table', label: 'Collector Table' }],
  materialization: [{ value: 'materialization', label: '指标物化任务' }],
  materialization_flow: [{ value: 'materialization_flow', label: '物化 Flow' }],
  pipeline_event: [{ value: 'pipeline', label: 'Pipeline' }],
  pipeline_snapshot: [{ value: 'topic_snapshot_scheduler', label: '主题快照任务' }],
  dqc_job: [{ value: 'dqc_monitor_rule', label: 'DQC 监控规则' }],
  custom: [{ value: 'custom_entity', label: '自定义业务实体' }]
};

export default function TaskTargetPicker({ taskType, targetKind, targetId, onChange }: {
  taskType: TaskType;
  targetKind: TaskTargetKind;
  targetId: string;
  onChange: (kind: TaskTargetKind, id: string, name: string) => void;
}) {
  const { t } = useTranslation();
  const kinds = targetKindsByTaskType[taskType];
  const [options, setOptions] = useState<TaskTargetOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    if (targetKind === 'custom_entity') {
      setOptions([]);
      setError('');
      return () => { active = false; };
    }
    setLoading(true);
    setError('');
    taskTargetService.listTargets(taskType, targetKind)
      .then((targets) => { if (active) setOptions(targets); })
      .catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : String(reason)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [taskType, targetKind]);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="block text-xs font-medium">{t('关联实体类型')}<select className="field mt-1.5 w-full" value={targetKind} onChange={(event) => onChange(event.target.value as TaskTargetKind, '', '')}>{kinds.map((kind) => <option key={kind.value} value={kind.value}>{t(kind.label)}</option>)}</select></label>
      {targetKind === 'custom_entity' ? <label className="block text-xs font-medium">{t('业务实体引用')}<input required className="field mt-1.5 w-full font-mono text-xs" value={targetId} onChange={(event) => onChange(targetKind, event.target.value, event.target.value)} /></label> : <label className="block text-xs font-medium">{t('关联 Watchmen 实体')}<select required className="field mt-1.5 w-full" value={targetId} disabled={loading} onChange={(event) => {
        const selected = options.find((option) => option.id === event.target.value);
        if (selected) onChange(targetKind, selected.id, selected.name);
      }}><option value="">{loading ? t('加载中…') : t('请选择具体实体')}</option>{options.map((option) => <option key={option.id} value={option.id}>{option.name} · {option.id}</option>)}</select>{error && <span className="mt-1 block text-[11px] text-rose-600">{error}</span>}{!loading && !error && options.length === 0 && <span className="mt-1 block text-[11px] text-muted-foreground">{t('当前租户暂无可关联实体')}</span>}</label>}
    </div>
  );
}
