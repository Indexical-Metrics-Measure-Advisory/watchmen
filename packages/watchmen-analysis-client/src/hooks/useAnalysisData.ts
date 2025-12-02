import React from 'react';

interface AnalysisData {
  conversationStage: string | null;
  documentSearchData: any;
  analysisAnswer: any;
}

export const useAnalysisData = (chatHistory: any[]) => {
  return React.useMemo(() => {
    if (!chatHistory || chatHistory.length === 0) {
      return {
        conversationStage: null,
        documentSearchData: null,
        analysisAnswer: null,
      };
    }

    const latestAssistantMessage = chatHistory
      .filter(msg => msg.type === 'assistant')
      .pop();

    if (!latestAssistantMessage || !latestAssistantMessage.metadata) {
      return {
        conversationStage: null,
        documentSearchData: null,
        analysisAnswer: null,
      };
    }

    const stage = latestAssistantMessage.metadata.conversationStage;
    const searchData = stage === 'document_search' ? latestAssistantMessage.metadata : null;
    const answerData = stage === 'deep_conversation' ? latestAssistantMessage.metadata.analysis_answer : null;

    return {
      conversationStage: stage,
      documentSearchData: searchData,
      analysisAnswer: answerData,
    };
  }, [chatHistory]);
};