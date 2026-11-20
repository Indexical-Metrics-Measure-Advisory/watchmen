import type { TaskTargetKind, TaskTargetOption, TaskType } from '@/model';
import { checkResponse, getDefaultHeaders, WATCHMEN_API_BASE_URL } from '@/utils/apiConfig';

type EntityRow = Record<string, any>;
type EntityPage = { data?: EntityRow[] };

const mockTargets: TaskTargetOption[] = [
  { id: 'module-crm', name: 'CRM', kind: 'collector_module' },
  { id: 'module-oms', name: 'Order Management', kind: 'collector_module' },
  { id: 'model-customer', name: 'Customer Master', kind: 'collector_model', description: 'CRM' },
  { id: 'model-order', name: 'Order Delta', kind: 'collector_model', description: 'Order Management' },
  { id: 'table-crm-customer', name: 'CRM.CUSTOMER', kind: 'collector_table', description: 'Customer Master' },
  { id: 'table-oms-order', name: 'OMS.SALES_ORDER', kind: 'collector_table', description: 'Order Delta' },
  { id: 'pipeline-order-standardize', name: 'Order Standardization', kind: 'pipeline' },
  { id: 'pipeline-customer-profile', name: 'Customer Profile', kind: 'pipeline' },
  { id: 'mat-retention-30d', name: '30-Day Customer Retention', kind: 'materialization' },
  { id: 'mat-order-metrics', name: 'Daily Order Metrics', kind: 'materialization' },
  { id: 'flow-customer-analytics', name: 'Customer Analytics Flow', kind: 'materialization_flow' },
  { id: 'snapshot-customer-daily', name: 'Daily Customer Snapshot', kind: 'topic_snapshot_scheduler' },
  { id: 'snapshot-order-daily', name: 'Daily Order Snapshot', kind: 'topic_snapshot_scheduler' },
  { id: 'rule-customer-completeness', name: 'Customer Completeness', kind: 'dqc_monitor_rule' },
  { id: 'rule-order-referential', name: 'Order Referential Integrity', kind: 'dqc_monitor_rule' }
];

const requestWatchmen = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  const response = await fetch(`${WATCHMEN_API_BASE_URL}${path}`, {
    ...init,
    headers: { ...getDefaultHeaders(), ...init.headers }
  });
  return checkResponse(response) as Promise<T>;
};
const post = <T>(path: string, body: unknown) => requestWatchmen<T>(path, { method: 'POST', body: JSON.stringify(body) });
const rows = (response: EntityRow[] | EntityPage): EntityRow[] => Array.isArray(response) ? response : response.data ?? [];
const pageable = { pageNumber: 1, pageSize: 200 };
const option = (kind: TaskTargetKind, row: EntityRow, id: string, name: string, description?: string): TaskTargetOption => ({
  id: String(row[id]), name: String(row[name] ?? row[id]), kind, description
});

const loadRestTargets = async (kind: TaskTargetKind): Promise<TaskTargetOption[]> => {
  switch (kind) {
    case 'collector_module':
      return rows(await post<EntityPage>('/collector/module/config/search', { conditions: {}, pageable }))
        .map((row) => option(kind, row, 'moduleId', 'moduleName'));
    case 'collector_model':
      return rows(await post<EntityPage>('/collector/model/config/name?query_name=', pageable))
        .map((row) => option(kind, row, 'modelId', 'modelName', row.rawTopicCode));
    case 'collector_table':
      return rows(await post<EntityPage>('/collector/table/config/name?query_name=', pageable))
        .map((row) => option(kind, row, 'configId', 'name', row.tableName));
    case 'pipeline':
      return rows(await requestWatchmen<EntityRow[]>('/pipeline/all'))
        .map((row) => option(kind, row, 'pipelineId', 'name', row.topicId));
    case 'materialization':
      return rows(await post<EntityPage>('/metricflow/materialization/page', pageable))
        .map((row) => option(kind, row, 'materializationId', 'name', row.metricName));
    case 'materialization_flow':
      return rows(await requestWatchmen<EntityRow[]>('/metricflow/materialization/flow/all'))
        .map((row) => option(kind, row, 'flowId', 'name', row.description));
    case 'topic_snapshot_scheduler':
      return rows(await post<EntityPage>('/topic/snapshot/scheduler/list', pageable))
        .map((row) => option(kind, row, 'schedulerId', 'targetTopicName', row.frequency));
    case 'dqc_monitor_rule':
      return rows(await requestWatchmen<EntityRow[]>('/dqc/monitor/rules?grade=GLOBAL'))
        .map((row) => option(kind, row, 'ruleId', 'code', row.severity));
    case 'custom_entity':
      return [];
  }
};

const targetCache = new Map<string, { expiresAt: number; request: Promise<TaskTargetOption[]> }>();

export const taskTargetService = {
  async listTargets(taskType: TaskType, kind: TaskTargetKind): Promise<TaskTargetOption[]> {
    const key = `${taskType}:${kind}`;
    const cached = targetCache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.request;
    const request = import.meta.env.VITE_TASKHUB_DATA_SOURCE === 'rest'
      ? loadRestTargets(kind)
      : Promise.resolve(mockTargets.filter((target) => target.kind === kind));
    targetCache.set(key, { request, expiresAt: Date.now() + 60_000 });
    try {
      return await request;
    } catch (reason) {
      targetCache.delete(key);
      throw reason;
    }
  }
};
