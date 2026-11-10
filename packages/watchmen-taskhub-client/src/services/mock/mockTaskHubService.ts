import { mockAdapters, mockAlerts, mockAssets, mockDependencies, mockRuns, mockTasks, successTrend } from '@/data/mock';
import i18n from '@/i18n';
import type {
  NewDependencyInput, NewTaskInput, RunTaskInput, ScheduleDefinition, TaskDefinition, TaskHubSnapshot, TaskRun, TimelineRow
} from '@/model';
import type { TaskHubService } from '../taskHubService';

const timeline: TimelineRow[] = [
  { taskId: 'task-crm-collector', start: 2, duration: 0.12, actualStart: 2, actualDuration: 0.06, status: 'SUCCESS', label: '02:00' },
  { taskId: 'task-order-collector', start: 10.5, duration: 0.25, actualStart: 10.75, actualDuration: 0.25, status: 'RUNNING', label: 'Every 15 minutes' },
  { taskId: 'task-retention-mat', start: 3, duration: 0.15, actualStart: 3, actualDuration: 7.75, status: 'WAITING', label: '03:00', risk: true },
  { taskId: 'task-order-mat', start: 10.16, duration: 0.08, actualStart: 10.16, actualDuration: 0.04, status: 'SUCCESS', label: 'At minute 10 every hour' },
  { taskId: 'task-customer-flow', start: 4, duration: 0.2, actualStart: 4, actualDuration: 0.14, status: 'SUCCESS', label: '04:00' },
  { taskId: 'task-customer-dqc', start: 4.2, duration: 0.05, actualStart: 4.25, actualDuration: 0.01, status: 'FAILED', label: 'Dependency triggered' },
  { taskId: 'task-customer-snapshot', start: 5, duration: 0.1, actualStart: 5, actualDuration: 0.04, status: 'SUCCESS', label: '05:00' },
  { taskId: 'task-customer-repair', start: 4.3, duration: 0.08, actualStart: 4.3, actualDuration: 0.08, status: 'SKIPPED', label: 'ON_FAILURE' }
];

const clone = <T>(value: T): T => structuredClone(value);
let snapshot: TaskHubSnapshot = {
  tasks: clone(mockTasks),
  runs: clone(mockRuns).map((run, index) => ({
    ...run,
    claimedBy: `taskhub-0${(index % 3) + 1}`,
    lockExpiresAt: run.status === 'RUNNING' || run.status === 'WAITING' ? '2026-11-03T10:50:00+08:00' : undefined,
    idempotencyKey: `mock-request-${run.id}`
  })),
  dependencies: clone(mockDependencies),
  assets: clone(mockAssets),
  alerts: clone(mockAlerts),
  adapters: clone(mockAdapters),
  successTrend: clone(successTrend),
  timeline,
  cluster: {
    nodes: [
      { id: 'taskhub-01', address: '10.42.1.11:8820', status: 'HEALTHY', lastHeartbeatAt: '2026-11-03T10:45:32+08:00', activeRuns: 1, claimedLocks: 3 },
      { id: 'taskhub-02', address: '10.42.1.12:8820', status: 'HEALTHY', lastHeartbeatAt: '2026-11-03T10:45:34+08:00', activeRuns: 0, claimedLocks: 2 },
      { id: 'taskhub-03', address: '10.42.1.13:8820', status: 'HEALTHY', lastHeartbeatAt: '2026-11-03T10:45:35+08:00', activeRuns: 1, claimedLocks: 2 }
    ],
    sharedStoreStatus: 'CONNECTED',
    schedulerHeartbeatAt: '2026-11-03T10:45:35+08:00',
    activeLocks: 7,
    rejectedDuplicateDispatches: 12,
    failovers24h: 1
  }
};
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());
const executionMode = (schedule: ScheduleDefinition) => schedule.frequency === 'EVENT' ? 'EVENT' : schedule.frequency === 'STREAMING' ? 'STREAMING' : 'SCHEDULED';

export const mockTaskHubService: TaskHubService = {
  async load() {
    return clone(snapshot);
  },

  async createTask(input: NewTaskInput) {
    const id = `task-custom-${Date.now()}`;
    const task: TaskDefinition = {
      id,
      name: input.name,
      description: input.description || 'New data build or processing task.',
      type: input.type,
      executionMode: executionMode(input.schedule),
      engine: input.engine,
      engineRef: input.engineRef,
      targetKind: input.targetKind,
      targetName: input.targetName,
      schedule: input.schedule,
      externalTrigger: clone(input.externalTrigger),
      callback: clone(input.callback),
      enabled: true,
      owner: input.owner,
      tags: ['New'],
      lastStatus: 'PENDING',
      refs: []
    };
    snapshot.tasks = [...snapshot.tasks, task];
    emit();
    return clone(task);
  },

  async updateDefinition(taskId, input) {
    const task = snapshot.tasks.find((item) => item.id === taskId);
    if (!task) throw new Error(i18n.t('任务不存在'));
    Object.assign(task, {
      name: input.name,
      description: input.description,
      owner: input.owner,
      type: input.type,
      engine: input.engine,
      engineRef: input.engineRef,
      targetKind: input.targetKind,
      targetName: input.targetName,
      executionMode: executionMode(input.schedule)
    });
    emit();
    return clone(task);
  },

  async setTaskEnabled(taskId, enabled) {
    const task = snapshot.tasks.find((item) => item.id === taskId);
    if (!task) throw new Error(i18n.t('任务不存在'));
    task.enabled = enabled;
    emit();
    return clone(task);
  },

  async updateSchedule(taskId, schedule) {
    const task = snapshot.tasks.find((item) => item.id === taskId);
    if (!task) throw new Error(i18n.t('任务不存在'));
    task.schedule = clone(schedule);
    task.executionMode = executionMode(schedule);
    emit();
    return clone(task);
  },

  async updateIntegration(taskId, input) {
    const task = snapshot.tasks.find((item) => item.id === taskId);
    if (!task) throw new Error(i18n.t('任务不存在'));
    task.externalTrigger = clone(input.externalTrigger);
    task.callback = clone(input.callback);
    emit();
    return clone(task);
  },

  async runTask(taskId, input: RunTaskInput) {
    const task = snapshot.tasks.find((item) => item.id === taskId);
    if (!task || task.readOnly) throw new Error(i18n.t('任务不存在'));
    const runId = `run-mock-${Date.now()}`;
    const startedAt = new Date().toISOString();
    const newRun: TaskRun = {
      id: runId,
      taskId,
      instanceKey: `day:${input.processDate}`,
      attempt: snapshot.runs.filter((run) => run.taskId === taskId && run.instanceKey === `day:${input.processDate}`).length,
      processDate: input.processDate,
      status: 'RUNNING',
      triggerType: 'MANUAL',
      window: 'Manually triggered window',
      startedAt,
      triggeredBy: 'Demo Admin',
      engineRunKey: `taskhub:${runId}`,
      claimedBy: 'taskhub-02',
      lockExpiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      idempotencyKey: `mock-request-${runId}`,
      dependencies: []
    };
    snapshot.runs = [newRun, ...snapshot.runs];
    task.lastStatus = 'RUNNING';
    task.lastRunAt = startedAt;
    emit();
    window.setTimeout(() => {
      const run = snapshot.runs.find((item) => item.id === runId);
      if (!run) return;
      run.status = 'SUCCESS';
      run.finishedAt = new Date().toISOString();
      run.durationMs = 1800;
      run.rowCount = 1024;
      run.engineRunKey = `mock-engine:${runId}`;
      task.lastStatus = 'SUCCESS';
      task.lastRunAt = run.finishedAt;
      emit();
    }, 1800);
    return clone(newRun);
  },

  async createDependency(input: NewDependencyInput) {
    if (input.upstreamTaskId === input.downstreamTaskId) throw new Error(i18n.t('上游和下游不能是同一个任务'));
    if (snapshot.dependencies.some((item) => item.upstreamTaskId === input.upstreamTaskId && item.downstreamTaskId === input.downstreamTaskId && item.status !== 'REJECTED')) {
      throw new Error(i18n.t('这两个任务之间已存在依赖'));
    }
    const reaches = (start: string, target: string, visited = new Set<string>()): boolean => {
      if (start === target) return true;
      if (visited.has(start)) return false;
      visited.add(start);
      return snapshot.dependencies
        .filter((item) => item.upstreamTaskId === start && item.status === 'ACCEPTED' && item.enabled)
        .some((item) => reaches(item.downstreamTaskId, target, visited));
    };
    if (reaches(input.downstreamTaskId, input.upstreamTaskId)) throw new Error(i18n.t('保存失败：该边会形成依赖环'));
    const dependency = {
      ...input,
      id: `dep-mock-${Date.now()}`,
      kind: 'explicit' as const,
      status: 'ACCEPTED' as const,
      enabled: true,
      offsetDays: 0
    };
    snapshot.dependencies = [...snapshot.dependencies, dependency];
    emit();
    return clone(dependency);
  },

  async adoptDependency(dependencyId) {
    const dependency = snapshot.dependencies.find((item) => item.id === dependencyId);
    if (!dependency) throw new Error(i18n.t('依赖不存在'));
    dependency.status = 'ACCEPTED';
    dependency.enabled = true;
    emit();
    return clone(dependency);
  },

  async rejectDependency(dependencyId) {
    const dependency = snapshot.dependencies.find((item) => item.id === dependencyId);
    if (!dependency) throw new Error(i18n.t('依赖不存在'));
    dependency.status = 'REJECTED';
    dependency.enabled = false;
    emit();
    return clone(dependency);
  },

  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }
};
