
import React, { useState, useEffect, useCallback, Suspense, useMemo, useRef, useTransition, useDeferredValue } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, Loader2, Search, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { collectorService } from '@/services';
import { EventTriggerItem, PaginatedEventsResponse, EventResultRecord } from '@/models/monitor.models';
import { toast } from '@/hooks/use-toast';
import Skeleton from '@/components/ui/monitor/Skeleton';
import EventsTable from '@/components/ui/monitor/EventsTable';
const EventDetailsPanel = React.lazy(() => import('@/components/ui/monitor/EventDetailsPanel'));

// Trigger type display mapping
const TRIGGER_TYPE_LABELS: Record<number, string> = {
  1: 'DEFAULT',
  2: 'BY_TABLE',
  3: 'BY_RECORD',
  4: 'BY_PIPELINE',
  5: 'BY_SCHEDULE',
};

const Monitor = () => {
  // Pagination state for first-level events
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [eventsPage, setEventsPage] = useState<PaginatedEventsResponse | null>(null);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // Filters
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const deferredQuery = useDeferredValue(query);
  const [, startTransition] = useTransition();

  // Second-level details state
  const [selectedEvent, setSelectedEvent] = useState<EventTriggerItem | null>(null);
  const [records, setRecords] = useState<EventResultRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);

  // Performance metrics
  const perfRef = useRef({
    eventsFetchMs: 0,
    eventsRenderMs: 0,
    recordsFetchMs: 0,
    recordsRenderMs: 0,
  });

  // Fetch first-level events when pageNumber/pageSize changes
  useEffect(() => {
    const fetchEvents = async () => {
      setLoadingEvents(true);
      try {
        const t0 = performance.now();
        const data = await collectorService.getMonitorEvents({ pageNumber, pageSize });
        const t1 = performance.now();
        // console.log(data)
        perfRef.current.eventsFetchMs = Math.round(t1 - t0);
        startTransition(() => setEventsPage(data));
      } catch (error: any) {
        toast({
          title: 'Error Fetching Events',
          description: error?.message || 'Failed to fetch event triggers',
          variant: 'destructive',
        });
        startTransition(() => setEventsPage({ pageNumber, pageSize, data: [] }));
      } finally {
        setLoadingEvents(false);
      }
    };
    fetchEvents();
  }, [pageNumber, pageSize]);

  // Measure render time when events page updates
  useEffect(() => {
    const t0 = performance.now();
    // Next tick after state applied
    const id = requestAnimationFrame(() => {
      const t1 = performance.now();
      perfRef.current.eventsRenderMs = Math.round(t1 - t0);
    });
    return () => cancelAnimationFrame(id);
  }, [eventsPage]);

  // Load records for selected event
  const loadEventRecords = useCallback(async (event: EventTriggerItem) => {
    startTransition(() => setSelectedEvent(event));
    setLoadingRecords(true);
    try {
      const t0 = performance.now();

      // console.log("event.eventTriggerId",event.eventTriggerId)
      const data = await collectorService.getMonitorEventRecords(event.eventTriggerId);
      const t1 = performance.now();
      perfRef.current.recordsFetchMs = Math.round(t1 - t0);
      startTransition(() => setRecords(data || []));
    } catch (error: any) {
      toast({
        title: 'Error Fetching Details',
        description: error?.message || 'Failed to fetch event result records',
        variant: 'destructive',
      });
      startTransition(() => setRecords([]));
    } finally {
      setLoadingRecords(false);
    }
  }, []);

  useEffect(() => {
    const t0 = performance.now();
    const id = requestAnimationFrame(() => {
      const t1 = performance.now();
      perfRef.current.recordsRenderMs = Math.round(t1 - t0);
    });
    return () => cancelAnimationFrame(id);
  }, [records, loadingRecords]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const t0 = performance.now();
      const events = await collectorService.getMonitorEvents({ pageNumber, pageSize });
      const t1 = performance.now();
      perfRef.current.eventsFetchMs = Math.round(t1 - t0);
      startTransition(() => setEventsPage(events));
      // If an event is selected, refresh its records
      if (selectedEvent) {
        const r0 = performance.now();
        const res = await collectorService.getMonitorEventRecords(selectedEvent.eventTriggerId);
        const r1 = performance.now();
        perfRef.current.recordsFetchMs = Math.round(r1 - r0);
        startTransition(() => setRecords(res || []));
      }
    } catch (error: any) {
      toast({
        title: 'Refresh Failed',
        description: error?.message || 'Failed to refresh data',
        variant: 'destructive',
      });
    } finally {
      setRefreshing(false);
    }
  }, [pageNumber, pageSize, selectedEvent]);

  const eventsCount = useMemo(() => (eventsPage?.data?.length ?? 0), [eventsPage]);
  const filteredEventsPage = useMemo<PaginatedEventsResponse | null>(() => {
    if (!eventsPage) return null;
    const q = deferredQuery.trim().toLowerCase();
    const matchStatus = (evt: EventTriggerItem) => {
      if (statusFilter === 'all') return true;
      try {
        const num = Number(statusFilter);
        return evt.status === num;
      } catch {
        return true;
      }
    };
    const data = eventsPage.data.filter(evt => {
      const hit = !q
        || (evt.tableName?.toLowerCase().includes(q))
        || (String(evt.eventTriggerId).includes(q));
      return hit && matchStatus(evt);
    });
    return { ...eventsPage, data };
  }, [eventsPage, deferredQuery, statusFilter]);

  return (
    <div className="p-6 space-y-6 bg-gray-50/50 min-h-screen">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Ingestion Monitor</h1>
          <p className="text-muted-foreground">
            Real-time tracking of data ingestion events and status
          </p>
        </div>
        <Button 
          onClick={handleRefresh} 
          disabled={refreshing || loadingEvents} 
          variant="outline"
          className="gap-2"
        >
          {refreshing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          {refreshing ? "Refreshing..." : "Refresh Data"}
        </Button>
      </div>

      {/* Two-level UI: Event triggers on top, details below */}
      <div className="grid grid-cols-1 gap-6">
        {/* First-level: Event triggers */}
        <Card className="shadow-sm border-gray-200">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold">Event Triggers</CardTitle>
                <CardDescription>
                  Showing {eventsCount} events
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Filter bar */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6 p-4 bg-gray-50/50 rounded-lg border border-gray-100">
              <div className="flex items-center gap-4 w-full md:w-auto flex-1">
                <div className="relative w-full md:w-72">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                  <Input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search table or ID..."
                    className="pl-9 bg-white"
                  />
                </div>
                <div className="w-48">
                  <Select
                    value={statusFilter}
                    onValueChange={setStatusFilter}
                  >
                    <SelectTrigger className="bg-white">
                      <div className="flex items-center gap-2">
                        <Filter className="h-3.5 w-3.5 text-gray-500" />
                        <SelectValue placeholder="Filter status" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="0">Status #0</SelectItem>
                      <SelectItem value="1">Status #1</SelectItem>
                      <SelectItem value="2">Status #2</SelectItem>
                      <SelectItem value="3">Status #3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 whitespace-nowrap">Rows per page</span>
                <Select
                  value={String(pageSize)}
                  onValueChange={(val) => setPageSize(Number(val))}
                >
                  <SelectTrigger className="w-[80px] bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {loadingEvents ? (
              <div className="py-6 space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : (
              <>
                <div className="rounded-md border">
                  <EventsTable
                    eventsPage={filteredEventsPage}
                    selectedEvent={selectedEvent}
                    onSelectEvent={loadEventRecords}
                    typeLabelMap={TRIGGER_TYPE_LABELS}
                  />
                </div>

                {/* Pagination controls */}
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-gray-500">
                    Showing page {eventsPage?.pageNumber ?? pageNumber} of {Math.ceil((eventsPage?.data?.length || 0) / pageSize) || 1}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPageNumber(Math.max(1, pageNumber - 1))}
                      disabled={pageNumber <= 1 || loadingEvents}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPageNumber(pageNumber + 1)}
                      disabled={loadingEvents || (eventsPage && (eventsPage.data?.length ?? 0) < pageSize)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Second-level: Details (stacked below) */}
        <div className={`transition-all duration-300 ease-in-out ${selectedEvent ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none h-0 overflow-hidden'}`}>
          <Suspense fallback={<Card><CardContent><div className="py-6 space-y-3"><Skeleton className="h-6 w-full" /><Skeleton className="h-6 w-full" /></div></CardContent></Card>}>
            <EventDetailsPanel selectedEvent={selectedEvent} records={records} loadingRecords={loadingRecords} />
          </Suspense>
        </div>
      </div>
    </div>
  );
};

export default Monitor;
