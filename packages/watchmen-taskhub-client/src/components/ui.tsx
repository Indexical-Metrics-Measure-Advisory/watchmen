import { X } from 'lucide-react';
import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import type { Readiness, RunStatus, TaskType } from '@/types';

export const buttonStyles = (variant: 'primary' | 'outline' | 'ghost' | 'danger' = 'primary', size: 'sm' | 'md' | 'icon' = 'md') => cn(
  'inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50',
  size === 'sm' && 'h-8 px-2.5 text-xs',
  size === 'md' && 'h-9 px-3.5',
  size === 'icon' && 'h-8 w-8',
  variant === 'primary' && 'bg-primary text-primary-foreground shadow-sm hover:bg-blue-600',
  variant === 'outline' && 'border border-input bg-white text-slate-700 hover:bg-accent hover:text-foreground',
  variant === 'ghost' && 'text-slate-600 hover:bg-accent hover:text-foreground',
  variant === 'danger' && 'bg-rose-600 text-white hover:bg-rose-700'
);

export function Button({ className, variant = 'primary', size = 'md', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'icon';
}) {
  return <button className={cn(buttonStyles(variant, size), className)} {...props} />;
}

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('glass-card', className)} {...props} />;
}

export function PageHeader({ title, description, actions, eyebrow }: { title: string; description: string; actions?: ReactNode; eyebrow?: string }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-primary">{eyebrow}</div>}
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function SectionHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border/70 px-5 py-4">
      <div>
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatCard({ icon, label, value, detail, tone = 'blue' }: { icon: ReactNode; label: string; value: ReactNode; detail?: ReactNode; tone?: 'blue' | 'green' | 'amber' | 'rose' | 'violet' }) {
  const tones = {
    blue: 'bg-blue-50 text-blue-600', green: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600', rose: 'bg-rose-50 text-rose-600', violet: 'bg-violet-50 text-violet-600'
  };
  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', tones[tone])}>{icon}</div>
        <div className="min-w-0">
          <div className="text-xs font-medium text-muted-foreground">{label}</div>
          <div className="mt-0.5 text-2xl font-bold leading-tight tracking-tight text-slate-900">{value}</div>
          {detail && <div className="mt-1 text-xs text-muted-foreground">{detail}</div>}
        </div>
      </div>
    </Card>
  );
}

const runStatusLabels: Record<RunStatus, string> = {
  PENDING: '待执行', WAITING: '依赖等待', RUNNING: '运行中', SUCCESS: '成功', FAILED: '失败', CANCELLED: '已取消', SKIPPED: '已跳过', STALE: '状态未知'
};

const runStatusStyles: Record<RunStatus, string> = {
  PENDING: 'border-slate-200 bg-slate-100 text-slate-600',
  WAITING: 'border-violet-200 bg-violet-50 text-violet-700',
  RUNNING: 'border-blue-200 bg-blue-50 text-blue-700',
  SUCCESS: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  FAILED: 'border-rose-200 bg-rose-50 text-rose-700',
  CANCELLED: 'border-slate-200 bg-slate-100 text-slate-600',
  SKIPPED: 'border-amber-200 bg-amber-50 text-amber-700',
  STALE: 'border-orange-200 bg-orange-50 text-orange-700'
};

export function StatusBadge({ status, pulse = false }: { status: RunStatus; pulse?: boolean }) {
  const { t } = useTranslation();
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium', runStatusStyles[status])}>
      <span className={cn('h-1.5 w-1.5 rounded-full bg-current', pulse && status === 'RUNNING' && 'animate-pulse')} />
      {t(runStatusLabels[status])}
    </span>
  );
}

const readinessLabels: Record<Readiness, string> = { FRESH: '新鲜', STALE: '过期', FAILED: '失败', UNKNOWN: '未知' };
export function ReadinessBadge({ state }: { state: Readiness }) {
  const { t } = useTranslation();
  const styles: Record<Readiness, string> = {
    FRESH: 'border-emerald-200 bg-emerald-50 text-emerald-700', STALE: 'border-amber-200 bg-amber-50 text-amber-700',
    FAILED: 'border-rose-200 bg-rose-50 text-rose-700', UNKNOWN: 'border-slate-200 bg-slate-100 text-slate-600'
  };
  return <span className={cn('rounded-full border px-2 py-0.5 text-[11px] font-medium', styles[state])}>{t(readinessLabels[state])}</span>;
}

export const taskTypeLabels: Record<TaskType, string> = {
  collector_online: '在线采集', collector_batch: '批量采集', materialization: '指标物化',
  materialization_flow: '物化 Flow', pipeline_event: '事件 Pipeline', pipeline_snapshot: '主题快照',
  dqc_job: 'DQC 质量任务', custom: '自定义模块任务'
};

export function TaskTypeBadge({ type }: { type: TaskType }) {
  const { t } = useTranslation();
  return <span className="inline-flex whitespace-nowrap rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600">{t(taskTypeLabels[type])}</span>;
}

export function Tag({ children, tone = 'slate' }: { children: ReactNode; tone?: 'slate' | 'blue' | 'violet' | 'amber' | 'green' }) {
  const tones = { slate: 'bg-slate-100 text-slate-600', blue: 'bg-blue-50 text-blue-700', violet: 'bg-violet-50 text-violet-700', amber: 'bg-amber-50 text-amber-700', green: 'bg-emerald-50 text-emerald-700' };
  return <span className={cn('inline-flex rounded px-1.5 py-0.5 text-[11px] font-medium', tones[tone])}>{children}</span>;
}

export function Modal({ open, title, description, onClose, children, width = 'max-w-lg' }: { open: boolean; title: string; description?: string; onClose: () => void; children: ReactNode; width?: string }) {
  const { t } = useTranslation();
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title}>
      <button className="absolute inset-0 cursor-default bg-slate-950/35 backdrop-blur-[2px]" onClick={onClose} aria-label={t('关闭弹窗')} />
      <Card className={cn('relative z-10 max-h-[90vh] w-full overflow-y-auto shadow-2xl', width)}>
        <div className="flex items-start justify-between border-b px-5 py-4">
          <div><h2 className="text-lg font-semibold">{title}</h2>{description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}</div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label={t('关闭')}><X className="h-4 w-4" /></Button>
        </div>
        <div className="p-5">{children}</div>
      </Card>
    </div>
  );
}

export function EmptyState({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
  return <div className="flex flex-col items-center justify-center px-6 py-14 text-center"><div className="mb-3 text-slate-300">{icon}</div><h3 className="text-sm font-medium">{title}</h3><p className="mt-1 text-xs text-muted-foreground">{description}</p></div>;
}
