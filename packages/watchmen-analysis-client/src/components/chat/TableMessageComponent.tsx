import React, { useState, useMemo } from 'react';
import { Download, Filter, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TableMessage } from '@/model/chat';

interface TableMessageProps {
  message: TableMessage;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

export const TableMessageComponent: React.FC<TableMessageProps> = ({
  message,
  isExpanded,
  onToggleExpand
}) => {
  const metadata = message.metadata || {};
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filterText, setFilterText] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const {
    tableData = [],
    tableHeaders = [],
    title = 'Data Table',
    description = message.content,
    sortable = true,
    filterable = true,
    exportable = true,
    pagination = true,
    pageSize = 10
  } = metadata;

  // 处理排序
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // 过滤和排序数据
  const processedData = useMemo(() => {
    let filtered = tableData.filter((row: any) => {
      if (!filterText) return true;
      return Object.values(row).some(value =>
        String(value).toLowerCase().includes(filterText.toLowerCase())
      );
    });

    if (sortField) {
      filtered.sort((a: any, b: any) => {
        const aVal = a[sortField];
        const bVal = b[sortField];
        
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
        }
        
        return sortDirection === 'asc' 
          ? String(aVal).localeCompare(String(bVal))
          : String(bVal).localeCompare(String(aVal));
      });
    }

    return filtered;
  }, [tableData, filterText, sortField, sortDirection]);

  // 分页
  const totalPages = Math.ceil(processedData.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedData = processedData.slice(startIndex, startIndex + pageSize);

  // 导出数据
  const handleExport = () => {
    const exportData = {
      headers: tableHeaders,
      data: processedData,
      title,
      description,
      exportDate: new Date().toISOString()
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    if (processedData.length === 0) return;

    const headers = tableHeaders.join(',');
    const rows = processedData.map((row: any) => 
      tableHeaders.map(header => 
        String(row[header] || '').replace(/,/g, ';')
      ).join(',')
    );

    const csvContent = [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`bg-white border rounded-lg ${isExpanded ? 'w-full' : 'w-full max-w-4xl'}`}>
      <div className="p-4 border-b">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
            <p className="text-sm text-gray-600 mt-1">{description}</p>
          </div>
          <div className="flex space-x-2">
            {exportable && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleExport}
                  className="p-1 h-6 w-6"
                  title="Export as JSON"
                >
                  <Download className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleExportCSV}
                  className="text-xs px-2 h-6"
                  title="Export as CSV"
                >
                  CSV
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleExpand}
              className="p-1 h-6 w-6"
            >
              {isExpanded ? '−' : '+'}
            </Button>
          </div>
        </div>

        {filterable && (
          <div className="mt-3">
            <Input
              type="text"
              placeholder="Filter data..."
              value={filterText}
              onChange={(e) => {
                setFilterText(e.target.value);
                setCurrentPage(1);
              }}
              className="max-w-xs"
            />
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {tableHeaders.map((header: string, index: number) => (
                <th
                  key={index}
                  className="px-4 py-2 text-left font-medium text-gray-700 border-b"
                >
                  <div className="flex items-center space-x-1">
                    <span>{header}</span>
                    {sortable && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort(header)}
                        className="p-0 h-4 w-4"
                      >
                        <ArrowUpDown className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((row: any, rowIndex: number) => (
              <tr key={rowIndex} className="hover:bg-gray-50">
                {tableHeaders.map((header: string, colIndex: number) => (
                  <td
                    key={colIndex}
                    className="px-4 py-2 border-b text-gray-800"
                  >
                    {row[header] !== null && row[header] !== undefined 
                      ? String(row[header]) 
                      : '-'
                    }
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {processedData.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No data available{filterText && ' matching your filter'}
          </div>
        )}
      </div>

      {pagination && processedData.length > pageSize && (
        <div className="flex justify-between items-center p-4 border-t">
          <div className="text-sm text-gray-600">
            Showing {startIndex + 1}-{Math.min(startIndex + pageSize, processedData.length)} of {processedData.length} entries
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-2 py-1 text-sm">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};