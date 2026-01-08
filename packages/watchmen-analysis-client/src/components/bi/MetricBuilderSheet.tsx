import React from 'react';
import { 
  BarChart3, 
  LineChart, 
  PieChart, 
  Plus, 
  Search,
  Filter,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { DateRange } from "react-day-picker";
import { ChartCard } from '@/components/bi/ChartCard';
import { BIMetric, BIChartType } from '@/model/biAnalysis';
import type { MetricDefinition } from '@/model/metricsManagement';
import type { MetricDimension } from '@/model/analysis';
import type { MetricFlowResponse } from '@/model/metricFlow';
import { inferType } from './utils';

export type MetricBuilderSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  search: string;
  onSearchChange: (value: string) => void;
  categoryId: string;
  onCategoryIdChange: (value: string) => void;
  categories: { id: string; name: string }[];
  metricsLoading: boolean;
  metricsList: MetricDefinition[];
  selectedMetricId: string;
  onSelectMetric: (id: string, def: MetricDefinition) => void;
  selectedMetric: BIMetric | null;
  availableDimsDetailed: MetricDimension[];
  selectedDimType: string;
  onSelectedDimTypeChange: (value: string) => void;
  dimSearch: string;
  onDimSearchChange: (value: string) => void;
  filteredDims: MetricDimension[];
  selectedDims: string[];
  onToggleDim: (value: string) => void;
  timeRange: string;
  onTimeRangeChange: (value: string) => void;
  timeGranularity: string;
  onTimeGranularityChange: (value: string) => void;
  customDateRange: DateRange | undefined;
  onCustomDateRangeChange: (value: DateRange | undefined) => void;
  previewType: BIChartType;
  previewData: unknown[];
  previewRawData: MetricFlowResponse | null;
  onAddToDashboard: () => void;
};

export function MetricBuilderSheet({
  open,
  onOpenChange,
  search,
  onSearchChange,
  categoryId,
  onCategoryIdChange,
  categories,
  metricsLoading,
  metricsList,
  selectedMetricId,
  onSelectMetric,
  selectedMetric,
  availableDimsDetailed,
  selectedDimType,
  onSelectedDimTypeChange,
  dimSearch,
  onDimSearchChange,
  filteredDims,
  selectedDims,
  onToggleDim,
  timeRange,
  onTimeRangeChange,
  timeGranularity,
  onTimeGranularityChange,
  customDateRange,
  onCustomDateRangeChange,
  previewType,
  previewData,
  previewRawData,
  onAddToDashboard
}: MetricBuilderSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[95vw] sm:max-w-[1100px] p-0">
        <div className="flex h-full flex-col">
          <SheetHeader className="px-6 pt-6 pb-4 border-b">
            <SheetTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-muted-foreground" />
              Build a Chart
            </SheetTitle>
            <SheetDescription>
              Choose a metric, dimensions, and time range, then add it to the dashboard.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-12 gap-6">
              <Card className="col-span-12 lg:col-span-4 h-fit border-l-4 border-l-primary/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    Metric Configuration
                  </CardTitle>
                  <CardDescription>Select metrics and dimensions to analyze</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase">Metric Filter</Label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Search metrics..."
                            value={search}
                            onChange={(e) => onSearchChange(e.target.value)}
                            className="pl-8"
                          />
                        </div>
                        <Select value={categoryId === '' ? 'all' : categoryId} onValueChange={(v) => onCategoryIdChange(v === 'all' ? '' : v)}>
                          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Category" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Categories</SelectItem>
                            {categories.map(c => (
                              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase">Available Metrics</Label>
                      <ScrollArea className="h-[200px] rounded-md border p-2">
                        {metricsLoading ? (
                          <div className="flex items-center justify-center h-full text-muted-foreground">
                            <Loader2 className="h-6 w-6 animate-spin mr-2" />
                            Loading...
                          </div>
                        ) : metricsList.length === 0 ? (
                          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                            No metrics found
                          </div>
                        ) : (
                          <div className="space-y-1">
                            {metricsList.map(m => {
                              const id = m.id ?? m.name;
                              const isSelected = selectedMetricId === id;
                              return (
                                <button
                                  key={id}
                                  onClick={() => onSelectMetric(id, m)}
                                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center justify-between group ${
                                    isSelected
                                      ? 'bg-primary text-primary-foreground shadow-sm'
                                      : 'hover:bg-accent hover:text-accent-foreground'
                                  }`}
                                >
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium truncate">{m.label || m.name}</div>
                                    {m.description && (
                                      <div className={`text-xs truncate ${isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                                        {m.description}
                                      </div>
                                    )}
                                  </div>
                                  {isSelected && <ArrowRight className="h-4 w-4 ml-2 flex-shrink-0" />}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </ScrollArea>
                    </div>
                  </div>

                  <Separator />

                  {selectedMetric ? (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase">Dimensions</Label>
                        {selectedDims.length > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {selectedDims.length} selected
                          </Badge>
                        )}
                      </div>

                      <Tabs value={selectedDimType || 'CATEGORICAL'} onValueChange={onSelectedDimTypeChange} className="w-full">
                        <TabsList className="w-full grid grid-cols-2 mb-2">
                          {Array.from(new Set(availableDimsDetailed.map(inferType))).sort().map(t => (
                            <TabsTrigger key={t} value={t} className="text-xs">
                              {t === 'TIME' ? 'Time' : 'Categorical'}
                            </TabsTrigger>
                          ))}
                        </TabsList>

                        <div className="relative mb-2">
                          <Search className="absolute left-2 top-2.5 h-3 w-3 text-muted-foreground" />
                          <Input
                            value={dimSearch}
                            onChange={(e) => onDimSearchChange(e.target.value)}
                            placeholder="Filter dimensions..."
                            className="h-8 pl-7 text-xs"
                          />
                        </div>

                        <ScrollArea className="h-[180px] rounded-md border p-2">
                          <div className="grid grid-cols-1 gap-1">
                            {filteredDims.map((d) => {
                              const val = d.qualified_name || d.name;
                              const label = d.description || d.qualified_name || d.name;
                              const isChecked = selectedDims.includes(val);
                              return (
                                <label
                                  key={val}
                                  className={`flex items-center gap-2 px-2 py-1.5 rounded-sm cursor-pointer text-sm transition-colors ${
                                    isChecked ? 'bg-accent/50' : 'hover:bg-accent/20'
                                  }`}
                                >
                                  <Checkbox
                                    checked={isChecked}
                                    onCheckedChange={() => onToggleDim(val)}
                                    className="h-4 w-4"
                                  />
                                  <span className="truncate flex-1" title={label}>{label}</span>
                                </label>
                              );
                            })}
                          </div>
                        </ScrollArea>
                      </Tabs>

                      {selectedDimType === 'TIME' && (
                        <div className="space-y-2 mb-4">
                          <Label className="text-xs font-semibold text-muted-foreground uppercase">Time Granularity</Label>
                          <Select value={timeGranularity} onValueChange={onTimeGranularityChange}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                               <SelectItem value="day">Day</SelectItem>
                               <SelectItem value="week">Week</SelectItem>
                               <SelectItem value="month">Month</SelectItem>
                               <SelectItem value="quarter">Quarter</SelectItem>
                               <SelectItem value="year">Year</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase">Time Range</Label>
                        <Select value={timeRange} onValueChange={onTimeRangeChange}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Past 7 days">Past 7 days</SelectItem>
                            <SelectItem value="Past 30 days">Past 30 days</SelectItem>
                            <SelectItem value="Past 90 days">Past 90 days</SelectItem>
                            <SelectItem value="Past year">Past year</SelectItem>
                            <SelectItem value="Custom">Custom Range</SelectItem>
                          </SelectContent>
                        </Select>

                        {timeRange === 'Custom' && (
                          <div className="pt-1 animate-in fade-in slide-in-from-top-1">
                            <DatePickerWithRange
                              date={customDateRange}
                              onSelect={onCustomDateRangeChange}
                              className="w-full"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground bg-muted/30 rounded-lg border border-dashed">
                      <p className="text-sm">Select a metric above to configure dimensions</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="col-span-12 lg:col-span-8 h-full flex flex-col border-l-4 border-l-blue-500/20">
                <CardHeader className="pb-2 border-b">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {previewType === 'line' ? <LineChart className="h-5 w-5 text-blue-500" /> :
                          previewType === 'pie' ? <PieChart className="h-5 w-5 text-purple-500" /> :
                            <BarChart3 className="h-5 w-5 text-green-500" />}
                        Preview
                      </CardTitle>
                      <CardDescription>
                        Real-time preview based on selected metrics and dimensions
                      </CardDescription>
                    </div>
                    {selectedMetric && (
                      <Badge variant="outline" className="text-xs font-mono">
                        Type: {previewType}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex-1 p-6 min-h-[400px] flex flex-col">
                  {selectedMetric ? (
                    <div className="flex-1 w-full h-full min-h-[350px]">
                      <ChartCard
                        card={{
                          id: 'preview',
                          title: `${selectedMetric.name} · ${timeRange}`,
                          metricId: selectedMetric.name,
                          chartType: previewType,
                          size: 'lg',
                          selection: { dimensions: selectedDims, timeRange, timeGranularity }
                        }}
                        data={previewData}
                        sourceData={previewRawData ?? undefined}
                      />
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground space-y-4">
                      <div className="p-4 bg-muted rounded-full">
                        <BarChart3 className="h-8 w-8 opacity-50" />
                      </div>
                      <p>Start by selecting a metric from the configuration panel</p>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="border-t bg-muted/10 py-4 flex justify-between items-center">
                  <div className="text-sm text-muted-foreground">
                    {previewData.length > 0 ? `${previewData.length} data points loaded` : 'No data loaded'}
                  </div>
                  <Button
                    onClick={onAddToDashboard}
                    disabled={!selectedMetric}
                    className="gap-2"
                    size="lg"
                  >
                    <Plus className="h-4 w-4" />
                    Add to Dashboard
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
