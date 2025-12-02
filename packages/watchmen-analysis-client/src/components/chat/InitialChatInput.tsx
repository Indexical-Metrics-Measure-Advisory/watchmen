import React from 'react';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';

interface InitialChatInputProps {
  inputValue: string;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
  onSend: () => void;
  isSubmitting: boolean;
  placeholder?: string;
  inputRef?: React.RefObject<HTMLInputElement>;
  suggestions?: string[];
  onSuggestionClick?: (suggestion: string) => void;
}

export const InitialChatInput: React.FC<InitialChatInputProps> = ({
  inputValue,
  onInputChange,
  onKeyPress,
  onSend,
  isSubmitting,
  placeholder = "Ask about your analysis report",
  inputRef,
  suggestions,
  onSuggestionClick,
}) => {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-gradient-to-r from-white to-slate-50 border border-slate-200 rounded-2xl shadow-lg p-4 flex items-center gap-3 transition-all duration-300 hover:shadow-xl focus-within:border-blue-300 focus-within:shadow-blue-100/50 transform hover:scale-[1.01]">
        <div className="flex-1 relative">
          <div className="flex items-center">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={onInputChange}
              onKeyDown={onKeyPress}
              placeholder={placeholder}
              className="w-full bg-transparent border-none outline-none text-slate-800 placeholder-slate-400 text-base py-2 pr-8 transition-all duration-200 focus:placeholder-slate-600"
              disabled={isSubmitting}
            />
            <Button
              onClick={onSend}
              disabled={isSubmitting || !inputValue.trim()}
              size="sm"
              className={`rounded-full h-8 w-8 p-0 transition-all duration-300 transform hover:scale-110 active:scale-95 ${
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
      </div>
      {suggestions && suggestions.length > 0 && (
        <div className="mt-4">
          <div className="flex flex-wrap gap-2 justify-center">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => onSuggestionClick?.(suggestion)}
                className="px-4 py-2 bg-gradient-to-r from-slate-100 to-slate-50 text-slate-700 rounded-full text-sm hover:from-slate-200 hover:to-slate-100 transition-all duration-200 border border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-md transform hover:scale-105 active:scale-95"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};