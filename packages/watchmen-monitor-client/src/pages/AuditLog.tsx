import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { StatusPill } from '@/components/monitor/StatusPill';
import { MonoText, EmptyState, ErrorBanner, CopyButton } from '@/components/monitor/common';
import { useAuditLogs, useAuditAccounts } from '@/hooks/useMonitorQueries';
import { formatDateTime } from '@/i18n/utils/format';
import type { AuditLogCriteria, AuditLogItem, AuditOperationType } from '@/services/auditService';
import { AUDIT_OPERATION_TYPES } from '@/services/auditService';
import type { Tone } from '@/utils/monitorConstants';

const PAGE_SIZE = 20;

/** Resource types derived by the backend recorder (audit_recorder.ask_resource). */
const AUDIT_RESOURCES: ReadonlyArray<string> = [
  'topic',
  'pipeline',
  'datasource',
  'user',
  'user-group',
  'space',
  'dashboard',
  'report',
  'subject',
  'tag',
  'tenant',
  'pat',
  'lineage',
  'enumeration',
  'plugin',
  'external-writer',
];

const operationTypeTone = (type?: string): Tone =>
  type === 'config-edit'
    ? 'warning'
    : type === 'login' || type === 'logout'
      ? 'neutral'
      : type === 'query'
        ? 'info'
        : 'success';

const successTone = (success?: boolean): Tone => (success ? 'success' : 'error');

/** Translate a known resource type, fall back to the raw value for unknown ones. */
const resourceLabel = (resource: string, t: (k: string) => string): string =>
  AUDIT_RESOURCES.includes(resource) ? t(`audit:resources.${resource}`) : resource;

const AuditLog: React.FC = () => {
  const { t } = useTranslation(['audit', 'common']);

  const [account, setAccount] = React.useState<string>('all');
  const [operationType, setOperationType] = React.useState<string>('all');
  const [resource, setResource] = React.useState<string>('all');
  const [success, setSuccess] = React.useState<string>('all');
  const [keyword, setKeyword] = React.useState('');
  const [start, setStart] = React.useState('');
  const [end, setEnd] = React.useState('');
  const [pageNumber, setPageNumber] = React.useState(1);
  const [selected, setSelected] = React.useState<AuditLogItem | null>(null);

  const criteria: AuditLogCriteria = React.useMemo(() => {
    // datetime-local inputs already carry naive local time, which matches the
    // naive timestamps the backend stores and renders — do not convert to UTC
    return {
      pageNumber,
      pageSize: PAGE_SIZE,
      accounts: account !== 'all' ? [account] : undefined,
      operationTypes: operationType !== 'all' ? [operationType] : undefined,
      resources: resource !== 'all' ? [resource] : undefined,
      success: success === 'all' ? null : success === 'success',
      keyword: keyword.trim() || undefined,
      start: start || null,
      end: end || null,
    };
  }, [pageNumber, account, operationType, resource, success, keyword, start, end]);

  const logsQ = useAuditLogs(criteria);
  const accountsQ = useAuditAccounts();

  const accounts = React.useMemo(() => {
    const set = new Set(accountsQ.data ?? []);
    if (account !== 'all') set.add(account);
    return Array.from(set).sort();
  }, [accountsQ.data, account]);

  const rows = logsQ.data?.data ?? [];
  const itemCount = logsQ.data?.itemCount ?? logsQ.data?.total ?? 0;
  const pageCount = Math.max(1, logsQ.data?.pageCount ?? Math.ceil(itemCount / PAGE_SIZE));

  const hasFilters =
    account !== 'all' || operationType !== 'all' || resource !== 'all' || success !== 'all' || keyword !== '' || start !== '' || end !== '';

  const resetFilters = () => {
    setAccount('all');
    setOperationType('all');
    setResource('all');
    setSuccess('all');
    setKeyword('');
    setStart('');
    setEnd('');
    setPageNumber(1);
  };

  return (
    <div className="space-y-4">
      {/* Filter bar: account / operation type / result / keyword / time range */}
      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">{t('audit:filters.account')}</label>
            <Select
              value={account}
              onValueChange={(v) => {
                setAccount(v);
                setPageNumber(1);
              }}
            >
              <SelectTrigger className="h-9 w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common:all')}</SelectItem>
                {accounts.map((name) => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">{t('audit:filters.operationType')}</label>
            <Select
              value={operationType}
              onValueChange={(v) => {
                setOperationType(v);
                setPageNumber(1);
              }}
            >
              <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common:all')}</SelectItem>
                {AUDIT_OPERATION_TYPES.map((tp) => (
                  <SelectItem key={tp} value={tp}>{t(`audit:operationTypes.${tp}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">{t('audit:filters.resource')}</label>
            <Select
              value={resource}
              onValueChange={(v) => {
                setResource(v);
                setPageNumber(1);
              }}
            >
              <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common:all')}</SelectItem>
                {AUDIT_RESOURCES.map((r) => (
                  <SelectItem key={r} value={r}>{resourceLabel(r, t)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">{t('audit:filters.result')}</label>
            <Select
              value={success}
              onValueChange={(v) => {
                setSuccess(v);
                setPageNumber(1);
              }}
            >
              <SelectTrigger className="h-9 w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common:all')}</SelectItem>
                <SelectItem value="success">{t('audit:result.success')}</SelectItem>
                <SelectItem value="fail">{t('audit:result.fail')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">{t('audit:filters.keyword')}</label>
            <Input
              className="h-9 w-56"
              value={keyword}
              onChange={(e) => {
                setKeyword(e.target.value);
                setPageNumber(1);
              }}
              placeholder={t('audit:filters.keywordPlaceholder')}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">{t('audit:filters.start')}</label>
            <Input
              type="datetime-local"
              className="h-9 w-56"
              value={start}
              onChange={(e) => {
                setStart(e.target.value);
                setPageNumber(1);
              }}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">{t('audit:filters.end')}</label>
            <Input
              type="datetime-local"
              className="h-9 w-56"
              value={end}
              onChange={(e) => {
                setEnd(e.target.value);
                setPageNumber(1);
              }}
            />
          </div>
          <Button variant="outline" size="sm" className="h-9" onClick={() => logsQ.refetch()}>
            {t('common:refresh')}
          </Button>
          {hasFilters && (
            <Button variant="ghost" size="sm" className="h-9" onClick={resetFilters}>
              {t('common:cancel')}
            </Button>
          )}
        </div>
      </Card>

      {/* Audit log table */}
      <Card className="p-0">
        {logsQ.error ? (
          <div className="p-4"><ErrorBanner message={String(logsQ.error)} onRetry={() => logsQ.refetch()} /></div>
        ) : logsQ.isLoading ? (
          <div className="space-y-2 p-3">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState title={t('audit:empty')} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-44">{t('common:time')}</TableHead>
                <TableHead className="w-36">{t('audit:filters.account')}</TableHead>
                <TableHead className="w-32">{t('audit:filters.operationType')}</TableHead>
                <TableHead className="w-28">{t('audit:filters.resource')}</TableHead>
                <TableHead>{t('audit:columns.operation')}</TableHead>
                <TableHead className="w-24">{t('audit:columns.result')}</TableHead>
                <TableHead className="w-24 text-right">{t('common:duration')}</TableHead>
                <TableHead className="w-32">{t('audit:columns.clientIp')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((log) => (
                <TableRow
                  key={log.auditId}
                  className="cursor-pointer"
                  onClick={() => setSelected(log)}
                >
                  <TableCell className="whitespace-nowrap tabular-nums">
                    {formatDateTime(log.occurredAt)}
                  </TableCell>
                  <TableCell>
                    {log.userName
                      ? <span className="text-sm font-medium">{log.userName}</span>
                      : <span className="text-xs italic text-muted-foreground">{t('audit:unknownAccount')}</span>}
                  </TableCell>
                  <TableCell>
                    <StatusPill
                      tone={operationTypeTone(log.operationType)}
                      label={log.operationType
                        ? t(`audit:operationTypes.${log.operationType}`)
                        : '-'}
                    />
                  </TableCell>
                  <TableCell>
                    {log.resource
                      ? <Badge variant="outline" className="font-normal">{resourceLabel(log.resource, t)}</Badge>
                      : <span className="text-xs text-muted-foreground">-</span>}
                  </TableCell>
                  <TableCell>
                    <div className="flex min-w-0 items-center gap-2">
                      {log.method && (
                        <span className="shrink-0 rounded bg-muted px-1.5 py-0 font-mono text-[10px] font-semibold">
                          {log.method}
                        </span>
                      )}
                      <div className="min-w-0">
                        <MonoText className="block max-w-[420px] truncate text-xs" >
                          {log.path}
                          {log.queryString ? `?${log.queryString}` : ''}
                        </MonoText>
                        {log.detail && (
                          <span className="block max-w-[420px] truncate text-xs text-muted-foreground" title={log.detail}>
                            {log.detail}
                          </span>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusPill
                      tone={successTone(log.success)}
                      label={log.success ? t('audit:result.success') : t('audit:result.fail')}
                    />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {log.durationMs != null ? `${log.durationMs} ms` : '-'}
                  </TableCell>
                  <TableCell><MonoText className="text-xs">{log.clientIp ?? '-'}</MonoText></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {/* Pagination */}
        <div className="flex items-center justify-between border-t px-4 py-2 text-xs text-muted-foreground">
          <span className="tabular-nums">{t('audit:totalRecords', { count: itemCount })} · {pageNumber} / {pageCount}</span>
          <div className="flex gap-1">
            <Button size="sm" variant="outline" disabled={pageNumber <= 1}
              onClick={() => setPageNumber((p) => p - 1)}>{t('common:previous')}</Button>
            <Button size="sm" variant="outline" disabled={pageNumber >= pageCount}
              onClick={() => setPageNumber((p) => p + 1)}>{t('common:next')}</Button>
          </div>
        </div>
      </Card>

      {/* Detail dialog */}
      <Dialog open={selected != null} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{t('audit:detail.title')}</DialogTitle>
            <DialogDescription>
              {selected && formatDateTime(selected.occurredAt)}
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <DetailRow label={t('audit:filters.account')}>
                {selected.userName ?? t('audit:unknownAccount')}
              </DetailRow>
              <DetailRow label={t('audit:filters.operationType')}>
                {selected.operationType
                  ? t(`audit:operationTypes.${selected.operationType}`)
                  : '-'}
              </DetailRow>
              <DetailRow label={t('audit:filters.resource')}>
                {selected.resource ? resourceLabel(selected.resource, t) : '-'}
              </DetailRow>
              <DetailRow label={t('audit:columns.operation')} full>
                <span className="flex items-center gap-2">
                  {selected.method && (
                    <span
                      className={`rounded border px-1.5 py-0 font-mono text-[10px] font-semibold ${
                        selected.method === 'GET'
                          ? 'border-blue-200 bg-blue-50 text-blue-700'
                          : 'border-amber-200 bg-amber-50 text-amber-700'
                      }`}
                    >
                      {selected.method}
                    </span>
                  )}
                  <MonoText className="break-all">{selected.path}</MonoText>
                  <CopyButton text={selected.path ?? ''} />
                </span>
              </DetailRow>
              {selected.queryString && (
                <DetailRow label="Query String" full>
                  <MonoText className="break-all">{selected.queryString}</MonoText>
                </DetailRow>
              )}
              {selected.detail && (
                <DetailRow label={t('audit:columns.detail')} full>
                  <MonoText className="break-all">{selected.detail}</MonoText>
                </DetailRow>
              )}
              <DetailRow label={t('audit:columns.result')}>
                <StatusPill
                  tone={successTone(selected.success)}
                  label={selected.success ? t('audit:result.success') : t('audit:result.fail')}
                />
              </DetailRow>
              <DetailRow label={t('common:duration')}>
                {selected.durationMs != null ? `${selected.durationMs} ms` : '-'}
              </DetailRow>
              <DetailRow label={t('audit:columns.clientIp')}>
                <MonoText>{selected.clientIp ?? '-'}</MonoText>
              </DetailRow>
              <DetailRow label={t('audit:detail.tenant')}>
                <MonoText>{selected.tenantId ?? '-'}</MonoText>
              </DetailRow>
              <DetailRow label={t('audit:detail.userId')} full>
                <MonoText>{selected.userId ?? '-'}</MonoText>
              </DetailRow>
              {selected.userAgent && (
                <DetailRow label="User-Agent" full>
                  <span className="break-all text-xs text-muted-foreground">{selected.userAgent}</span>
                </DetailRow>
              )}
              <DetailRow label={t('audit:detail.auditId')} full>
                <MonoText>{selected.auditId}</MonoText>
              </DetailRow>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const DetailRow: React.FC<{
  label: string;
  full?: boolean;
  children: React.ReactNode;
}> = ({ label, full, children }) => (
  <div className={full ? 'col-span-2' : undefined}>
    <p className="text-xs font-medium text-muted-foreground">{label}</p>
    <p className="mt-0.5 text-sm text-foreground">{children}</p>
  </div>
);

export default AuditLog;
