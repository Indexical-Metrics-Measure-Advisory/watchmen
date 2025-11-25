
import React, { useState, useEffect, useCallback, Suspense, useMemo, useRef, useTransition, useDeferredValue } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Activity, RefreshCw, Loader2 } from 'lucide-react';
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
        console.log(data)
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

      console.log("event.eventTriggerId",event.eventTriggerId)
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
    <div className="p-6 space-y-6">
      {/* Hero header */}
      <Card className="border-0 bg-gradient-to-r from-teal-600 to-blue-600 text-white rounded-2xl shadow-md">
        <CardContent className="p-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-white/20 rounded-xl shadow-md">
                <Activity className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">Ingestion Monitor</h1>
                <p className="text-teal-100 mt-1">Track data ingestion across modules</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button onClick={handleRefresh} disabled={refreshing || loadingEvents} className="gap-2 bg-white text-teal-700 hover:bg-teal-50">
                {refreshing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                {refreshing ? "Refreshing..." : "Refresh"}
              </Button>
              
            </div>
          </div>
        </CardContent>
      </Card>
      {/* Two-level UI: Event triggers on top, details below */}
      <div className="grid grid-cols-1 gap-4">
        {/* First-level: Event triggers */}
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle>Event Triggers</CardTitle>
            <CardDescription className="flex items-center justify-between">
              <span>List of triggered events with pagination</span>
              <span className="text-xs text-gray-500">{eventsCount} items</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Filter bar */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
              <div className="flex items-center gap-2 w-full md:w-auto">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by table or event ID"
                  className="w-full md:w-64 px-3 py-2 border rounded-md text-sm"
                  aria-label="Search events"
                />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border rounded-md text-sm"
                  aria-label="Filter by status"
                >
                  <option value="all">All status</option>
                  <option value="0">Status #0</option>
                  <option value="1">Status #1</option>
                  <option value="2">Status #2</option>
                  <option value="3">Status #3</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor="pageSize" className="text-sm text-gray-600">Page size</label>
                <select
                  id="pageSize"
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="px-3 py-2 border rounded-md text-sm"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>
            {loadingEvents ? (
              <div className="py-6 space-y-3">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
              </div>
            ) : (
              <>
                <EventsTable
                  eventsPage={filteredEventsPage}
                  selectedEvent={selectedEvent}
                  onSelectEvent={loadEventRecords}
                  typeLabelMap={TRIGGER_TYPE_LABELS}
                />

                {/* Pagination controls */}
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-gray-600">
                    Page {eventsPage?.pageNumber ?? pageNumber} · Size {eventsPage?.pageSize ?? pageSize} · Items {(eventsPage?.data || []).length}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setPageNumber(Math.max(1, pageNumber - 1))}
                      disabled={pageNumber <= 1 || loadingEvents}
                    >
                      Prev
                    </Button>
                    <Button
                      variant="outline"
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
        <div className={`transition-all ${selectedEvent ? 'opacity-100 translate-y-0' : 'opacity-95 translate-y-[2px]'} duration-300`}>
          <Suspense fallback={<Card><CardContent><div className="py-6 space-y-3"><Skeleton className="h-6 w-full" /><Skeleton className="h-6 w-full" /></div></CardContent></Card>}>
            <EventDetailsPanel selectedEvent={selectedEvent} records={records} loadingRecords={loadingRecords} />
          </Suspense>
        </div>
      </div>

     
    </div>
  );
};

export default Monitor;
