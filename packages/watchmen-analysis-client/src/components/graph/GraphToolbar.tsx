
import React from 'react';
import { Button } from '@/components/ui/button';
import {
  ZoomIn, ZoomOut, Focus, RefreshCw
} from 'lucide-react';

interface GraphToolbarProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  onRefresh: () => void;
  onHelp: () => void;
  className?: string;
}

const GraphToolbar: React.FC<GraphToolbarProps> = ({
  onZoomIn,
  onZoomOut,
  onFitView,
  onRefresh,
  onHelp,
  className
}) => {
  return (
    <div className="flex gap-3">
      <div className="flex overflow-hidden rounded-md border shadow-sm">
        <Button onClick={onZoomIn} variant="ghost" size="icon" className="rounded-none border-r" title="Zoom In">
          <ZoomIn className="size-4" />
        </Button>
        <Button onClick={onZoomOut} variant="ghost" size="icon" className="rounded-none border-r" title="Zoom Out">
          <ZoomOut className="size-4" />
        </Button>
        <Button onClick={onFitView} variant="ghost" size="icon" className="rounded-none border-r" title="Fit View">
          <Focus className="size-4" />
        </Button>
        <Button onClick={onRefresh} variant="ghost" size="icon" className="rounded-none" title="Refresh">
          <RefreshCw className="size-4" />
        </Button>
      </div>
      
      {/* <div className="flex overflow-hidden rounded-md border shadow-sm">
        <Button variant="ghost" size="icon" className="rounded-none border-r" title="Undo">
          <ArrowLeft className="size-4" />
        </Button>
        <Button variant="ghost" size="icon" className="rounded-none" title="Redo">
          <ArrowRight className="size-4" />
        </Button>
      </div> */}
      
      {/* <div className="flex overflow-hidden rounded-md border shadow-sm ml-auto">
        <Button variant="ghost" size="icon" className="rounded-none border-r" title="Download">
          <Download className="size-4" />
        </Button>
        <Button onClick={onHelp} variant="ghost" size="icon" className="rounded-none" title="Help">
          <HelpCircle className="size-4" />
        </Button>
      </div> */}
    </div>
  );
};

export default GraphToolbar;
