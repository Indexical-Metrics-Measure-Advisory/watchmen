import React from 'react';
import { Message } from '@/model/chat';
import {
  ThinkingMessageComponent,
  SystemMessageComponent,
  DeveloperMessageComponent,
  ToolMessageComponent,
  RegularMessageComponent,
} from './MessageTypes';

interface ChatMessageProps {
  message: Message;
  index: number;
  isExpanded: boolean;
  onToggleExpand: (index: number) => void;
  onShowAnalysis?: () => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  index,
  isExpanded,
  onToggleExpand,
  onShowAnalysis,
}) => {
  const renderMessageByType = () => {
    switch (message.type) {
      case 'thinking':
        return <ThinkingMessageComponent message={message} isExpanded={isExpanded} onToggleExpand={() => onToggleExpand(index)} onShowAnalysis={onShowAnalysis} />;
      
      case 'system':
        return <SystemMessageComponent message={message} isExpanded={isExpanded} onToggleExpand={() => onToggleExpand(index)} onShowAnalysis={onShowAnalysis} />;
      
      case 'developer':
        return <DeveloperMessageComponent message={message} isExpanded={isExpanded} onToggleExpand={() => onToggleExpand(index)} onShowAnalysis={onShowAnalysis} />;
      
      case 'tool':
        return <ToolMessageComponent message={message} isExpanded={isExpanded} onToggleExpand={() => onToggleExpand(index)} onShowAnalysis={onShowAnalysis} />;
      
      default:
        return (
          <RegularMessageComponent
            message={message}
            isExpanded={isExpanded}
            onToggleExpand={() => onToggleExpand(index)}
            onShowAnalysis={onShowAnalysis}
          />
        );
    }
  };

  return (
    <div className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
      {renderMessageByType()}
    </div>
  );
};