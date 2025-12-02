
import React from 'react';
import { ArrowDown, ArrowUp, ArrowRight, AlertCircle, Info, Pencil, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import MetricEditDialog from './MetricEditDialog';
import { AlertIndicator } from './AlertIndicator';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { MetricType } from '@/model/Metric';



interface MetricCardProps {
  metric: MetricType;
  className?: string;
  onClick?: (id: string) => void;
  showAlert?: boolean;
  onEdit?: (metric: MetricType) => void;
}

const MetricCard: React.FC<MetricCardProps> = ({ metric, className, onClick, showAlert = true, onEdit }) => {
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) {
      setEditDialogOpen(true);
    }
  };
  const { id, name, value,valueReadable, unit, change, status, description, lastUpdated } = metric;

  const statusConfig = {
    positive: {
      icon: <ArrowUp className="h-3 w-3" />,
      class: 'text-green-600 bg-green-50 dark:bg-green-950/40 dark:text-green-400',
    },
    negative: {
      icon: <ArrowDown className="h-3 w-3" />,
      class: 'text-red-600 bg-red-50 dark:bg-red-950/40 dark:text-red-400',
    },
    neutral: {
      icon: <ArrowRight className="h-3 w-3" />,
      class: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-400',
    },
  };

  const formattedChange = Math.abs(change).toFixed(1);
  const { icon, class: statusClass } = statusConfig[status];

  return (
    <Card
      className={cn(
        "glass-card hover:shadow-glass-hover transition-all duration-300", 
        className
      )}

    >
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="space-y-1.5">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              {name}
              {description && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs text-xs">{description}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground/75">
              {status === 'positive' ? 'Improved compared to previous period' : status === 'negative' ? 'Decreased compared to previous period' : 'Stable compared to previous period'}
            </CardDescription>
          </div>
          {onEdit && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleEdit}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      {onEdit && (
        <MetricEditDialog
          metric={metric}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onSave={onEdit}
        />
      )}
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-end gap-2">
            <div className="text-2xl font-semibold">
              {valueReadable || value.toString()}
              <span className="text-sm ml-1 font-normal text-muted-foreground">{unit}</span>
            </div>
            
            <div className={cn("text-xs px-2 py-1 rounded-md flex items-center gap-1.5", statusClass)}>
              {icon}
              <span className="font-medium">{formattedChange}%</span>
            </div>
          </div>
          
          <div className="text-xs text-muted-foreground/90 space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">Trend: </span>
              <span>{status === 'positive' ? 'Upward' : status === 'negative' ? 'Downward' : 'Stable'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">Change Rate: </span>
              <span>{formattedChange}% ({status === 'positive' ? 'Increase' : status === 'negative' ? 'Decrease' : 'No change'})</span>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-0 flex justify-between items-center">
        <div className="text-xs text-muted-foreground">
          Last updated on {new Date(lastUpdated).toLocaleDateString()}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="text-xs"
          onClick={(e) => {
            e.stopPropagation();
            onClick && onClick(id);
          }}
        >
          <ExternalLink className="h-3 w-3 mr-1" />
          View Details
        </Button>
      </CardFooter>
    </Card>
  );
};

export default MetricCard;
