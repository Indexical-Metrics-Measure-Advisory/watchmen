import { useTranslation } from 'react-i18next';
import type { RunStatus, TaskCallbackConfig, TaskIntegrationInput } from '@/model';

const lifecycleEvents: RunStatus[] = ['WAITING', 'PENDING', 'RUNNING', 'SUCCESS', 'FAILED', 'CANCELLED', 'SKIPPED', 'STALE'];

export default function TaskIntegrationEditor({ value, onChange }: {
  value: TaskIntegrationInput;
  onChange: (value: TaskIntegrationInput) => void;
}) {
  const { t } = useTranslation();
  const updateCallback = (patch: Partial<TaskCallbackConfig>) => onChange({
    ...value,
    callback: { ...value.callback, ...patch }
  });

  return (
    <div className="space-y-4">
      <label className="flex items-start gap-3 rounded-lg border p-3">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 accent-blue-600"
          checked={value.externalTrigger.enabled}
          onChange={(event) => onChange({ ...value, externalTrigger: { enabled: event.target.checked } })}
        />
        <span><span className="block text-xs font-medium">{t('允许外部系统触发')}</span><span className="mt-1 block text-[11px] leading-relaxed text-muted-foreground">{t('外部系统使用 PAT 和 Idempotency-Key 调用统一触发 API；关闭后仅拒绝 API 触发。')}</span></span>
      </label>
      <label className="flex items-center gap-2 text-xs font-medium"><input type="checkbox" className="h-4 w-4 accent-blue-600" checked={value.callback.enabled} onChange={(event) => updateCallback({ enabled: event.target.checked })} />{t('外部触发后通知调用方')}</label>
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_140px]">
        <label className="block text-xs font-medium">{t('Callback URL')}<input type="url" required={value.callback.enabled} disabled={!value.callback.enabled} className="field mt-1.5 w-full disabled:bg-slate-50" placeholder="https://example.com/watchmen/callback" value={value.callback.url} onChange={(event) => updateCallback({ url: event.target.value })} /></label>
        <label className="block text-xs font-medium">{t('回调超时（秒）')}<input type="number" min={1} max={60} disabled={!value.callback.enabled} className="field mt-1.5 w-full disabled:bg-slate-50" value={value.callback.timeoutSeconds} onChange={(event) => updateCallback({ timeoutSeconds: Number(event.target.value) })} /></label>
      </div>
      <fieldset disabled={!value.callback.enabled} className="rounded-lg border p-3 disabled:opacity-50">
        <legend className="px-1 text-xs font-medium">{t('生命周期通知事件')}</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{lifecycleEvents.map((event) => <label key={event} className="flex items-center gap-2 text-[11px]"><input type="checkbox" className="h-3.5 w-3.5 accent-blue-600" checked={value.callback.events.includes(event)} onChange={(change) => updateCallback({ events: change.target.checked ? [...value.callback.events, event] : value.callback.events.filter((item) => item !== event) })} />{event}</label>)}</div>
      </fieldset>
      <p className="text-[11px] leading-relaxed text-muted-foreground">{t('仅对外部 API 触发的新实例发送回调；通知包含 runId、instanceKey、attempt、状态和结果引用。通知失败不会改变运行状态。')}</p>
    </div>
  );
}
