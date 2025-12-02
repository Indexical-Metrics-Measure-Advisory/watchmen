import React, { useState } from 'react';
import { Download, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChartMessage } from '@/model/chat';

interface ChartMessageProps {
  message: ChartMessage;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

export const ChartMessageComponent: React.FC<ChartMessageProps> = ({
  message,
  isExpanded,
  onToggleExpand
}) => {
  const metadata = message.metadata || {};
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleExport = () => {
    // 导出图表数据
    if (metadata.chartData) {
      const dataStr = JSON.stringify(metadata.chartData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${metadata.title || 'chart-data'}.json`;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  const renderChart = () => {
    const { chartType, chartData, chartOptions } = metadata;

    if (!chartData || chartData.length === 0) {
      return (
        <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
          <div className="text-gray-500">No data available</div>
        </div>
      );
    }

    // 简化的图表渲染 - 在实际项目中可以使用Chart.js或Recharts
    const renderSimpleChart = () => {
      switch (chartType) {
        case 'bar':
          return renderBarChart();
        case 'line':
          return renderLineChart();
        case 'pie':
          return renderPieChart();
        default:
          return renderDefaultChart();
      }
    };

    const renderBarChart = () => {
      const maxValue = Math.max(...chartData.map((d: any) => d.value || 0));
      return (
        <div className="space-y-2">
          {chartData.map((item: any, index: number) => {
            const height = maxValue > 0 ? (item.value / maxValue) * 200 : 0;
            return (
              <div key={index} className="flex items-center space-x-2">
                <div className="w-20 text-sm text-gray-600 truncate">{item.label}</div>
                <div className="flex-1 bg-gray-200 rounded">
                  <div
                    className="bg-blue-500 rounded transition-all duration-300"
                    style={{ height: '20px', width: `${height}%` }}
                  />
                </div>
                <div className="w-12 text-sm text-gray-600">{item.value}</div>
              </div>
            );
          })}
        </div>
      );
    };

    const renderLineChart = () => {
      const points = chartData.map((d: any, i: number) => ({
        x: i * 40,
        y: 150 - (d.value / Math.max(...chartData.map((item: any) => item.value))) * 100
      }));

      const pathData = points.reduce((path: string, point: any, index: number) => {
        return path + (index === 0 ? `M ${point.x} ${point.y}` : ` L ${point.x} ${point.y}`);
      }, '');

      return (
        <svg width="100%" height="200" viewBox="0 0 400 200" className="border rounded">
          <path
            d={pathData}
            stroke="#3b82f6"
            strokeWidth="2"
            fill="none"
          />
          {points.map((point: any, index: number) => (
            <circle key={index} cx={point.x} cy={point.y} r="4" fill="#3b82f6" />
          ))}
        </svg>
      );
    };

    const renderPieChart = () => {
      const total = chartData.reduce((sum: number, d: any) => sum + (d.value || 0), 0);
      let currentAngle = 0;
      const radius = 80;
      const centerX = 100;
      const centerY = 100;

      const slices = chartData.map((item: any, index: number) => {
        const sliceAngle = (item.value / total) * 360;
        const startAngle = currentAngle;
        const endAngle = currentAngle + sliceAngle;
        currentAngle += sliceAngle;

        const x1 = centerX + radius * Math.cos((startAngle - 90) * Math.PI / 180);
        const y1 = centerY + radius * Math.sin((startAngle - 90) * Math.PI / 180);
        const x2 = centerX + radius * Math.cos((endAngle - 90) * Math.PI / 180);
        const y2 = centerY + radius * Math.sin((endAngle - 90) * Math.PI / 180);

        const largeArcFlag = sliceAngle > 180 ? 1 : 0;

        return {
          path: `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`,
          color: `hsl(${index * 360 / chartData.length}, 70%, 50%)`,
          label: item.label,
          value: item.value
        };
      });

      return (
        <div className="flex justify-center">
          <svg width="200" height="200" viewBox="0 0 200 200">
            {slices.map((slice: any, index: number) => (
              <g key={index}>
                <path
                  d={slice.path}
                  fill={slice.color}
                  stroke="white"
                  strokeWidth="1"
                />
              </g>
            ))}
          </svg>
        </div>
      );
    };

    const renderDefaultChart = () => (
      <div className="p-4 bg-gray-50 rounded-lg">
        <div className="text-center">
          <div className="text-lg font-semibold text-gray-700">{metadata.title || 'Data Visualization'}</div>
          <div className="text-sm text-gray-500 mt-2">{metadata.description || message.content}</div>
          <div className="mt-4 text-xs text-gray-400">
            Chart Type: {chartType || 'unknown'}
          </div>
        </div>
      </div>
    );

    return (
      <div className={`bg-white border rounded-lg p-4 ${isExpanded ? 'w-full' : 'w-full max-w-md'}`}>
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">{metadata.title || 'Chart'}</h3>
            <p className="text-sm text-gray-600">{metadata.description || message.content}</p>
          </div>
          <div className="flex space-x-2">
            {metadata.exportable && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleExport}
                className="p-1 h-6 w-6"
              >
                <Download className="h-3 w-3" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleExpand}
              className="p-1 h-6 w-6"
            >
              {isExpanded ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
            </Button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          {renderSimpleChart()}
        </div>

        {metadata.dataSource && (
          <div className="mt-2 text-xs text-gray-500">
            Data Source: {metadata.dataSource}
          </div>
        )}
      </div>
    );
  };

  return renderChart();
};