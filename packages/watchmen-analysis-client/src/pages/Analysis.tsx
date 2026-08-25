
import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSidebar } from '@/contexts/SidebarContext';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Zap, BarChart2, AlertTriangle, LineChart } from 'lucide-react';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';

// Import components
import AIInsightsTab from '@/components/analysis/AIInsightsTab';
import DataAnalysisTab from '@/components/analysis/DataAnalysisTab';
import HypothesisTestingTab from '@/components/analysis/HypothesisTestingTab';
import HypothesisAnalysisHeader from '@/components/analysis/HypothesisAnalysisHeader';
import HypothesisNotFound from '@/components/analysis/HypothesisNotFound';
import AlertPanel from '@/components/analysis/AlertPanel';
import AlertRuleSettings from '@/components/analysis/AlertRuleSettings';
import RelatedHypotheses from '@/components/analysis/RelatedHypotheses';
import { HypothesisType, RelatedHypothesis } from '@/model/Hypothesis';
import { analysis_service } from '@/services/analysisService';
import { hypothesisService } from '@/services/hypothesisService';
import { HypothesisAnalysisData, EmulativeAnalysisMethod } from '@/model/analysis';
import { AnalysisProvider } from '@/contexts/AnalysisContext';
import { useToast } from '@/components/ui/use-toast';





/**
 * Analysis Component - Refactored UI based on HypothesisAnalysisData class
 * 
 * This component provides a comprehensive analysis interface with the following sections:
 * 1. Analysis Header - Displays hypothesis information from HypothesisAnalysisData
 * 2. Analysis Controls - Configuration for dimensions and time range
 * 3. Metrics Overview - Key statistical metrics derived from analysis_metrics
 * 4. Analysis Tabs - AI Insights, Data Analysis, and Hypothesis Testing
 * 5. Related Content - Related hypotheses and AI assistant
 * 
 * Features:
 * - Structured data access through HypothesisAnalysisData interface
 * - Data extraction from analysis_metrics and data_explain_dict
 * - Improved error handling and loading states
 * - Responsive design with modern UI components
 * - Clear separation of concerns and data flow
 */
const Analysis: React.FC = () => {
  const { collapsed } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const [hypothesis, setHypothesis] = useState<HypothesisType | null>(null);
  const [loading, setLoading] = useState(true);
  const [analysisData, setAnalysisData] = useState<HypothesisAnalysisData | null>(null);
  const [showAlertSettings, setShowAlertSettings] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [relatedHypotheses, setRelatedHypotheses] = useState<RelatedHypothesis[]>([]);
  const { toast } = useToast();


  // Derived state from HypothesisAnalysisData
  const dataExplanations = analysisData?.data_explain_dict || [];
  const currentHypothesis = analysisData?.hypothesis || hypothesis;

  // Extract metrics data based on analysis method
  const getMetricsData = () => {
    if (!analysisData?.analysis_metrics) {
      return null;
    }

    return analysisData.analysis_metrics.map(metric => ({
      name: metric.name,
      category: metric.category,
      format: metric.format,
      data: metric.dataset?.dataset?.data,
      columns: metric.dataset?.dataset?.column_names,
      dimensions: metric.dimensions
    }));
  };

  const metricsData = useMemo(() => getMetricsData(), [analysisData]);

  const loadData = async () => {
    try {
      const searchParams = new URLSearchParams(location.search);
      const hypothesisId = searchParams.get('hypothesis');

      if (!hypothesisId) {
        setLoading(false);
        return;
      }

      const analysisData = await analysis_service.load_analysis_data(hypothesisId);

      if (analysisData) {
        setHypothesis(analysisData.hypothesis);
        setAnalysisData(analysisData);
      } else {
        // No persisted analysis yet: load the hypothesis itself so the page
        // can offer to run the analysis from the empty states
        const hypothesis = await hypothesisService.getHypothesisById(hypothesisId);
        setHypothesis(hypothesis || null);
        setAnalysisData(null);
      }
    } catch (error) {
      console.error('Error fetching analysis data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [location.search]);

  // Resolve related hypotheses from real data
  useEffect(() => {
    const resolveRelatedHypotheses = async () => {
      const relatedIds = currentHypothesis?.relatedHypothesesIds;
      if (!relatedIds || relatedIds.length === 0) {
        setRelatedHypotheses([]);
        return;
      }

      try {
        const allHypotheses = await hypothesisService.getHypotheses();
        const hypothesesById = new Map(allHypotheses.map(h => [h.id, h]));
        setRelatedHypotheses(
          relatedIds
            .map(id => hypothesesById.get(id))
            .filter((h): h is HypothesisType => !!h)
            .map(h => ({
              id: h.id,
              title: h.title,
              description: h.description,
              status: h.status,
              confidence: h.confidence
            }))
        );
      } catch (error) {
        console.error('Error fetching related hypotheses:', error);
      }
    };

    resolveRelatedHypotheses();
  }, [currentHypothesis?.id, currentHypothesis?.relatedHypothesesIds]);

  const handleRunAnalysis = async () => {
    if (!currentHypothesis?.id) {
      return;
    }

    setIsAnalyzing(true);
    try {
      const result = await analysis_service.start_analysis(currentHypothesis.id);
      toast({
        title: result.hypothesisValidationFlag === true
          ? "Hypothesis validated"
          : result.hypothesisValidationFlag === false
            ? "Hypothesis rejected"
            : "Analysis completed",
        description: result.message,
      });
      await loadData();
    } catch (error) {
      toast({
        title: "Analysis Failed",
        description: "Please try again later",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleViewAnalysis = (hypothesisId: string) => {
    navigate(`/analysis?hypothesis=${hypothesisId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        
        <div className={`${collapsed ? 'pl-20' : 'pl-56'} min-h-screen transition-all duration-300`}>
          <Header />
          
          <main className="container py-6 flex items-center justify-center">
            <Card className="glass-card border-0 shadow-sm p-8 text-center">
              <div className="flex flex-col items-center space-y-4">
                <div className="loading-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-foreground">Loading Analysis</h3>
                  <p className="text-sm text-muted-foreground">Fetching hypothesis data and analysis results...</p>
                </div>
              </div>
            </Card>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      
      <div className={`${collapsed ? 'pl-20' : 'pl-56'} min-h-screen transition-all duration-300`}>
        <Header />
        
        <main className="container py-6">
          <AnalysisProvider initialHypothesis={currentHypothesis}>
            {currentHypothesis ? (
              <div className="space-y-6">
                {/* Analysis Header Section */}
                <Card className="glass-card border-0 shadow-lg">
                  <HypothesisAnalysisHeader hypothesis={currentHypothesis} onRunAnalysis={handleRunAnalysis} />
                </Card>

                {/* Analysis Controls Section */}
                <Card className="glass-card border-0 shadow-sm">
                  <div className="p-6">
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-foreground mb-2">Analysis Configuration</h3>
                      <p className="text-sm text-muted-foreground">Configure dimensions and time range for your analysis</p>
                    </div>

                  </div>
                </Card>

                {/* Alert Monitoring Section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <AlertPanel className="h-full" />
                  </div>
                  <div className="lg:col-span-1">
                    <Card className="glass-card border-0 shadow-sm h-full">
                      <div className="p-6">
                        <div className="mb-4">
                          <h3 className="text-lg font-semibold text-foreground mb-2 flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-orange-500" />
                            Alert Management
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Configure and manage metric alert rules
                          </p>
                        </div>
                        <div className="space-y-4">
                          <button
                            onClick={() => setShowAlertSettings(!showAlertSettings)}
                            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                          >
                            <AlertTriangle className="h-4 w-4" />
                            {showAlertSettings ? 'Close Settings' : 'Configure Alert Rules'}
                          </button>
                          <div className="text-sm text-muted-foreground space-y-2">
                            <div className="flex justify-between">
                              <span>Active Rules:</span>
                              <span className="font-medium">3</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Monitored Metrics:</span>
                              <span className="font-medium">8</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Latest Alert:</span>
                              <span className="font-medium">2 hours ago</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>

                {/* Alert Rule Settings Modal */}
                {showAlertSettings && (
                  <Card className="glass-card border-0 shadow-lg">
                    <AlertRuleSettings 
                      className="" 
                      onClose={() => setShowAlertSettings(false)}
                    />
                  </Card>
                )}

                {/* Analysis Tabs Section */}
                <Card className="glass-card border-0 shadow-sm">
                  <div className="p-6">
                    <Tabs defaultValue="insights" className="w-full">
                      <TabsList className="grid w-full grid-cols-3 mb-6">
                         <TabsTrigger value="insights" className="flex items-center gap-3">
                          <Zap className="h-4 w-4" />
                          AI Insights
                        </TabsTrigger>
                        <TabsTrigger value="data" className="flex items-center gap-3">
                          <BarChart2 className="h-4 w-4" />
                          Data Analysis
                        </TabsTrigger>
                        <TabsTrigger value="testing" className="flex items-center gap-2">
                          <LineChart className="h-4 w-4" />
                          Hypothesis Testing
                        </TabsTrigger>
                      </TabsList>


                      <TabsContent value="insights" className="mt-0">
                        <AIInsightsTab dataExplanations={dataExplanations} />
                      </TabsContent>
                       <TabsContent value="data" className="mt-0">
                        <DataAnalysisTab
                          analysisMethod={currentHypothesis?.analysisMethod as EmulativeAnalysisMethod}
                          metricsData={metricsData}
                          onRunAnalysis={handleRunAnalysis}
                          isAnalyzing={isAnalyzing}
                        />
                      </TabsContent>
                      <TabsContent value="testing" className="mt-0">
                        <HypothesisTestingTab
                          dataExplanations={dataExplanations}
                          onRunAnalysis={handleRunAnalysis}
                          isAnalyzing={isAnalyzing}
                        />
                      </TabsContent>
                    </Tabs>
                  </div>
                </Card>

                {/* Related Content Section */}
                {relatedHypotheses.length > 0 && (
                  <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
                    <div className="lg:col-span-2">
                      <RelatedHypotheses
                        hypotheses={relatedHypotheses}
                        handleViewAnalysis={handleViewAnalysis}
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <HypothesisNotFound />
            )}
          </AnalysisProvider>
        </main>
      </div>
    </div>
  );
};

export default Analysis;
