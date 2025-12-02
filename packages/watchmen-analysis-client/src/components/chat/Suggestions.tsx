import React from 'react';

interface SuggestionsProps {
  suggestions?: string[];
  onSuggestionClick: (suggestion: string) => void;
  suggestionsRef?: React.RefObject<HTMLDivElement>;
}

export const Suggestions: React.FC<SuggestionsProps> = ({
  suggestions,
  onSuggestionClick,
  suggestionsRef,
}) => {
  if (!suggestions || suggestions.length === 0) {
    return null;
  }

  return (
    <div 
      ref={suggestionsRef}
      className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto"
    >
      {suggestions.map((suggestion, index) => (
        <div
          key={index}
          className="p-2 hover:bg-gray-100 cursor-pointer text-sm text-gray-700 border-b last:border-b-0"
          onClick={() => onSuggestionClick(suggestion)}
        >
          {suggestion}
        </div>
      ))}
    </div>
  );
};