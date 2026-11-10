import { mockTaskHubService } from './mock/mockTaskHubService';
import { restTaskHubService } from './rest/restTaskHubService';
import type { TaskHubService } from './taskHubService';

export const taskHubService: TaskHubService = import.meta.env.VITE_TASKHUB_DATA_SOURCE === 'rest'
  ? restTaskHubService
  : mockTaskHubService;

export type { TaskHubService } from './taskHubService';
