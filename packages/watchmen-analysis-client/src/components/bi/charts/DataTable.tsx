import React, { useMemo, useState } from 'react';
import type { ChartDatum } from './types';
import type { MetricFlowResponse } from '@/model/metricFlow';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from '@/components/ui/button';

const INITIAL_ROWS = 50;
const ROWS_PER_PAGE = 50;
const MAX_RENDER_ROWS = 500;

// Pre-format numbers to avoid repeated toLocaleString calls
const formatNumber = (value: number): string => {
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
};

// Cache for formatted numbers to avoid re-formatting
const numberCache = new Map<number, string>();
const cachedFormat = (value: number): string => {
  const cached = numberCache.get(value);
  if (cached !== undefined) return cached;
  const formatted = formatNumber(value);
  numberCache.set(value, formatted);
  return formatted;
};

export const DataTable = React.memo(({ data, sourceData }: { data: ChartDatum[], sourceData?: MetricFlowResponse }) => {
  const [visibleRows, setVisibleRows] = useState(INITIAL_ROWS);

  const fallbackHeaders = useMemo(
    () => (!data || data.length === 0 ? [] : Object.keys(data[0]).filter(k => k !== 'color' && k !== 'fill')),
    [data]
  );

  // Reset visible rows when data changes
  React.useEffect(() => {
    setVisibleRows(INITIAL_ROWS);
  }, [data, sourceData]);

  // Prefer sourceData (raw response) if available
  if (sourceData && Array.isArray(sourceData.column_names) && Array.isArray(sourceData.data)) {
    const headers = sourceData.column_names;
    const rows = sourceData.data;

    if (rows.length === 0) {
      return <div className="flex items-center justify-center h-full text-muted-foreground text-sm">No data available</div>;
    }

    const displayRows = rows.slice(0, Math.min(visibleRows, MAX_RENDER_ROWS));
    const hasMore = rows.length > visibleRows;

    return (
      <ScrollArea className="h-full w-full rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10">
              {headers.map((header, idx) => (
                <TableHead key={idx} className="capitalize min-w-[100px]">
                  {header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayRows.map((row, i) => (
              <TableRow key={i} className="hover:bg-muted/50">
                {row.map((cell, j) => (
                  <TableCell key={`${i}-${j}`} className="font-medium">
                    {typeof cell === 'number'
                      ? cachedFormat(cell)
                      : (cell === null || cell === undefined ? '-' : String(cell))}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {hasMore && (
          <div className="flex items-center justify-center py-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground"
              onClick={() => setVisibleRows(prev => Math.min(prev + ROWS_PER_PAGE, rows.length))}
            >
              Load more ({Math.min(visibleRows, rows.length)}/{rows.length} rows)
            </Button>
          </div>
        )}
      </ScrollArea>
    );
  }

  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-full text-muted-foreground text-sm">No data available</div>;
  }

  // Extract headers from the first data item
  const headers = fallbackHeaders;
  const displayData = data.slice(0, Math.min(visibleRows, MAX_RENDER_ROWS));
  const hasMore = data.length > visibleRows;

  return (
    <ScrollArea className="h-full w-full rounded-md border">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10">
            {headers.map((header) => (
              <TableHead key={header} className="capitalize min-w-[100px]">
                {header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {displayData.map((row, i) => (
            <TableRow key={i} className="hover:bg-muted/50">
              {headers.map((header) => (
                <TableCell key={`${i}-${header}`} className="font-medium">
                  {typeof row[header] === 'number'
                    ? cachedFormat(row[header] as number)
                    : (row[header] === null || row[header] === undefined ? '-' : String(row[header]))}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {hasMore && (
        <div className="flex items-center justify-center py-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground"
            onClick={() => setVisibleRows(prev => Math.min(prev + ROWS_PER_PAGE, data.length))}
          >
            Load more ({Math.min(visibleRows, data.length)}/{data.length} rows)
          </Button>
        </div>
      )}
    </ScrollArea>
  );
});
