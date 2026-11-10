import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Save } from 'lucide-react';
import TaskTargetPicker, { targetKindsByTaskType } from '@/components/TaskTargetPicker';
import { Button, Modal, taskTypeLabels } from '@/components/ui';
import type { NewTaskInput, TaskDefinition, TaskTargetKind, TaskType } from '@/model';
import { APP_NAME } from '@/config';

const types = Object.entries(taskTypeLabels) as [TaskType, string][];
const engineDefaults: Record<TaskType, { engine: string; targetKind: TaskTargetKind }> = {
  collector_online: { engine: 'Doll Collector', targetKind: 'collector_module' },
  collector_batch: { engine: 'Batch Collector', targetKind: 'collector_table' },
  materialization: { engine: 'Metricflow', targetKind: 'materialization' },
  materialization_flow: { engine: 'Metricflow Flow', targetKind: 'materialization_flow' },
  pipeline_event: { engine: 'Doll Pipeline', targetKind: 'pipeline' },
  pipeline_snapshot: { engine: 'Doll Snapshot', targetKind: 'topic_snapshot_scheduler' },
  dqc_job: { engine: 'DQC', targetKind: 'dqc_monitor_rule' },
  custom: { engine: 'Custom Engine', targetKind: 'custom_entity' }
};

export default function TaskDefinitionEditorDialog({ task, open, onClose, onSubmit }: {
  task: TaskDefinition;
  open: boolean;
  onClose: () => void;
  onSubmit: (input: NewTaskInput) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [form, setForm] = useState<NewTaskInput>(() => ({
    name: task.name,
    description: task.description,
    owner: task.owner,
    type: task.type,
    engine: task.engine,
    engineRef: task.engineRef,
    targetKind: task.targetKind ?? targetKindsByTaskType[task.type][0].value,
    targetName: task.targetName ?? task.engineRef,
    schedule: task.schedule,
    externalTrigger: task.externalTrigger,
    callback: task.callback
  }));

  useEffect(() => {
    if (open) {
      setForm({
        name: task.name,
        description: task.description,
        owner: task.owner,
        type: task.type,
        engine: task.engine,
        engineRef: task.engineRef,
        targetKind: task.targetKind ?? targetKindsByTaskType[task.type][0].value,
        targetName: task.targetName ?? task.engineRef,
        schedule: task.schedule,
        externalTrigger: task.externalTrigger,
        callback: task.callback
      });
    }
  }, [open, task.id]);

  const changeTarget = useCallback((targetKind: TaskTargetKind, engineRef: string, targetName: string) => {
    setForm((current) => ({ ...current, targetKind, engineRef, targetName }));
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await onSubmit(form);
  };

  return (
    <Modal open={open} onClose={onClose} title={t('编辑任务定义')} description={t('修改任务基础信息和关联实体；调度与触发回调配置保持不变。', { name: APP_NAME })} width="max-w-2xl">
      <form onSubmit={submit} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-xs font-medium">{t('任务名称')}<input required className="field mt-1.5 w-full" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
          <label className="block text-xs font-medium">{t('责任人')}<input required className="field mt-1.5 w-full" value={form.owner} onChange={(event) => setForm({ ...form, owner: event.target.value })} /></label>
        </div>
        <label className="block text-xs font-medium">{t('任务类型')}<select className="field mt-1.5 w-full" value={form.type} onChange={(event) => {
          const type = event.target.value as TaskType;
          setForm({ ...form, type, ...engineDefaults[type], engineRef: '', targetName: '' });
        }}>{types.map(([value, label]) => <option key={value} value={value}>{t(label)}</option>)}</select></label>
        <label className="block text-xs font-medium">{t('描述')}<textarea className="mt-1.5 min-h-16 w-full rounded-md border bg-white p-3 text-sm focus:border-primary/50 focus:outline-none" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
        <label className="block text-xs font-medium">{t('执行引擎')}<input readOnly className="field mt-1.5 w-full bg-slate-50" value={form.engine} /></label>
        <TaskTargetPicker taskType={form.type} targetKind={form.targetKind} targetId={form.engineRef} onChange={changeTarget} />
        <div className="flex justify-end gap-2 border-t pt-4"><Button type="button" variant="outline" onClick={onClose}>{t('取消')}</Button><Button type="submit"><Save className="h-4 w-4" />{t('保存定义')}</Button></div>
      </form>
    </Modal>
  );
}
