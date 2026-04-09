# BI Analysis Module Memory

## Project: watchmen-analysis-client
- BI analysis page at `src/pages/BIAnalysis.tsx` (969 lines, down from ~1700)
- Components under `src/components/bi/`
- Chart components under `src/components/bi/charts/`
- Custom hooks under `src/hooks/bi/`

## Architecture (Refactored 2026-04-09 → 2026-04-10)
- **BIAnalysisPage** is the coordinator, composing 4 custom hooks + local state
- **useCardDataLoader** (`src/hooks/bi/useCardDataLoader.ts`): cardDataMap, alertStatusMap, fetch/cache logic. NO dependency on global filter state — context passed via options param
- **useGlobalFilters** (`src/hooks/bi/useGlobalFilters.ts`): commonFilterDimensions, globalFilterValues, globalTimeRange, debounced filter handlers. Uses ref-based tracking to avoid stale closures
- **useAnalysisState** (`src/hooks/bi/useAnalysisState.ts`): cards, save/load/delete, templates, drag-drop, alert dialog, acknowledge, share link
- **useMetricBuilder** (`src/hooks/bi/useMetricBuilder.ts`): chartConfig, metrics list, dimensions, preview state/cache, all builder handlers, addCardToBoard. Uses `onCardAdded` callback pattern
- **AnalysisBoard** renders card grid with batch rendering (12 cards at a time via RAF)
- **RechartsProvider** shares recharts module load across all ChartCard instances
- Shared utils in `src/utils/biAnalysisUtils.ts`

## Performance Optimizations Applied (2026-04-09)
1. **AlertCard**: Constants outside component + React.memo
2. **DataTable**: Paginated rendering (50 rows initially, load more)
3. **ChartViews**: Shared `extractChartKeys` + `useChartKeys` hook
4. **RechartsContext**: Single shared recharts load via React Context
5. **Shared BI utils**: `transformMetricFlowToChartData`, `timeRangeToBounds`, `buildGlobalWhere` in `src/utils/biAnalysisUtils.ts`
6. **useCallback**: All major handler functions memoized
7. **Ref-based state tracking**: cardsRef, globalFilterValuesRef, etc. to avoid stale closures
8. **previewCache LRU**: Eviction at PREVIEW_CACHE_MAX_SIZE=50
9. **useMemo**: hasGlobalFilters in AnalysisBoard
10. **Lazy SubscriptionModal**: React.lazy dynamic import
11. **Hook extraction**: BIAnalysisPage God Component split into 3 hooks (969 + 886 lines total)

## Tooltip & Scroll Performance (2026-04-10)
12. **ResponsiveContainer debounce={200}**: Throttles resize recalculation in all chart views — major scroll perf win
13. **Tooltip no animation**: `TOOLTIP_SHARED_PROPS` constant with `isAnimationActive:false`, stroke-only cursor (no fill)
14. **CustomTooltip no CSS animation**: Removed `animate-in fade-in-0 zoom-in-95` classes
15. **CSS contain**: `contain:'layout style paint'` on ChartCard, CardContent, grid container, BoardCardItem
16. **transition-shadow**: Changed `transition-all` → `transition-shadow` to avoid layout property transitions during scroll
17. **will-change: transform**: On chart container div for GPU compositing hint
18. **RechartsContext value memoized**: `useMemo` + stable NULL_CONTEXT_VALUE fallback
19. **Stable callbacks**: handleAddAlert, handleOpenSubscription, filter toggle buttons all use useCallback

## Remaining Known Issues
- AlertConfigurationModal and GlobalAlertConfigurationModal have ~400 lines of duplicated logic
