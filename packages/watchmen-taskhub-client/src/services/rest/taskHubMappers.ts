import { defaultSchedule, defaultTaskCallback } from '@/lib/utils';
import type { TaskDefinition, TaskDependency, TaskRun } from '@/model';
import type { TaskDefinitionDto, TaskDependencyDto, TaskRunDto } from './taskHubRestModels';

export function mapTask(dto: TaskDefinitionDto): TaskDefinition {
  const summary = dto.lastRunSummary;
  return {
    id: dto.taskId,
    name: dto.name,
    description: dto.description ?? '',
    type: dto.taskType,
    executionMode: dto.executionMode,
    engine: dto.engineRef.kind,
    engineRef: dto.engineRef.id,
    targetKind: dto.engineRef.kind as TaskDefinition['targetKind'],
    targetName: dto.engineRef.id,
    schedule: dto.schedule ?? defaultSchedule({ mode: 'mirrored' }),
    externalTrigger: dto.externalTrigger ?? { enabled: true },
    callback: {
      ...defaultTaskCallback(),
      ...dto.callback,
      url: dto.callback?.url ?? ''
    },
    enabled: dto.enabled,
    owner: dto.ownerName ?? dto.ownerId ?? '—',
    tags: dto.tags ?? [],
    lastStatus: summary?.status ?? 'PENDING',
    lastRunAt: summary?.lastRunAt,
    successRate: summary?.successRate,
    avgDurationMs: summary?.avgDurationMs,
    refs: (dto.refs ?? []).map((ref) => ({
      id: ref.targetId,
      type: ref.refType as TaskDefinition['refs'][number]['type'],
      name: ref.targetName ?? ref.targetId,
      role: ref.role,
      inferred: ref.inferred
    })),
    readOnly: dto.capabilities?.run === false,
    projectionUnsupported: dto.capabilities?.projection === false
  };
}

export function mapRun(dto: TaskRunDto): TaskRun {
  return {
    id: dto.runId,
    taskId: dto.taskId,
    instanceKey: dto.instanceKey,
    attempt: dto.attempt,
    processDate: dto.processDate,
    status: dto.status,
    triggerType: dto.triggerType,
    window: dto.windowStart && dto.windowEnd ? `${dto.windowStart} → ${dto.windowEnd}` : dto.processDate,
    startedAt: dto.startedAt,
    finishedAt: dto.finishedAt,
    durationMs: dto.durationMs,
    rowCount: dto.rowCount,
    triggeredBy: dto.triggeredBy ?? '—',
    engineRunKey: dto.engineRunKey,
    claimedBy: dto.claimedBy,
    lockExpiresAt: dto.lockExpiresAt,
    idempotencyKey: dto.idempotencyKey,
    error: dto.errorMessage,
    dependencies: (dto.dependencies ?? []).map((dependency) => ({
      dependencyId: dependency.dependencyId,
      taskId: dependency.upstreamTaskId,
      taskName: dependency.upstreamTaskName,
      runId: dependency.upstreamRunId,
      state: dependency.state,
      condition: dependency.condition
    }))
  };
}

export function mapDependency(dto: TaskDependencyDto): TaskDependency {
  return {
    id: dto.dependencyId,
    upstreamTaskId: dto.upstreamTaskId,
    downstreamTaskId: dto.downstreamTaskId,
    kind: dto.kind,
    status: dto.adoptionStatus,
    enabled: dto.enabled,
    condition: dto.condition,
    instancePolicy: dto.instancePolicy,
    offsetDays: dto.offsetDays
  };
}
