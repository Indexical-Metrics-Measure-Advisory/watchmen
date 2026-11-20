import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import i18n from '@/i18n';
import type { ScheduleDefinition, TaskCallbackConfig } from '@/types';

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

export const formatDuration = (ms?: number) => {
  if (ms === undefined) return '—';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s`;
};

export const formatRows = (value?: number) => {
  if (value === undefined) return '—';
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toLocaleString();
};

export const shortTime = (value?: string) => value?.slice(11, 16) ?? '—';

export const defaultSchedule = (overrides: Partial<ScheduleDefinition> = {}): ScheduleDefinition => ({
  mode: 'managed',
  frequency: 'DAILY',
  timeOfDay: '02:00',
  timezone: 'Asia/Shanghai',
  misfirePolicy: 'catchup_window',
  graceMinutes: 30,
  dependencyWaitTimeoutMinutes: 60,
  freshnessSlaMinutes: 60,
  ...overrides
});

export const defaultTaskCallback = (): TaskCallbackConfig => ({
  enabled: false,
  url: '',
  events: ['RUNNING', 'SUCCESS', 'FAILED', 'CANCELLED', 'SKIPPED', 'STALE'],
  timeoutSeconds: 5
});

export const formatSchedule = (schedule: ScheduleDefinition) => {
  const suffix = schedule.mode === 'managed' ? i18n.t(' · managed') : '';
  switch (schedule.frequency) {
    case 'DAILY': return i18n.t('每天 {{time}}{{suffix}}', { time: schedule.timeOfDay, suffix });
    case 'WEEKLY': return i18n.t('每周{{day}} {{time}}{{suffix}}', { day: i18n.t(['日', '一', '二', '三', '四', '五', '六'][schedule.weekday ?? 1]), time: schedule.timeOfDay, suffix });
    case 'MONTHLY': return i18n.t('每月 {{day}} 日 {{time}}{{suffix}}', { day: schedule.dayOfMonth ?? 1, time: schedule.timeOfDay, suffix });
    case 'INTERVAL': return i18n.t('每 {{minutes}} 分钟{{suffix}}', { minutes: schedule.intervalMinutes, suffix });
    case 'CRON': return `${schedule.cronExpression}${suffix}`;
    case 'EVENT': return i18n.t('依赖 / API 触发');
    case 'STREAMING': return i18n.t('持续流式执行');
  }
};
