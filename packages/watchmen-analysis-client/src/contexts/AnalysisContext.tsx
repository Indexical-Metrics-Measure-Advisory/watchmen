import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { HypothesisType } from '@/model/Hypothesis';
import { AnalysisData, BusinessContext } from '@/model/analysis';
import { aiService } from '@/services/aiService';



interface AnalysisContextType {
  hypothesis: HypothesisType | null;
  analysisData: AnalysisData | null;
  analysisHistory: Array<{
    timestamp: string;
    type: 'insight' | 'feedback' | 'action';
    content: string;
  }>;
  businessContext: BusinessContext;
  isRefreshingInsights: boolean;
  addAnalysisHistory: (entry: { type: 'insight' | 'feedback' | 'action'; content: string }) => void;
  updateBusinessContext: (context: Partial<AnalysisContextType['businessContext']>) => void;
  refreshInsights: () => Promise<void>;
}

const AnalysisContext = createContext<AnalysisContextType | null>(null);

export const useAnalysis = () => {
  const context = useContext(AnalysisContext);
  if (!context) {
    throw new Error('useAnalysis must be used within an AnalysisProvider');
  }
  return context;
};

export const AnalysisProvider: React.FC<{
  children: React.ReactNode;
  initialHypothesis?: HypothesisType | null;
  initialAnalysisData?: AnalysisData | null;
}> = ({ children, initialHypothesis, initialAnalysisData }) => {
  const [hypothesis, setHypothesis] = useState<HypothesisType | null>(initialHypothesis || null);
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(initialAnalysisData || null);
  const [analysisHistory, setAnalysisHistory] = useState<AnalysisContextType['analysisHistory']>([]);
  const [isRefreshingInsights, setIsRefreshingInsights] = useState(false);
  const [businessContext, setBusinessContext] = useState<AnalysisContextType['businessContext']>({
    industry: 'Insurance',
    marketSize: 1000000000,
    competitors: ['Ping An Insurance', 'China Life Insurance', 'Pacific Insurance'],
    targetMarket: 'Mainland China'
  });

  useEffect(() => {
    if (hypothesis) {
      setAnalysisHistory(prev => [
        ...prev,
        {
          timestamp: new Date().toISOString(),
          type: 'insight',
          content: `Start analyzing hypothesis: ${hypothesis.title}`
        }
      ]);
    }
  }, [hypothesis]);

  const addAnalysisHistory = useCallback((entry: { type: 'insight' | 'feedback' | 'action'; content: string }) => {
    setAnalysisHistory(prev => [
      ...prev,
      {
        ...entry,
        timestamp: new Date().toISOString()
      }
    ]);
  }, []);

  const updateBusinessContext = useCallback((context: Partial<AnalysisContextType['businessContext']>) => {
    setBusinessContext(prev => ({
      ...prev,
      ...context
    }));
  }, []);

  const refreshInsights = useCallback(async () => {
    if (!hypothesis) return;
    setIsRefreshingInsights(true);
    try {
      const newInsights = await aiService.generateInsights(hypothesis, businessContext);
      setAnalysisData(prev => ({
        ...prev,
        insights: newInsights
      }));
      addAnalysisHistory({
        type: 'insight',
        content: 'Analysis insights have been regenerated based on updated business context.'
      });
    } catch (error) {
      console.error('Error refreshing insights:', error);
      addAnalysisHistory({
        type: 'insight',
        content: 'An error occurred while refreshing insights.'
      });
    } finally {
      setIsRefreshingInsights(false);
    }
  }, [hypothesis, businessContext, addAnalysisHistory]);

  return (
    <AnalysisContext.Provider
      value={{
        hypothesis,
        analysisData,
        analysisHistory,
        businessContext,
        isRefreshingInsights,
        addAnalysisHistory,
        updateBusinessContext,
        refreshInsights
      }}
    >
      {children}
    </AnalysisContext.Provider>
  );
};