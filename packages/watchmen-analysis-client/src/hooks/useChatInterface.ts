import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { debounce } from '@/utils/debounce';
import { Message } from '@/model/chat';

export interface UseChatInterfaceProps {
  onSendMessage: (message: string) => void;
  onReportGenerated?: (reportContent: string) => void;
  chatHistory: Message[];
}

export const useChatInterface = ({ 
  onSendMessage, 
  onReportGenerated, 
  chatHistory 
}: UseChatInterfaceProps) => {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [expandedMessages, setExpandedMessages] = useState<Set<number>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (inputValue.trim()) {
        onSendMessage(inputValue);
        setInputValue('');
      }
      setShowSuggestions(false);
    }
  }, [inputValue, onSendMessage]);

  const handleSuggestionClick = useCallback((suggestion: string) => {
    setInputValue(suggestion);
    setShowSuggestions(false);
    inputRef.current?.focus();
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  }, []);

  const toggleMessageExpansion = useCallback((index: number) => {
    setExpandedMessages(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(index)) {
        newExpanded.delete(index);
      } else {
        newExpanded.add(index);
      }
      return newExpanded;
    });
  }, []);

  const handleSendButtonClick = useCallback(() => {
    if (inputValue.trim()) {
      onSendMessage(inputValue);
      setInputValue('');
      setShowSuggestions(false);
    }
  }, [inputValue, onSendMessage]);

  const debouncedSuggestionUpdate = useMemo(
    () => debounce((value: string) => {
      if (value.trim() === '') {
        setShowSuggestions(true);
      } else {
        setShowSuggestions(false);
      }
    }, 150),
    []
  );

  const visibleMessages = useMemo(() => {
    if (chatHistory.length > 50) {
      return chatHistory.slice(-50);
    }
    return chatHistory;
  }, [chatHistory]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node) &&
          inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (!onReportGenerated || !chatHistory.length) return;
    
    const latestAssistantMessage = chatHistory
      .filter(msg => msg.type === 'assistant')
      .pop();
    
    if (latestAssistantMessage?.metadata?.intent === 'report_generation') {
      onReportGenerated(latestAssistantMessage.content);
    }
  }, [chatHistory, onReportGenerated]);

  return {
    inputValue,
    setInputValue,
    showSuggestions,
    setShowSuggestions,
    expandedMessages,
    inputRef,
    suggestionsRef,
    visibleMessages,
    handleKeyPress,
    handleSuggestionClick,
    handleInputChange,
    toggleMessageExpansion,
    handleSendButtonClick,
    debouncedSuggestionUpdate,
  };
};