import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft, Box, CalendarClock, Check, ChevronRight, CircleUserRound, Database,
  ExternalLink, GitBranch, Play, RefreshCw, RotateCcw, Save, Settings2, ShieldCheck
} from 'lucide-react';
import ScheduleEditor from '@/components/ScheduleEditor';
import TaskIntegrationEditor from '@/components/TaskIntegrationEditor';
import { Button, Card, PageHeader, SectionHeader, StatusBadge, Tag, TaskTypeBadge } from '@/components/ui';
import { useTaskHub } from '@/context/TaskHubContext';
import { cn, defaultSchedule, defaultTaskCallback, formatDuration, formatRows, formatSchedule } from '@/lib/utils';
import type { TaskIntegrationInput } from '@/model';

const tabs = [
  { id: 'overview', label: '定义概览' }, { id: 'schedule', label: '调度定义' },
  { id: 'integration', label: '触发与回调' }, { id: 'runs', label: '运行历史' },
  { id: 'refs', label: '资产引用' }, { id: 'dependencies', label: '依赖配置' }
];

export default function TaskDetailPage() {
  const { taskId } = useParams();
  const { tasks, runs, dependencies, runTask, toggleTask, updateSchedule, updateIntegration } = useTaskHub();
  const { t } = useTranslation();
  const [tab, setTab] = useState('overview');
  const [scheduleDraft, setScheduleDraft] = useState(defaultSchedule());
  const [integrationDraft, setIntegrationDraft] = useState<TaskIntegrationInput>({
    externalTrigger: { enabled: true }, callback: defaultTaskCallback()
  });
  const task = tasks.find((item) => item.id === taskId);

  useEffect(() => {
    if (task) {
      setScheduleDraft(task.schedule);
      setIntegrationDraft({ externalTrigger: task.externalTrigger, callback: task.callback });
    }
  }, [task?.id]);

  if (!task) return <div className="page-container"><Card className="p-10 text-center"><h1 className="text-lg font-semibold">{t('任务不存在')}</h1><Link to="/tasks" className="mt-3 inline-block text-sm text-primary">{t('返回任务中心')}</Link></Card></div>;
  const taskRuns = runs.filter((run) => run.taskId === task.id);
  const upstream = dependencies.filter((dependency) => dependency.downstreamTaskId === task.id && dependency.status === 'ACCEPTED');
  const downstream = dependencies.filter((dependency) => dependency.upstreamTaskId === task.id && dependency.status === 'ACCEPTED');

  return (
    <div className="page-container">
      <Link to="/tasks" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary"><ArrowLeft className="h-3.5 w-3.5" />{t('返回任务中心')}</Link>
      <PageHeader eyebrow={task.engineRef} title={task.name} description={task.description}
        actions={<><StatusBadge status={task.lastStatus} pulse /><Button variant="outline" size="sm" disabled={task.readOnly} onClick={() => toggleTask(task.id)}><Settings2 className="h-3.5 w-3.5" />{t(task.enabled ? '停用' : '启用')}</Button><Button size="sm" disabled={task.readOnly} onClick={() => runTask(task.id)}><Play className="h-3.5 w-3.5" />{t('手动运行')}</Button></>} />

      <div className="flex gap-1 overflow-x-auto border-b border-border">
        {tabs.map((item) => <button key={item.id} onClick={() => setTab(item.id)} className={cn('relative whitespace-nowrap px-4 py-2.5 text-sm font-medium text-slate-500 hover:text-slate-800', tab === item.id && 'text-primary after:absolute after:inset-x-2 after:bottom-[-1px] after:h-0.5 after:bg-primary')}>{t(item.label)}{item.id === 'runs' && <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 text-[10px]">{taskRuns.length}</span>}</button>)}
      </div>

      {tab === 'overview' && <>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card className="cursor-pointer p-4 hover:border-primary/40" onClick={() => setTab('schedule')}><div className="flex items-center justify-between text-xs text-muted-foreground"><span className="flex items-center gap-2"><CalendarClock className="h-4 w-4 text-blue-500" />{t('调度策略')}</span><span className="text-[10px] text-primary">{t('编辑')}</span></div><div className="mt-3 text-sm font-semibold">{formatSchedule(task.schedule)}</div><div className="mt-1 text-[11px] text-muted-foreground">{task.schedule.timezone} · {task.executionMode}</div></Card>
          <Card className="p-4"><div className="flex items-center gap-2 text-xs text-muted-foreground"><CircleUserRound className="h-4 w-4 text-violet-500" />{t('责任与标签')}</div><div className="mt-3 text-sm font-semibold">{task.owner}</div><div className="mt-1.5 flex gap-1">{task.tags.map((tag) => <Tag key={tag}>{tag}</Tag>)}</div></Card>
          <Card className="p-4"><div className="flex items-center gap-2 text-xs text-muted-foreground"><Check className="h-4 w-4 text-emerald-500" />{t('近 30 日成功率')}</div><div className="mt-3 text-xl font-bold">{task.successRate === undefined ? '—' : `${task.successRate}%`}</div><div className="mt-1 text-[11px] text-muted-foreground">{t('平均时长')} {formatDuration(task.avgDurationMs)}</div></Card>
          <Card className="p-4"><div className="flex items-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="h-4 w-4 text-blue-500" />{t('引擎与能力')}</div><div className="mt-3"><TaskTypeBadge type={task.type} /></div><div className="mt-1.5 text-[11px] text-muted-foreground">{task.projectionUnsupported ? 'PROJECTION_UNSUPPORTED' : task.readOnly ? t('只读发现') : t('运行 · 投影 · 重跑')}</div></Card>
        </div>
        <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
          <Card><SectionHeader title={t('执行定义')} description={t('引擎真源镜像 · 操作后回读')} /><dl className="grid grid-cols-1 gap-x-6 gap-y-4 p-5 text-xs sm:grid-cols-2"><div><dt className="text-muted-foreground">Engine</dt><dd className="mt-1 font-medium">{task.engine}</dd></div><div><dt className="text-muted-foreground">Engine Ref</dt><dd className="mt-1 break-all font-mono text-[11px]">{task.engineRef}</dd></div><div><dt className="text-muted-foreground">Target Type</dt><dd className="mt-1 font-medium">{task.targetKind ?? task.engine}</dd></div><div><dt className="text-muted-foreground">Target Entity</dt><dd className="mt-1 break-all font-medium">{task.targetName ?? task.engineRef}</dd></div><div><dt className="text-muted-foreground">{t('调度归属 / 频率')}</dt><dd className="mt-1">{task.schedule.mode} · {task.schedule.frequency}</dd></div><div><dt className="text-muted-foreground">{t('执行方式')}</dt><dd className="mt-1">{t('引擎适配器内部调用 REST API')}</dd></div><div><dt className="text-muted-foreground">{t('最近运行')}</dt><dd className="mt-1">{task.lastRunAt?.replace('T', ' ').slice(0, 19) ?? '—'}</dd></div><div><dt className="text-muted-foreground">{t('实例模型')}</dt><dd className="mt-1 font-mono text-[11px]">processDate + instanceKey + attempt</dd></div></dl></Card>
          <Card><SectionHeader title={t('构建关系')} description={t('已采纳的直接上下游')} /><div className="space-y-4 p-5"><div><div className="mb-2 text-[11px] font-medium text-muted-foreground">{t('上游')} {upstream.length}</div>{upstream.length === 0 ? <div className="text-xs text-slate-400">{t('无显式上游')}</div> : upstream.map((dependency) => <Link to={`/tasks/${dependency.upstreamTaskId}`} key={dependency.id} className="flex items-center gap-2 rounded-lg border p-2.5 text-xs hover:border-primary/40"><GitBranch className="h-3.5 w-3.5 text-blue-500" /><span className="font-medium">{tasks.find((item) => item.id === dependency.upstreamTaskId)?.name}</span><Tag>{dependency.condition}</Tag><ChevronRight className="ml-auto h-3 w-3" /></Link>)}</div><div><div className="mb-2 text-[11px] font-medium text-muted-foreground">{t('下游')} {downstream.length}</div>{downstream.length === 0 ? <div className="text-xs text-slate-400">{t('无直接下游')}</div> : downstream.map((dependency) => <Link to={`/tasks/${dependency.downstreamTaskId}`} key={dependency.id} className="flex items-center gap-2 rounded-lg border p-2.5 text-xs hover:border-primary/40"><GitBranch className="h-3.5 w-3.5 text-violet-500" /><span className="font-medium">{tasks.find((item) => item.id === dependency.downstreamTaskId)?.name}</span><ChevronRight className="ml-auto h-3 w-3" /></Link>)}</div></div></Card>
        </div>
      </>}

      {tab === 'schedule' && <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.4fr)_320px]">
        <Card><SectionHeader title="ScheduleDefinition" description={t('结构化调度定义 · 保存后更新当前 mock 任务')} action={<Button size="sm" disabled={task.readOnly} onClick={() => updateSchedule(task.id, scheduleDraft)}><Save className="h-3.5 w-3.5" />{t('保存调度')}</Button>} /><div className="p-5"><ScheduleEditor value={scheduleDraft} onChange={setScheduleDraft} /></div></Card>
        <Card className="h-fit"><SectionHeader title={t('当前生效配置')} description={t('调度、依赖与就绪度共用')} /><div className="p-5"><div className="text-sm font-semibold">{formatSchedule(task.schedule)}</div><dl className="mt-4 space-y-3 text-xs"><div className="flex justify-between"><dt className="text-muted-foreground">{t('时区')}</dt><dd>{task.schedule.timezone}</dd></div><div className="flex justify-between"><dt className="text-muted-foreground">{t('补跑策略')}</dt><dd>{task.schedule.misfirePolicy}</dd></div><div className="flex justify-between"><dt className="text-muted-foreground">{t('调度宽限')}</dt><dd>{t('{{count}} 分钟', { count: task.schedule.graceMinutes })}</dd></div><div className="flex justify-between"><dt className="text-muted-foreground">{t('依赖等待')}</dt><dd>{t('{{count}} 分钟', { count: task.schedule.dependencyWaitTimeoutMinutes })}</dd></div><div className="flex justify-between"><dt className="text-muted-foreground">{t('新鲜度 SLA')}</dt><dd>{task.schedule.freshnessSlaMinutes ? t('{{count}} 分钟', { count: task.schedule.freshnessSlaMinutes }) : t('未设置')}</dd></div></dl><div className="mt-5 rounded-lg bg-slate-50 p-3 text-[11px] leading-relaxed text-muted-foreground">{t('执行器只在实例满足依赖后调用引擎 REST API。调度定义中不包含 URL、PAT 或请求模板。')}</div></div></Card>
      </div>}

      {tab === 'integration' && <Card><SectionHeader title={t('外部触发与生命周期通知')} description={t('统一管理外部触发、运行状态通知和终态回调')} action={<Button size="sm" disabled={task.readOnly} onClick={() => updateIntegration(task.id, integrationDraft)}><Save className="h-3.5 w-3.5" />{t('保存触发与回调配置')}</Button>} /><div className="p-5"><TaskIntegrationEditor value={integrationDraft} onChange={setIntegrationDraft} /></div></Card>}

      {tab === 'runs' && <Card className="overflow-hidden"><SectionHeader title={t('运行历史')} description={t('同一逻辑实例的多个 attempt 独立保留')} action={<Button variant="outline" size="sm"><RotateCcw className="h-3.5 w-3.5" />{t('重跑失败实例')}</Button>} /><div className="overflow-x-auto"><table className="table-shell min-w-[900px]"><thead><tr><th>{t('Run / 实例')}</th><th>Attempt</th><th>{t('状态')}</th><th>{t('触发')}</th><th>{t('开始时间')}</th><th>{t('时长')}</th><th>{t('行数')}</th></tr></thead><tbody>{taskRuns.map((run) => <tr key={run.id}><td><Link to="/runs" className="font-mono text-xs text-primary">{run.id}</Link><div className="mt-1 max-w-[260px] truncate text-[10px] text-muted-foreground">{run.instanceKey}</div></td><td><Tag tone={run.attempt > 0 ? 'blue' : 'slate'}>#{run.attempt}</Tag></td><td><StatusBadge status={run.status} /></td><td className="text-xs">{run.triggerType}<div className="mt-1 text-[10px] text-muted-foreground">{run.triggeredBy}</div></td><td className="text-xs">{run.startedAt?.replace('T', ' ').slice(0, 19)}</td><td className="text-xs">{formatDuration(run.durationMs)}</td><td className="text-xs">{formatRows(run.rowCount)}</td></tr>)}</tbody></table></div></Card>}

      {tab === 'refs' && <Card className="overflow-hidden"><SectionHeader title="Task Resource Refs" description={t('SOURCE / TARGET 显式资产边，是构建视图与依赖推导的底座')} action={<Button variant="outline" size="sm"><Box className="h-3.5 w-3.5" />{t('补充 Ref')}</Button>} /><table className="table-shell"><thead><tr><th>{t('角色')}</th><th>{t('资产类型')}</th><th>{t('规范 ID')}</th><th>{t('资产名称')}</th><th>{t('来源')}</th></tr></thead><tbody>{task.refs.map((ref) => <tr key={`${ref.role}-${ref.id}`}><td><Tag tone={ref.role === 'TARGET' ? 'green' : 'blue'}>{ref.role}</Tag></td><td className="text-xs"><Database className="mr-1.5 inline h-3.5 w-3.5 text-slate-400" />{ref.type}</td><td className="font-mono text-xs">{ref.id}</td><td className="font-medium">{ref.name}</td><td className="text-xs text-muted-foreground">{t(ref.inferred ? '自动推断' : '人工声明')}</td></tr>)}</tbody></table>{task.refs.length === 0 && <div className="p-10 text-center text-xs text-muted-foreground">{t('尚未声明读写资产，暂不能参与数据依赖推导')}</div>}</Card>}

      {tab === 'dependencies' && <div className="grid gap-5 lg:grid-cols-2"><Card><SectionHeader title={t('上游依赖')} description={t('全部满足后才允许 dispatch')} /><div className="space-y-3 p-5">{upstream.map((dependency) => <div key={dependency.id} className="rounded-lg border p-4"><div className="flex items-center justify-between"><span className="text-sm font-medium">{tasks.find((item) => item.id === dependency.upstreamTaskId)?.name}</span><Tag tone="blue">{dependency.condition}</Tag></div><div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-muted-foreground"><span>{t('实例策略')}：{dependency.instancePolicy}</span><span>{t('跨日偏移')}：{dependency.offsetDays} {t('天')}</span><span>{t('来源')}：{dependency.kind}</span><span>{t('状态')}：{dependency.status}</span></div></div>)}{upstream.length === 0 && <div className="text-xs text-muted-foreground">{t('无上游依赖，可由调度直接分发')}</div>}</div></Card><Card><SectionHeader title={t('分发安全')} description={t('统一 dispatch 保证等待实例不会调用引擎')} /><div className="space-y-4 p-5 text-xs leading-relaxed text-slate-600"><div className="flex gap-3"><ShieldCheck className="h-5 w-5 shrink-0 text-emerald-500" /><p>{t('实例锁键为')} <code className="rounded bg-slate-100 px-1">tenant + task + instanceKey + attempt</code>，SCHEDULE、MANUAL、API、DEPENDENCY {t('共用')}。</p></div><div className="flex gap-3"><RefreshCw className="h-5 w-5 shrink-0 text-blue-500" /><p>{t('上游显式重跑成功后，仅恢复最新状态为 SKIPPED 的下游，不重复执行已成功实例。')}</p></div><Button variant="outline" size="sm"><ExternalLink className="h-3.5 w-3.5" />{t('查看引擎原生记录')}</Button></div></Card></div>}
    </div>
  );
}
