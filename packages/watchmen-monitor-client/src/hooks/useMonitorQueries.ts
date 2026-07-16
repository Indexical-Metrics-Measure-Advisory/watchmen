// React Query wrappers around the monitor services.
// Usage: `const { data, isLoading, error } = useIngestEvents({ pageNumber: 1, pageSize: 20 })`.
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { ingestMonitorService } from '@/services/ingestMonitorService';
import { pipelineMonitorService } from '@/services/pipelineMonitorService';
import { pipelineMetaService } from '@/services/pipelineMetaService';
import { topicService } from '@/services/topicService';
import type { Pageable } from '@/models/api.models';
import type { PipelineMonitorLogCriteria } from '@/models/pipeline.models';

const REACT_QUERY_KEYS = {
  ingestEvents: (p: Pageable) => ['ingest', 'events', p] as const,
  ingestEventDetail: (id: string | number) => ['ingest', 'event-detail', String(id)] as const,
  ingestProgress: (id: string | number, kind: 'record' | 'json' | 'task') =>
    ['ingest', 'progress', kind, String(id)] as const,
  pipelineLogs: (criteria: PipelineMonitorLogCriteria) => ['pipeline', 'logs', criteria] as const,
  pipelines: ['pipeline', 'all'] as const,
  pipeline: (id: string) => ['pipeline', id] as const,
  topicsSearch: (query: string | null, p: Pageable) => ['topics', 'search', query ?? '', p] as const,
  topicsAll: ['topics', 'all'] as const,
  topic: (id: string) => ['topic', id] as const,
} as const;

// ---- Ingest ----
export const useIngestEvents = (pageable: Pageable, enabled = true) =>
  useQuery({
    queryKey: REACT_QUERY_KEYS.ingestEvents(pageable),
    queryFn: () => ingestMonitorService.getEvents(pageable),
    placeholderData: keepPreviousData,
    enabled,
  });

export const useIngestEventDetail = (eventTriggerId: string | number | null, enabled = true) =>
  useQuery({
    queryKey: REACT_QUERY_KEYS.ingestEventDetail(eventTriggerId ?? ''),
    queryFn: () => ingestMonitorService.getEventDetail(eventTriggerId as string | number),
    enabled: enabled && eventTriggerId != null,
  });

export const useIngestProgress = (
  eventTriggerId: string | number | null,
  kind: 'record' | 'json' | 'task',
  enabled = true,
) =>
  useQuery({
    queryKey: REACT_QUERY_KEYS.ingestProgress(eventTriggerId ?? '', kind),
    queryFn: () => {
      const fn =
        kind === 'record'
          ? ingestMonitorService.getRecordCounts
          : kind === 'json'
            ? ingestMonitorService.getJsonCounts
            : ingestMonitorService.getTaskCounts;
      return fn(eventTriggerId as string | number);
    },
    enabled: enabled && eventTriggerId != null,
  });

// ---- Pipeline Monitor (runtime) ----
export const usePipelineLogs = (criteria: PipelineMonitorLogCriteria, enabled = true) =>
  useQuery({
    queryKey: REACT_QUERY_KEYS.pipelineLogs(criteria),
    queryFn: () => pipelineMonitorService.getLogs(criteria),
    placeholderData: keepPreviousData,
    enabled,
  });

// ---- Pipeline Meta ----
export const useAllPipelines = (enabled = true) =>
  useQuery({
    queryKey: REACT_QUERY_KEYS.pipelines,
    queryFn: () => pipelineMetaService.getAllPipelines(),
    enabled,
  });

export const usePipeline = (pipelineId: string | null | undefined, enabled = true) =>
  useQuery({
    queryKey: REACT_QUERY_KEYS.pipeline(pipelineId ?? ''),
    queryFn: () => pipelineMetaService.getPipeline(pipelineId as string),
    enabled: enabled && !!pipelineId,
  });

// ---- Topics ----
export const useTopicsSearch = (queryName: string | null, pageable: Pageable, enabled = true) =>
  useQuery({
    queryKey: REACT_QUERY_KEYS.topicsSearch(queryName, pageable),
    queryFn: () => topicService.searchTopics(queryName, pageable),
    placeholderData: keepPreviousData,
    enabled,
  });

export const useAllTopics = (enabled = true) =>
  useQuery({
    queryKey: REACT_QUERY_KEYS.topicsAll,
    queryFn: () => topicService.getAllTopics(),
    enabled,
  });

export const useTopic = (topicId: string | null | undefined, enabled = true) =>
  useQuery({
    queryKey: REACT_QUERY_KEYS.topic(topicId ?? ''),
    queryFn: () => topicService.getTopic(topicId as string),
    enabled: enabled && !!topicId,
  });
