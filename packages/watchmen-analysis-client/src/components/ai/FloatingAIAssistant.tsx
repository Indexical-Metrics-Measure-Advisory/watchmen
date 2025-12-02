
import React, { useState } from 'react';
import AIAssistant from './AIAssistant';
import { Button } from '@/components/ui/button';
import { BrainCircuit, Maximize2, Minimize2 } from 'lucide-react';

const FloatingAIAssistant: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
    if (isMinimized) setIsMinimized(false);
  };

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
    if (!isMinimized && isCollapsed) {
      setIsCollapsed(false);
    }
  };

  if (isMinimized) {
    return (
      <Button 
        className="fixed right-6 bottom-6 h-12 w-12 rounded-full shadow-lg z-50 animate-fade-in"
        onClick={toggleMinimize}
      >
        <BrainCircuit className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <div className={`fixed right-6 bottom-6 z-50 transition-all duration-300 animate-fade-in ${isCollapsed ? 'w-auto' : 'w-80 md:w-96'}`}>
      <div className="relative">
        {!isCollapsed && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute -top-10 right-0 h-8 w-8 bg-background/80 backdrop-blur-sm"
            onClick={toggleMinimize}
          >
            <Minimize2 className="h-4 w-4" />
          </Button>
        )}
        <AIAssistant 
          isCollapsed={isCollapsed} 
          onToggleCollapse={toggleCollapse}
          className={`shadow-lg ${isCollapsed ? 'h-16 w-16' : 'h-[450px]'}`}
        />
      </div>
    </div>
  );
};

export default FloatingAIAssistant;
