import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';

export interface Dimension {
  id: string;
  name: string;
  importance: number;
  subDimensions?: Dimension[];
}

interface DimensionSelectorProps {
  dimensions: Dimension[];
  selectedDimension: string[];
  onDimensionChange: (dimensionIds: string[]) => void;
}

const DimensionSelector: React.FC<DimensionSelectorProps> = ({
  dimensions,
  selectedDimension,
  onDimensionChange,
}) => {
  const handleDimensionToggle = (dimensionId: string) => {
    const newSelection = selectedDimension.includes(dimensionId)
      ? selectedDimension.filter(id => id !== dimensionId)
      : [...selectedDimension, dimensionId];
    onDimensionChange(newSelection);
  };

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Dimension Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            {dimensions.map((dimension) => (
              <div key={dimension.id} className="flex items-center space-x-2">
                <Checkbox
                  id={dimension.id}
                  checked={selectedDimension.includes(dimension.id)}
                  onCheckedChange={() => handleDimensionToggle(dimension.id)}
                />
                <label
                  htmlFor={dimension.id}
                  className="flex items-center justify-between w-full text-sm cursor-pointer"
                >
                  <span>{dimension.name}</span>
                  <Badge variant="secondary" className="ml-2">
                    {dimension.importance.toFixed(1)}%
                  </Badge>
                </label>
              </div>
            ))}
          </div>

          <div className="text-sm text-muted-foreground">
            {dimensions.filter(d => selectedDimension.includes(d.id)).map(dimension => (
              dimension.subDimensions && (
                <div key={dimension.id} className="mt-4">
                  <h4 className="font-medium mb-2">Sub-dimensions for {dimension.name}</h4>
                  <div className="space-y-2">
                    {dimension.subDimensions.map(sub => (
                      <div key={sub.id} className="flex items-center justify-between">
                        <span>{sub.name}</span>
                        <Badge variant="outline">{sub.importance.toFixed(1)}%</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DimensionSelector;