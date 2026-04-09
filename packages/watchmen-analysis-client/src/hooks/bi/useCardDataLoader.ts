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

  // ── Refs: Caches ──
  const cardQueryCache = useRef<Map<string, { result: FetchCardDataResult; timestamp: number }>>(new Map());
  const cardInFlightRequests = useRef<Map<string, number>>(new Map());
  const boardRefreshRequestRef = useRef(0);

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
        if (resp && typeof resp.triggered === 'boolean') {
          if (resp.alertStatus) {
            status = resp.alertStatus;
          } else {
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
              conditionResults: resp.conditionResults || []
            };
          }
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
      return null;
    }
  }, []);

  // ── Load data for a single card (with cache & dedup) ──
  const loadCardDataFor = useCallback(async (
    card: BIChartCard,
    context?: {
      globalTimeRange?: string;
      globalCustomDateRange?: DateRange;
      filtersOverride?: Record<string, string>;
      globalFilterValues?: Record<string, string>;
      timeRangeOverride?: string;
    }
  ) => {
    const cached = cardQueryCache.current.get(card.id);
    if (cached && Date.now() - cached.timestamp < CARD_QUERY_CACHE_TTL && !context?.filtersOverride) {
      setCardDataMap(prev => ({ ...prev, [card.id]: { chartData: cached.result.data, rawData: cached.result.rawData as MetricFlowResponse } }));
      if (cached.result.type === 'alert' && cached.result.status) {
        setAlertStatusMap(prev => ({ ...prev, [card.id]: cached.result.status! }));
      }
      return;
    }
    if (cardInFlightRequests.current.has(card.id)) return;
    const requestId = Date.now();
    cardInFlightRequests.current.set(card.id, requestId);
    try {
      const result = await fetchCardData(card, context);
      if (cardInFlightRequests.current.get(card.id) !== requestId) return;
      if (!result) return;

      cardQueryCache.current.set(card.id, { result, timestamp: Date.now() });

      if (result.type === 'alert') {
        setCardDataMap(prev => ({ ...prev, [result.id]: { chartData: result.data, rawData: result.rawData } }));
        if (result.status) {
          setAlertStatusMap(prev => ({ ...prev, [result.id]: result.status! }));
        }
      } else {
        setCardDataMap(prev => ({ ...prev, [result.id]: { chartData: result.data, rawData: result.rawData as MetricFlowResponse } }));
      }
    } finally {
      cardInFlightRequests.current.delete(card.id);
    }
  }, [fetchCardData]);

  // ── Batch-apply results from parallel fetches ──
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
  }, []);

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
    const results = await Promise.all(
      cardsToRefresh.map(card => fetchCardData(card, context))
    );
    if (requestId !== boardRefreshRequestRef.current) return;
    applyCardResults(results);
  }, [applyCardResults, fetchCardData]);

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
    cardQueryCache.current.clear();
    cardInFlightRequests.current.clear();
  }, []);

  return {
    cardDataMap,
    alertStatusMap,
    setAlertStatusMap,
    isBoardRefreshing,
    setIsBoardRefreshing,
    fetchCardData,
    loadCardDataFor,
    refreshCardsWithContext,
    refreshData,
    clearCardDataMap,
  };
};
