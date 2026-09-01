import { useCallback, useRef, useState } from 'react';
import type { DateRange } from 'react-day-picker';
import type { BIChartCard, GlobalAlertRule } from '@/model/biAnalysis';
import type { ChartDatum } from '@/components/bi/ChartCard';
import type { MetricFlowResponse, MetricQueryRequest } from '@/model/metricFlow';
import type { AlertStatus } from '@/model/AlertConfig';
import type { MetricDimension } from '@/model/analysis';
import { metricsService } from '@/services/metricsService';
import { globalAlertService } from '@/services/globalAlertService';
import { transformMetricFlowToChartData, timeRangeToBounds, toTimeRangeValue, buildGlobalWhere } from '@/utils/biAnalysisUtils';
import { inferType } from '@/components/bi/utils';
import { GLOBAL_TIME_RANGE_PER_CARD } from '@/hooks/bi/useGlobalFilters';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type FetchCardDataResult = {
  id: string;
  type: 'chart';
  data: ChartDatum[];
  rawData: MetricFlowResponse | null;
  status?: never;
} | {
  id: string;
  type: 'alert';
  data: ChartDatum[];
  rawData: null;
  status: AlertStatus | null;
};

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const CARD_QUERY_CACHE_TTL = 30_000;

type CardQueryContext = {
  globalTimeRange?: string;
  globalCustomDateRange?: DateRange;
  filtersOverride?: Record<string, string>;
  globalFilterValues?: Record<string, string>;
  timeRangeOverride?: string;
};

// Cache key must include the query context — a bare card.id would serve stale
// data after the global time range or filters change.
const buildCardCacheKey = (card: BIChartCard, context?: CardQueryContext): string => {
  const timePart = context?.timeRangeOverride ?? context?.globalTimeRange ?? '';
  const customPart = context?.globalCustomDateRange
    ? `${context.globalCustomDateRange.from?.toISOString() ?? ''}~${context.globalCustomDateRange.to?.toISOString() ?? ''}`
    : '';
  const filterPart = JSON.stringify(context?.filtersOverride ?? context?.globalFilterValues ?? {});
  return `${card.id}|${timePart}|${customPart}|${filterPart}`;
};

const resolveTimeRange = (
  card: BIChartCard,
  globalTimeRange: string,
  globalCustomDateRange: DateRange | undefined,
  timeRangeOverride?: string
) => {
  const range = timeRangeOverride ?? globalTimeRange;
  if (range === GLOBAL_TIME_RANGE_PER_CARD) return card.selection.timeRange;
  if (range === 'Custom') return toTimeRangeValue('Custom', globalCustomDateRange) ?? 'Past 30 days';
  return range;
};

// ─────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────

/**
 * useCardDataLoader manages card data fetching, caching, and state.
 * 
 * It does NOT depend on global filter state directly — instead, all
 * global filter / time range context is passed via the options parameter
 * of refreshCardsWithContext and loadCardDataFor.
 */
export const useCardDataLoader = () => {
  // ── State ──
  const [cardDataMap, setCardDataMap] = useState<Record<string, { chartData: ChartDatum[]; rawData: MetricFlowResponse | null }>>({});
  const [alertStatusMap, setAlertStatusMap] = useState<Record<string, AlertStatus>>({});
  const [isBoardRefreshing, setIsBoardRefreshing] = useState(false);
  // Per-card fetch status: true while a fetch is in flight; a short message on failure
  const [cardLoadingMap, setCardLoadingMap] = useState<Record<string, boolean>>({});
  const [cardErrorMap, setCardErrorMap] = useState<Record<string, string>>({});

  // ── Refs: Caches ──
  const cardQueryCache = useRef<Map<string, { result: FetchCardDataResult; timestamp: number }>>(new Map());
  const cardInFlightRequests = useRef<Map<string, number>>(new Map());
  const boardRefreshRequestRef = useRef(0);
  const loadedCardIdsRef = useRef<Set<string>>(new Set());
  // Last query context used by any load — reused by retryCard so a per-card retry
  // runs with the same global time range / filters as the board's last fetch
  const lastContextRef = useRef<CardQueryContext | undefined>(undefined);

  // ── Batched loading-map updates (one setState per batch, not per card) ──
  const markCardsLoading = useCallback((cardIds: string[]) => {
    if (cardIds.length === 0) return;
    setCardLoadingMap(prev => {
      const next = { ...prev };
      cardIds.forEach(id => {
        next[id] = true;
      });
      return next;
    });
  }, []);

  const markCardsSettled = useCallback((cardIds: string[]) => {
    if (cardIds.length === 0) return;
    setCardLoadingMap(prev => {
      const next = { ...prev };
      cardIds.forEach(id => {
        delete next[id];
      });
      return next;
    });
  }, []);

  // ── Fetch single card data ──
  const fetchCardData = useCallback(async (
    card: BIChartCard,
    context?: {
      globalTimeRange?: string;
      globalCustomDateRange?: DateRange;
      filtersOverride?: Record<string, string>;
      globalFilterValues?: Record<string, string>;
      timeRangeOverride?: string;
    }
  ): Promise<FetchCardDataResult | null> => {
    try {
      if (card.chartType === 'alert' && card.alert) {
        if (!card.alert.enabled) {
          return { id: card.id, type: 'alert', data: [], rawData: null, status: null };
        }
        const resp = await globalAlertService.fetchAlertData(card.alert as GlobalAlertRule);

        let chartData: ChartDatum[] = [];
        if (resp && Array.isArray(resp.data)) {
          chartData = (resp.data as ChartDatum[]);
        } else if (Array.isArray(resp)) {
          chartData = (resp as ChartDatum[]);
        }

        let status: AlertStatus | null = null;
        if (resp && resp.id) {
            status = {
              id: resp.id,
              ruleId: resp.ruleId || card.id,
              ruleName: resp.ruleName || card.alert?.name || 'Alert',
              triggered: resp.triggered ?? false,
              severity: resp.severity || 'info',
              message: resp.message || (resp.triggered ? 'Alert Triggered' : 'Normal'),
              acknowledged: resp.acknowledged || false,
              acknowledgedBy: resp.acknowledgedBy,
              acknowledgedAt: resp.acknowledgedAt,
              acknowledgeReason: resp.acknowledgeReason,
              conditionResults: resp.conditionResults || [],
              actions: resp.actions,
              actionExecuted: resp.actionExecuted,
              nextTriggerTime: resp.nextTriggerTime,
              intervalMinutes: resp.intervalMinutes
            };
        } else if (resp && typeof resp.triggered === 'boolean') {
            const alertRule = card.alert as GlobalAlertRule;
            const priority = alertRule.priority || 'medium';
            let severity: 'info' | 'warning' | 'critical' = 'info';
            if (priority === 'critical') severity = 'critical';
            else if (priority === 'high') severity = 'warning';

            status = {
              id: `alert-status-${card.id}`,
              ruleId: alertRule.id || card.id,
              ruleName: alertRule.name || 'Alert',
              triggered: resp.triggered,
              severity: severity,
              message: resp.message || (resp.triggered ? 'Alert Triggered' : 'Normal'),
              acknowledged: resp.acknowledged || false,
              conditionResults: resp.conditionResults || [],
              actions: resp.actions,
              actionExecuted: resp.actionExecuted
            };
        }
        return { id: card.id, type: 'alert', data: chartData, rawData: null, status };
      }

      const gTimeRange = context?.timeRangeOverride ?? context?.globalTimeRange ?? GLOBAL_TIME_RANGE_PER_CARD;
      const resolvedRange = resolveTimeRange(card, gTimeRange, context?.globalCustomDateRange);
      const { start, end } = timeRangeToBounds(resolvedRange);
      let groupBy = card.selection.dimensions && card.selection.dimensions.length > 0 ? [...card.selection.dimensions] : undefined;

      if (card.selection.timeGranularity && groupBy) {
        groupBy = groupBy.map(dim => {
          if (inferType({ name: dim } as MetricDimension) === 'TIME') {
            return `${dim}__${card.selection.timeGranularity}`;
          }
          return dim;
        });
      }

      const filterValues = context?.filtersOverride ?? context?.globalFilterValues ?? {};
      const where = groupBy ? buildGlobalWhere(filterValues) : undefined;

      const req: MetricQueryRequest = {
        metric: card.metricId,
        group_by: groupBy,
        where,
        start_time: start,
        end_time: end,
        order: [],
        limit: 500
      };
      const resp = await metricsService.getMetricValue(req);
      const data = transformMetricFlowToChartData(resp);
      return { id: card.id, type: 'chart', data, rawData: resp };
    } catch (e) {
      console.warn(`Card ${card.id}: failed to load data.`, e);
      setCardErrorMap(prev => ({ ...prev, [card.id]: e instanceof Error ? e.message : String(e) }));
      return null;
    }
  }, []);

  // ── Batch-apply results from parallel fetches (single setState per map) ──
  const applyCardResults = useCallback((results: Awaited<ReturnType<typeof fetchCardData>>[]) => {
    setCardDataMap(prev => {
      const next = { ...prev };
      results.forEach(result => {
        if (!result) return;
        next[result.id] = { chartData: result.data, rawData: result.rawData as MetricFlowResponse };
      });
      return next;
    });

    setAlertStatusMap(prev => {
      const next = { ...prev };
      let hasUpdates = false;
      results.forEach(result => {
        if (result && result.type === 'alert' && result.status) {
          next[result.id] = result.status;
          hasUpdates = true;
        }
      });
      return hasUpdates ? next : prev;
    });

    // A successful fetch clears any previously recorded error for that card
    setCardErrorMap(prev => {
      const next = { ...prev };
      let hasUpdates = false;
      results.forEach(result => {
        if (result && next[result.id]) {
          delete next[result.id];
          hasUpdates = true;
        }
      });
      return hasUpdates ? next : prev;
    });
  }, []);

  // ── Load data for a single card (with cache & dedup) ──
  const loadCardDataFor = useCallback(async (
    card: BIChartCard,
    context?: CardQueryContext
  ) => {
    lastContextRef.current = context;
    const cacheKey = buildCardCacheKey(card, context);
    const cached = cardQueryCache.current.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CARD_QUERY_CACHE_TTL && !context?.filtersOverride) {
      applyCardResults([cached.result]);
      return;
    }
    if (cardInFlightRequests.current.has(cacheKey)) return;
    const requestId = Date.now();
    cardInFlightRequests.current.set(cacheKey, requestId);
    markCardsLoading([card.id]);
    try {
      const result = await fetchCardData(card, context);
      if (cardInFlightRequests.current.get(cacheKey) !== requestId) return;
      if (!result) return;

      cardQueryCache.current.set(cacheKey, { result, timestamp: Date.now() });
      applyCardResults([result]);
    } finally {
      cardInFlightRequests.current.delete(cacheKey);
      markCardsSettled([card.id]);
    }
  }, [applyCardResults, fetchCardData, markCardsLoading, markCardsSettled]);

  // ── Load data for many cards at once — fetches in parallel and applies all
  // results with a single batched state update (used for the initial board load) ──
  const loadCardsDataFor = useCallback(async (
    cardsToLoad: BIChartCard[],
    context?: CardQueryContext
  ) => {
    lastContextRef.current = context;
    const now = Date.now();
    const cachedResults: FetchCardDataResult[] = [];
    const pending: BIChartCard[] = [];

    cardsToLoad.forEach(card => {
      const cacheKey = buildCardCacheKey(card, context);
      const cached = cardQueryCache.current.get(cacheKey);
      if (cached && now - cached.timestamp < CARD_QUERY_CACHE_TTL && !context?.filtersOverride) {
        cachedResults.push(cached.result);
        return;
      }
      if (cardInFlightRequests.current.has(cacheKey)) return;
      pending.push(card);
    });

    if (cachedResults.length > 0) {
      applyCardResults(cachedResults);
    }
    if (pending.length === 0) return;

    const requestId = Date.now();
    pending.forEach(card => cardInFlightRequests.current.set(buildCardCacheKey(card, context), requestId));
    markCardsLoading(pending.map(card => card.id));
    try {
      const results = await Promise.all(pending.map(card => fetchCardData(card, context)));
      const valid: FetchCardDataResult[] = [];
      results.forEach((result, index) => {
        if (!result) return;
        cardQueryCache.current.set(buildCardCacheKey(pending[index], context), { result, timestamp: Date.now() });
        valid.push(result);
      });
      applyCardResults(valid);
    } finally {
      pending.forEach(card => cardInFlightRequests.current.delete(buildCardCacheKey(card, context)));
      markCardsSettled(pending.map(card => card.id));
    }
  }, [applyCardResults, fetchCardData, markCardsLoading, markCardsSettled]);

  // ── Refresh a set of cards with context ──
  const refreshCardsWithContext = useCallback(async (
    cardsToRefresh: BIChartCard[],
    context?: {
      globalTimeRange?: string;
      globalCustomDateRange?: DateRange;
      filtersOverride?: Record<string, string>;
      globalFilterValues?: Record<string, string>;
      timeRangeOverride?: string;
    }
  ) => {
    const requestId = ++boardRefreshRequestRef.current;
    lastContextRef.current = context;
    markCardsLoading(cardsToRefresh.map(card => card.id));
    try {
      const results = await Promise.all(
        cardsToRefresh.map(card => fetchCardData(card, context))
      );
      if (requestId !== boardRefreshRequestRef.current) return;
      applyCardResults(results);
    } finally {
      markCardsSettled(cardsToRefresh.map(card => card.id));
    }
  }, [applyCardResults, fetchCardData, markCardsLoading, markCardsSettled]);

  // ── Retry a single failed card: drop its cache entry and refetch with the
  // last-used query context ──
  const retryCard = useCallback(async (card: BIChartCard) => {
    const context = lastContextRef.current;
    cardQueryCache.current.delete(buildCardCacheKey(card, context));
    setCardErrorMap(prev => {
      if (!prev[card.id]) return prev;
      const next = { ...prev };
      delete next[card.id];
      return next;
    });
    await loadCardDataFor(card, context);
  }, [loadCardDataFor]);

  // ── Refresh all cards (used by refresh button) ──
  const refreshData = useCallback(async (cards: BIChartCard[], context?: {
    globalTimeRange?: string;
    globalCustomDateRange?: DateRange;
    globalFilterValues?: Record<string, string>;
  }) => {
    setIsBoardRefreshing(true);
    await refreshCardsWithContext(cards, context);
    setIsBoardRefreshing(false);
  }, [refreshCardsWithContext]);

  // ── Clear card data map (used when loading template) ──
  const clearCardDataMap = useCallback(() => {
    setCardDataMap({});
    setAlertStatusMap({});
    setCardLoadingMap({});
    setCardErrorMap({});
    cardQueryCache.current.clear();
    cardInFlightRequests.current.clear();
    loadedCardIdsRef.current.clear();
  }, []);

  return {
    cardDataMap,
    alertStatusMap,
    setAlertStatusMap,
    isBoardRefreshing,
    setIsBoardRefreshing,
    cardLoadingMap,
    cardErrorMap,
    retryCard,
    fetchCardData,
    loadCardDataFor,
    loadCardsDataFor,
    refreshCardsWithContext,
    refreshData,
    clearCardDataMap,
    loadedCardIdsRef,
  };
};
