import { CalendarClock, Clock3, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ScheduleDefinition, ScheduleFrequency } from '@/types';

const updateNumber = (value: string, fallback: number) => value === '' ? fallback : Number(value);

export default function ScheduleEditor({ value, onChange }: { value: ScheduleDefinition; onChange: (schedule: ScheduleDefinition) => void }) {
  const { t } = useTranslation();
  const update = <K extends keyof ScheduleDefinition>(key: K, next: ScheduleDefinition[K]) => onChange({ ...value, [key]: next });
  const periodic = !['EVENT', 'STREAMING'].includes(value.frequency);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-xs font-medium">{t('调度归属')}
          <select className="field mt-1.5 w-full" value={value.mode} disabled={!periodic} onChange={(event) => update('mode', event.target.value as ScheduleDefinition['mode'])}>
            <option value="managed">{t('Task Hub 托管调度')}</option>
            <option value="mirrored">{t('引擎调度镜像')}</option>
          </select>
          <span className="mt-1 block text-[10px] font-normal text-muted-foreground">{t('参与强制依赖编排时建议使用托管调度')}</span>
        </label>
        <label className="text-xs font-medium">{t('执行频率')}
          <select className="field mt-1.5 w-full" value={value.frequency} onChange={(event) => {
            const frequency = event.target.value as ScheduleFrequency;
            onChange({
              ...value,
              frequency,
              mode: ['EVENT', 'STREAMING'].includes(frequency) ? 'mirrored' : value.mode,
              cronExpression: frequency === 'CRON' ? value.cronExpression ?? '0 2 * * *' : value.cronExpression,
              intervalMinutes: frequency === 'INTERVAL' ? value.intervalMinutes ?? 15 : value.intervalMinutes
            });
          }}>
            <option value="DAILY">{t('每天')}</option><option value="WEEKLY">{t('每周')}</option><option value="MONTHLY">{t('每月')}</option>
            <option value="INTERVAL">{t('固定间隔')}</option><option value="CRON">{t('Cron 表达式')}</option>
            <option value="EVENT">{t('仅依赖 / API 触发')}</option><option value="STREAMING">{t('持续流式执行')}</option>
          </select>
        </label>
      </div>

      {['DAILY', 'WEEKLY', 'MONTHLY'].includes(value.frequency) && <div className="grid gap-4 sm:grid-cols-2">
        {value.frequency === 'WEEKLY' && <label className="text-xs font-medium">{t('星期')}<select className="field mt-1.5 w-full" value={value.weekday ?? 1} onChange={(event) => update('weekday', Number(event.target.value))}>{['日', '一', '二', '三', '四', '五', '六'].map((day, index) => <option key={day} value={index}>{t('星期')}{t(day)}</option>)}</select></label>}
        {value.frequency === 'MONTHLY' && <label className="text-xs font-medium">{t('每月日期')}<input type="number" min="1" max="31" className="field mt-1.5 w-full" value={value.dayOfMonth ?? 1} onChange={(event) => update('dayOfMonth', updateNumber(event.target.value, 1))} /></label>}
        <label className="text-xs font-medium">{t('执行时间')}<input type="time" required className="field mt-1.5 w-full" value={value.timeOfDay ?? '02:00'} onChange={(event) => update('timeOfDay', event.target.value)} /></label>
      </div>}
      {value.frequency === 'INTERVAL' && <label className="block text-xs font-medium">{t('间隔分钟数')}<input type="number" min="1" required className="field mt-1.5 w-full" value={value.intervalMinutes ?? 15} onChange={(event) => update('intervalMinutes', updateNumber(event.target.value, 15))} /><span className="mt-1 block text-[10px] font-normal text-muted-foreground">{t('每个间隔生成独立窗口实例，不使用日锁去重')}</span></label>}
      {value.frequency === 'CRON' && <label className="block text-xs font-medium">{t('5 段 Cron 表达式')}<input required pattern="\S+\s+\S+\s+\S+\s+\S+\s+\S+" className="field mt-1.5 w-full font-mono" placeholder="0 2 * * *" value={value.cronExpression ?? ''} onChange={(event) => update('cronExpression', event.target.value)} /><span className="mt-1 block text-[10px] font-normal text-muted-foreground">{t('分 时 日 月 星期，例如 0 2 * * * 表示每天 02:00')}</span></label>}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-xs font-medium">{t('时区')}<select className="field mt-1.5 w-full" value={value.timezone} onChange={(event) => update('timezone', event.target.value)}><option>Asia/Shanghai</option><option>UTC</option><option>Asia/Tokyo</option><option>America/New_York</option></select></label>
        <label className="text-xs font-medium">{t('错过调度策略')}<select className="field mt-1.5 w-full" value={value.misfirePolicy} disabled={!periodic} onChange={(event) => update('misfirePolicy', event.target.value as ScheduleDefinition['misfirePolicy'])}><option value="catchup_window">{t('在宽限窗口内补跑')}</option><option value="fire_once">{t('恢复后立即执行一次')}</option><option value="skip">{t('跳过本次实例')}</option></select></label>
        <label className="text-xs font-medium">{t('调度宽限（分钟）')}<input type="number" min="0" className="field mt-1.5 w-full" value={value.graceMinutes} onChange={(event) => update('graceMinutes', updateNumber(event.target.value, 0))} /></label>
        <label className="text-xs font-medium">{t('依赖等待超时（分钟）')}<input type="number" min="1" className="field mt-1.5 w-full" value={value.dependencyWaitTimeoutMinutes} onChange={(event) => update('dependencyWaitTimeoutMinutes', updateNumber(event.target.value, 60))} /></label>
        <label className="text-xs font-medium">{t('资产新鲜度 SLA（分钟）')}<input type="number" min="1" className="field mt-1.5 w-full" value={value.freshnessSlaMinutes ?? ''} placeholder={t('不设置则 UNKNOWN')} onChange={(event) => update('freshnessSlaMinutes', event.target.value === '' ? undefined : Number(event.target.value))} /></label>
      </div>

      <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-[11px] leading-relaxed text-blue-700">
        <div className="mb-1 flex items-center gap-1.5 font-semibold"><Info className="h-4 w-4" />{t('实例生成规则')}</div>
        <div className="flex items-start gap-2"><CalendarClock className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span>{t('托管调度使用 scheduledFireTime 生成 instanceKey；窗口和 occurrence 区分同日多次执行。')}</span></div>
        <div className="mt-1 flex items-start gap-2"><Clock3 className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span>{t('processDate 按此处时区计算，依赖等待超过阈值后告警并 SKIPPED。')}</span></div>
      </div>
    </div>
  );
}
