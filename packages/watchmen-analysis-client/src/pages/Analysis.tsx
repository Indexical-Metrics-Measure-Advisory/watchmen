
import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSidebar } from '@/contexts/SidebarContext';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Zap, BarChart2, AlertTriangle } from 'lucide-react';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';

// Import components
import AIInsightsTab from '@/components/analysis/AIInsightsTab';
import DataAnalysisTab from '@/components/analysis/DataAnalysisTab';
import HypothesisAnalysisHeader from '@/components/analysis/HypothesisAnalysisHeader';
import HypothesisNotFound from '@/components/analysis/HypothesisNotFound';
import AlertPanel from '@/components/analysis/AlertPanel';
import AlertRuleSettings from '@/components/analysis/AlertRuleSettings';
import { HypothesisType } from '@/model/Hypothesis';
import { analysis_service } from '@/services/analysisService';
import { HypothesisAnalysisData, EmulativeAnalysisMethod } from '@/model/analysis';
import { AnalysisProvider } from '@/contexts/AnalysisContext';





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


  // Derived state from HypothesisAnalysisData
  const hasValidAnalysisData = analysisData && analysisData.analysis_id && analysisData.hypothesis;
  const analysisMetrics = analysisData?.analysis_metrics || [];
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
      data: metric.dataset.dataset.data,
      columns: metric.dataset.dataset.column_names,
      dimensions: metric.dimensions
    }));
  };

  const metricsData = useMemo(() => getMetricsData(), [analysisData]);

  useEffect(() => {
    const fetchAnalysisData = async () => {
      try {
        const searchParams = new URLSearchParams(location.search);
        const hypothesisId = searchParams.get('hypothesis');


        const analysisData = await analysis_service.load_analysis_data(hypothesisId);
       
        // const hypothesis = hypothesisService.getHypothesisById(hypothesisId);
        setHypothesis(analysisData.hypothesis);
        setAnalysisData(analysisData);
       
          
          
        
      } catch (error) {
        console.error('Error fetching analysis data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalysisData();
  }, [location.search]);

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
            {currentHypothesis && hasValidAnalysisData ? (
              <div className="space-y-6">
                {/* Analysis Header Section */}
                <Card className="glass-card border-0 shadow-lg">
                  <HypothesisAnalysisHeader hypothesis={currentHypothesis} />
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

                {/* Metrics Overview Section */}
                {/* <Card className="glass-card border-0 shadow-sm">
                  <div className="p-6">
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-foreground mb-2">Key Metrics</h3>
                      <p className="text-sm text-muted-foreground">Statistical overview of your hypothesis analysis</p>
                    </div>
                    <MetricsCards 
                        confidence={currentHypothesis?.confidence || 0}
                        pValue={0.05}
                        analysisData={{ sampleSize: 1000, duration: '30 days' }}
                        lastAnalysis={{ date: new Date().toISOString(), daysAgo: '1 day ago' }}
                        significanceLabel={'Significant'}
                      />
                  </div>
                </Card> */}
                    
                
                

                {/* Analysis Tabs Section */}
                <Card className="glass-card border-0 shadow-sm">
                  <div className="p-6">
                    <Tabs defaultValue="insights" className="w-full">
                      <TabsList className="grid w-full grid-cols-2 mb-6">
                         <TabsTrigger value="insights" className="flex items-center gap-3">
                          <Zap className="h-4 w-4" />
                          AI Insights
                        </TabsTrigger>
                        <TabsTrigger value="data" className="flex items-center gap-3">
                          <BarChart2 className="h-4 w-4" />
                          Data Analysis
                        </TabsTrigger>
                       
                        {/* <TabsTrigger value="testing" className="flex items-center gap-2">
                          <LineChart className="h-4 w-4" />
                          Hypothesis Testing
                        </TabsTrigger> */}
                      </TabsList>
                     
                      
                      <TabsContent value="insights" className="mt-0">
                        <AIInsightsTab dataExplanations={dataExplanations} />
                      </TabsContent>
                       <TabsContent value="data" className="mt-0">
                        <DataAnalysisTab
                          analysisMethod={currentHypothesis?.analysisMethod as EmulativeAnalysisMethod}
                          metricsData={metricsData}
                        />
                      </TabsContent>
                      
                    
                      
                      {/* <TabsContent value="testing" className="mt-0">
                        <HypothesisTestingTab testResults={[]} />
                      </TabsContent> */}
                    </Tabs>
                  </div>
                </Card>
                
                {/* Related Content Section */}
                {/* <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
                  <div className="lg:col-span-2">
                    <Card className="glass-card border-0 shadow-sm">
                      <div className="p-6">
                        <div className="mb-4">
                          <h3 className="text-lg font-semibold text-foreground mb-2">Related Hypotheses</h3>
                          <p className="text-sm text-muted-foreground">Explore similar hypotheses and their analysis results</p>
                        </div>
                        <RelatedHypotheses 
                          hypotheses={[
                            {
                              id: "h1",
                              title: "Product Pricing Elasticity and Customer Age Relationship",
                              description: "Hypothesis that price sensitivity varies among different age groups, with customers aged 45-60 showing lower price elasticity.",
                              status: "validated",
                              confidence: 82
                            },
                            {
                              id: "h2",
                              title: "Marketing Channel Preferences by Age Group",
                              description: "Hypothesis that marketing channel preferences significantly differ by age group, with customers aged 45-60 preferring offline agent channels.",
                              status: "testing",
                              confidence: 68
                            },
                            {
                              id: "h3",
                              title: "Customer Lifetime Value and Age Correlation",
                              description: "Hypothesis that customers acquired between ages 45-60 have significantly higher Customer Lifetime Value (CLV) than other age groups.",
                              status: "drafted",
                              confidence: 0
                            }
                          ]}
                          handleViewAnalysis={handleViewAnalysis}
                        />
                      </div>
                    </Card>
                  </div>
                  
              
                </div> */}
              </div>
            ) : currentHypothesis && !hasValidAnalysisData ? (
              <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
                <Card className="glass-card border-0 shadow-sm p-8 text-center max-w-md">
                  <div className="mb-4">
                    <BarChart2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">No Analysis Data Available</h3>
                    <p className="text-sm text-muted-foreground">
                      Analysis data for this hypothesis is not yet available. Please check back later or contact support.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Hypothesis ID: {currentHypothesis?.id}</p>
                    <p className="text-xs text-muted-foreground">Status: {currentHypothesis?.status}</p>
                  </div>
                </Card>
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
