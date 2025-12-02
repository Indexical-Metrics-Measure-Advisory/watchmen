import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, X } from 'lucide-react';

interface ChatHeaderProps {
  onBack?: () => void;
  onClose?: () => void;
  title?: string;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({ 
  onBack, 
  onClose, 
  title = "AI Assistant" 
}) => {
  return (
    <div className="p-4 border-b border-gray-200 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {onBack && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="rounded-full h-8 w-8 p-0 hover:bg-gray-100"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      {onClose && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="rounded-full h-8 w-8 p-0 hover:bg-gray-100"
          title="Back to Dashboard"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};