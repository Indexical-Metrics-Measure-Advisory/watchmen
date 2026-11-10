import { useCallback, useMemo, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { ListFilter, Play, Plus, RefreshCw, Search, SquareCode } from 'lucide-react';
import ScheduleEditor from '@/components/ScheduleEditor';
import TaskIntegrationEditor from '@/components/TaskIntegrationEditor';
import TaskTargetPicker from '@/components/TaskTargetPicker';
import { Button, Card, EmptyState, Modal, PageHeader, StatusBadge, Tag, TaskTypeBadge, taskTypeLabels } from '@/components/ui';
import { useTaskHub, type NewTaskInput } from '@/context/TaskHubContext';
import { cn, defaultSchedule, defaultTaskCallback, formatSchedule, shortTime } from '@/lib/utils';
import type { TaskTargetKind, TaskType } from '@/types';

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

export default function TasksPage() {
  const { tasks, runTask, toggleTask, createTask } = useTaskHub();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState('');
  const [type, setType] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [enabledOnly, setEnabledOnly] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<NewTaskInput>({
    name: '', description: '', owner: 'Demo Admin', type: 'materialization',
    ...engineDefaults.materialization, engineRef: '', targetName: '', schedule: defaultSchedule(),
    externalTrigger: { enabled: true }, callback: defaultTaskCallback()
  });

  const changeTarget = useCallback((targetKind: TaskTargetKind, engineRef: string, targetName: string) => {
    setForm((current) => ({ ...current, targetKind, engineRef, targetName }));
  }, []);

  const filtered = useMemo(() => tasks.filter((task) => {
    const matchesKeyword = `${task.name}${task.description}${task.owner}${task.tags.join('')}`.toLowerCase().includes(keyword.toLowerCase());
    return matchesKeyword && (type === 'ALL' || task.type === type) && (status === 'ALL' || task.lastStatus === status) && (!enabledOnly || task.enabled);
  }), [tasks, keyword, type, status, enabledOnly]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const id = await createTask(form);
      setCreateOpen(false);
      navigate(`/tasks/${id}`);
    } catch {
      // The context displays the service error.
    }
  };

  return (
    <div className="page-container">
      <PageHeader title={t('任务中心')} description={t('按业务类型统一注册采集、物化、Pipeline、快照与质量任务；执行器在背后调用引擎 API')}
        actions={<><Button variant="outline" size="sm"><RefreshCw className="h-3.5 w-3.5" />{t('同步定义')}</Button><Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" />{t('新建任务')}</Button></>} />

      <Card className="flex flex-wrap items-center gap-3 p-3">
        <div className="relative min-w-[220px] flex-1 md:max-w-sm"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input className="field w-full pl-9" placeholder={t('搜索任务、责任人或标签')} value={keyword} onChange={(event) => setKeyword(event.target.value)} /></div>
        <select aria-label={t('任务类型')} className="field w-36" value={type} onChange={(event) => setType(event.target.value)}><option value="ALL">{t('全部类型')}</option>{types.map(([value, label]) => <option key={value} value={value}>{t(label)}</option>)}</select>
        <select aria-label={t('全部状态')} className="field w-32" value={status} onChange={(event) => setStatus(event.target.value)}><option value="ALL">{t('全部状态')}</option>{['SUCCESS', 'RUNNING', 'WAITING', 'FAILED', 'SKIPPED', 'STALE'].map((value) => <option key={value}>{value}</option>)}</select>
        <label className="flex items-center gap-2 text-xs text-slate-600"><input type="checkbox" className="h-4 w-4 rounded border-slate-300 accent-blue-600" checked={enabledOnly} onChange={(event) => setEnabledOnly(event.target.checked)} />{t('仅启用')}</label>
        <span className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground"><ListFilter className="h-3.5 w-3.5" />{t('{{filtered}} / {{total}} 个任务', { filtered: filtered.length, total: tasks.length })}</span>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-shell min-w-[1080px]">
            <thead><tr><th>{t('任务')}</th><th>{t('类型 / 引擎')}</th><th>{t('调度')}</th><th>{t('最近状态')}</th><th>{t('成功率')}</th><th>{t('责任人')}</th><th>{t('启用')}</th><th className="text-right">{t('操作')}</th></tr></thead>
            <tbody>
              {filtered.map((task) => (
                <tr key={task.id} className="cursor-pointer" onClick={() => navigate(`/tasks/${task.id}`)}>
                  <td><div className="max-w-[280px]"><Link to={`/tasks/${task.id}`} className="block truncate font-medium text-slate-800 hover:text-primary">{task.name}</Link><div className="mt-1 flex items-center gap-1.5">{task.tags.slice(0, 2).map((tag) => <Tag key={tag}>{tag}</Tag>)}{task.readOnly && <Tag tone="amber">{t('只读')}</Tag>}</div></div></td>
                  <td><TaskTypeBadge type={task.type} /><div className="mt-1.5 text-[11px] text-muted-foreground">{task.engine}</div></td>
                  <td><div className="max-w-[170px] text-xs text-slate-600">{formatSchedule(task.schedule)}</div><div className="mt-1 text-[10px] text-muted-foreground">{task.schedule.timezone} · {task.schedule.misfirePolicy}</div></td>
                  <td><StatusBadge status={task.lastStatus} pulse /><div className="mt-1.5 text-[10px] text-muted-foreground">{shortTime(task.lastRunAt)}</div></td>
                  <td>{task.successRate === undefined ? <span className="text-xs text-amber-600">{t('不支持投影')}</span> : <><span className="text-xs font-semibold">{task.successRate}%</span><div className="mt-1.5 h-1 w-16 overflow-hidden rounded-full bg-slate-100"><div className={cn('h-full rounded-full', task.successRate > 97 ? 'bg-emerald-500' : 'bg-amber-500')} style={{ width: `${task.successRate}%` }} /></div></>}</td>
                  <td><div className="flex items-center gap-2"><div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-600">{task.owner.slice(0, 1)}</div><span className="text-xs">{task.owner}</span></div></td>
                  <td><button disabled={task.readOnly} onClick={(event) => { event.stopPropagation(); toggleTask(task.id); }} className={cn('relative h-5 w-9 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40', task.enabled ? 'bg-blue-500' : 'bg-slate-300')} aria-label={`${t(task.enabled ? '停用' : '启用')} ${task.name}`}><span className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-all', task.enabled ? 'left-[18px]' : 'left-0.5')} /></button></td>
                  <td><div className="flex justify-end gap-1"><Button variant="ghost" size="icon" disabled={task.readOnly} title={t('手动运行')} onClick={(event) => { event.stopPropagation(); runTask(task.id); }}><Play className="h-4 w-4" /></Button><Button variant="ghost" size="icon" title={t('查看定义')} onClick={(event) => { event.stopPropagation(); navigate(`/tasks/${task.id}`); }}><SquareCode className="h-4 w-4" /></Button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <EmptyState icon={<Search className="h-10 w-10" />} title={t('没有匹配的任务')} description={t('尝试调整关键词、类型或状态筛选')} />}
        <div className="flex items-center justify-between border-t px-4 py-3 text-xs text-muted-foreground"><span>{t('第 1 页，共 1 页')}</span><span>{t('每页 20 条')}</span></div>
      </Card>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title={t('新建任务')} description={t('定义业务任务、所属引擎和执行节奏，不配置执行引擎 HTTP 请求')} width="max-w-2xl">
        <form onSubmit={submit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-xs font-medium">{t('任务名称')}<input required className="field mt-1.5 w-full" placeholder={t('例如：客户质量检查')} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
            <label className="block text-xs font-medium">{t('任务类型')}<select className="field mt-1.5 w-full" value={form.type} onChange={(event) => {
              const taskType = event.target.value as TaskType;
              setForm({ ...form, type: taskType, ...engineDefaults[taskType], engineRef: '', targetName: '' });
            }}>{types.map(([value, label]) => <option key={value} value={value}>{t(label)}</option>)}</select></label>
          </div>
          <label className="block text-xs font-medium">{t('描述')}<textarea className="mt-1.5 min-h-16 w-full rounded-md border bg-white p-3 text-sm focus:border-primary/50 focus:outline-none" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
          <label className="block text-xs font-medium">{t('执行引擎')}<input readOnly className="field mt-1.5 w-full bg-slate-50" value={form.engine} /></label>
          <TaskTargetPicker taskType={form.type} targetKind={form.targetKind} targetId={form.engineRef} onChange={changeTarget} />
          <div className="border-t pt-4"><div className="mb-4 text-sm font-semibold">{t('触发与回调')}</div><TaskIntegrationEditor value={form} onChange={(integration) => setForm({ ...form, ...integration })} /></div>
          <div className="border-t pt-4"><div className="mb-4 text-sm font-semibold">{t('调度定义')}</div><ScheduleEditor value={form.schedule} onChange={(schedule) => setForm({ ...form, schedule })} /></div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-600">{t('任务类型只表达业务能力。触发时由对应引擎适配器在背后调用 REST API，并统一处理幂等、状态轮询和终态收口。')}</div>
          <div className="flex justify-end gap-2 border-t pt-4"><Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>{t('取消')}</Button><Button type="submit"><Plus className="h-4 w-4" />{t('创建任务')}</Button></div>
        </form>
      </Modal>
    </div>
  );
}
