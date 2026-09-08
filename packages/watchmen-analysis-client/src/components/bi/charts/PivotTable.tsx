import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { MetricFlowResponse } from '@/model/metricFlow';
import type { MetricNumberFormat } from '@/model/metricsManagement';
import { formatMetricValue } from '@/utils/metricValueFormat';
import { buildPivotModel } from '@/utils/pivotModel';
import type { ChartTransformOptions } from '@/utils/biAnalysisUtils';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';

/**
 * Cross-tab view for multi-dimension data: every non-series dimension becomes
 * a row column, series values become pivot columns with row/column totals.
 * Falls back to a flat measure list when the payload has no dimension.
 */
export const PivotTable = React.memo(({ sourceData, roleOptions, format, currency, numberFormat }: {
  sourceData?: MetricFlowResponse;
  roleOptions?: ChartTransformOptions;
  format?: string;
  currency?: string;
  numberFormat?: MetricNumberFormat;
}) => {
  const { t } = useTranslation('biAnalysis');

  const model = useMemo(
    () => (sourceData ? buildPivotModel(sourceData, roleOptions ?? {}, t('chart.others')) : null),
    [sourceData, roleOptions, t]
  );

  const formatValue = (value: number) => formatMetricValue(value, format, currency, numberFormat);

  if (!model) {
    return <div className="flex items-center justify-center h-full text-muted-foreground text-sm">No data available</div>;
  }

  const columnKeys = model.columns.length > 0 ? model.columns.map(c => c.key) : [model.measureLabel];

  return (
    <ScrollArea className="h-full w-full rounded-md border">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10">
            {model.rowDimLabels.map(label => (
              <TableHead key={label} className="capitalize min-w-[110px] whitespace-nowrap">{label}</TableHead>
            ))}
            {columnKeys.map(key => (
              <TableHead key={key} className="min-w-[100px] text-right whitespace-nowrap">{key}</TableHead>
            ))}
            <TableHead className="min-w-[100px] text-right whitespace-nowrap font-semibold">{t('pivot.total')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {model.rows.map(row => (
            <TableRow key={row.key} className="hover:bg-muted/50">
              {row.cells.map((cell, i) => (
                <TableCell key={`${row.key}-${i}`} className="font-medium max-w-[220px] truncate" title={cell}>
                  {cell}
                </TableCell>
              ))}
              {columnKeys.map(key => (
                <TableCell key={`${row.key}-${key}`} className="text-right tabular-nums">
                  {formatValue(row.values[key] ?? 0)}
                </TableCell>
              ))}
              <TableCell className="text-right tabular-nums font-semibold">
                {formatValue(row.total)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow className="hover:bg-transparent font-semibold">
            <TableCell colSpan={model.rowDimLabels.length} className="font-semibold">{t('pivot.total')}</TableCell>
            {columnKeys.map(key => (
              <TableCell key={key} className="text-right tabular-nums font-semibold">
                {formatValue(model.columnTotals[key] ?? 0)}
              </TableCell>
            ))}
            <TableCell className="text-right tabular-nums font-semibold">
              {formatValue(model.grandTotal)}
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
      {model.truncated && (
        <div className="flex items-center justify-center py-2 border-t text-xs text-muted-foreground">
          {t('pivot.truncated', { max: model.rows.length })}
        </div>
      )}
    </ScrollArea>
  );
});

export default PivotTable;
