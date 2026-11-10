import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import i18n from '@/i18n';
import type {
  NewDependencyInput, NewTaskInput, RunStatus, ScheduleDefinition, TaskHubSnapshot
} from '@/model';
import { taskHubService, type TaskHubService } from '@/services';

interface Notice {
  message: string;
  tone: 'success' | 'error' | 'info';
}

interface TaskHubContextValue extends TaskHubSnapshot {
  loading: boolean;
  notice?: Notice;
  dismissNotice: () => void;
  refresh: () => Promise<void>;
  runTask: (taskId: string) => Promise<void>;
  toggleTask: (taskId: string) => Promise<void>;
  updateSchedule: (taskId: string, schedule: ScheduleDefinition) => Promise<void>;
  updateIntegration: (taskId: string, input: import('@/model').TaskIntegrationInput) => Promise<void>;
  adoptDependency: (dependencyId: string) => Promise<void>;
  rejectDependency: (dependencyId: string) => Promise<void>;
  addDependency: (input: NewDependencyInput) => Promise<void>;
  createTask: (input: NewTaskInput) => Promise<string>;
}

const emptySnapshot: TaskHubSnapshot = {
  tasks: [], runs: [], dependencies: [], assets: [], alerts: [], adapters: [], successTrend: [], timeline: [],
  cluster: { nodes: [], sharedStoreStatus: 'UNAVAILABLE', activeLocks: 0, rejectedDuplicateDispatches: 0, failovers24h: 0 }
};
const TaskHubContext = createContext<TaskHubContextValue | null>(null);

const statusRank: Record<RunStatus, number> = {
  SUCCESS: 1, RUNNING: 2, WAITING: 3, PENDING: 4, FAILED: 5, STALE: 6, CANCELLED: 7, SKIPPED: 8
};

export function TaskHubProvider({ children, service = taskHubService }: { children: ReactNode; service?: TaskHubService }) {
  const [snapshot, setSnapshot] = useState<TaskHubSnapshot>(emptySnapshot);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<Notice | undefined>();

  const dismissNotice = useCallback(() => setNotice(undefined), []);
  const reportError = useCallback((reason: unknown) => {
    setNotice({ message: reason instanceof Error ? reason.message : String(reason), tone: 'error' });
  }, []);
  const refresh = useCallback(async () => {
    try {
      setSnapshot(await service.load());
    } catch (reason) {
      reportError(reason);
    } finally {
      setLoading(false);
    }
  }, [service, reportError]);

  useEffect(() => {
    void refresh();
    return service.subscribe?.(() => void refresh());
  }, [service, refresh]);

  const runTask = useCallback(async (taskId: string) => {
    const task = snapshot.tasks.find((item) => item.id === taskId);
    if (!task || task.readOnly) return;
    try {
      await service.runTask(taskId, { processDate: new Date().toISOString().slice(0, 10) });
      await refresh();
      setNotice({ message: i18n.t('已创建 {{name}} 的运行实例', { name: task.name }), tone: 'success' });
    } catch (reason) {
      reportError(reason);
    }
  }, [snapshot.tasks, service, refresh, reportError]);

  const toggleTask = useCallback(async (taskId: string) => {
    const task = snapshot.tasks.find((item) => item.id === taskId);
    if (!task) return;
    try {
      await service.setTaskEnabled(taskId, !task.enabled);
      await refresh();
      setNotice({ message: i18n.t('{{name}}已{{action}}', { name: task.name, action: i18n.t(task.enabled ? '停用' : '启用') }), tone: 'info' });
    } catch (reason) {
      reportError(reason);
    }
  }, [snapshot.tasks, service, refresh, reportError]);

  const adoptDependency = useCallback(async (dependencyId: string) => {
    try {
      await service.adoptDependency(dependencyId);
      await refresh();
      setNotice({ message: i18n.t('推导依赖已采纳，成环检测通过'), tone: 'success' });
    } catch (reason) {
      reportError(reason);
    }
  }, [service, refresh, reportError]);

  const rejectDependency = useCallback(async (dependencyId: string) => {
    try {
      await service.rejectDependency(dependencyId);
      await refresh();
      setNotice({ message: i18n.t('已拒绝该推导边，后续 discover 不会自动恢复'), tone: 'info' });
    } catch (reason) {
      reportError(reason);
    }
  }, [service, refresh, reportError]);

  const addDependency = useCallback(async (input: NewDependencyInput) => {
    try {
      await service.createDependency(input);
      await refresh();
      setNotice({ message: i18n.t('显式依赖已创建，成环检测通过'), tone: 'success' });
    } catch (reason) {
      reportError(reason);
      throw reason;
    }
  }, [service, refresh, reportError]);

  const updateSchedule = useCallback(async (taskId: string, schedule: ScheduleDefinition) => {
    try {
      await service.updateSchedule(taskId, schedule);
      await refresh();
      setNotice({ message: i18n.t('调度定义已保存'), tone: 'success' });
    } catch (reason) {
      reportError(reason);
    }
  }, [service, refresh, reportError]);

  const updateIntegration = useCallback(async (taskId: string, input: import('@/model').TaskIntegrationInput) => {
    try {
      await service.updateIntegration(taskId, input);
      await refresh();
      setNotice({ message: i18n.t('触发与回调配置已保存'), tone: 'success' });
    } catch (reason) {
      reportError(reason);
    }
  }, [service, refresh, reportError]);

  const createTask = useCallback(async (input: NewTaskInput) => {
    try {
      const task = await service.createTask(input);
      await refresh();
      setNotice({ message: i18n.t('任务已创建'), tone: 'success' });
      return task.id;
    } catch (reason) {
      reportError(reason);
      throw reason;
    }
  }, [service, refresh, reportError]);

  const value = useMemo(() => ({
    ...snapshot, loading, notice, dismissNotice, refresh, runTask, toggleTask, updateSchedule, updateIntegration,
    adoptDependency, rejectDependency, addDependency, createTask
  }), [snapshot, loading, notice, dismissNotice, refresh, runTask, toggleTask, updateSchedule, updateIntegration, adoptDependency, rejectDependency, addDependency, createTask]);

  return <TaskHubContext.Provider value={value}>{children}</TaskHubContext.Provider>;
}

export function useTaskHub() {
  const context = useContext(TaskHubContext);
  if (!context) throw new Error('useTaskHub must be used inside TaskHubProvider');
  return context;
}

export const getTaskStatusPriority = (status: RunStatus) => statusRank[status];
export type { NewTaskInput } from '@/model';
