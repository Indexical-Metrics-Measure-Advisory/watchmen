import { useMemo, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Check, ChevronRight, GitBranch, Plus, ShieldCheck, Sparkles, X } from 'lucide-react';
import OrchestrationGraph from '@/components/OrchestrationGraph';
import { Button, Card, Modal, PageHeader, SectionHeader, StatusBadge, Tag } from '@/components/ui';
import { useTaskHub } from '@/context/TaskHubContext';

export default function DependenciesPage() {
  const { tasks, dependencies, adoptDependency, rejectDependency, addDependency } = useTaskHub();
  const { t } = useTranslation();
  const [filter, setFilter] = useState('ALL');
  const [selectedTaskId, setSelectedTaskId] = useState('task-retention-mat');
  const [createOpen, setCreateOpen] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ upstreamTaskId: 'task-crm-collector', downstreamTaskId: 'task-retention-mat', condition: 'ON_SUCCESS' as const, instancePolicy: 'LATEST_RUN' as const });

  const visible = useMemo(() => dependencies.filter((dependency) => filter === 'ALL' || dependency.kind === filter), [dependencies, filter]);
  const proposed = dependencies.filter((dependency) => dependency.status === 'PROPOSED');
  const selected = tasks.find((task) => task.id === selectedTaskId);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    try {
      await addDependency(form);
      setCreateOpen(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    }
  };

  return (
    <div className="page-container">
      <PageHeader title={t('依赖编排')} description={t('显式任务依赖与数据推导候选统一成图；只有 ACCEPTED + enabled 的边参与 dispatch')}
        actions={<><Button variant="outline" size="sm"><Sparkles className="h-3.5 w-3.5" />{t('运行依赖推导')}</Button><Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" />{t('新建依赖')}</Button></>} />
      <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_300px]">
        <Card className="min-w-0 overflow-hidden">
          <SectionHeader title={t('任务 DAG')} description={t('{{count}} 条有效边 · processDate 2026-11-03', { count: dependencies.filter((item) => item.status === 'ACCEPTED').length })} action={<div className="flex rounded-md bg-slate-100 p-0.5">{[['ALL', '全部'], ['explicit', '仅显式'], ['inferred_data', '仅推导']].map(([value, label]) => <button key={value} onClick={() => setFilter(value)} className={`rounded px-2.5 py-1 text-[11px] ${filter === value ? 'bg-white font-medium text-blue-700 shadow-sm' : 'text-slate-500'}`}>{t(label)}</button>)}</div>} />
          <OrchestrationGraph tasks={tasks} dependencies={visible} onSelect={setSelectedTaskId} />
        </Card>
        <Card className="h-fit">
          <SectionHeader title={t('节点实例')} description={t('选中任务的当前定义与状态')} />
          {selected && <div className="p-4"><Link to={`/tasks/${selected.id}`} className="text-sm font-semibold hover:text-primary">{selected.name}</Link><div className="mt-2 flex items-center gap-2"><StatusBadge status={selected.lastStatus} /><Tag>{selected.executionMode}</Tag></div><dl className="mt-4 space-y-3 text-xs"><div><dt className="text-muted-foreground">{t('调度')}</dt><dd className="mt-1">{selected.schedule.frequency} · {selected.schedule.timeOfDay ?? selected.schedule.cronExpression ?? selected.schedule.intervalMinutes ?? '—'} · {selected.schedule.mode}</dd></div><div><dt className="text-muted-foreground">{t('实例键')}</dt><dd className="mt-1 break-all rounded bg-slate-50 p-2 font-mono text-[10px]">schedule:2026-11-03T03:00+08:00</dd></div><div><dt className="text-muted-foreground">{t('直接入边')}</dt><dd className="mt-1">{t('{{count}} 条', { count: dependencies.filter((item) => item.downstreamTaskId === selected.id && item.status === 'ACCEPTED').length })} · AND</dd></div></dl><Link to={`/tasks/${selected.id}`} className="mt-4 flex items-center justify-center gap-1 rounded-md border py-2 text-xs font-medium text-primary hover:bg-blue-50">{t('查看任务详情')}<ChevronRight className="h-3.5 w-3.5" /></Link></div>}
        </Card>
      </div>

      <Card>
        <SectionHeader title={t('推导边预览与采纳')} description={t('PROPOSED 不参与执行；拒绝后 discover 保留决策，不自动复活')} action={<Tag tone="violet">{t('{{count}} 待处理', { count: proposed.length })}</Tag>} />
        <div className="divide-y divide-border/70">
          {proposed.map((dependency) => {
            const upstream = tasks.find((task) => task.id === dependency.upstreamTaskId);
            const downstream = tasks.find((task) => task.id === dependency.downstreamTaskId);
            return <div key={dependency.id} className="flex flex-wrap items-center gap-3 px-5 py-4"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-violet-600"><GitBranch className="h-4 w-4" /></div><div className="min-w-[260px] flex-1"><div className="text-sm font-medium">{upstream?.name}<span className="mx-2 text-slate-400">→</span>{downstream?.name}</div><div className="mt-1 text-[11px] text-muted-foreground">{t('资产交集推导')} · {dependency.condition} · offsetDays={dependency.offsetDays}</div></div><Tag tone="violet">PROPOSED</Tag><div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => rejectDependency(dependency.id)}><X className="h-3.5 w-3.5" />{t('拒绝')}</Button><Button size="sm" onClick={() => adoptDependency(dependency.id)}><Check className="h-3.5 w-3.5" />{t('采纳')}</Button></div></div>;
          })}
          {proposed.length === 0 && <div className="p-8 text-center text-xs text-muted-foreground">{t('所有推导边均已处理')}</div>}
        </div>
      </Card>
      <div className="flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-xs leading-relaxed text-blue-700"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /><span>{t('编排保障：共享数据库实例锁、多节点唯一约束防重、多上游 AND、LATEST_RUN / SAME_WINDOW 实例策略、失败重跑恢复、20 层传导上限。流式 Pipeline 不参与实例依赖。')}</span></div>

      <Modal open={createOpen} onClose={() => { setCreateOpen(false); setError(''); }} title={t('新建显式依赖')} description={t('保存前执行成环检测；多入边默认全部满足后触发')}>
        <form onSubmit={submit} className="space-y-4">
          <label className="block text-xs font-medium">{t('上游任务')}<select className="field mt-1.5 w-full" value={form.upstreamTaskId} onChange={(event) => setForm({ ...form, upstreamTaskId: event.target.value })}>{tasks.filter((task) => task.type !== 'pipeline_event').map((task) => <option key={task.id} value={task.id}>{task.name}</option>)}</select></label>
          <label className="block text-xs font-medium">{t('下游任务')}<select className="field mt-1.5 w-full" value={form.downstreamTaskId} onChange={(event) => setForm({ ...form, downstreamTaskId: event.target.value })}>{tasks.filter((task) => task.type !== 'pipeline_event').map((task) => <option key={task.id} value={task.id}>{task.name}</option>)}</select></label>
          <div className="grid grid-cols-2 gap-3"><label className="text-xs font-medium">{t('传导条件')}<select className="field mt-1.5 w-full" value={form.condition} onChange={(event) => setForm({ ...form, condition: event.target.value as typeof form.condition })}><option>ON_SUCCESS</option><option>ON_FINISH</option><option>ON_FAILURE</option></select></label><label className="text-xs font-medium">{t('实例策略')}<select className="field mt-1.5 w-full" value={form.instancePolicy} onChange={(event) => setForm({ ...form, instancePolicy: event.target.value as typeof form.instancePolicy })}><option>LATEST_RUN</option><option>SAME_WINDOW</option></select></label></div>
          {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">{error}</div>}
          <div className="flex justify-end gap-2 border-t pt-4"><Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>{t('取消')}</Button><Button type="submit"><Plus className="h-4 w-4" />{t('保存并检测')}</Button></div>
        </form>
      </Modal>
    </div>
  );
}
