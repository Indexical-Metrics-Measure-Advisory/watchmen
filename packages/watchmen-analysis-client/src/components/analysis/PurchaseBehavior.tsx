import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, BarChart2, LineChart } from 'lucide-react';

interface BehaviorItem {
  icon: string;
  title: string;
  description: string;
}

interface PurchaseBehaviorProps {
  title: string;
  description: string;
  behaviors: BehaviorItem[];
}

const PurchaseBehavior: React.FC<PurchaseBehaviorProps> = ({ 
  title,
  description,
  behaviors = [] // Add default empty array
}) => {
  // Add empty check
  if (!behaviors?.length) {
    return (
      <Card className="shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground text-center py-4">
            No behavior data available
          </div>
        </CardContent>
      </Card>
    );
  }
  const getIcon = (type: BehaviorItem['icon']) => {
    switch (type) {
      case 'pie':
        return <PieChart className="h-5 w-5 text-primary shrink-0 mt-0.5" />;
      case 'bar':
        return <BarChart2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />;
      case 'line':
        return <LineChart className="h-5 w-5 text-primary shrink-0 mt-0.5" />;
    }
  };

  return (
    <Card className="shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {behaviors.map((item, index) => (
            <div key={index} className="flex items-start gap-3 p-3 bg-muted/50 rounded-md">
              {getIcon(item.icon)}
              <div>
                <div className="font-medium mb-1">{item.title}</div>
                <div className="text-sm text-muted-foreground">{item.description}</div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default PurchaseBehavior;