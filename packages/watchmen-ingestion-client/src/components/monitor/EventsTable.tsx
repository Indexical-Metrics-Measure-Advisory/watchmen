import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PaginatedEventsResponse, EventTriggerItem } from '@/models/monitor.models';

interface EventsTableProps {
  eventsPage: PaginatedEventsResponse | null;
  selectedEvent: EventTriggerItem | null;
  onSelectEvent: (evt: EventTriggerItem) => void;
  typeLabelMap?: Record<number, string>;
}

// --- Time formatting helpers (business-friendly) ---
function parseDate(raw?: string | null): Date | null {
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function formatTimestamp(date: Date): string {
  const y = date.getFullYear();
  const m = pad2(date.getMonth() + 1);
  const d = pad2(date.getDate());
  const hh = pad2(date.getHours());
  const mm = pad2(date.getMinutes());
  const ss = pad2(date.getSeconds());
  return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
}

function formatRelative(date: Date, baseMs = Date.now()): string {
  const diffMs = baseMs - date.getTime();
  const abs = Math.abs(diffMs);
  const sec = Math.floor(abs / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  if (day > 0) return diffMs >= 0 ? `${day}d ago` : `in ${day}d`;
  if (hr > 0) return diffMs >= 0 ? `${hr}h ago` : `in ${hr}h`;
  if (min > 0) return diffMs >= 0 ? `${min}m ago` : `in ${min}m`;
  return diffMs >= 0 ? `${sec}s ago` : `in ${sec}s`;
}

function formatDuration(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  if (days) return `${days}d ${hours}h`;
  if (hours) return `${hours}h ${minutes}m`;
  if (minutes) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

const EventsTable: React.FC<EventsTableProps> = ({ eventsPage, selectedEvent, onSelectEvent, typeLabelMap }) => {
  const rows = useMemo(() => eventsPage?.data ?? [], [eventsPage]);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Event ID</TableHead>
          <TableHead>Table</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Start</TableHead>
          <TableHead>End</TableHead>
          <TableHead>Created At</TableHead>
          <TableHead>Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((evt) => (
          <TableRow
            key={evt.eventTriggerId}
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter') onSelectEvent(evt); }}
            className={(selectedEvent?.eventTriggerId === evt.eventTriggerId ? 'bg-blue-50 ' : '') + 'hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-300'}
          >
            <TableCell className="font-mono text-sm">{evt.eventTriggerId}</TableCell>
            <TableCell className="font-mono text-sm">{evt.tableName}</TableCell>
            <TableCell>
              <Badge className={evt.isFinished ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}>
                {evt.isFinished ? 'Finished' : 'Running'} (#{evt.status})
              </Badge>
            </TableCell>
            <TableCell>
              {typeLabelMap?.[evt.type] ? (
                <span className="text-sm">{typeLabelMap[evt.type]} <span className="text-xs text-gray-500">(#{evt.type})</span></span>
              ) : (
                <span className="text-sm">#{evt.type}</span>
              )}
            </TableCell>
            {/* Start time (formatted + relative) */}
            <TableCell title={evt.startTime ?? ''}>
              {(() => {
                const startDt = parseDate(evt.startTime);
                if (!startDt) return '-';
                return (
                  <div className="flex flex-col">
                    <span className="font-mono text-sm">{formatTimestamp(startDt)}</span>
                    <span className="text-xs text-gray-500">{formatRelative(startDt)}</span>
                  </div>
                );
              })()}
            </TableCell>
            {/* End time (formatted + duration or progress) */}
            <TableCell title={evt.endTime ?? ''}>
              {(() => {
                const startDt = parseDate(evt.startTime);
                const endDt = parseDate(evt.endTime);
                if (endDt) {
                  const dur = startDt ? endDt.getTime() - startDt.getTime() : undefined;
                  return (
                    <div className="flex flex-col">
                      <span className="font-mono text-sm">{formatTimestamp(endDt)}</span>
                      <span className="text-xs text-gray-500">{dur !== undefined ? `Duration: ${formatDuration(dur)}` : formatRelative(endDt)}</span>
                    </div>
                  );
                }
                if (startDt && !evt.isFinished) {
                  const elapsed = Date.now() - startDt.getTime();
                  return (
                    <div className="flex flex-col">
                      <span className="text-sm text-gray-700">In progress</span>
                      <span className="text-xs text-gray-500">+{formatDuration(elapsed)}</span>
                    </div>
                  );
                }
                return '-';
              })()}
            </TableCell>
            <TableCell>{evt.createdAt}</TableCell>
            <TableCell>
              <Button variant="outline" size="sm" onClick={() => onSelectEvent(evt)}>View Details</Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

EventsTable.propTypes = ({
  eventsPage: PropTypes.shape({
    pageNumber: PropTypes.number.isRequired,
    pageSize: PropTypes.number.isRequired,
    data: PropTypes.arrayOf(
      PropTypes.shape({
        eventTriggerId: PropTypes.number.isRequired,
        startTime: PropTypes.string,
        endTime: PropTypes.string,
        isFinished: PropTypes.bool,
        status: PropTypes.number,
        type: PropTypes.number,
        tableName: PropTypes.string,
        records: PropTypes.array,
        pipelineId: PropTypes.number,
        params: PropTypes.any,
        createdAt: PropTypes.string.isRequired,
        createdBy: PropTypes.string,
        lastModifiedAt: PropTypes.string,
        lastModifiedBy: PropTypes.string,
        tenantId: PropTypes.string,
      })
    ).isRequired,
    total: PropTypes.number,
    totalPages: PropTypes.number,
  }),
  selectedEvent: PropTypes.shape({
    eventTriggerId: PropTypes.number.isRequired,
    startTime: PropTypes.string,
    endTime: PropTypes.string,
    isFinished: PropTypes.bool,
    status: PropTypes.number,
    type: PropTypes.number,
    tableName: PropTypes.string,
    records: PropTypes.array,
    pipelineId: PropTypes.number,
    params: PropTypes.any,
    createdAt: PropTypes.string.isRequired,
    createdBy: PropTypes.string,
    lastModifiedAt: PropTypes.string,
    lastModifiedBy: PropTypes.string,
    tenantId: PropTypes.string,
  }),
  typeLabelMap: PropTypes.objectOf(PropTypes.string),
  onSelectEvent: PropTypes.func.isRequired,
}) as unknown as React.WeakValidationMap<EventsTableProps>;

export default React.memo(EventsTable);