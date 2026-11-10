import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import type { TaskDefinition, TaskDependency } from '@/types';

const positions: Record<string, { x: number; y: number }> = {
  'task-crm-collector': { x: 45, y: 45 },
  'task-order-collector': { x: 45, y: 220 },
  'task-kafka-orders': { x: 45, y: 365 },
  'task-retention-mat': { x: 340, y: 45 },
  'task-order-mat': { x: 340, y: 220 },
  'task-customer-flow': { x: 625, y: 45 },
  'task-customer-snapshot': { x: 625, y: 330 },
  'task-customer-dqc': { x: 875, y: 45 },
  'task-customer-repair': { x: 875, y: 235 }
};

const statusColor = {
  SUCCESS: '#10b981', FAILED: '#f43f5e', RUNNING: '#2492ff', WAITING: '#8b5cf6',
  SKIPPED: '#f59e0b', STALE: '#f97316', PENDING: '#94a3b8', CANCELLED: '#94a3b8'
};

export default function OrchestrationGraph({ tasks, dependencies, showProposed = true, onSelect }: {
  tasks: TaskDefinition[];
  dependencies: TaskDependency[];
  showProposed?: boolean;
  onSelect?: (taskId: string) => void;
}) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<string>();
  const visibleTasks = useMemo(() => tasks.filter((task) => positions[task.id]), [tasks]);
  const visibleDependencies = dependencies.filter((dependency) => dependency.status === 'ACCEPTED' || (showProposed && dependency.status === 'PROPOSED'));

  return (
    <div className="graph-grid relative min-h-[460px] overflow-auto rounded-b-xl">
      <svg viewBox="0 0 1100 480" className="h-[480px] min-w-[980px] w-full" role="img" aria-label="任务依赖编排图">
        <defs><marker id="dag-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#8aa4bf" /></marker><marker id="dag-arrow-proposed" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#a78bfa" /></marker></defs>
        {visibleDependencies.map((dependency) => {
          const source = positions[dependency.upstreamTaskId];
          const target = positions[dependency.downstreamTaskId];
          if (!source || !target) return null;
          const x1 = source.x + 190;
          const y1 = source.y + 34;
          const x2 = target.x;
          const y2 = target.y + 34;
          const middle = x1 + Math.max(35, (x2 - x1) / 2);
          const path = `M ${x1} ${y1} H ${middle} V ${y2} H ${x2 - 4}`;
          const proposed = dependency.status === 'PROPOSED';
          return (
            <g key={dependency.id} opacity={dependency.enabled ? 1 : 0.35}>
              <path d={path} fill="none" stroke={proposed ? '#a78bfa' : dependency.kind === 'explicit' ? '#64748b' : '#8aa4bf'} strokeWidth={dependency.kind === 'explicit' ? 1.8 : 1.5} strokeDasharray={proposed ? '5 5' : dependency.kind === 'explicit' ? '7 4' : undefined} markerEnd={`url(#${proposed ? 'dag-arrow-proposed' : 'dag-arrow'})`} />
              <rect x={middle - 42} y={(y1 + y2) / 2 - 10} width="84" height="18" rx="8" fill="#fff" stroke="#e6edf5" />
              <text x={middle} y={(y1 + y2) / 2 + 3} textAnchor="middle" fontSize="9" fontWeight="500" fill={proposed ? '#8b5cf6' : '#64748b'}>{dependency.condition}</text>
            </g>
          );
        })}
        {visibleTasks.map((task) => {
          const position = positions[task.id];
          const active = selected === task.id;
          return (
            <g key={task.id} transform={`translate(${position.x},${position.y})`} className="cursor-pointer" role="button" tabIndex={0}
              onClick={() => { setSelected(task.id); onSelect?.(task.id); }}
              onKeyDown={(event) => { if (event.key === 'Enter') { setSelected(task.id); onSelect?.(task.id); } }}>
              <rect width="190" height="68" rx="10" fill="#fff" stroke={active ? '#2492ff' : '#dce6f0'} strokeWidth={active ? 2 : 1} filter="drop-shadow(0 3px 5px rgba(15,23,42,.06))" />
              <rect width="4" height="68" rx="2" fill={['dqc_job', 'custom'].includes(task.type) ? '#8b5cf6' : '#2492ff'} />
              <circle cx="17" cy="18" r="4" fill={statusColor[task.lastStatus]} className={cn(task.lastStatus === 'RUNNING' && 'animate-pulse')} />
              <text x="29" y="22" fontSize="12" fontWeight="600" fill="#1e293b">{task.name.length > 13 ? `${task.name.slice(0, 13)}…` : task.name}</text>
              <text x="16" y="43" fontSize="10" fill="#94a3b8">{task.schedule.frequency} · {task.schedule.timeOfDay ?? task.schedule.cronExpression ?? task.schedule.intervalMinutes ?? '—'}</text>
              <text x="16" y="58" fontSize="9" fill="#64748b">{task.owner} · {task.executionMode}</text>
            </g>
          );
        })}
      </svg>
      <div className="absolute bottom-3 left-3 flex flex-wrap gap-3 rounded-lg border bg-white/90 px-3 py-2 text-[10px] text-slate-500 shadow-sm backdrop-blur">
        <span className="flex items-center gap-1.5"><i className="h-0.5 w-5 bg-slate-400" />{t('显式依赖')}</span>
        <span className="flex items-center gap-1.5"><i className="h-0.5 w-5 border-t border-dashed border-violet-400" />{t('推导 / 待采纳')}</span>
        <span>{t('点击节点查看任务')}</span>
      </div>
    </div>
  );
}
