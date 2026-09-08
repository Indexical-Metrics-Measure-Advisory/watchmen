import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { ChartFacetGroup } from '@/utils/biAnalysisUtils';
import type { useChartAxis } from './useChartAxis';
import type { MetricNumberFormat } from '@/model/metricsManagement';
import { MAX_FACETS, mergeFacetGroups, toNumericValue } from './utils';
import { BarChartView, LineChartView, AreaChartView, PieChartView } from './ChartViews';
import type { RechartsModule, ChartDatum } from './types';

/**
 * Small-multiples (trellis) grid: one mini chart per facet dimension value.
 * Panels share a Y scale so facet members stay visually comparable; facets
 * beyond MAX_FACETS are merged into an "others" panel.
 */
export const FacetGridView = React.memo(({ lib, facets, chartType, axisProps, format, unit, currency, numberFormat, valueLabel, maxSeries }: {
  lib: RechartsModule;
  facets: ChartFacetGroup[];
  chartType: string;
  axisProps: ReturnType<typeof useChartAxis>;
  format?: string;
  unit?: string;
  currency?: string;
  numberFormat?: MetricNumberFormat;
  valueLabel?: string;
  maxSeries?: number;
}) => {
  const { t } = useTranslation('biAnalysis');
  const othersLabel = t('chart.others');

  const { groups, truncated } = useMemo(
    () => mergeFacetGroups(facets ?? [], othersLabel, MAX_FACETS),
    [facets, othersLabel]
  );

  // Shared Y domain across all panels so heights are comparable
  const yDomain = useMemo<[number | 'auto', number | 'auto'] | undefined>(() => {
    let max = 0;
    groups.forEach(group => group.rows.forEach((row: ChartDatum) => {
      Object.keys(row).forEach(key => {
        if (key === 'date' || key === 'name') return;
        const v = toNumericValue(row[key]);
        if (v > max) max = v;
      });
    }));
    return max > 0 ? [0, Math.ceil(max * 1.05)] : undefined;
  }, [groups]);

  if (!facets || facets.length === 0) {
    return null;
  }

  const renderPanel = (rows: ChartDatum[]) => {
    if (chartType === 'pie') {
      return <PieChartView lib={lib} data={rows} format={format} unit={unit} currency={currency} numberFormat={numberFormat} valueLabel={valueLabel} />;
    }
    if (chartType === 'area') {
      return <AreaChartView lib={lib} data={rows} axisProps={axisProps} format={format} unit={unit} currency={currency} numberFormat={numberFormat} valueLabel={valueLabel} maxSeries={maxSeries} yDomain={yDomain} />;
    }
    if (['bar', 'groupedBar', 'stackedBar'].includes(chartType)) {
      return <BarChartView lib={lib} data={rows} chartType={chartType} axisProps={axisProps} format={format} unit={unit} currency={currency} numberFormat={numberFormat} valueLabel={valueLabel} maxSeries={maxSeries} yDomain={yDomain} />;
    }
    return <LineChartView lib={lib} data={rows} axisProps={axisProps} format={format} unit={unit} currency={currency} numberFormat={numberFormat} valueLabel={valueLabel} maxSeries={maxSeries} yDomain={yDomain} />;
  };

  return (
    <div className="h-full w-full flex flex-col gap-2">
      <div className="flex-1 min-h-0 grid gap-3 auto-rows-[190px] grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 overflow-y-auto pr-1">
        {groups.map(group => {
          const total = group.rows.reduce((sum, row) => sum + Object.keys(row)
            .filter(k => k !== 'date' && k !== 'name')
            .reduce((s, k) => s + toNumericValue(row[k]), 0), 0);
          return (
            <div key={group.value} className="flex flex-col rounded-md border bg-card/40 overflow-hidden min-h-0">
              <div className="px-2 py-1 flex items-center justify-between gap-2 border-b bg-muted/30 shrink-0">
                <span className="text-xs font-medium truncate" title={group.value}>{group.value}</span>
                <span className="text-[10px] tabular-nums text-muted-foreground shrink-0">
                  {total.toLocaleString(undefined, { notation: 'compact', maximumFractionDigits: 1 })}
                </span>
              </div>
              <div className="flex-1 min-h-0">
                {renderPanel(group.rows)}
              </div>
            </div>
          );
        })}
      </div>
      {truncated && (
        <div className="text-[11px] text-muted-foreground text-center shrink-0">
          {t('chart.facetsTruncated', { count: MAX_FACETS })}
        </div>
      )}
    </div>
  );
});

export default FacetGridView;
