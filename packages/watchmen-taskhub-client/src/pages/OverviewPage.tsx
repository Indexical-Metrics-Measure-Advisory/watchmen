import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  AlertCircle, ArrowRight, Boxes, CheckCircle2, CircleGauge, CloudCog, Database,
  GitBranch, HeartPulse, ListChecks, LockKeyhole, RefreshCw, Server, TimerReset, Workflow
} from 'lucide-react';
import TrendChart from '@/components/TrendChart';
import { Button, Card, PageHeader, SectionHeader, StatCard, StatusBadge, Tag } from '@/components/ui';
import { useTaskHub } from '@/context/TaskHubContext';
import { shortTime } from '@/lib/utils';

export default function OverviewPage() {
  const { tasks, runs, assets, alerts, adapters, successTrend, cluster, refresh } = useTaskHub();
  const { t } = useTranslation();
  const running = runs.filter((run) => run.status === 'RUNNING').length;
  const waiting = runs.filter((run) => run.status === 'WAITING');
  const failed = runs.filter((run) => run.status === 'FAILED');
  const freshness = assets.reduce<Record<string, number>>((result, asset) => ({ ...result, [asset.readiness]: (result[asset.readiness] ?? 0) + 1 }), {});

  return (
    <div className="page-container">
      <PageHeader title={t('早上好，今晚的构建尽在掌握')} description={t('2026 年 11 月 3 日 · 跨采集、物化、Pipeline、快照与质量任务的统一运行视图')}
        actions={<><Button variant="outline" size="sm" onClick={() => void refresh()}><RefreshCw className="h-3.5 w-3.5" />{t('刷新')}</Button><Link to="/tasks" className="inline-flex"><Button size="sm"><ListChecks className="h-3.5 w-3.5" />{t('管理任务')}</Button></Link></>} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={<HeartPulse className="h-5 w-5" />} label={t('今日成功率')} value="96.8%" detail={<span className="text-emerald-600">↑ 1.2%</span>} tone="green" />
        <StatCard icon={<Workflow className="h-5 w-5" />} label={t('活跃运行实例')} value={running + waiting.length} detail={t('{{running}} 运行中 · {{waiting}} 等待依赖', { running, waiting: waiting.length })} tone="blue" />
        <StatCard icon={<AlertCircle className="h-5 w-5" />} label={t('今日失败')} value={failed.length} detail={t('1 条已通知 · 0 条未认领')} tone="rose" />
        <StatCard icon={<Boxes className="h-5 w-5" />} label={t('资产就绪')} value={`${freshness.FRESH ?? 0}/${assets.length}`} detail={t('{{stale}} 过期 · {{unknown}} 未知', { stale: freshness.STALE ?? 0, unknown: freshness.UNKNOWN ?? 0 })} tone="violet" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,1fr)]">
        <Card>
          <SectionHeader title={t('成功率趋势')} description={t('近 7 日已收口运行实例 · 不含 streaming 活跃度')} action={<Link to="/runs" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">{t('运行台账')}<ArrowRight className="h-3 w-3" /></Link>} />
          <div className="px-4 pb-2 pt-3"><TrendChart data={successTrend} /></div>
        </Card>
        <Card>
          <SectionHeader title={t('资产就绪度')} description={t('按 TARGET 构建任务最新应完成实例计算')} action={<CircleGauge className="h-4 w-4 text-muted-foreground" />} />
          <div className="flex items-center gap-6 p-5">
            <div className="relative h-32 w-32 shrink-0 rounded-full" style={{ background: 'conic-gradient(#10b981 0 50%, #f59e0b 50% 66.6%, #f43f5e 66.6% 83.3%, #cbd5e1 83.3% 100%)' }}>
              <div className="absolute inset-[13px] flex flex-col items-center justify-center rounded-full bg-white"><span className="text-2xl font-bold">50%</span><span className="text-[10px] text-muted-foreground">{t('整体新鲜')}</span></div>
            </div>
            <div className="flex-1 space-y-3 text-xs">
              {[['FRESH', '新鲜', freshness.FRESH ?? 0, 'bg-emerald-500'], ['STALE', '过期', freshness.STALE ?? 0, 'bg-amber-500'], ['FAILED', '失败', freshness.FAILED ?? 0, 'bg-rose-500'], ['UNKNOWN', '未知', freshness.UNKNOWN ?? 0, 'bg-slate-300']].map(([key, label, count, color]) => (
                <div key={String(key)} className="flex items-center gap-2"><i className={`h-2 w-2 rounded-full ${color}`} /><span className="text-slate-600">{t(String(label))}</span><span className="ml-auto font-semibold">{count}</span></div>
              ))}
              <Link to="/assets" className="block pt-1 text-primary hover:underline">{t('查看资产构建卡片 →')}</Link>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-1">
          <SectionHeader title={t('依赖等待')} description={t('需要关注的逻辑实例')} action={<Tag tone="violet">{t('{{count}} 等待', { count: waiting.length })}</Tag>} />
          <div className="divide-y divide-border/70">
            {waiting.map((run) => {
              const task = tasks.find((item) => item.id === run.taskId);
              return <div key={run.id} className="p-4"><div className="flex items-center justify-between gap-2"><Link to={`/tasks/${run.taskId}`} className="text-sm font-medium hover:text-primary">{task?.name}</Link><StatusBadge status={run.status} /></div><p className="mt-2 text-xs leading-relaxed text-muted-foreground">{run.error}</p><div className="mt-3 flex items-center gap-2 text-[11px] text-violet-600"><GitBranch className="h-3.5 w-3.5" />{run.dependencies[0]?.taskName}<span className="ml-auto">{t('已等待 7h 45m')}</span></div></div>;
            })}
            {waiting.length === 0 && <div className="p-8 text-center text-xs text-muted-foreground">{t('当前没有依赖等待')}</div>}
          </div>
        </Card>

        <Card className="xl:col-span-1">
          <SectionHeader title={t('最近失败')} description={t('按最新终态排序')} action={<Link to="/runs" className="text-xs text-primary">{t('全部')}</Link>} />
          <div className="divide-y divide-border/70">
            {failed.map((run) => {
              const task = tasks.find((item) => item.id === run.taskId);
              return <div key={run.id} className="p-4"><div className="flex items-center justify-between gap-2"><span className="text-sm font-medium">{task?.name}</span><StatusBadge status={run.status} /></div><p className="mt-2 line-clamp-2 text-xs leading-relaxed text-rose-600">{run.error}</p><div className="mt-2 text-[11px] text-muted-foreground">{run.processDate} · attempt {run.attempt} · {shortTime(run.finishedAt)}</div></div>;
            })}
          </div>
        </Card>

        <Card className="xl:col-span-1">
          <SectionHeader title={t('最近告警')} description={t('持久化事件 · Webhook 已发送')} action={<Tag tone="amber">{t('{{count}} 条', { count: alerts.length })}</Tag>} />
          <div className="divide-y divide-border/70">
            {alerts.map((alert) => <div key={alert.id} className="flex gap-3 p-4"><div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${alert.level === 'critical' ? 'bg-rose-50 text-rose-600' : alert.level === 'warning' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>{alert.level === 'info' ? <CloudCog className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}</div><div className="min-w-0"><div className="text-xs font-medium">{alert.title}</div><p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">{alert.detail}</p><div className="mt-1.5 text-[10px] text-slate-400">{shortTime(alert.createdAt)} · {alert.status}</div></div></div>)}
          </div>
        </Card>
      </div>

      <Card>
        <SectionHeader title={t('平台与适配器')} description={t('同步游标、引擎连接和投影能力')} action={<span className="flex items-center gap-1.5 text-[11px] text-emerald-600"><CheckCircle2 className="h-3.5 w-3.5" />{t('调度心跳正常')}</span>} />
        <div className="grid divide-y divide-border/70 md:grid-cols-2 md:divide-y-0 xl:grid-cols-4 xl:divide-x">
          {adapters.map((adapter) => <div key={adapter.id} className="p-4"><div className="flex items-center justify-between"><span className="text-sm font-medium">{adapter.name}</span><span className={`h-2 w-2 rounded-full ${adapter.state === 'HEALTHY' ? 'bg-emerald-500' : 'bg-amber-500'}`} /></div><div className="mt-1 text-[11px] text-muted-foreground">{adapter.engine}</div><div className="mt-3 flex items-center justify-between text-[11px]"><span className="text-slate-500">{t('{{count}} 个任务', { count: adapter.taskCount })}</span><span className={adapter.state === 'HEALTHY' ? 'text-emerald-600' : 'text-amber-600'}>{adapter.state === 'HEALTHY' ? t('延迟 {{seconds}}s', { seconds: adapter.lagSeconds }) : t('仅只读发现')}</span></div></div>)}
        </div>
      </Card>

      <Card>
        <SectionHeader title={t('集群与并发控制')} description={t('无状态节点共享元数据库；调度、运行和告警通过实例锁与唯一约束防重')}
          action={<Tag tone={cluster.sharedStoreStatus === 'CONNECTED' ? 'green' : 'amber'}>{cluster.nodes.filter((node) => node.status === 'HEALTHY').length}/{cluster.nodes.length} {t('节点健康')}</Tag>} />
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1.45fr)_minmax(340px,1fr)]">
          <div className="divide-y divide-border/70 border-b lg:border-b-0 lg:border-r">
            {cluster.nodes.map((node) => <div key={node.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><Server className="h-4 w-4" /></div>
              <div className="min-w-[180px] flex-1"><div className="flex items-center gap-2 text-xs font-semibold"><span className="font-mono">{node.id}</span><span className={`h-2 w-2 rounded-full ${node.status === 'HEALTHY' ? 'bg-emerald-500' : node.status === 'SUSPECT' ? 'bg-amber-500' : 'bg-slate-300'}`} /></div><div className="mt-1 font-mono text-[10px] text-muted-foreground">{node.address}</div></div>
              <div className="text-right text-[11px] text-muted-foreground"><div>{t('{{count}} 个活跃实例', { count: node.activeRuns })} · {t('{{count}} 把锁', { count: node.claimedLocks })}</div><div className="mt-1">{t('心跳')} {shortTime(node.lastHeartbeatAt)}</div></div>
            </div>)}
            {cluster.nodes.length === 0 && <div className="p-6 text-center text-xs text-muted-foreground">{t('当前服务未上报集群节点信息')}</div>}
          </div>
          <div className="grid grid-cols-2 gap-3 p-4">
            <div className="rounded-lg bg-slate-50 p-3"><LockKeyhole className="h-4 w-4 text-violet-500" /><div className="mt-2 text-lg font-bold">{cluster.activeLocks}</div><div className="text-[10px] text-muted-foreground">{t('活动实例锁')}</div></div>
            <div className="rounded-lg bg-slate-50 p-3"><CheckCircle2 className="h-4 w-4 text-emerald-500" /><div className="mt-2 text-lg font-bold">{cluster.rejectedDuplicateDispatches}</div><div className="text-[10px] text-muted-foreground">{t('已拦截重复分发')}</div></div>
            <div className="rounded-lg bg-slate-50 p-3"><RefreshCw className="h-4 w-4 text-blue-500" /><div className="mt-2 text-lg font-bold">{cluster.failovers24h}</div><div className="text-[10px] text-muted-foreground">{t('24h 故障接管')}</div></div>
            <div className="rounded-lg bg-slate-50 p-3"><Database className="h-4 w-4 text-cyan-600" /><div className="mt-2 text-sm font-bold">{cluster.sharedStoreStatus}</div><div className="text-[10px] text-muted-foreground">{t('共享元数据库')}</div></div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 border-t bg-slate-50/60 px-5 py-3 text-[10px] text-slate-500"><Tag>tenant + task + instanceKey + attempt</Tag><Tag>{t('终态单调')}</Tag><Tag>{t('租约过期后接管')}</Tag><Tag>{t('不确定结果标记 STALE，不盲目重发')}</Tag></div>
      </Card>
      <div className="flex items-center justify-center gap-2 pb-2 text-[11px] text-muted-foreground"><TimerReset className="h-3.5 w-3.5" />{t('下一次适配器同步约 24 秒后 · 依赖兜底评估每 60 秒执行')}</div>
    </div>
  );
}
