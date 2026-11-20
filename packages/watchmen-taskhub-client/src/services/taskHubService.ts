import type {
  NewDependencyInput, NewTaskInput, RunTaskInput, ScheduleDefinition, TaskDefinition, TaskDependency, TaskHubSnapshot,
  TaskIntegrationInput, TaskRun
} from '@/model';

export interface TaskHubService {
  load: () => Promise<TaskHubSnapshot>;
  createTask: (input: NewTaskInput) => Promise<TaskDefinition>;
  updateDefinition: (taskId: string, input: NewTaskInput) => Promise<TaskDefinition>;
  setTaskEnabled: (taskId: string, enabled: boolean) => Promise<TaskDefinition>;
  updateSchedule: (taskId: string, schedule: ScheduleDefinition) => Promise<TaskDefinition>;
  updateIntegration: (taskId: string, input: TaskIntegrationInput) => Promise<TaskDefinition>;
  runTask: (taskId: string, input: RunTaskInput) => Promise<TaskRun>;
  createDependency: (input: NewDependencyInput) => Promise<TaskDependency>;
  adoptDependency: (dependencyId: string) => Promise<TaskDependency>;
  rejectDependency: (dependencyId: string) => Promise<TaskDependency>;
  subscribe?: (listener: () => void) => () => void;
}
