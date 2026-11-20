import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, CalendarDays, ChevronLeft, ChevronRight, Clock3, Download, ZoomIn, ZoomOut } from 'lucide-react';
import { Button, Card, PageHeader, SectionHeader, StatCard, StatusBadge, Tag } from '@/components/ui';
import { useTaskHub } from '@/context/TaskHubContext';
import { cn } from '@/lib/utils';

const barStyles = { SUCCESS: 'bg-emerald-500', FAILED: 'bg-rose-500', RUNNING: 'bg-blue-500', WAITING: 'bg-violet-400', SKIPPED: 'bg-amber-400', PENDING: 'bg-slate-400', STALE: 'bg-orange-500', CANCELLED: 'bg-slate-400' };

export default function TimelinePage() {
  const { tasks, timeline: rows } = useTaskHub();
  const { t } = useTranslation();
  const [zoom, setZoom] = useState(1);
  const [showPlan, setShowPlan] = useState(true);
  const current = 10.75;

  return (
    <div className="page-container">
      <PageHeader title={t('构建时间线')} description={t('24 小时计划 vs 实际执行；等待区间和预计就绪风险按逻辑实例展示')}
        actions={<><Button variant="outline" size="icon"><ChevronLeft className="h-4 w-4" /></Button><Button variant="outline" size="sm"><CalendarDays className="h-4 w-4" />2026-11-03</Button><Button variant="outline" size="icon"><ChevronRight className="h-4 w-4" /></Button><Button variant="outline" size="icon"><Download className="h-4 w-4" /></Button></>} />
      <div className="grid gap-4 sm:grid-cols-3"><StatCard icon={<Clock3 className="h-5 w-5" />} label={t('计划实例')} value="42" detail="00:00 — 23:59" tone="blue" /><StatCard icon={<AlertTriangle className="h-5 w-5" />} label={t('依赖风险')} value="1" detail={t('客户留存物化预计等待')} tone="amber" /><StatCard icon={<CalendarDays className="h-5 w-5" />} label={t('今晚待运行')} value="18" detail={t('下一次 11:00 · 订单增量采集')} tone="violet" /></div>
      <Card className="overflow-hidden">
        <SectionHeader title={t('计划与实际甘特图')} description={t('浅色轨道为计划，实色条为实际 / 等待')} action={<div className="flex items-center gap-2"><Button variant="outline" size="sm" onClick={() => setShowPlan((value) => !value)}>{t(showPlan ? '隐藏计划' : '显示计划')}</Button><Button variant="ghost" size="icon" onClick={() => setZoom((value) => Math.max(0.75, value - 0.25))}><ZoomOut className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => setZoom((value) => Math.min(2, value + 0.25))}><ZoomIn className="h-4 w-4" /></Button></div>} />
        <div className="overflow-x-auto"><div className="min-w-[1100px]" style={{ width: `${zoom * 100}%` }}>
          <div className="flex border-b bg-slate-50/70"><div className="w-[230px] shrink-0 border-r px-4 py-3 text-xs font-medium text-muted-foreground">{t('任务 / 实例')}</div><div className="relative flex-1">{Array.from({ length: 13 }, (_, index) => <span key={index} className="absolute top-3 text-[10px] text-muted-foreground" style={{ left: `${(index / 12) * 100}%`, transform: index === 12 ? 'translateX(-100%)' : 'translateX(-50%)' }}>{String(index * 2).padStart(2, '0')}:00</span>)}<div className="h-10" /></div></div>
          {rows.map((row) => {
            const task = tasks.find((item) => item.id === row.taskId)!;
            return <div key={row.taskId} className="flex h-[70px] border-b last:border-0"><div className="flex w-[230px] shrink-0 items-center gap-3 border-r px-4"><div className={cn('h-7 w-1 rounded-full', barStyles[row.status])} /><div className="min-w-0"><div className="truncate text-xs font-medium">{task.name}</div><div className="mt-1 flex items-center gap-1.5"><StatusBadge status={row.status} /><span className="text-[10px] text-muted-foreground">{t(row.label)}</span></div></div></div><div className="timeline-grid relative flex-1">
              {showPlan && <div className="absolute top-[17px] h-2 rounded-full bg-slate-200" style={{ left: `${row.start / 24 * 100}%`, width: `${Math.max(row.duration / 24 * 100, 0.5)}%` }} />}
              <div className={cn('group absolute top-[32px] flex h-5 items-center rounded-md px-2 text-[9px] font-medium text-white shadow-sm', barStyles[row.status], row.status === 'WAITING' && 'border border-violet-300 bg-violet-100 !text-violet-700')} style={{ left: `${row.actualStart / 24 * 100}%`, width: `${Math.max(row.actualDuration / 24 * 100, 0.7)}%` }}><span className="whitespace-nowrap">{row.status === 'WAITING' ? t('等待上游 7h45m') : row.status}</span></div>
              {row.risk && <div className="absolute left-[29%] top-[11px] flex items-center gap-1 text-[10px] text-amber-600"><AlertTriangle className="h-3 w-3" />{t('计划早于上游预计就绪')}</div>}
              <div className="absolute inset-y-0 w-px bg-rose-400/70" style={{ left: `${current / 24 * 100}%` }}><span className="absolute -top-1 left-1 whitespace-nowrap rounded bg-rose-50 px-1 text-[9px] text-rose-600">10:45</span></div>
            </div></div>;
          })}
        </div></div>
        <div className="flex flex-wrap items-center gap-4 border-t px-4 py-3 text-[10px] text-muted-foreground"><span className="flex items-center gap-1"><i className="h-2 w-5 rounded bg-slate-200" />{t('计划')}</span>{[['成功', 'bg-emerald-500'], ['运行', 'bg-blue-500'], ['等待', 'bg-violet-400'], ['失败', 'bg-rose-500'], ['跳过', 'bg-amber-400']].map(([label, color]) => <span key={label} className="flex items-center gap-1"><i className={`h-2 w-2 rounded-full ${color}`} />{t(label)}</span>)}<Tag>{t('窗口归属日 2026-11-03')}</Tag></div>
      </Card>
    </div>
  );
}
