import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PaginatedEventsResponse, EventTriggerItem } from '@/models/monitor.models';
import { useTranslation } from 'react-i18next';
import { formatDateTime, formatDuration, formatRelativeTime } from '@/i18n/utils/format';

interface EventsTableProps {
  eventsPage: PaginatedEventsResponse | null;
  selectedEvent: EventTriggerItem | null;
  onSelectEvent: (evt: EventTriggerItem) => void;
  typeLabelMap?: Record<number, string>;
}

function parseDate(raw?: string | null): Date | null {
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

const EventsTable: React.FC<EventsTableProps> = ({ eventsPage, selectedEvent, onSelectEvent, typeLabelMap }) => {
  const { t, i18n } = useTranslation(['common', 'monitor']);
  const locale = i18n.resolvedLanguage ?? 'en';
  const rows = useMemo(() => eventsPage?.data ?? [], [eventsPage]);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t('monitor:table.eventId')}</TableHead>
          <TableHead>{t('monitor:table.table')}</TableHead>
          <TableHead>{t('monitor:table.status')}</TableHead>
          <TableHead>{t('monitor:table.type')}</TableHead>
          <TableHead>{t('monitor:table.start')}</TableHead>
          <TableHead>{t('monitor:table.end')}</TableHead>
          <TableHead>{t('monitor:table.createdAt')}</TableHead>
          <TableHead>{t('monitor:table.action')}</TableHead>
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
                {evt.isFinished ? t('monitor:statusLabel.finished') : t('monitor:statusLabel.running')} (#{evt.status})
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
                    <span className="font-mono text-sm">{formatDateTime(startDt)}</span>
                    <span className="text-xs text-gray-500">{formatRelativeTime(startDt, locale)}</span>
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
                      <span className="font-mono text-sm">{formatDateTime(endDt)}</span>
                      <span className="text-xs text-gray-500">
                        {dur !== undefined
                          ? t('monitor:end.duration', { value: formatDuration(dur, locale) })
                          : formatRelativeTime(endDt, locale)}
                      </span>
                    </div>
                  );
                }
                if (startDt && !evt.isFinished) {
                  const elapsed = Date.now() - startDt.getTime();
                  return (
                    <div className="flex flex-col">
                      <span className="text-sm text-gray-700">{t('monitor:end.inProgress')}</span>
                      <span className="text-xs text-gray-500">{t('monitor:end.elapsed', { value: formatDuration(elapsed, locale) })}</span>
                    </div>
                  );
                }
                return '-';
              })()}
            </TableCell>
            <TableCell>{formatDateTime(evt.createdAt)}</TableCell>
            <TableCell>
              <Button variant="outline" size="sm" onClick={() => onSelectEvent(evt)}>{t('common:viewDetails')}</Button>
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
      })
    ).isRequired,
    total: PropTypes.number,
    totalPages: PropTypes.number,
  }),
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
  typeLabelMap: PropTypes.objectOf(PropTypes.string),
  onSelectEvent: PropTypes.func.isRequired,
}) as unknown as React.WeakValidationMap<EventsTableProps>;

export default React.memo(EventsTable);
