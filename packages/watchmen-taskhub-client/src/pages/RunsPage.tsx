import { Fragment, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { CalendarDays, ChevronDown, ChevronRight, CircleAlert, ExternalLink, Filter, GitBranch, LockKeyhole, Play, Search, Server } from 'lucide-react';
import { Button, Card, EmptyState, PageHeader, StatusBadge, Tag } from '@/components/ui';
import { useTaskHub } from '@/context/TaskHubContext';
import { cn, formatDuration, formatRows } from '@/lib/utils';

export default function RunsPage() {
  const { runs, tasks } = useTaskHub();
  const { t } = useTranslation();
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('ALL');
  const [trigger, setTrigger] = useState('ALL');
  const [expanded, setExpanded] = useState<string | null>(runs[0]?.id ?? null);

  const filtered = useMemo(() => runs.filter((run) => {
    const task = tasks.find((item) => item.id === run.taskId);
    return `${task?.name}${run.id}${run.instanceKey}`.toLowerCase().includes(keyword.toLowerCase()) && (status === 'ALL' || run.status === status) && (trigger === 'ALL' || run.triggerType === trigger);
  }), [runs, tasks, keyword, status, trigger]);

  return (
    <div className="page-container">
      <PageHeader title={t('运行台账')} description={t('统一 schema 查询每次执行尝试，追溯上游链，并核对多节点实例认领与幂等信息')}
        actions={<Button variant="outline" size="sm"><CalendarDays className="h-3.5 w-3.5" />processDate：2026-11-03</Button>} />
      <Card className="flex flex-wrap items-center gap-3 p-3">
        <div className="relative min-w-[220px] flex-1 md:max-w-sm"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input className="field w-full pl-9" placeholder={t('搜索 Run ID、实例或任务')} value={keyword} onChange={(event) => setKeyword(event.target.value)} /></div>
        <select aria-label={t('全部状态')} className="field w-36" value={status} onChange={(event) => setStatus(event.target.value)}><option value="ALL">{t('全部状态')}</option>{['SUCCESS', 'RUNNING', 'WAITING', 'FAILED', 'SKIPPED', 'STALE'].map((item) => <option key={item}>{item}</option>)}</select>
        <select aria-label={t('全部触发方式')} className="field w-36" value={trigger} onChange={(event) => setTrigger(event.target.value)}><option value="ALL">{t('全部触发方式')}</option>{['SCHEDULE', 'MANUAL', 'API', 'DEPENDENCY'].map((item) => <option key={item}>{item}</option>)}</select>
        <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground"><Filter className="h-3.5 w-3.5" />{t('{{count}} 次执行', { count: filtered.length })}</span>
      </Card>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto"><table className="table-shell min-w-[1180px]"><thead><tr><th className="w-8" /><th>{t('任务 / Run ID')}</th><th>{t('实例 / Attempt')}</th><th>{t('状态')}</th><th>{t('业务窗口')}</th><th>{t('触发方式')}</th><th>{t('开始时间')}</th><th className="text-right">{t('时长')}</th><th className="text-right">{t('行数')}</th></tr></thead><tbody>
          {filtered.map((run) => {
            const task = tasks.find((item) => item.id === run.taskId);
            const open = expanded === run.id;
            return <Fragment key={run.id}><tr className="cursor-pointer" onClick={() => setExpanded(open ? null : run.id)}><td>{open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}</td><td><Link to={`/tasks/${run.taskId}`} className="font-medium text-slate-800 hover:text-primary">{task?.name}</Link><div className="mt-1 font-mono text-[10px] text-muted-foreground">{run.id}</div></td><td><div className="max-w-[210px] truncate font-mono text-[10px] text-slate-600" title={run.instanceKey}>{run.instanceKey}</div><div className="mt-1"><Tag tone={run.attempt > 0 ? 'blue' : 'slate'}>attempt {run.attempt}</Tag></div></td><td><StatusBadge status={run.status} pulse /></td><td><span className="text-xs">{run.window}</span><div className="mt-1 text-[10px] text-muted-foreground">{run.processDate}</div></td><td><Tag tone={run.triggerType === 'DEPENDENCY' ? 'violet' : 'slate'}>{run.triggerType}</Tag><div className="mt-1 text-[10px] text-muted-foreground">{run.triggeredBy}</div></td><td className="text-xs">{run.startedAt?.replace('T', ' ').slice(0, 19)}</td><td className="text-right text-xs">{formatDuration(run.durationMs)}</td><td className="text-right text-xs">{formatRows(run.rowCount)}</td></tr>
              {open && <tr className="bg-slate-50/70 hover:bg-slate-50/70"><td colSpan={9} className="px-6 py-4"><div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]"><div><div className="mb-3 flex items-center gap-2 text-xs font-semibold"><GitBranch className="h-4 w-4 text-violet-500" />{t('实例依赖判定')}</div>{run.dependencies.length === 0 ? <div className="rounded-lg border border-dashed bg-white p-4 text-xs text-muted-foreground">{t('根实例，无上游依赖')}</div> : <div className="space-y-2">{run.dependencies.map((dependency) => <div key={dependency.dependencyId} className="flex flex-wrap items-center gap-3 rounded-lg border bg-white p-3"><span className={cn('h-2 w-2 rounded-full', dependency.state === 'SATISFIED' ? 'bg-emerald-500' : dependency.state === 'VIOLATED' ? 'bg-rose-500' : 'bg-violet-500')} /><Link to={`/tasks/${dependency.taskId}`} className="text-xs font-medium hover:text-primary">{dependency.taskName}</Link><Tag>{dependency.condition}</Tag><Tag tone={dependency.state === 'SATISFIED' ? 'green' : dependency.state === 'VIOLATED' ? 'amber' : 'violet'}>{dependency.state}</Tag><span className="ml-auto font-mono text-[10px] text-muted-foreground">{dependency.runId ?? t('等待实例创建')}</span></div>)}</div>}{run.error && <div className="mt-3 flex gap-2 rounded-lg border border-rose-100 bg-rose-50 p-3 text-xs leading-relaxed text-rose-700"><CircleAlert className="h-4 w-4 shrink-0" />{run.error}</div>}</div><div className="rounded-lg border bg-white p-4"><div className="mb-3 text-xs font-semibold">{t('执行与关联')}</div><dl className="space-y-2.5 text-[11px]"><div className="flex justify-between gap-4"><dt className="text-muted-foreground">Engine Run Key</dt><dd className="break-all font-mono">{run.engineRunKey}</dd></div><div className="flex justify-between"><dt className="text-muted-foreground">Process Date</dt><dd>{run.processDate}</dd></div><div className="flex justify-between"><dt className="text-muted-foreground">Finished At</dt><dd>{run.finishedAt?.replace('T', ' ').slice(0, 19) ?? '—'}</dd></div><div className="flex justify-between gap-4"><dt className="flex items-center gap-1 text-muted-foreground"><Server className="h-3 w-3" />{t('认领节点')}</dt><dd className="font-mono">{run.claimedBy ?? t('等待分发')}</dd></div><div className="flex justify-between gap-4"><dt className="flex items-center gap-1 text-muted-foreground"><LockKeyhole className="h-3 w-3" />{t('实例锁到期')}</dt><dd>{run.lockExpiresAt?.replace('T', ' ').slice(0, 19) ?? '—'}</dd></div><div className="flex justify-between gap-4"><dt className="text-muted-foreground">Idempotency Key</dt><dd className="max-w-[170px] truncate font-mono" title={run.idempotencyKey}>{run.idempotencyKey ?? '—'}</dd></div></dl><div className="mt-4 flex gap-2"><Button variant="outline" size="sm"><ExternalLink className="h-3.5 w-3.5" />{t('引擎明细')}</Button>{run.status === 'FAILED' && <Button size="sm"><Play className="h-3.5 w-3.5" />{t('创建新 Attempt')}</Button>}</div></div></div></td></tr>}
            </Fragment>;
          })}
        </tbody></table></div>
        {filtered.length === 0 && <EmptyState icon={<Search className="h-10 w-10" />} title={t('没有运行记录')} description={t('调整筛选条件后重试')} />}
        <div className="flex items-center justify-between border-t px-4 py-3 text-xs text-muted-foreground"><span>{t('已加载 {{count}} 条 · 保留期 90 天', { count: filtered.length })}</span><span>1 / 1</span></div>
      </Card>
    </div>
  );
}
