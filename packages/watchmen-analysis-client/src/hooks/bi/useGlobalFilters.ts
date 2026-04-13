import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import type { MetricDimension } from '@/model/analysis';
import type { BIChartCard } from '@/model/biAnalysis';
import type { MetricFlowResponse } from '@/model/metricFlow';
import { findDimensionsByMetric } from '@/services/metricsManagementService';
import { inferType } from '@/components/bi/utils';

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

export const GLOBAL_TIME_RANGE_PER_CARD = '__card__';

const toDimKey = (d: MetricDimension) => d.qualified_name || d.name;

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

/** Context passed to refreshCardsWithContext when global filters change */
export type RefreshContext = {
  globalTimeRange?: string;
  globalCustomDateRange?: DateRange;
  filtersOverride?: Record<string, string>;
  globalFilterValues?: Record<string, string>;
  timeRangeOverride?: string;
};

// ─────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────

interface UseGlobalFiltersOptions {
  cards: BIChartCard[];
  /** Called with the latest cards + context when a global filter change triggers data refresh */
  onRefreshCards: (cards: BIChartCard[], context?: RefreshContext) => Promise<void>;
  setIsBoardRefreshing: (v: boolean) => void;
}

export const useGlobalFilters = (options: UseGlobalFiltersOptions) => {
  const { cards, onRefreshCards, setIsBoardRefreshing } = options;

  // ── State ──
  const [commonFilterDimensions, setCommonFilterDimensions] = useState<MetricDimension[]>([]);
  const [globalFilterValues, setGlobalFilterValues] = useState<Record<string, string>>({});
  const [globalTimeRange, setGlobalTimeRange] = useState<string>(GLOBAL_TIME_RANGE_PER_CARD);
  const [globalCustomDateRange, setGlobalCustomDateRange] = useState<DateRange | undefined>();

  // ── Refs ──
  const metricDimsCache = useRef<Map<string, MetricDimension[]>>(new Map());
  const globalFilterDebounceRef = useRef<number | null>(null);
  const cardsRef = useRef(cards);
  cardsRef.current = cards;
  const globalFilterValuesRef = useRef(globalFilterValues);
  globalFilterValuesRef.current = globalFilterValues;
  const globalCustomDateRangeRef = useRef(globalCustomDateRange);
  globalCustomDateRangeRef.current = globalCustomDateRange;
  const globalTimeRangeRef = useRef(globalTimeRange);
  globalTimeRangeRef.current = globalTimeRange;

  // ── Cleanup debounce on unmount ──
  useEffect(() => {
    return () => {
      if (globalFilterDebounceRef.current) {
        window.clearTimeout(globalFilterDebounceRef.current);
      }
    };
  }, []);

  // ── Derive common filter source from cards (memoized by metricId+dimensions keys) ──
  // Sort keys to make them order-independent — drag reorder shouldn't trigger recomputation
  const commonFilterSourceKey = useMemo(() => {
    return cards.map(card => `${card.metricId}|${(card.selection?.dimensions ?? []).sort().join(',')}`).sort().join(';;');
  }, [cards]);

  const commonFilterSource = useMemo(() => cards.map(card => ({
    metricId: card.metricId,
    dimensions: Array.isArray(card.selection?.dimensions) ? card.selection.dimensions : []
  })), [cards]);

  // ── Compute common filter dimensions when cards change ──
  useEffect(() => {
    let alive = true;
    const loadCommon = async () => {
      const selectedDimSets = commonFilterSource
        .map(c => (Array.isArray(c.dimensions) ? c.dimensions : []))
        .map(dims => dims.map(d => (d || '').trim()).filter(d => d.length > 0))
        .filter(dims => dims.length > 0)
        .map(dims => new Set<string>(dims));

      if (selectedDimSets.length === 0) {
        if (alive) {
          setCommonFilterDimensions([]);
          setGlobalFilterValues({});
        }
        return;
      }

      let commonKeys = new Set<string>(Array.from(selectedDimSets[0]));
      for (const s of selectedDimSets.slice(1)) {
        commonKeys = new Set(Array.from(commonKeys).filter(k => s.has(k)));
      }

      if (commonKeys.size === 0) {
        if (alive) {
          setCommonFilterDimensions([]);
          setGlobalFilterValues({});
        }
        return;
      }

      const metricIds = Array.from(
        new Set(
          commonFilterSource
            .map(c => (c.metricId || '').trim())
            .filter(id => id.length > 0)
        )
      );

      if (metricIds.length === 0) {
        if (alive) {
          setCommonFilterDimensions([]);
          setGlobalFilterValues({});
        }
        return;
      }

      try {
        const missingIds = metricIds.filter(id => !metricDimsCache.current.has(id));
        if (missingIds.length > 0) {
          // Filter out purely numeric IDs which cause UnknownMetricError in MetricFlow backend
          const validMissingNames = missingIds.filter(id => !/^\d+$/.test(id));
          
          if (validMissingNames.length > 0) {
            const responses = await Promise.all(validMissingNames.map(name => findDimensionsByMetric(name)));
            responses.forEach((r, i) => {
              const dims = Array.isArray(r?.dimensions) ? r.dimensions : [];
              metricDimsCache.current.set(validMissingNames[i], dims);
            });
          }
          
          // Mark purely numeric IDs as having no dimensions to avoid re-fetching
          missingIds.forEach(id => {
            if (/^\d+$/.test(id) && !metricDimsCache.current.has(id)) {
              metricDimsCache.current.set(id, []);
            }
          });
        }

        const maps = metricIds.map(id => {
          const dims = metricDimsCache.current.get(id) || [];
          return new Map(dims.map(d => [toDimKey(d), d] as const));
        });

        if (maps.length === 0) {
          if (alive) setCommonFilterDimensions([]);
          return;
        }

        const dimByKey = new Map<string, MetricDimension>();
        for (const m of maps) {
          for (const k of Array.from(commonKeys)) {
            if (!dimByKey.has(k) && m.has(k)) {
              const d = m.get(k);
              if (d) dimByKey.set(k, d);
            }
          }
        }

        const commonDims = Array.from(commonKeys)
          .map(k => dimByKey.get(k) ?? ({ name: k, qualified_name: k } as MetricDimension))
          .filter((d): d is MetricDimension => Boolean(d))
          .filter(d => inferType(d) !== 'TIME')
          .sort((a, b) => {
            const ia = typeof a.importance === 'number' ? a.importance : 0;
            const ib = typeof b.importance === 'number' ? b.importance : 0;
            if (ib !== ia) return ib - ia;
            return (a.name || '').localeCompare(b.name || '');
          });

        if (!alive) return;
        setCommonFilterDimensions(commonDims);
        setGlobalFilterValues(prev => {
          const next: Record<string, string> = {};
          for (const k of Array.from(commonKeys)) {
            if (typeof prev[k] === 'string') next[k] = prev[k];
          }
          return next;
        });
      } catch (e) {
        if (!alive) return;
        setCommonFilterDimensions([]);
      }
    };

    void loadCommon();
    return () => {
      alive = false;
    };
  }, [commonFilterSourceKey]);

  // ── Handlers ──
  const handleGlobalFilterChange = useCallback((dimensionKey: string, value: string) => {
    const next = { ...globalFilterValuesRef.current, [dimensionKey]: value };
    setGlobalFilterValues(next);

    if (globalFilterDebounceRef.current) {
      window.clearTimeout(globalFilterDebounceRef.current);
    }

    globalFilterDebounceRef.current = window.setTimeout(async () => {
      setIsBoardRefreshing(true);
      await onRefreshCards(cardsRef.current, { filtersOverride: next });
      setIsBoardRefreshing(false);
    }, 220);
  }, [onRefreshCards, setIsBoardRefreshing]);

  const handleGlobalTimeRangeChange = useCallback(async (range: string) => {
    setGlobalTimeRange(range);
    setIsBoardRefreshing(true);

    let nextCards = cardsRef.current;
    if (range !== GLOBAL_TIME_RANGE_PER_CARD && range !== 'Custom') {
      nextCards = cardsRef.current.map(c => ({
        ...c,
        selection: { ...c.selection, timeRange: range }
      }));
    } else if (range === 'Custom' && globalCustomDateRangeRef.current?.from && globalCustomDateRangeRef.current?.to) {
      const customStr = `Custom:${format(globalCustomDateRangeRef.current.from, 'yyyy-MM-dd')}:${format(globalCustomDateRangeRef.current.to, 'yyyy-MM-dd')}`;
      nextCards = cardsRef.current.map(c => ({
        ...c,
        selection: { ...c.selection, timeRange: customStr }
      }));
    }

    await onRefreshCards(nextCards, {
      globalTimeRange: range,
      filtersOverride: globalFilterValuesRef.current,
      timeRangeOverride: range === GLOBAL_TIME_RANGE_PER_CARD ? undefined : range
    });
    setIsBoardRefreshing(false);
  }, [onRefreshCards, setIsBoardRefreshing]);

  const handleGlobalCustomDateRangeChange = useCallback(async (range: DateRange) => {
    setGlobalCustomDateRange(range);
    if (globalTimeRangeRef.current !== 'Custom') return;

    if (!range?.from || !range?.to) return;
    const override = `Custom:${format(range.from, 'yyyy-MM-dd')}:${format(range.to, 'yyyy-MM-dd')}`;

    const nextCards = cardsRef.current.map(c => ({
      ...c,
      selection: { ...c.selection, timeRange: override }
    }));

    setIsBoardRefreshing(true);
    await onRefreshCards(nextCards, { filtersOverride: globalFilterValuesRef.current, timeRangeOverride: override, globalCustomDateRange: range });
    setIsBoardRefreshing(false);
  }, [onRefreshCards, setIsBoardRefreshing]);

  const clearGlobalFilters = useCallback(async () => {
    const next: Record<string, string> = {};
    setGlobalFilterValues(next);
    setGlobalTimeRange(GLOBAL_TIME_RANGE_PER_CARD);
    setGlobalCustomDateRange(undefined);
    setIsBoardRefreshing(true);
    await onRefreshCards(cardsRef.current, { filtersOverride: next });
    setIsBoardRefreshing(false);
  }, [onRefreshCards, setIsBoardRefreshing]);

  return {
    commonFilterDimensions,
    globalFilterValues,
    globalTimeRange,
    globalCustomDateRange,
    handleGlobalFilterChange,
    handleGlobalTimeRangeChange,
    handleGlobalCustomDateRangeChange,
    clearGlobalFilters,
    metricDimsCache,
  };
};
