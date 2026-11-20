import { defaultSchedule, defaultTaskCallback } from '@/lib/utils';
import type { AdapterHealth, AlertEvent, Asset, TaskDefinition, TaskDependency, TaskRun } from '@/types';

export const mockTasks: TaskDefinition[] = [
  {
    id: 'task-crm-collector', name: 'CRM Customer Full Collection', description: 'Sync customer master records and contact details from CRM Oracle to the raw customer topic.',
    type: 'collector_online', executionMode: 'SCHEDULED', engine: 'Doll Collector', engineRef: 'collector_model:crm_customer',
    schedule: defaultSchedule({ mode: 'mirrored', timeOfDay: '02:00' }), enabled: true, externalTrigger: { enabled: true }, callback: defaultTaskCallback(), owner: 'Lin Wang', tags: ['Core Pipeline', 'CRM'],
    lastStatus: 'SUCCESS', lastRunAt: '2026-11-03T02:03:42+08:00', successRate: 98.6, avgDurationMs: 222000,
    refs: [
      { id: 'st-crm', type: 'source_table', name: 'CRM.CUSTOMER', role: 'SOURCE', inferred: true },
      { id: 'topic-customer-raw', type: 'topic', name: 'customer_raw', role: 'TARGET', inferred: true }
    ]
  },
  {
    id: 'task-order-collector', name: 'Order Incremental Collection', description: 'Collect order and order line changes in 15-minute windows.',
    type: 'collector_online', executionMode: 'SCHEDULED', engine: 'Doll Collector', engineRef: 'collector_model:order_delta',
    schedule: defaultSchedule({ frequency: 'INTERVAL', intervalMinutes: 15 }), enabled: true, externalTrigger: { enabled: true }, callback: defaultTaskCallback(), owner: 'Chen Chen', tags: ['Core Pipeline', 'Orders'],
    lastStatus: 'RUNNING', lastRunAt: '2026-11-03T10:45:00+08:00', successRate: 99.2, avgDurationMs: 74000,
    refs: [
      { id: 'st-order', type: 'source_table', name: 'OMS.SALES_ORDER', role: 'SOURCE', inferred: true },
      { id: 'topic-order-raw', type: 'topic', name: 'order_delta', role: 'TARGET', inferred: true }
    ]
  },
  {
    id: 'task-retention-mat', name: 'Customer Retention Materialization', description: 'Build the 30-day customer retention metric after customer and behavior data are ready.',
    type: 'materialization', executionMode: 'SCHEDULED', engine: 'Metricflow', engineRef: 'materialization:retention_30d',
    schedule: defaultSchedule({ timeOfDay: '03:00' }), enabled: true, externalTrigger: { enabled: true }, callback: defaultTaskCallback(), owner: 'Yi Zhao', tags: ['Customer Analytics', 'Core Metrics'],
    lastStatus: 'WAITING', lastRunAt: '2026-11-03T03:00:00+08:00', successRate: 96.4, avgDurationMs: 318000,
    refs: [
      { id: 'topic-customer-raw', type: 'topic', name: 'customer_raw', role: 'SOURCE', inferred: true },
      { id: 'metric-retention', type: 'metric', name: 'retention_30d', role: 'TARGET', inferred: true }
    ]
  },
  {
    id: 'task-order-mat', name: 'Order Metrics Materialization', description: 'Calculate GMV, order count, and average order value for each window.',
    type: 'materialization', executionMode: 'SCHEDULED', engine: 'Metricflow', engineRef: 'materialization:order_metrics',
    schedule: defaultSchedule({ mode: 'mirrored', frequency: 'CRON', cronExpression: '10 * * * *' }), enabled: true, externalTrigger: { enabled: true }, callback: defaultTaskCallback(), owner: 'Yi Zhao', tags: ['Orders', 'Core Metrics'],
    lastStatus: 'SUCCESS', lastRunAt: '2026-11-03T10:12:18+08:00', successRate: 97.8, avgDurationMs: 138000,
    refs: [
      { id: 'topic-order-raw', type: 'topic', name: 'order_delta', role: 'SOURCE', inferred: true },
      { id: 'topic-order-metrics', type: 'topic', name: 'order_metrics_daily', role: 'TARGET', inferred: true }
    ]
  },
  {
    id: 'task-customer-flow', name: 'Customer Topic Compute Flow', description: 'Orchestrate customer profile, retention, and lifecycle segmentation materializations.',
    type: 'materialization_flow', executionMode: 'SCHEDULED', engine: 'Metricflow Flow', engineRef: 'flow:customer_analytics',
    schedule: defaultSchedule({ mode: 'mirrored', timeOfDay: '04:00' }), enabled: true, externalTrigger: { enabled: true }, callback: defaultTaskCallback(), owner: 'Ke Sun', tags: ['Customer Analytics', 'Flow'],
    lastStatus: 'SUCCESS', lastRunAt: '2026-11-03T04:08:31+08:00', successRate: 94.8, avgDurationMs: 511000,
    refs: [
      { id: 'metric-retention', type: 'metric', name: 'retention_30d', role: 'SOURCE', inferred: true },
      { id: 'topic-customer-profile', type: 'topic', name: 'customer_profile', role: 'TARGET', inferred: true }
    ]
  },
  {
    id: 'task-customer-dqc', name: 'Customer Quality Check', description: 'Check the completeness of customer primary keys and phone numbers with the DQC engine.',
    type: 'dqc_job', executionMode: 'EVENT', engine: 'DQC', engineRef: 'dqc_rule:customer_profile_quality',
    schedule: defaultSchedule({ mode: 'mirrored', frequency: 'EVENT', freshnessSlaMinutes: undefined }), enabled: true, externalTrigger: { enabled: true }, callback: defaultTaskCallback(), owner: 'Qi Zhou', tags: ['DQC', 'Quality'],
    lastStatus: 'FAILED', lastRunAt: '2026-11-03T04:16:03+08:00', successRate: 92.1, avgDurationMs: 45000,
    refs: [{ id: 'topic-customer-profile', type: 'topic', name: 'customer_profile', role: 'SOURCE', inferred: false }]
  },
  {
    id: 'task-customer-repair', name: 'Customer Quality Repair', description: 'Invoke the repair module when quality checks fail, using an explicit ON_FAILURE dependency.',
    type: 'custom', executionMode: 'EVENT', engine: 'Data Repair', engineRef: 'repair_job:customer_profile',
    schedule: defaultSchedule({ mode: 'mirrored', frequency: 'EVENT', freshnessSlaMinutes: undefined }), enabled: true, externalTrigger: { enabled: true }, callback: defaultTaskCallback(), owner: 'Qi Zhou', tags: ['Repair', 'Quality'],
    lastStatus: 'SKIPPED', lastRunAt: '2026-11-02T04:15:00+08:00', successRate: 100, avgDurationMs: 81000,
    refs: [{ id: 'topic-customer-profile', type: 'topic', name: 'customer_profile', role: 'TARGET', inferred: false }]
  },
  {
    id: 'task-kafka-orders', name: 'Kafka Order Event Ingestion', description: 'Mirrored Kafka Collector configuration; the current engine does not provide a unified run projection.',
    type: 'collector_batch', executionMode: 'STREAMING', engine: 'Kafka Collector', engineRef: 'kafka:orders-event',
    schedule: defaultSchedule({ mode: 'mirrored', frequency: 'STREAMING', freshnessSlaMinutes: undefined }), enabled: true, externalTrigger: { enabled: true }, callback: defaultTaskCallback(), owner: 'Chen Chen', tags: ['Kafka', 'Read Only'],
    lastStatus: 'STALE', successRate: undefined,
    projectionUnsupported: true, readOnly: true,
    refs: [{ id: 'topic-order-event', type: 'topic', name: 'order_event', role: 'TARGET', inferred: true }]
  },
  {
    id: 'task-customer-snapshot', name: 'Daily Customer Topic Snapshot', description: 'Retain T+1 snapshots of the customer topic for trend analysis and auditing.',
    type: 'pipeline_snapshot', executionMode: 'SCHEDULED', engine: 'Doll Snapshot', engineRef: 'snapshot:customer_daily',
    schedule: defaultSchedule({ mode: 'mirrored', timeOfDay: '05:00' }), enabled: true, externalTrigger: { enabled: true }, callback: defaultTaskCallback(), owner: 'Lin Wang', tags: ['Snapshots', 'Customer Analytics'],
    lastStatus: 'SUCCESS', lastRunAt: '2026-11-03T05:02:11+08:00', successRate: 99.8, avgDurationMs: 131000,
    refs: [
      { id: 'topic-customer-profile', type: 'topic', name: 'customer_profile', role: 'SOURCE', inferred: true },
      { id: 'topic-customer-snapshot', type: 'topic', name: 'customer_profile_snapshot', role: 'TARGET', inferred: true }
    ]
  },
  {
    id: 'task-order-pipeline', name: 'Order Event Standardization Pipeline', description: 'Standardize order data using event-driven processing; only activity status is shown in phase one.',
    type: 'pipeline_event', executionMode: 'STREAMING', engine: 'Doll Pipeline', engineRef: 'pipeline:order_standardize',
    schedule: defaultSchedule({ mode: 'mirrored', frequency: 'STREAMING', freshnessSlaMinutes: undefined }), enabled: true, externalTrigger: { enabled: true }, callback: defaultTaskCallback(), owner: 'Chen Chen', tags: ['Pipeline', 'Read Only'],
    lastStatus: 'RUNNING', readOnly: true,
    refs: [
      { id: 'topic-order-event', type: 'topic', name: 'order_event', role: 'SOURCE', inferred: true },
      { id: 'topic-order-raw', type: 'topic', name: 'order_delta', role: 'TARGET', inferred: true }
    ]
  }
];

export const mockDependencies: TaskDependency[] = [
  { id: 'dep-1', upstreamTaskId: 'task-crm-collector', downstreamTaskId: 'task-retention-mat', kind: 'inferred_data', status: 'ACCEPTED', enabled: true, condition: 'ON_SUCCESS', instancePolicy: 'LATEST_RUN', offsetDays: 0 },
  { id: 'dep-2', upstreamTaskId: 'task-order-collector', downstreamTaskId: 'task-order-mat', kind: 'explicit', status: 'ACCEPTED', enabled: true, condition: 'ON_SUCCESS', instancePolicy: 'SAME_WINDOW', offsetDays: 0 },
  { id: 'dep-3', upstreamTaskId: 'task-retention-mat', downstreamTaskId: 'task-customer-flow', kind: 'inferred_data', status: 'ACCEPTED', enabled: true, condition: 'ON_SUCCESS', instancePolicy: 'LATEST_RUN', offsetDays: 0 },
  { id: 'dep-4', upstreamTaskId: 'task-customer-dqc', downstreamTaskId: 'task-customer-repair', kind: 'explicit', status: 'ACCEPTED', enabled: true, condition: 'ON_FAILURE', instancePolicy: 'LATEST_RUN', offsetDays: 0 },
  { id: 'dep-5', upstreamTaskId: 'task-customer-flow', downstreamTaskId: 'task-customer-dqc', kind: 'explicit', status: 'ACCEPTED', enabled: true, condition: 'ON_SUCCESS', instancePolicy: 'LATEST_RUN', offsetDays: 0 },
  { id: 'dep-6', upstreamTaskId: 'task-customer-snapshot', downstreamTaskId: 'task-retention-mat', kind: 'inferred_data', status: 'PROPOSED', enabled: true, condition: 'ON_SUCCESS', instancePolicy: 'LATEST_RUN', offsetDays: 1 },
  { id: 'dep-7', upstreamTaskId: 'task-kafka-orders', downstreamTaskId: 'task-order-mat', kind: 'inferred_data', status: 'PROPOSED', enabled: true, condition: 'ON_FINISH', instancePolicy: 'LATEST_RUN', offsetDays: 0 },
  { id: 'dep-8', upstreamTaskId: 'task-customer-flow', downstreamTaskId: 'task-customer-snapshot', kind: 'inferred_data', status: 'ACCEPTED', enabled: true, condition: 'ON_SUCCESS', instancePolicy: 'LATEST_RUN', offsetDays: 0 }
];

const dep = (dependencyId: string, taskId: string, taskName: string, state: 'WAITING' | 'SATISFIED' | 'VIOLATED', condition = 'ON_SUCCESS', runId?: string) => ({ dependencyId, taskId, taskName, state, condition, runId });

export const mockRuns: TaskRun[] = [
  { id: 'run-10301', taskId: 'task-order-collector', instanceKey: 'window:2026-11-03T10:30/10:45', attempt: 0, processDate: '2026-11-03', status: 'RUNNING', triggerType: 'SCHEDULE', window: '10:30 → 10:45', startedAt: '2026-11-03T10:45:00+08:00', triggeredBy: 'taskhub-scheduler', engineRunKey: 'collector:evt-89301', dependencies: [] },
  { id: 'run-10302', taskId: 'task-retention-mat', instanceKey: 'schedule:2026-11-03T03:00+08:00', attempt: 0, processDate: '2026-11-03', status: 'WAITING', triggerType: 'SCHEDULE', window: '2026-11-03', startedAt: '2026-11-03T03:00:00+08:00', triggeredBy: 'taskhub-scheduler', engineRunKey: 'taskhub:run-10302', error: 'Waiting for the latest CRM Customer Full Collection instance to succeed', dependencies: [dep('dep-1', 'task-crm-collector', 'CRM Customer Full Collection', 'WAITING', 'ON_SUCCESS', 'run-10298')] },
  { id: 'run-10298', taskId: 'task-crm-collector', instanceKey: 'schedule:2026-11-03T02:00+08:00', attempt: 0, processDate: '2026-11-03', status: 'SUCCESS', triggerType: 'SCHEDULE', window: '2026-11-02 → 2026-11-03', startedAt: '2026-11-03T02:00:00+08:00', finishedAt: '2026-11-03T02:03:42+08:00', durationMs: 222000, rowCount: 128420, triggeredBy: 'engine-cron', engineRunKey: 'collector:evt-89288', dependencies: [] },
  { id: 'run-10297', taskId: 'task-order-mat', instanceKey: 'window:2026-11-03T09:00/10:00', attempt: 0, processDate: '2026-11-03', status: 'SUCCESS', triggerType: 'DEPENDENCY', window: '09:00 → 10:00', startedAt: '2026-11-03T10:10:00+08:00', finishedAt: '2026-11-03T10:12:18+08:00', durationMs: 138000, rowCount: 58402, triggeredBy: 'orchestrator', engineRunKey: 'metricflow:mr-7721', dependencies: [dep('dep-2', 'task-order-collector', 'Order Incremental Collection', 'SATISFIED', 'ON_SUCCESS', 'run-10290')] },
  { id: 'run-10296', taskId: 'task-customer-flow', instanceKey: 'schedule:2026-11-03T04:00+08:00', attempt: 0, processDate: '2026-11-03', status: 'SUCCESS', triggerType: 'DEPENDENCY', window: '2026-11-03', startedAt: '2026-11-03T04:00:00+08:00', finishedAt: '2026-11-03T04:08:31+08:00', durationMs: 511000, rowCount: 124830, triggeredBy: 'orchestrator', engineRunKey: 'metricflow:flow-run-441', dependencies: [dep('dep-3', 'task-retention-mat', 'Customer Retention Materialization', 'SATISFIED', 'ON_SUCCESS', 'run-10280')] },
  { id: 'run-10295', taskId: 'task-customer-dqc', instanceKey: 'schedule:2026-11-03T04:00+08:00', attempt: 0, processDate: '2026-11-03', status: 'FAILED', triggerType: 'DEPENDENCY', window: '2026-11-03', startedAt: '2026-11-03T04:15:21+08:00', finishedAt: '2026-11-03T04:16:03+08:00', durationMs: 42000, triggeredBy: 'orchestrator', engineRunKey: 'dqc:job-1192', error: 'Phone completeness is 96.8%, below the 99% threshold', dependencies: [dep('dep-5', 'task-customer-flow', 'Customer Topic Compute Flow', 'SATISFIED', 'ON_SUCCESS', 'run-10296')] },
  { id: 'run-10294', taskId: 'task-customer-repair', instanceKey: 'schedule:2026-11-02T04:00+08:00', attempt: 0, processDate: '2026-11-02', status: 'SKIPPED', triggerType: 'DEPENDENCY', window: '2026-11-02', startedAt: '2026-11-02T04:15:00+08:00', finishedAt: '2026-11-02T04:15:00+08:00', triggeredBy: 'orchestrator', engineRunKey: 'taskhub:run-10294', error: 'ON_FAILURE condition not met: the upstream quality check succeeded', dependencies: [dep('dep-4', 'task-customer-dqc', 'Customer Quality Check', 'VIOLATED', 'ON_FAILURE', 'run-10240')] },
  { id: 'run-10293', taskId: 'task-customer-snapshot', instanceKey: 'schedule:2026-11-03T05:00+08:00', attempt: 0, processDate: '2026-11-03', status: 'SUCCESS', triggerType: 'SCHEDULE', window: '2026-11-03', startedAt: '2026-11-03T05:00:00+08:00', finishedAt: '2026-11-03T05:02:11+08:00', durationMs: 131000, rowCount: 124830, triggeredBy: 'engine-cron', engineRunKey: 'snapshot:lock-551', dependencies: [] },
  { id: 'run-10292', taskId: 'task-crm-collector', instanceKey: 'schedule:2026-11-02T02:00+08:00', attempt: 1, processDate: '2026-11-02', status: 'SUCCESS', triggerType: 'MANUAL', window: '2026-11-01 → 2026-11-02', startedAt: '2026-11-02T03:18:00+08:00', finishedAt: '2026-11-02T03:21:48+08:00', durationMs: 228000, rowCount: 127903, triggeredBy: 'Lin Wang', engineRunKey: 'collector:evt-89102', dependencies: [] },
  { id: 'run-10291', taskId: 'task-crm-collector', instanceKey: 'schedule:2026-11-02T02:00+08:00', attempt: 0, processDate: '2026-11-02', status: 'FAILED', triggerType: 'SCHEDULE', window: '2026-11-01 → 2026-11-02', startedAt: '2026-11-02T02:00:00+08:00', finishedAt: '2026-11-02T02:01:12+08:00', durationMs: 72000, triggeredBy: 'engine-cron', engineRunKey: 'collector:evt-89088', error: 'ORA-12154: Timed out connecting to the CRM read-only database', dependencies: [] }
];

export const mockAssets: Asset[] = [
  { id: 'topic-customer-raw', name: 'customer_raw', type: 'topic', description: 'Raw customer topic for CRM master data', readiness: 'FRESH', builderTaskIds: ['task-crm-collector'], upstreamAssetIds: ['st-crm'], downstreamAssetIds: ['metric-retention'], lastBuiltAt: '2026-11-03T02:03:42+08:00', rowCount: 128420, owner: 'Lin Wang' },
  { id: 'metric-retention', name: 'retention_30d', type: 'metric', description: 'Core 30-day customer retention metric', readiness: 'STALE', builderTaskIds: ['task-retention-mat'], upstreamAssetIds: ['topic-customer-raw'], downstreamAssetIds: ['topic-customer-profile'], owner: 'Yi Zhao' },
  { id: 'topic-customer-profile', name: 'customer_profile', type: 'topic', description: 'Customer profile and lifecycle topic', readiness: 'FAILED', builderTaskIds: ['task-customer-flow', 'task-customer-repair'], upstreamAssetIds: ['metric-retention'], downstreamAssetIds: ['topic-customer-snapshot'], lastBuiltAt: '2026-11-03T04:08:31+08:00', rowCount: 124830, owner: 'Ke Sun' },
  { id: 'topic-order-metrics', name: 'order_metrics_daily', type: 'topic', description: 'Daily order metrics aggregate topic', readiness: 'FRESH', late: true, builderTaskIds: ['task-order-mat'], upstreamAssetIds: ['topic-order-raw'], downstreamAssetIds: [], lastBuiltAt: '2026-11-03T10:12:18+08:00', rowCount: 58402, owner: 'Yi Zhao' },
  { id: 'topic-customer-snapshot', name: 'customer_profile_snapshot', type: 'topic', description: 'Daily customer profile snapshot', readiness: 'FRESH', builderTaskIds: ['task-customer-snapshot'], upstreamAssetIds: ['topic-customer-profile'], downstreamAssetIds: ['metric-retention'], lastBuiltAt: '2026-11-03T05:02:11+08:00', rowCount: 124830, owner: 'Lin Wang' },
  { id: 'st-crm', name: 'CRM.CUSTOMER', type: 'source_table', description: 'CRM Oracle customer source table', readiness: 'UNKNOWN', builderTaskIds: [], upstreamAssetIds: [], downstreamAssetIds: ['topic-customer-raw'], owner: 'CRM System' }
];

export const mockAlerts: AlertEvent[] = [
  { id: 'alert-1', type: 'RUN_FAILED', title: 'Customer Quality Check Failed', taskId: 'task-customer-dqc', detail: 'Phone completeness is below the threshold; repair dependency evaluation has been triggered', createdAt: '2026-11-03T04:16:04+08:00', level: 'critical', status: 'SENT' },
  { id: 'alert-2', type: 'DEPENDENCY_WAITING', title: 'Customer Retention Materialization Wait Timed Out', taskId: 'task-retention-mat', detail: 'Waiting for more than 60 minutes · processDate=2026-11-03', createdAt: '2026-11-03T04:00:00+08:00', level: 'warning', status: 'SENT' },
  { id: 'alert-3', type: 'ADAPTER_UNSYNCED', title: 'Kafka Collector Projection Unavailable', taskId: 'task-kafka-orders', detail: 'The engine has no unified run API and has been marked PROJECTION_UNSUPPORTED', createdAt: '2026-11-03T03:45:00+08:00', level: 'info', status: 'SENT' }
];

export const mockAdapters: AdapterHealth[] = [
  { id: 'adapter-collector', name: 'collector-online', engine: 'Doll :8000', state: 'HEALTHY', lagSeconds: 12, lastSyncAt: '2026-11-03T10:45:12+08:00', taskCount: 2 },
  { id: 'adapter-metricflow', name: 'metricflow', engine: 'Metricflow :8910', state: 'HEALTHY', lagSeconds: 24, lastSyncAt: '2026-11-03T10:45:24+08:00', taskCount: 3 },
  { id: 'adapter-snapshot', name: 'pipeline-snapshot', engine: 'Doll :8000', state: 'HEALTHY', lagSeconds: 36, lastSyncAt: '2026-11-03T10:45:36+08:00', taskCount: 1 },
  { id: 'adapter-batch', name: 'collector-batch', engine: 'Kafka / Batch', state: 'UNSYNCED', lagSeconds: 0, lastSyncAt: '2026-11-03T10:40:00+08:00', taskCount: 1 }
];

export const successTrend = [
  { day: '10/28', rate: 96.2, runs: 142 }, { day: '10/29', rate: 97.1, runs: 148 },
  { day: '10/30', rate: 95.8, runs: 139 }, { day: '10/31', rate: 98.0, runs: 151 },
  { day: '11/01', rate: 97.4, runs: 146 }, { day: '11/02', rate: 98.1, runs: 156 },
  { day: '11/03', rate: 96.8, runs: 87 }
];
