import React from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { addDays } from 'date-fns';
import { DatePickerWithRange } from '../ui/date-range-picker';
import { AnalysisDimension } from '@/model/Metric';


interface AnalysisDimensionSelectorProps {
  dimensions: AnalysisDimension[];
  selectedTimeDimension: string;
  selectedAnalysisDimensions: string[];
  dateRange: {
    from: Date;
    to: Date;
  };
  onTimeDimensionChange: (dimensionId: string) => void;
  onAnalysisDimensionsChange: (dimensionIds: string[]) => void;
  onDateRangeChange: (range: { from: Date; to: Date }) => void;
}

const AnalysisDimensionSelector: React.FC<AnalysisDimensionSelectorProps> = ({
  dimensions,
  selectedTimeDimension,
  selectedAnalysisDimensions,
  dateRange,
  onTimeDimensionChange,
  onAnalysisDimensionsChange,
  onDateRangeChange,
}) => {
  const timeDimensions = dimensions.filter(d => d.type === 'time');
  const analysisDimensions = dimensions.filter(d => d.type === 'category');

  return (
    <Card className="p-4 mb-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 时间维度选择 */}
        <div>
          <Label className="mb-2 block">Time Dimension</Label>
          <Select value={selectedTimeDimension} onValueChange={onTimeDimensionChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select Time Dimension" />
            </SelectTrigger>
            <SelectContent>
              {timeDimensions.map(dimension => (
                <SelectItem key={dimension.id} value={dimension.id}>
                  {dimension.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 时间范围选择 */}
        <div className="col-span-2">
          <Label className="mb-2 block">Date Range</Label>
          <DatePickerWithRange
            date={{
              from: dateRange.from,
              to: dateRange.to,
            }}
            onSelect={onDateRangeChange}
          />
        </div>

        {/* 分析维度选择 */}
        <div className="md:col-span-3">
          <Label className="mb-2 block">Analysis Dimension</Label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {analysisDimensions.map(dimension => (
              <Select
                key={dimension.id}
                value={selectedAnalysisDimensions.includes(dimension.id) ? dimension.id : ''}
                onValueChange={(value) => {
                  const newDimensions = value
                    ? [...selectedAnalysisDimensions, value]
                    : selectedAnalysisDimensions.filter(d => d !== dimension.id);
                  onAnalysisDimensionsChange(newDimensions);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={`Select ${dimension.name}`} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {dimension.options?.map(option => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default AnalysisDimensionSelector;