import React from 'react';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';

interface ChatInputProps {
  inputValue: string;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
  onSend: () => void;
  isSubmitting: boolean;
  placeholder?: string;
  inputRef?: React.RefObject<HTMLInputElement>;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  inputValue,
  onInputChange,
  onKeyPress,
  onSend,
  isSubmitting,
  placeholder = "Ask anything, create anything",
  inputRef,
}) => {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-gradient-to-r from-white to-slate-50 border border-slate-200 rounded-2xl shadow-lg p-4 flex items-center gap-3 transition-all duration-300 hover:shadow-xl focus-within:border-blue-300 focus-within:shadow-blue-100/50 transform hover:scale-[1.01]">
        <div className="flex-1">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={onInputChange}
            onKeyDown={onKeyPress}
            placeholder={placeholder}
            className="w-full bg-transparent border-none outline-none text-slate-800 placeholder-slate-400 text-sm leading-relaxed transition-all duration-200 focus:placeholder-slate-600"
            disabled={isSubmitting}
          />
        </div>
        
        <Button
          onClick={onSend}
          disabled={isSubmitting || !inputValue.trim()}
          size="sm"
          className={`rounded-full h-10 w-10 p-0 transition-all duration-300 transform hover:scale-110 active:scale-95 ${
            inputValue.trim() && !isSubmitting
              ? 'bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 hover:from-blue-600 hover:via-blue-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed hover:bg-slate-200'
          }`}
        >
          {isSubmitting ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
};