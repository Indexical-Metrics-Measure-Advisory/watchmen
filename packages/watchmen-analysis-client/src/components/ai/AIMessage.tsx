
import React from 'react';
import { User, BrainCircuit } from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

export interface Message {
  id: string;
  content: string;
  role: 'user' | 'ai';
  timestamp: Date;
}

interface AIMessageProps {
  message: Message;
}

const AIMessage: React.FC<AIMessageProps> = ({ message }) => {
  return (
    <div
      className={cn(
        "flex max-w-[80%] rounded-lg p-3",
        message.role === 'user' 
          ? "bg-primary text-primary-foreground ml-auto" 
          : "bg-muted ml-0"
      )}
    >
      <div className="mr-2 mt-0.5">
        {message.role === 'user' ? (
          <User className="h-4 w-4" />
        ) : (
          <BrainCircuit className="h-4 w-4" />
        )}
      </div>
      <div>
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown>{message.content}</ReactMarkdown>
        </div>
        <div className="mt-1 text-xs opacity-70">
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
};

export default AIMessage;
