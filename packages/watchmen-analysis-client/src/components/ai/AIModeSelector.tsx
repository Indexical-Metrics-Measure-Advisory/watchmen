
import React from 'react';
import {
  Menubar,
  MenubarMenu,
  MenubarTrigger,
  MenubarContent,
  MenubarItem,
  MenubarSeparator
} from '@/components/ui/menubar';
import { Bot, BrainCircuit, Sparkles } from 'lucide-react';

interface AIModeSelector {
  currentMode: 'hypothesis-analysis' | 'challenge-monitor' | 'improvement-actions';
  onModeChange: (mode: 'hypothesis-analysis' | 'challenge-monitor' | 'improvement-actions') => void;
}

const AIModeSelector: React.FC<AIModeSelector> = ({ currentMode, onModeChange }) => {
  return (
    <Menubar className="border-none shadow-none p-0">
      <MenubarMenu>
        <MenubarTrigger className="p-1 cursor-pointer data-[state=open]:bg-accent">
          <Bot className="h-4 w-4 text-primary" />
        </MenubarTrigger>
        <MenubarContent align="end" alignOffset={-5} className="w-56">
          <MenubarItem onClick={() => onModeChange('hypothesis-analysis')}>
            <BrainCircuit className="mr-2 h-4 w-4" />
            <span>Hypothesis Analysis</span>
          </MenubarItem>
          <MenubarSeparator />
          <MenubarItem onClick={() => onModeChange('challenge-monitor')}>
            <Bot className="mr-2 h-4 w-4" />
            <span>Challenge Monitor</span>
          </MenubarItem>
          {/* <MenubarItem onClick={() => onModeChange('improvement-actions')}>
            <Sparkles className="mr-2 h-4 w-4" />
            <span>Improvement Actions</span>
          </MenubarItem> */}
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  );
};

export default AIModeSelector;
