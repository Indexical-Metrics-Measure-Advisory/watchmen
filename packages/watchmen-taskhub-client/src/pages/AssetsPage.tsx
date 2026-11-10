import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ArrowDownLeft, ArrowUpRight, Box, Database, ExternalLink, Search, Workflow } from 'lucide-react';
import { Button, Card, EmptyState, PageHeader, ReadinessBadge, SectionHeader, StatusBadge, Tag } from '@/components/ui';
import { useTaskHub } from '@/context/TaskHubContext';
import { cn, formatRows } from '@/lib/utils';

export default function AssetsPage() {
  const { tasks, runs, assets } = useTaskHub();
  const { t } = useTranslation();
  const [keyword, setKeyword] = useState('');
  const [readiness, setReadiness] = useState('ALL');
  const [selectedId, setSelectedId] = useState('metric-retention');
  const filtered = useMemo(() => assets.filter((asset) => `${asset.name}${asset.description}`.toLowerCase().includes(keyword.toLowerCase()) && (readiness === 'ALL' || asset.readiness === readiness)), [assets, keyword, readiness]);
  const selected = assets.find((asset) => asset.id === selectedId) ?? filtered[0];

  return (
    <div className="page-container">
      <PageHeader title={t('资产构建视图')} description={t('回答“谁构建我、上游是谁、下游去哪、现在新鲜吗”')} actions={<Button variant="outline" size="sm"><Database className="h-3.5 w-3.5" />{t('同步资产 Refs')}</Button>} />
      <div className="grid min-h-[650px] gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
        <Card className="flex min-w-0 flex-col overflow-hidden">
          <div className="space-y-2 border-b p-3"><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input className="field w-full pl-9" placeholder={t('搜索 topic / metric / 源表')} value={keyword} onChange={(event) => setKeyword(event.target.value)} /></div><select aria-label={t('全部就绪状态')} className="field w-full" value={readiness} onChange={(event) => setReadiness(event.target.value)}><option value="ALL">{t('全部就绪状态')}</option><option>FRESH</option><option>STALE</option><option>FAILED</option><option>UNKNOWN</option></select></div>
          <div className="flex-1 divide-y divide-border/70 overflow-y-auto">
            {filtered.map((asset) => <button key={asset.id} onClick={() => setSelectedId(asset.id)} className={cn('w-full px-4 py-4 text-left transition-colors hover:bg-blue-50/40', selected?.id === asset.id && 'border-l-2 border-l-primary bg-blue-50/60')}><div className="flex items-center gap-2"><span className="min-w-0 flex-1 truncate text-sm font-medium">{asset.name}</span><ReadinessBadge state={asset.readiness} /></div><p className="mt-1 truncate text-[11px] text-muted-foreground">{asset.description}</p><div className="mt-2 flex items-center gap-2"><Tag>{asset.type}</Tag><span className="text-[10px] text-muted-foreground">{t('{{count}} 个构建者', { count: asset.builderTaskIds.length })}</span>{asset.late && <Tag tone="amber">{t('迟到')}</Tag>}</div></button>)}
            {filtered.length === 0 && <EmptyState icon={<Search className="h-8 w-8" />} title={t('未找到资产')} description={t('尝试其他关键词')} />}
          </div>
          <div className="border-t px-4 py-3 text-[11px] text-muted-foreground">{t('{{count}} 个资产 · 仅当前租户', { count: filtered.length })}</div>
        </Card>

        {selected && <div className="min-w-0 space-y-5">
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50/80 via-white to-violet-50/60 p-5">
              <div className="flex flex-wrap items-start justify-between gap-4"><div className="flex min-w-0 items-start gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm"><Box className="h-5 w-5" /></div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h1 className="break-all text-xl font-bold">{selected.name}</h1><ReadinessBadge state={selected.readiness} />{selected.late && <Tag tone="amber">late=true</Tag>}</div><p className="mt-1 text-xs text-muted-foreground">{selected.description} · {selected.type}</p></div></div><Button variant="outline" size="sm"><ExternalLink className="h-3.5 w-3.5" />{t('打开资产详情')}</Button></div>
              <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-blue-100/70 pt-4 text-xs md:grid-cols-4"><div><dt className="text-muted-foreground">{t('责任人')}</dt><dd className="mt-1 font-medium">{selected.owner}</dd></div><div><dt className="text-muted-foreground">{t('最近构建')}</dt><dd className="mt-1 font-medium">{selected.lastBuiltAt?.replace('T', ' ').slice(0, 16) ?? '—'}</dd></div><div><dt className="text-muted-foreground">{t('数据行数')}</dt><dd className="mt-1 font-medium">{formatRows(selected.rowCount)}</dd></div><div><dt className="text-muted-foreground">{t('就绪规则')}</dt><dd className="mt-1 font-medium">{t('SLA 60 分钟')}</dd></div></dl>
            </div>
          </Card>

          <div className="grid gap-5 lg:grid-cols-3">
            <Card><SectionHeader title={t('上游资产')} description={t('{{count}} 个直接输入', { count: selected.upstreamAssetIds.length })} /><div className="space-y-2 p-3">{selected.upstreamAssetIds.map((id) => { const asset = assets.find((item) => item.id === id); return asset ? <button key={id} onClick={() => setSelectedId(id)} className="w-full rounded-lg border p-3 text-left hover:border-primary/40"><div className="flex items-center gap-2"><ArrowDownLeft className="h-3.5 w-3.5 text-blue-500" /><span className="min-w-0 flex-1 truncate text-xs font-medium">{asset.name}</span><ReadinessBadge state={asset.readiness} /></div></button> : <div key={id} className="rounded-lg border p-3 text-xs">{id}</div>; })}{selected.upstreamAssetIds.length === 0 && <div className="p-4 text-center text-xs text-muted-foreground">{t('平台外部根资产')}</div>}</div></Card>
            <Card><SectionHeader title={t('构建者')} description={t('{{count}} 个 TARGET 任务', { count: selected.builderTaskIds.length })} /><div className="space-y-2 p-3">{selected.builderTaskIds.map((id) => { const task = tasks.find((item) => item.id === id)!; const latestRun = runs.find((run) => run.taskId === id); return <Link key={id} to={`/tasks/${id}`} className="block rounded-lg border p-3 hover:border-primary/40"><div className="flex items-center gap-2"><Workflow className="h-3.5 w-3.5 text-violet-500" /><span className="min-w-0 flex-1 truncate text-xs font-medium">{task.name}</span><StatusBadge status={task.lastStatus} /></div>{latestRun && <div className="mt-2 text-[10px] text-muted-foreground">{latestRun.processDate} · attempt {latestRun.attempt}</div>}</Link>; })}{selected.builderTaskIds.length === 0 && <div className="p-4 text-center text-xs text-muted-foreground">{t('无平台内构建任务')}</div>}</div></Card>
            <Card><SectionHeader title={t('下游资产')} description={t('{{count}} 个直接输出', { count: selected.downstreamAssetIds.length })} /><div className="space-y-2 p-3">{selected.downstreamAssetIds.map((id) => { const asset = assets.find((item) => item.id === id); return asset ? <button key={id} onClick={() => setSelectedId(id)} className="w-full rounded-lg border p-3 text-left hover:border-primary/40"><div className="flex items-center gap-2"><ArrowUpRight className="h-3.5 w-3.5 text-violet-500" /><span className="min-w-0 flex-1 truncate text-xs font-medium">{asset.name}</span><ReadinessBadge state={asset.readiness} /></div></button> : null; })}{selected.downstreamAssetIds.length === 0 && <div className="p-4 text-center text-xs text-muted-foreground">{t('终端资产')}</div>}</div></Card>
          </div>

          <Card><SectionHeader title={t('今日构建状态')} description={t('processDate 2026-11-03 · 最新应完成实例')} /><div className="p-5">{selected.builderTaskIds.length > 0 ? selected.builderTaskIds.map((id) => { const task = tasks.find((item) => item.id === id)!; const run = runs.find((item) => item.taskId === id); return <div key={id} className="mb-3 rounded-lg border p-4 last:mb-0"><div className="flex flex-wrap items-center gap-3"><StatusBadge status={task.lastStatus} /><span className="text-sm font-medium">{task.name}</span><span className="ml-auto text-xs text-muted-foreground">{task.schedule.frequency} · {task.schedule.timezone}</span></div>{run?.error && <p className="mt-3 rounded-md bg-amber-50 p-2.5 text-xs text-amber-700">{run.error}</p>}{run && <div className="mt-3 grid gap-2 text-[11px] text-muted-foreground md:grid-cols-3"><span className="truncate font-mono">{run.instanceKey}</span><span>{t('触发')}：{run.triggerType}</span><span>Engine：{run.engineRunKey}</span></div>}</div>; }) : <div className="text-xs text-muted-foreground">{t('外部资产不参与 Task Hub 构建调度，状态显示为 UNKNOWN。')}</div>}</div></Card>
        </div>}
      </div>
    </div>
  );
}
