import React from 'react';
import PropTypes from 'prop-types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import Skeleton from './Skeleton';
import { EventTriggerItem, EventResultRecord } from '@/models/monitor.models';

interface EventDetailsPanelProps {
  selectedEvent: EventTriggerItem | null;
  records: EventResultRecord[];
  loadingRecords: boolean;
}

const STATUS_MAP: Record<number, { label: string; className: string }> = {
  1: { label: 'Running', className: 'bg-blue-100 text-blue-800 hover:bg-blue-100' },
  2: { label: 'Success', className: 'bg-green-100 text-green-800 hover:bg-green-100' },
  3: { label: 'Failed', className: 'bg-red-100 text-red-800 hover:bg-red-100' },
};

const EventDetailsPanel: React.FC<EventDetailsPanelProps> = ({ selectedEvent, records, loadingRecords }) => {
  const visible = !!selectedEvent && !loadingRecords;
  return (
    <Card className="transition-all">
      <CardHeader>
        <CardTitle>Event Details</CardTitle>
        <CardDescription>
          {selectedEvent ? `Event #${selectedEvent.eventTriggerId} · ${selectedEvent.tableName}` : 'Select an event to view details'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loadingRecords ? (
          <div className="space-y-2">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
          </div>
        ) : selectedEvent ? (
          records.length > 0 ? (
            <div className={`transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}>
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Module</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Table</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>Data Count</TableHead>
                  <TableHead>JSON Count</TableHead>
                  <TableHead>JSON Finished</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Percent</TableHead>
                  <TableHead>Errors</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((r, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{r.moduleName ?? '-'}</TableCell>
                    <TableCell>{r.modelName ?? '-'}</TableCell>
                    <TableCell className="font-mono text-sm">{r.tableName ?? '-'}</TableCell>
                    <TableCell>{r.startTime ?? '-'}</TableCell>
                    <TableCell>{r.dataCount ?? 0}</TableCell>
                    <TableCell>{r.jsonCount ?? 0}</TableCell>
                    <TableCell>{r.jsonFinishedCount ?? 0}</TableCell>
                    <TableCell>
                      {STATUS_MAP[r.status ?? 0] ? (
                        <Badge className={STATUS_MAP[r.status ?? 0].className}>
                          {STATUS_MAP[r.status ?? 0].label}
                        </Badge>
                      ) : (
                        <span className="text-gray-500">#{r.status ?? 0}</span>
                      )}
                    </TableCell>
                    <TableCell>{typeof r.percent === 'number' ? `${Math.round(r.percent * 100) }%` : '-'}</TableCell>
                    <TableCell>{r.errors ?? 0}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-sm text-gray-600">No records found for this event.</div>
          )
        ) : (
          <div className="text-sm text-gray-600">Choose an event from the left to view details.</div>
        )}
      </CardContent>
    </Card>
  );
};

EventDetailsPanel.propTypes = ({
  selectedEvent: PropTypes.shape({
    eventTriggerId: PropTypes.string.isRequired,
    startTime: PropTypes.string,
    endTime: PropTypes.string,
    isFinished: PropTypes.bool,
    status: PropTypes.number,
    type: PropTypes.number,
    tableName: PropTypes.string,
    records: PropTypes.array,
    pipelineId: PropTypes.string,
    params: PropTypes.any,
    createdAt: PropTypes.string.isRequired,
    createdBy: PropTypes.string,
    lastModifiedAt: PropTypes.string,
    lastModifiedBy: PropTypes.string,
    tenantId: PropTypes.string,
  }),
  records: PropTypes.arrayOf(
    PropTypes.shape({
      eventTriggerId: PropTypes.string,
      moduleTriggerId: PropTypes.string,
      modelTriggerId: PropTypes.string,
      tableTriggerId: PropTypes.string,
      moduleName: PropTypes.string,
      modelName: PropTypes.string,
      tableName: PropTypes.string,
      startTime: PropTypes.string,
      dataCount: PropTypes.number,
      jsonCount: PropTypes.number,
      jsonFinishedCount: PropTypes.number,
      status: PropTypes.number,
      percent: PropTypes.number,
      errors: PropTypes.number,
    })
  ).isRequired,
  loadingRecords: PropTypes.bool.isRequired,
}) as unknown as React.WeakValidationMap<EventDetailsPanelProps>;

export default EventDetailsPanel;