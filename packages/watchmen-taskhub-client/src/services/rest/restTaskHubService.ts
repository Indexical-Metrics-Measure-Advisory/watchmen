import type { NewDependencyInput, NewTaskInput, RunTaskInput, ScheduleDefinition, TaskDefinition, TaskHubSnapshot } from '@/model';
import type { TaskHubService } from '../taskHubService';
import { jsonBody, request } from './httpClient';
import { mapDependency, mapRun, mapTask } from './taskHubMappers';
import type { DataPage, TaskDefinitionDto, TaskDependencyDto, TaskRunDto } from './taskHubRestModels';

type Overview = Pick<TaskHubSnapshot, 'successTrend' | 'cluster'>;
type BuildMap = Pick<TaskHubSnapshot, 'assets'>;
type Timeline = TaskHubSnapshot['timeline'] | { rows: TaskHubSnapshot['timeline'] };

const listData = <T>(response: DataPage<T> | T[]): T[] => Array.isArray(response) ? response : response.data ?? [];

async function getTask(taskId: string): Promise<TaskDefinition> {
  return mapTask(await request<TaskDefinitionDto>(`/tasks/${encodeURIComponent(taskId)}`));
}

export const restTaskHubService: TaskHubService = {
  async load() {
    const [taskPage, runResponse, dependencyResponse, adapterResponse, alertResponse, overview, buildMap, timeline] = await Promise.all([
      request<DataPage<TaskDefinitionDto>>('/tasks/page', { method: 'POST', ...jsonBody({ pageNumber: 1, pageSize: 100 }) }),
      request<DataPage<TaskRunDto> | TaskRunDto[]>('/runs?page=1&pageSize=100'),
      request<DataPage<TaskDependencyDto> | TaskDependencyDto[]>('/dependencies'),
      request<DataPage<TaskHubSnapshot['adapters'][number]> | TaskHubSnapshot['adapters']>('/adapters'),
      request<DataPage<TaskHubSnapshot['alerts'][number]> | TaskHubSnapshot['alerts']>('/alerts/recent'),
      request<Overview>('/monitor/overview'),
      request<BuildMap>('/views/map', { method: 'POST', ...jsonBody({}) }),
      request<Timeline>('/views/timeline')
    ]);
    return {
      tasks: listData(taskPage).map(mapTask),
      runs: listData(runResponse).map(mapRun),
      dependencies: listData(dependencyResponse).map(mapDependency),
      assets: buildMap.assets ?? [],
      alerts: listData(alertResponse),
      adapters: listData(adapterResponse),
      successTrend: overview.successTrend ?? [],
      timeline: Array.isArray(timeline) ? timeline : timeline.rows ?? [],
      cluster: overview.cluster ?? {
        nodes: [], sharedStoreStatus: 'UNAVAILABLE', activeLocks: 0, rejectedDuplicateDispatches: 0, failovers24h: 0
      }
    };
  },

  async createTask(input: NewTaskInput) {
    const dto = await request<TaskDefinitionDto>('/tasks', {
      method: 'POST',
      ...jsonBody({
        name: input.name,
        description: input.description,
        taskType: input.type,
        executionMode: input.schedule.frequency === 'EVENT' ? 'EVENT' : input.schedule.frequency === 'STREAMING' ? 'STREAMING' : 'SCHEDULED',
        engineRef: { kind: input.targetKind, id: input.engineRef },
        schedule: input.schedule,
        externalTrigger: input.externalTrigger,
        callback: input.callback,
        dependencyWaitTimeoutMinutes: input.schedule.dependencyWaitTimeoutMinutes,
        freshnessSlaMinutes: input.schedule.freshnessSlaMinutes,
        ownerId: input.owner,
        enabled: true,
        tags: [],
        params: {}
      })
    });
    return mapTask(dto);
  },

  async updateDefinition(taskId, input) {
    const task = await request<TaskDefinitionDto>(`/tasks/${encodeURIComponent(taskId)}`);
    await request(`/tasks/${encodeURIComponent(taskId)}`, {
      method: 'PUT',
      ...jsonBody({
        ...task,
        name: input.name,
        description: input.description,
        ownerId: input.owner,
        taskType: input.type,
        executionMode: input.schedule.frequency === 'EVENT' ? 'EVENT' : input.schedule.frequency === 'STREAMING' ? 'STREAMING' : 'SCHEDULED',
        engineRef: { kind: input.targetKind, id: input.engineRef }
      })
    });
    return getTask(taskId);
  },

  async setTaskEnabled(taskId, enabled) {
    await request(`/tasks/${encodeURIComponent(taskId)}/enabled`, { method: 'POST', ...jsonBody({ enabled }) });
    return getTask(taskId);
  },

  async updateSchedule(taskId, schedule: ScheduleDefinition) {
    const task = await request<TaskDefinitionDto>(`/tasks/${encodeURIComponent(taskId)}`);
    await request(`/tasks/${encodeURIComponent(taskId)}`, {
      method: 'PUT',
      ...jsonBody({
        ...task,
        schedule,
        dependencyWaitTimeoutMinutes: schedule.dependencyWaitTimeoutMinutes,
        freshnessSlaMinutes: schedule.freshnessSlaMinutes
      })
    });
    return getTask(taskId);
  },

  async updateIntegration(taskId, input) {
    const task = await request<TaskDefinitionDto>(`/tasks/${encodeURIComponent(taskId)}`);
    await request(`/tasks/${encodeURIComponent(taskId)}`, {
      method: 'PUT',
      ...jsonBody({ ...task, ...input })
    });
    return getTask(taskId);
  },

  async runTask(taskId, input: RunTaskInput) {
    const response = await request<{ runId: string }>(`/tasks/${encodeURIComponent(taskId)}/run`, {
      method: 'POST',
      headers: { 'Idempotency-Key': crypto.randomUUID() },
      ...jsonBody(input)
    });
    return mapRun(await request<TaskRunDto>(`/runs/${encodeURIComponent(response.runId)}`));
  },

  async createDependency(input: NewDependencyInput) {
    return mapDependency(await request<TaskDependencyDto>('/dependencies', {
      method: 'POST',
      ...jsonBody({ ...input, kind: 'explicit', adoptionStatus: 'ACCEPTED', enabled: true, offsetDays: 0 })
    }));
  },

  async adoptDependency(dependencyId) {
    return mapDependency(await request<TaskDependencyDto>(`/dependencies/${encodeURIComponent(dependencyId)}/adopt`, { method: 'POST' }));
  },

  async rejectDependency(dependencyId) {
    return mapDependency(await request<TaskDependencyDto>(`/dependencies/${encodeURIComponent(dependencyId)}/reject`, { method: 'POST' }));
  }
};
