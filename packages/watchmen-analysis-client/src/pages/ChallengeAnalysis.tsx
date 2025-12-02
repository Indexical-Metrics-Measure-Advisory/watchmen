import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSidebar } from '@/contexts/SidebarContext';
import { ArrowLeft, Loader2, BarChart2, Lightbulb, CheckCircle, XCircle, ArrowRight, Search, BrainCircuit, HelpCircle, Download, Edit3, ChevronDown, Target, TrendingUp, AlertTriangle, Calendar, Users, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { ChallengeAnalysisResult } from '@/model/challengeAnalysis';
import { challengeAnalysisService } from '@/services/challengeAnalysisService';
import { BusinessChallengeWithProblems } from '@/model/business';

const ChallengeAnalysis: React.FC = () => {
  const { collapsed } = useSidebar();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const challengeId = searchParams.get('challengeId');
  const analysisId = searchParams.get('analysisId');
  
  const [analysis, setAnalysis] = useState<ChallengeAnalysisResult | null>(null);
  const [challenge, setChallenge] = useState<BusinessChallengeWithProblems | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [expandedProblems, setExpandedProblems] = useState<Set<string>>(new Set());
  const [selectedNavItem, setSelectedNavItem] = useState('overview');
  
  const { toast } = useToast();

  // Function to calculate validated and rejected hypothesis counts based on JSON data
  const calculateHypothesisStats = (analysis:ChallengeAnalysisResult ) => {
    if (!analysis || !analysis.hypothesisResultDict) {
      return { validated: 0, rejected: 0 };
    }

    let validated = 0;
    let rejected = 0;

    // Iterate through all hypothesis data in challengeInsightResult
    Object.values(analysis.hypothesisResultDict).forEach((hypothesisData: any) => {
      if (hypothesisData.data_explain_dict && Array.isArray(hypothesisData.data_explain_dict)) {
        hypothesisData.data_explain_dict.forEach((item: any) => {
          if (item.hypothesisValidationFlag === true) {
            validated++;
          } else if (item.hypothesisValidationFlag === false) {
            rejected++;
          }
        });
      }
    });

    console.log('validated', validated);
    console.log('rejected', rejected);

    return { validated, rejected };
  };

  // Build list of validated hypotheses
  const getValidatedHypotheses = (challenge:BusinessChallengeWithProblems,analysis: ChallengeAnalysisResult, problemId?: string) => {
    if (!analysis || !analysis.hypothesisResultDict || !challenge || !challenge.problems) {
      return [];
    }

    const validatedList: any[] = [];

    // Loop through problems and hypotheses from challenge
    challenge.problems.forEach(problem => {
      // If problemId is specified, only process matching problem
      if (problemId && problem.id !== problemId) {
        return;
      }
      
      if (problem.hypotheses && Array.isArray(problem.hypotheses)) {
        problem.hypotheses.forEach(hypothesis => {
          // Find corresponding validation results in analysis based on hypothesis id
          const hypothesisData = analysis.hypothesisResultDict[hypothesis.id];
          if (hypothesisData && hypothesisData.data_explain_dict && Array.isArray(hypothesisData.data_explain_dict)) {
            hypothesisData.data_explain_dict.forEach((item: any) => {
              if (item.hypothesisValidationFlag === true) {
                validatedList.push({
                  id: hypothesis.id,
                  title: hypothesis.title,
                  problemId: problem.id,
                  description: hypothesis.description,
                  problemTitle: problem.title,
                  hypothesisValidation: item.hypothesisValidation,
                  keyMetricChange: item.keyMetricChange,
                  summaryFinding: item.summaryFinding,
                  ...hypothesisData
                });
              }
            });
          }
        });
      }
    });

    return validatedList;
  };

  // Build list of rejected hypotheses
  const getRejectedHypotheses = (challenge:BusinessChallengeWithProblems, analysis: ChallengeAnalysisResult, problemId?: string) => {
    if (!analysis || !analysis.hypothesisResultDict || !challenge || !challenge.problems) {
      return [];
    }

    const rejectedList: any[] = [];

    // Loop through problems and hypotheses from challenge
    challenge.problems.forEach(problem => {
      // If problemId is specified, only process matching problem
      if (problemId && problem.id !== problemId) {
        return;
      }
      
      if (problem.hypotheses && Array.isArray(problem.hypotheses)) {
        problem.hypotheses.forEach(hypothesis => {
          // Find corresponding validation results in analysis based on hypothesis id
          const hypothesisData = analysis.hypothesisResultDict[hypothesis.id];
          if (hypothesisData && hypothesisData.data_explain_dict && Array.isArray(hypothesisData.data_explain_dict)) {
            hypothesisData.data_explain_dict.forEach((item: any) => {
              if (item.hypothesisValidationFlag === false) {
                rejectedList.push({
                  id: hypothesis.id,
                  title: hypothesis.title,
                  problemId: problem.id,
                  description: hypothesis.description,
                  problemTitle: problem.title,
                  hypothesisValidation: item.hypothesisValidation,
                  keyMetricChange: item.keyMetricChange,
                  summaryFinding: item.summaryFinding,
                  ...hypothesisData
                });
              }
            });
          }
        });
      }
    });

    return rejectedList;
  };

  useEffect(() => {
    const loadData = async () => {
      if (!challengeId) {
        setError('No challenge ID provided');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        
        let simulation_result;
        
        // If analysisId is provided, use it; otherwise use challengeId
        if (analysisId) {
          simulation_result = await challengeAnalysisService.getChallengeAnalysesByAnalysisId(analysisId);
        } else {
          simulation_result = await challengeAnalysisService.getChallengeAnalysesByChallengeId(challengeId);
        }
        
        // Load the business challenge
        // const challengeData = await businessService.getFullBusinessChallengeById(challengeId);
        console.log('challengeData', simulation_result.challenge);
        setChallenge(simulation_result.challenge);
        
        
        if (simulation_result.result) {
          setAnalysis(simulation_result.result); // Get the most recent analysis
        } 
      } catch (err) {
        setError('Failed to load analysis data. Please try again later.');
        toast({
          title: 'Error',
          description: 'Failed to load analysis data. Please try again later.',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [challengeId, analysisId, toast]);

  const handleGenerateNewAnalysis = async () => {
    if (!challengeId) return;
    
    try {
      setIsLoading(true);
      const newAnalysis = await challengeAnalysisService.generateChallengeAnalysis(challengeId);
      setAnalysis(newAnalysis);
      toast({
        title: 'Analysis Generated',
        description: 'A new challenge analysis has been generated successfully.'
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to generate new analysis. Please try again later.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToList = () => {
    navigate('/challenges');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <div className={`${collapsed ? 'pl-20' : 'pl-56'} min-h-screen transition-all duration-300`}>
          <Header />
          <main className="container py-6">
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (error || !challenge || !analysis) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <div className={`${collapsed ? 'pl-20' : 'pl-56'} min-h-screen transition-all duration-300`}>
          <Header />
          <main className="container py-6">
            <div className="flex flex-col items-center justify-center py-12">
              <h2 className="text-xl font-semibold mb-4">{error || 'Analysis not found'}</h2>
              <Button onClick={handleBackToList} variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Business Challenges
              </Button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const toggleProblemExpansion = (problemId: string) => {
    const newExpanded = new Set(expandedProblems);
    if (newExpanded.has(problemId)) {
      newExpanded.delete(problemId);
    } else {
      newExpanded.add(problemId);
    }
    setExpandedProblems(newExpanded);
  };

  const navigationItems = [
    { id: 'overview', label: 'Challenge Overview', icon: Target },
    ...(challenge.problems || []).map((problem, index) => ({
      id: `problem${index + 1}`,
      label: problem.title,
      problemId: problem.id,
      icon: problem.status === 'resolved' ? CheckCircle : problem.status === 'in_progress' ? TrendingUp : AlertTriangle
    })),
    { id: 'summary', label: 'Summary and Action Tracking', icon: Calendar }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className={`${collapsed ? 'pl-20' : 'pl-56'} min-h-screen transition-all duration-300`}>
        <Header />
        <div className="flex h-[calc(100vh-4rem)]">
          {/* Left Navigation Bar */}
          <div className="w-64 bg-card border-r border-border p-4 overflow-y-auto">
            <div className="mb-6">
              <Button onClick={handleBackToList} variant="ghost" className="w-full justify-start mb-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Challenge List
              </Button>
              {/* <h2 className="text-lg font-semibold mb-2">{challenge.title}</h2> */}
              <p className="text-sm text-muted-foreground">Analysis Report Navigation</p>
            </div>
            
            <nav className="space-y-2">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setSelectedNavItem(item.id)}
                    className={`w-full flex items-start px-3 py-2 text-sm rounded-md transition-colors ${
                      selectedNavItem === item.id 
                        ? 'bg-primary text-primary-foreground' 
                        : 'hover:bg-muted'
                    }`}
                  >
                    <Icon className="mr-2 h-4 w-4 flex-shrink-0" />
                    <span className="whitespace-nowrap overflow-hidden text-ellipsis block w-full">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6">
              {/* Top Action Bar */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-semibold">{analysis.title}</h1>
                  <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString('en-US')}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    Export PDF
                  </Button>
                  
                  <Button variant="outline" size="sm">
                    <Edit3 className="mr-2 h-4 w-4" />
                    Add Notes
                  </Button>
                  
                  {analysis?.challengeMarkdown && (
                    <Button variant="outline" size="sm" onClick={() => {
                      // Create a new window to display challengeMarkdown content
                      const newWindow = window.open('', '_blank', 'width=800,height=600,scrollbars=yes');
                      if (newWindow) {
                        const markdownContent = analysis.challengeMarkdown;
                        const content = `
                          <!DOCTYPE html>
                          <html>
                          <head>
                            <title>Challenge Analysis Report</title>
                            <meta charset="UTF-8">
                            <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
                            <style>
                              body { 
                                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                                margin: 40px; 
                                line-height: 1.6; 
                                color: #333;
                                max-width: 800px;
                              }
                              h1, h2, h3, h4, h5, h6 { 
                                color: #2c3e50; 
                                margin-top: 24px; 
                                margin-bottom: 16px;
                              }
                              h1 { border-bottom: 2px solid #eee; padding-bottom: 10px; }
                              h2 { border-bottom: 1px solid #eee; padding-bottom: 8px; }
                              p { margin-bottom: 16px; }
                              ul, ol { margin-bottom: 16px; padding-left: 24px; }
                              li { margin-bottom: 8px; }
                              blockquote { 
                                border-left: 4px solid #ddd; 
                                margin: 16px 0; 
                                padding-left: 16px; 
                                color: #666;
                              }
                              code { 
                                background: #f4f4f4; 
                                padding: 2px 4px; 
                                border-radius: 3px; 
                                font-family: 'Monaco', 'Consolas', monospace;
                              }
                              pre { 
                                background: #f4f4f4; 
                                padding: 16px; 
                                border-radius: 6px; 
                                overflow-x: auto;
                              }
                              table { 
                                border-collapse: collapse; 
                                width: 100%; 
                                margin-bottom: 16px;
                              }
                              th, td { 
                                border: 1px solid #ddd; 
                                padding: 8px 12px; 
                                text-align: left;
                              }
                              th { background-color: #f8f9fa; }
                            </style>
                          </head>
                          <body>
                            <div id="content"></div>
                            <script>
                              document.getElementById('content').innerHTML = marked.parse(${JSON.stringify(markdownContent)});
                            </script>
                          </body>
                          </html>
                        `;
                        newWindow.document.write(content);
                        newWindow.document.close();
                      }
                    }}>
                      <BrainCircuit className="mr-2 h-4 w-4" />
                      View Report
                    </Button>
                  )}
                  
                  <Button onClick={handleGenerateNewAnalysis} size="sm">
                    <Loader2 className="mr-2 h-4 w-4" />
                    Refresh Analysis
                  </Button>
                </div>
              </div>

              {/* Business Challenge Overview */}
              {selectedNavItem === 'overview' && (
                <div className="space-y-8">
                  {/* Executive Summary Card */}
                  <Card className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border-blue-200 shadow-lg">
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-2xl font-bold text-gray-800 mb-2">{challenge.title}</CardTitle>
                          <CardDescription className="text-lg text-gray-600">
                            {challenge.description}
                          </CardDescription>
                        </div>
                        {/* <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 shadow-sm">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">85%</div>
                            <div className="text-xs text-gray-500">Female Customers</div>
                          </div>
                        </div> */}
                      </div>
                    </CardHeader>
                  </Card>

                  {/* Key Insights Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Analysis Conclusion */}
                    <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 shadow-md hover:shadow-lg transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-center space-x-3">
                          <div className="bg-green-100 p-2 rounded-full">
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          </div>
                          <h3 className="font-semibold text-lg text-green-800">Analysis Conclusion</h3>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="bg-white/70 backdrop-blur-sm p-4 rounded-lg border border-green-100">
                          <div className="mb-3">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 mb-2">
                              Key Finding
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 leading-relaxed mb-3">
                            {analysis.challengeInsightResult?.answerForConclusion || 'The Renewable Female Critical Illness insurance product is predominantly purchased by women due to its tailored coverage for female-specific illnesses and affordability.'}
                          </p>
                          <div className="flex items-center space-x-4 text-xs text-gray-600">
                            <div className="flex items-center">
                              <Users className="h-3 w-3 mr-1" />
                              <span>30-40 age group</span>
                            </div>
                            <div className="flex items-center">
                              <TrendingUp className="h-3 w-3 mr-1" />
                              <span>High renewal rate</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Key Findings Summary */}
                    <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200 shadow-md hover:shadow-lg transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-center space-x-3">
                          <div className="bg-blue-100 p-2 rounded-full">
                            <HelpCircle className="h-5 w-5 text-blue-600" />
                          </div>
                          <h3 className="font-semibold text-lg text-blue-800">Key Findings Summary</h3>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="bg-white/70 backdrop-blur-sm p-4 rounded-lg border border-blue-100">
                          <div className="mb-3">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mb-2">
                              Behavioral Insights
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 leading-relaxed mb-3">
                            {analysis.challengeInsightResult?.summaryForQuestions || 'Females in the 30-40 age group are more likely to renew their policies, and higher premiums are associated with younger age groups, suggesting income and life-stage factors influence purchasing behaviors.'}
                          </p>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="bg-blue-50 p-2 rounded text-center">
                              <div className="font-semibold text-blue-700">Premium Factor</div>
                              <div className="text-gray-600">Age-based pricing</div>
                            </div>
                            <div className="bg-blue-50 p-2 rounded text-center">
                              <div className="font-semibold text-blue-700">Coverage Appeal</div>
                              <div className="text-gray-600">Female-specific</div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Future Analysis */}
                    <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200 shadow-md hover:shadow-lg transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-center space-x-3">
                          <div className="bg-purple-100 p-2 rounded-full">
                            <Search className="h-5 w-5 text-purple-600" />
                          </div>
                          <h3 className="font-semibold text-lg text-purple-800">Future Analysis Recommendations</h3>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="bg-white/70 backdrop-blur-sm p-4 rounded-lg border border-purple-100">
                          <div className="mb-3">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 mb-2">
                              Research Priorities
                            </span>
                          </div>
                          {analysis.challengeInsightResult?.futureAnalysis ? (
                            <div className="text-sm text-gray-700 leading-relaxed">
                              {analysis.challengeInsightResult.futureAnalysis}
                            </div>
                          ) : (
                            <div className="space-y-2 text-sm text-gray-700">
                              <div className="flex items-start space-x-2">
                                <div className="w-1.5 h-1.5 bg-purple-400 rounded-full mt-2 flex-shrink-0"></div>
                                <span>Obtain more <strong className="text-purple-700">granular income data</strong> to understand purchasing behavior</span>
                              </div>
                              <div className="flex items-start space-x-2">
                                <div className="w-1.5 h-1.5 bg-purple-400 rounded-full mt-2 flex-shrink-0"></div>
                                <span>Explore <strong className="text-purple-700">life-stage factors</strong> influencing the 30-40 age group</span>
                              </div>
                              <div className="flex items-start space-x-2">
                                <div className="w-1.5 h-1.5 bg-purple-400 rounded-full mt-2 flex-shrink-0"></div>
                                <span>Evaluate <strong className="text-purple-700">marketing effectiveness</strong> in communicating benefits</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Future Business Actions */}
                    <Card className="bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200 shadow-md hover:shadow-lg transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-center space-x-3">
                          <div className="bg-orange-100 p-2 rounded-full">
                            <TrendingUp className="h-5 w-5 text-orange-600" />
                          </div>
                          <h3 className="font-semibold text-lg text-orange-800">Future Business Actions</h3>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="bg-white/70 backdrop-blur-sm p-4 rounded-lg border border-orange-100">
                          <div className="mb-3">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 mb-2">
                              Strategic Actions
                            </span>
                          </div>
                          {analysis.challengeInsightResult?.futureBusinessAction ? (
                            <div className="text-sm text-gray-700 leading-relaxed">
                              {analysis.challengeInsightResult.futureBusinessAction}
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <div className="bg-orange-50 p-3 rounded-lg">
                                <div className="font-medium text-sm text-orange-800 mb-1">Target Marketing</div>
                                <div className="text-xs text-gray-600">Develop campaigns for females 30-40, emphasizing renewal value</div>
                              </div>
                              <div className="bg-orange-50 p-3 rounded-lg">
                                <div className="font-medium text-sm text-orange-800 mb-1">Product Innovation</div>
                                <div className="text-xs text-gray-600">Create tailored products for younger age groups (20-35 years)</div>
                              </div>
                              <div className="bg-orange-50 p-3 rounded-lg">
                                <div className="font-medium text-sm text-orange-800 mb-1">Market Expansion</div>
                                <div className="text-xs text-gray-600">Explore opportunities for male buyers and complementary products</div>
                              </div>
                            </div>
                          )}
                        </div>
                        
                      </CardContent>
                    </Card>
                  </div>
                  <div className="bg-muted/30 p-4 rounded-lg mb-4">
                          <div className="flex items-center mb-2">
                            <BrainCircuit className="h-5 w-5 text-primary mr-2" />
                            <h4 className="font-medium text-sm">Analysis Summary</h4>
                          </div>
                          {(() => {
                            const stats = calculateHypothesisStats(analysis);
                            const totalHypotheses = stats.validated + stats.rejected;
                            return (
                              <>
                                <p className="text-sm text-muted-foreground mb-3">
                                  Based on {totalHypotheses} tested hypotheses, 
                                  we've validated {stats.validated} key factors affecting {challenge?.title.toLowerCase()}.
                                </p>
                                
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                                  <div className="bg-white p-3 rounded-md border shadow-sm">
                                    <div className="flex items-center">
                                      <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center mr-2">
                                        <CheckCircle className="h-4 w-4 text-green-600" />
                                      </div>
                                      <div>
                                        <div className="text-sm font-medium">{stats.validated} Validated</div>
                                        <div className="text-xs text-muted-foreground">Hypotheses confirmed</div>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div className="bg-white p-3 rounded-md border shadow-sm">
                                    <div className="flex items-center">
                                      <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center mr-2">
                                        <XCircle className="h-4 w-4 text-red-600" />
                                      </div>
                                      <div>
                                        <div className="text-sm font-medium">{stats.rejected} Rejected</div>
                                        <div className="text-xs text-muted-foreground">Hypotheses disproven</div>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {/* <div className="bg-white p-3 rounded-md border shadow-sm">
                                    <div className="flex items-center">
                                      <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center mr-2">
                                        <Target className="h-4 w-4 text-blue-600" />
                                      </div>
                                      <div>
                                        <div className="text-sm font-medium">+{analysis.validatedHypotheses.reduce((acc, h) => acc + (h.confidence > 70 ? 7.2 : 3.5), 0).toFixed(1)}%</div>
                                        <div className="text-xs text-muted-foreground">Potential improvement</div>
                                      </div>
                                    </div>
                                  </div> */}
                                </div>
                              </>
                            );
                          })()}
                        </div>
                </div>
              )}
              
              {/* Problem Analysis Area */}
              {selectedNavItem.startsWith('problem') && (() => {
                const problemIndex = parseInt(selectedNavItem.replace('problem', '')) - 1;
                const currentProblem = challenge?.problems?.[problemIndex];
                
                if (!currentProblem) return null;
                
                return (
                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center">
                          {currentProblem.status === 'resolved' ? (
                            <CheckCircle className="mr-2 h-5 w-5 text-green-500" />
                          ) : currentProblem.status === 'in_progress' ? (
                            <Clock className="mr-2 h-5 w-5 text-blue-500" />
                          ) : (
                            <AlertTriangle className="mr-2 h-5 w-5 text-red-500" />
                          )}
                          {currentProblem.title}
                        </CardTitle>
                        <CardDescription>
                          {currentProblem.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {/* Problem Overview */}
                        <div className="mb-6 p-4 bg-muted/50 rounded-lg">
                          <h3 className="font-medium mb-2">Problem Overview</h3>
                          <p className="text-sm text-muted-foreground">
                            {currentProblem.description}
                          </p>
                          <div className="mt-3">
                            <Badge className="text-xs bg-blue-100 text-blue-800">
                              Status: {currentProblem.status.charAt(0).toUpperCase() + currentProblem.status.slice(1)}
                            </Badge>
                          </div>
                        </div>
                      
                      {/* Key Insights - Enhanced */}
                      <div className="mb-8">
                        <div className="flex items-center mb-4">
                          <div className="h-8 w-8 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 flex items-center justify-center mr-3">
                            <Lightbulb className="h-4 w-4 text-white" />
                          </div>
                          <h3 className="text-lg font-semibold text-gray-900">Key Insights</h3>
                          <div className="ml-auto">
                            <Badge className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-3 py-1">
                              AI Analysis Results
                            </Badge>
                          </div>
                        </div>
                        
                        {analysis.questionResultDict && analysis.questionResultDict[currentProblem.id] ? (
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Primary Insight - Question Analysis */}
                            <div className="relative p-6 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-100 border-l-4 border-blue-500 shadow-lg hover:shadow-xl transition-all duration-300">
                              <div className="flex items-center mb-3">
                                <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center mr-3">
                                  <BarChart2 className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                  <Badge className="text-xs bg-blue-500 text-white mb-1">
                                    Core Analysis
                                  </Badge>
                                  <h4 className="font-semibold text-base text-gray-900">Problem Analysis Results</h4>
                                </div>
                              </div>
                              <p className="text-sm text-gray-700 leading-relaxed">
                                {analysis.questionResultDict[currentProblem.id].answerForQuestion}
                              </p>
                              <div className="absolute top-4 right-4">
                                <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></div>
                              </div>
                            </div>
                            
                            {/* Secondary Insight - Hypothesis Summary */}
                            <div className="relative p-6 rounded-xl bg-gradient-to-br from-green-50 to-emerald-100 border-l-4 border-green-500 shadow-lg hover:shadow-xl transition-all duration-300">
                              <div className="flex items-center mb-3">
                                <div className="h-10 w-10 rounded-full bg-green-500 flex items-center justify-center mr-3">
                                  <CheckCircle className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                  <Badge className="text-xs bg-green-500 text-white mb-1">
                                    Key Findings
                                  </Badge>
                                  <h4 className="font-semibold text-base text-gray-900">Hypothesis Validation Summary</h4>
                                </div>
                              </div>
                              <p className="text-sm text-gray-700 leading-relaxed">
                                {analysis.questionResultDict[currentProblem.id].summaryForHypothesis}
                              </p>
                              <div className="absolute top-4 right-4">
                                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                              </div>
                            </div>
                            
                            {/* Action Items - Future Analysis */}
                            <div className="relative p-6 rounded-xl bg-gradient-to-br from-purple-50 to-violet-100 border-l-4 border-purple-500 shadow-lg hover:shadow-xl transition-all duration-300">
                              <div className="flex items-center mb-3">
                                <div className="h-10 w-10 rounded-full bg-purple-500 flex items-center justify-center mr-3">
                                  <TrendingUp className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                  <Badge className="text-xs bg-purple-500 text-white mb-1">
                                    Future Analysis
                                  </Badge>
                                  <h4 className="font-semibold text-base text-gray-900">Recommended Analysis Directions</h4>
                                </div>
                              </div>
                              <p className="text-sm text-gray-700 leading-relaxed">
                                {analysis.questionResultDict[currentProblem.id].futureAnalysis}
                              </p>
                              <div className="absolute top-4 right-4">
                                <div className="h-2 w-2 rounded-full bg-purple-500 animate-pulse"></div>
                              </div>
                            </div>
                            
                            {/* Business Actions - Highlighted */}
                            <div className="relative p-6 rounded-xl bg-gradient-to-br from-orange-50 to-red-100 border-l-4 border-orange-500 shadow-lg hover:shadow-xl transition-all duration-300">
                              <div className="flex items-center mb-3">
                                <div className="h-10 w-10 rounded-full bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center mr-3">
                                  <Target className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                  <Badge className="text-xs bg-gradient-to-r from-orange-500 to-red-500 text-white mb-1">
                                    Action Recommendations
                                  </Badge>
                                  <h4 className="font-semibold text-base text-gray-900">Business Action Plan</h4>
                                </div>
                              </div>
                              <p className="text-sm text-gray-700 leading-relaxed">
                                {analysis.questionResultDict[currentProblem.id].futureBusinessAction}
                              </p>
                              <div className="absolute top-4 right-4">
                                <div className="h-2 w-2 rounded-full bg-orange-500 animate-pulse"></div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {analysis.insights?.slice(0, 2).map((insight, index) => (
                              <div key={index} className="p-4 rounded-lg border bg-card">
                                <div className="flex items-center mb-2">
                                  <Badge 
                                    className={`text-xs ${insight.type === 'opportunity' ? 'bg-green-100 text-green-800' : 
                                      insight.type === 'risk' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}
                                  >
                                    {insight.type === 'opportunity' ? 'Opportunity' : insight.type === 'risk' ? 'Risk' : 'Insight'}
                                  </Badge>
                                  <Badge className="ml-2 text-xs" variant="outline">{insight.priority}</Badge>
                                </div>
                                <h4 className="font-medium text-sm mb-1">{insight.title}</h4>
                                <p className="text-xs text-muted-foreground">{insight.description}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      {/* Hypothesis Analysis Section */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-medium">Hypothesis Analysis</h3>
                          <Button 
                            variant="link" 
                            size="sm" 
                            className="text-primary" 
                            onClick={() => navigate(`/hypotheses?challengeId=${challengeId}`)}
                          >
                            View All Hypotheses
                            <ArrowRight className="ml-1 h-4 w-4" />
                          </Button>
                        </div>
                        
                        {/* Hypothesis Analysis Summary */}
                        
                        
                        {/* Validated Hypotheses List */}
                        <div className="bg-white rounded-lg border mb-4">
                          <div className="p-3 border-b bg-green-50">
                            <div className="flex items-center">
                              <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                              <h4 className="font-medium text-sm text-green-800">Validated Hypotheses ({getValidatedHypotheses(challenge, analysis, currentProblem.id).length})</h4>
                            </div>
                          </div>
                          <div className="divide-y">
                            {getValidatedHypotheses(challenge, analysis, currentProblem.id).map((hypothesis, index) => (
                              <div key={`validated-${hypothesis.id}-${index}`} className="p-3 hover:bg-green-50/50">
                                <div className="flex justify-between items-start mb-2">
                                  <div className="flex items-center">
                                    <div className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center mr-2">
                                      <CheckCircle className="h-3 w-3 text-green-600" />
                                    </div>
                                    <h5 className="font-medium text-sm">
                                      <button 
                                        onClick={() => navigate(`/analysis?hypothesis=${hypothesis.id}`)}
                                        className="text-left hover:text-blue-600 hover:underline transition-colors"
                                      >
                                        {hypothesis.hypothesis || `${hypothesis.title}`}
                                      </button>
                                    </h5>
                                  </div>
                                  <Badge variant="default" className="text-xs bg-green-100 text-green-800">
                                    Validated
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground mb-2">{hypothesis.hypothesisValidation || 'Hypothesis validation details'}</p>
                                {hypothesis.keyMetricChange && (
                                  <div className="text-xs text-green-700 mb-2">
                                    <span className="font-medium">Key Metric Change:</span> {hypothesis.keyMetricChange}
                                  </div>
                                )}
                                {hypothesis.summaryFinding && (
                                  <div className="text-xs text-muted-foreground">
                                    <span className="font-medium">Summary:</span> {hypothesis.summaryFinding}
                                  </div>
                                )}
                              </div>
                            ))}
                            {getValidatedHypotheses(challenge, analysis, currentProblem.id).length === 0 && (
                              <div className="p-4 text-center text-muted-foreground text-sm">
                                No validated hypotheses found
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Rejected Hypotheses List */}
                        <div className="bg-white rounded-lg border mb-4">
                          <div className="p-3 border-b bg-red-50">
                            <div className="flex items-center">
                              <XCircle className="h-4 w-4 text-red-600 mr-2" />
                              <h4 className="font-medium text-sm text-red-800">Rejected Hypotheses ({getRejectedHypotheses(challenge, analysis, currentProblem.id).length})</h4>
                            </div>
                          </div>
                          <div className="divide-y">
                            {getRejectedHypotheses(challenge, analysis, currentProblem.id).map((hypothesis, index) => (
                              <div key={`rejected-${hypothesis.id}-${index}`} className="p-3 hover:bg-red-50/50">
                                <div className="flex justify-between items-start mb-2">
                                  <div className="flex items-center">
                                    <div className="h-6 w-6 rounded-full bg-red-100 flex items-center justify-center mr-2">
                                      <XCircle className="h-3 w-3 text-red-600" />
                                    </div>
                                    <h5 className="font-medium text-sm">
                                      <button 
                                        onClick={() => navigate(`/analysis?hypothesis=${hypothesis.id}`)}
                                        className="text-left hover:text-blue-600 hover:underline transition-colors"
                                      >
                                        {hypothesis.hypothesis || `${hypothesis.title}`}
                                      </button>
                                    </h5>
                                  </div>
                                  <Badge variant="destructive" className="text-xs">
                                    Rejected
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground mb-2">{hypothesis.hypothesisValidation || 'Hypothesis validation details'}</p>
                                {hypothesis.keyMetricChange && (
                                  <div className="text-xs text-red-700 mb-2">
                                    <span className="font-medium">Key Metric Change:</span> {hypothesis.keyMetricChange}
                                  </div>
                                )}
                                {hypothesis.summaryFinding && (
                                  <div className="text-xs text-muted-foreground">
                                    <span className="font-medium">Summary:</span> {hypothesis.summaryFinding}
                                  </div>
                                )}
                              </div>
                            ))}
                            {getRejectedHypotheses(challenge, analysis, currentProblem.id).length === 0 && (
                              <div className="p-4 text-center text-muted-foreground text-sm">
                                No rejected hypotheses found
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Detailed Hypothesis Analysis Cards */}
                        {getValidatedHypotheses(challenge, analysis, currentProblem.id).slice(0, 2).map((hypothesis) => (
                          <Collapsible key={hypothesis.id}>
                            <CollapsibleTrigger asChild>
                              <Button variant="outline" className="w-full justify-between p-4 h-auto">
                                <div className="text-left">
                                  <h4 className="font-medium">{hypothesis.title}</h4>
                                  <p className="text-sm text-muted-foreground mt-1">{hypothesis.description}</p>
                                </div>
                                <ChevronDown className="h-4 w-4" />
                              </Button>
                            </CollapsibleTrigger>
                            <CollapsibleContent className="mt-2">
                              <Card>
                                <CardContent className="p-4">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                      <h5 className="font-medium text-sm mb-2">Analysis Method</h5>
                                      <p className="text-xs text-muted-foreground mb-3">Trend Analysis + Comparative Analysis</p>
                                      <div className="bg-muted/50 p-3 rounded text-center text-sm">
                                        📊 Chart Area (Trend Graph)
                                      </div>
                                    </div>
                                    <div>
                                      <h5 className="font-medium text-sm mb-2">Simulation Scenarios</h5>
                                      <div className="space-y-2 text-xs">
                                        <div className="flex justify-between">
                                          <span>Baseline Scenario:</span>
                                          <span className="font-medium">85%</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span>Optimized Scenario:</span>
                                          <span className="font-medium text-green-600">92%</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span>Pessimistic Scenario:</span>
                                          <span className="font-medium text-red-600">78%</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  {/* Hypothesis Conclusion Section */}
                                  <div className="mt-4 pt-4 border-t">
                                    <h5 className="font-medium text-sm mb-2">Key Findings</h5>
                                    <div className="bg-blue-50 p-3 rounded-md mb-3">
                                      <div className="flex items-center mb-1">
                                        <CheckCircle className="h-4 w-4 text-blue-600 mr-1" />
                                        <span className="text-xs font-medium text-blue-800">
                                          {hypothesis.status === 'validated' ? 'Validated Hypothesis' : 'Testing Results'}
                                        </span>
                                      </div>
                                      <p className="text-xs text-blue-700">
                                        {hypothesis.status === 'validated' 
                                          ? 'This hypothesis has been validated with statistical significance (p<0.05).'
                                          : 'Initial testing shows promising results with 92% confidence interval.'}
                                      </p>
                                    </div>
                                    <div className="space-y-2 mb-3">
                                      <div className="flex items-start">
                                        <div className="h-5 w-5 flex items-center justify-center rounded-full bg-green-100 text-green-600 mr-2 flex-shrink-0 mt-0.5">
                                          <TrendingUp className="h-3 w-3" />
                                        </div>
                                        <p className="text-xs">
                                          <span className="font-medium">Positive Impact:</span> {hypothesis.confidence > 70 
                                            ? 'Significant improvement in renewal rates by 7.2% across targeted segments.'
                                            : 'Moderate improvement in customer engagement metrics.'}
                                        </p>
                                      </div>
                                      <div className="flex items-start">
                                        <div className="h-5 w-5 flex items-center justify-center rounded-full bg-blue-100 text-blue-600 mr-2 flex-shrink-0 mt-0.5">
                                          <Lightbulb className="h-3 w-3" />
                                        </div>
                                        <p className="text-xs">
                                          <span className="font-medium">Key Insight:</span> {hypothesis.confidence > 70 
                                            ? 'Personalized messaging based on customer lifecycle stage shows 3x higher engagement.'
                                            : 'Customer segments respond differently to incentive structures.'}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {/* Recommendations and Action Items Section */}
                                  <div className="mt-4 pt-4 border-t">
                                    <div className="flex items-center justify-between mb-2">
                                      <h5 className="font-medium text-sm">Recommendations & Action Items</h5>
                                      <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="text-xs" 
                                        onClick={() => navigate(`/hypotheses/${hypothesis.id}`)}
                                      >
                                        View Details
                                        <ArrowRight className="ml-1 h-3 w-3" />
                                      </Button>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                      <Badge variant="secondary" className="text-xs">Short-term</Badge>
                                      <Badge variant="outline" className="text-xs">Marketing Dept</Badge>
                                      <Badge className="text-xs bg-orange-100 text-orange-800">High Priority</Badge>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            </CollapsibleContent>
                          </Collapsible>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
                );
              })()}
              
              {/* Summary and Action Tracking */}
              {selectedNavItem === 'summary' && (
                <div className="space-y-6">
                  {/* Analysis Quality Score */}
                  <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200">
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <BarChart2 className="mr-2 h-5 w-5 text-indigo-600" />
                        Analysis Quality Assessment
                      </CardTitle>
                      <CardDescription>Comprehensive evaluation of analysis effectiveness across key dimensions</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Score Visualization */}
                        <div className="space-y-4">
                          <h4 className="font-semibold text-sm mb-3">Quality Metrics</h4>
                          {[
                            { 
                              label: 'Goal Alignment', 
                              score: analysis.evaluation?.goal_alignment_score || 0, 
                              description: analysis.evaluation?.goal_alignment || 'Aligns well with business goals' 
                            },
                            { 
                              label: 'Challenge Understanding', 
                              score: analysis.evaluation?.challenge_understanding_score || 0, 
                              description: analysis.evaluation?.challenge_understanding || 'Clear understanding of core challenges' 
                            },
                            { 
                              label: 'Hypothesis Coverage', 
                              score: analysis.evaluation?.hypothesis_coverage_score || 0, 
                              description: analysis.evaluation?.hypothesis_coverage || 'Addresses key hypotheses effectively' 
                            },
                            { 
                              label: 'Actionable Insights', 
                              score: analysis.evaluation?.actionable_insights_score || 0, 
                              description: analysis.evaluation?.actionable_insights || 'Provides practical recommendations' 
                            },
                            { 
                              label: 'Verification Reliability', 
                              score: analysis.evaluation?.verification_reliability_score || 0, 
                              description: analysis.evaluation?.verification_reliability || 'Logical reasoning with data support' 
                            },
                            { 
                              label: 'Data Sufficiency', 
                              score: analysis.evaluation?.data_sufficiency_score || 0, 
                              description: analysis.evaluation?.data_sufficiency || 'Sufficient for initial conclusions' 
                            }
                          ].map((metric, index) => (
                            <div key={index} className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">{metric.label}</span>
                                <div className="flex items-center space-x-2">
                                  <span className="text-sm font-bold">{metric.score}/5</span>
                                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    metric.score === 5 ? 'bg-green-100 text-green-800' :
                                    metric.score === 4 ? 'bg-blue-100 text-blue-800' :
                                    metric.score === 3 ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-red-100 text-red-800'
                                  }`}>
                                    {metric.score === 5 ? 'Excellent' :
                                     metric.score === 4 ? 'Good' :
                                     metric.score === 3 ? 'Fair' : 'Poor'}
                                  </div>
                                </div>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full transition-all duration-500 ${
                                    metric.score === 5 ? 'bg-green-500' :
                                    metric.score === 4 ? 'bg-blue-500' :
                                    metric.score === 3 ? 'bg-yellow-500' :
                                    'bg-red-500'
                                  }`}
                                  style={{ width: `${(metric.score / 5) * 100}%` }}
                                ></div>
                              </div>
                              <p className="text-xs text-muted-foreground">{metric.description}</p>
                            </div>
                          ))}
                        </div>
                        
                        {/* Overall Score Summary */}
                        <div className="bg-white/70 backdrop-blur-sm p-6 rounded-lg border border-indigo-100">
                          {(() => {
                            const scores = [
                              analysis.evaluation?.goal_alignment_score || 0,
                              analysis.evaluation?.challenge_understanding_score || 0,
                              analysis.evaluation?.hypothesis_coverage_score || 0,
                              analysis.evaluation?.actionable_insights_score || 0,
                              analysis.evaluation?.verification_reliability_score || 0,
                              analysis.evaluation?.data_sufficiency_score || 0
                            ];
                            const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
                            const percentage = Math.round((averageScore / 5) * 100);
                            
                            return (
                              <>
                                <div className="text-center mb-4">
                                  <div className="text-3xl font-bold text-indigo-600 mb-2">{averageScore.toFixed(1)}/5</div>
                                  <div className="text-sm text-gray-600">Overall Quality Score</div>
                                  <div className="mt-2">
                                    <Badge className={`${
                                      averageScore >= 4.5 ? 'bg-green-100 text-green-800' :
                                      averageScore >= 3.5 ? 'bg-blue-100 text-blue-800' :
                                      averageScore >= 2.5 ? 'bg-yellow-100 text-yellow-800' :
                                      'bg-red-100 text-red-800'
                                    }`}>
                                      {averageScore >= 4.5 ? 'Excellent Analysis' :
                                       averageScore >= 3.5 ? 'High Quality Analysis' :
                                       averageScore >= 2.5 ? 'Good Analysis' : 'Needs Improvement'}
                                    </Badge>
                                  </div>
                                </div>
                                
                                {/* Circular Progress Indicator */}
                                <div className="flex justify-center mb-4">
                                  <div className="relative w-24 h-24">
                                    <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
                                      <circle
                                        cx="50"
                                        cy="50"
                                        r="40"
                                        stroke="#e5e7eb"
                                        strokeWidth="8"
                                        fill="none"
                                      />
                                      <circle
                                        cx="50"
                                        cy="50"
                                        r="40"
                                        stroke="#3b82f6"
                                        strokeWidth="8"
                                        fill="none"
                                        strokeDasharray={`${(averageScore / 5) * 251.2} 251.2`}
                                        className="transition-all duration-1000 ease-out"
                                      />
                                    </svg>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                      <span className="text-lg font-bold text-indigo-600">{percentage}%</span>
                                    </div>
                                  </div>
                                </div>
                              </>
                            );
                          })()}
                          
                          {/* Key Strengths */}
                          <div className="space-y-2">
                            <h5 className="font-medium text-sm text-gray-800">Key Strengths</h5>
                            <div className="space-y-1 text-xs text-gray-600">
                              {[
                                { key: 'goal_alignment', label: 'Goal Alignment', score: analysis.evaluation?.goal_alignment_score || 0 },
                                { key: 'challenge_understanding', label: 'Challenge Understanding', score: analysis.evaluation?.challenge_understanding_score || 0 },
                                { key: 'hypothesis_coverage', label: 'Hypothesis Coverage', score: analysis.evaluation?.hypothesis_coverage_score || 0 },
                                { key: 'actionable_insights', label: 'Actionable Insights', score: analysis.evaluation?.actionable_insights_score || 0 },
                                { key: 'verification_reliability', label: 'Verification Reliability', score: analysis.evaluation?.verification_reliability_score || 0 },
                                { key: 'data_sufficiency', label: 'Data Sufficiency', score: analysis.evaluation?.data_sufficiency_score || 0 }
                              ]
                              .filter(item => item.score >= 4)
                              .sort((a, b) => b.score - a.score)
                              .slice(0, 3)
                              .map((item, index) => (
                                <div key={index} className="flex items-center">
                                  <CheckCircle className={`h-3 w-3 mr-1 ${
                                    item.score === 5 ? 'text-green-500' : 'text-blue-500'
                                  }`} />
                                  <span>{item.score === 5 ? 'Excellent' : 'Good'} {item.label.toLowerCase()}</span>
                                </div>
                              ))}
                              {[
                                { key: 'goal_alignment', label: 'Goal Alignment', score: analysis.evaluation?.goal_alignment_score || 0 },
                                { key: 'challenge_understanding', label: 'Challenge Understanding', score: analysis.evaluation?.challenge_understanding_score || 0 },
                                { key: 'hypothesis_coverage', label: 'Hypothesis Coverage', score: analysis.evaluation?.hypothesis_coverage_score || 0 },
                                { key: 'actionable_insights', label: 'Actionable Insights', score: analysis.evaluation?.actionable_insights_score || 0 },
                                { key: 'verification_reliability', label: 'Verification Reliability', score: analysis.evaluation?.verification_reliability_score || 0 },
                                { key: 'data_sufficiency', label: 'Data Sufficiency', score: analysis.evaluation?.data_sufficiency_score || 0 }
                              ].filter(item => item.score >= 4).length === 0 && (
                                <div className="flex items-center">
                                  <CheckCircle className="h-3 w-3 text-gray-400 mr-1" />
                                  <span>Analysis completed successfully</span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Improvement Areas */}
                          <div className="space-y-2 mt-4">
                            <h5 className="font-medium text-sm text-gray-800">Areas for Improvement</h5>
                            <div className="space-y-1 text-xs text-gray-600">
                              {[
                                { key: 'goal_alignment', label: 'Goal Alignment', score: analysis.evaluation?.goal_alignment_score || 0 },
                                { key: 'challenge_understanding', label: 'Challenge Understanding', score: analysis.evaluation?.challenge_understanding_score || 0 },
                                { key: 'hypothesis_coverage', label: 'Hypothesis Coverage', score: analysis.evaluation?.hypothesis_coverage_score || 0 },
                                { key: 'actionable_insights', label: 'Actionable Insights', score: analysis.evaluation?.actionable_insights_score || 0 },
                                { key: 'verification_reliability', label: 'Verification Reliability', score: analysis.evaluation?.verification_reliability_score || 0 },
                                { key: 'data_sufficiency', label: 'Data Sufficiency', score: analysis.evaluation?.data_sufficiency_score || 0 }
                              ]
                              .filter(item => item.score < 4)
                              .sort((a, b) => a.score - b.score)
                              .slice(0, 3)
                              .map((item, index) => (
                                <div key={index} className="flex items-center">
                                  <AlertTriangle className={`h-3 w-3 mr-1 ${
                                    item.score < 2 ? 'text-red-500' : 'text-yellow-500'
                                  }`} />
                                  <span>Enhance {item.label.toLowerCase()}</span>
                                </div>
                              ))}
                              {[
                                { key: 'goal_alignment', label: 'Goal Alignment', score: analysis.evaluation?.goal_alignment_score || 0 },
                                { key: 'challenge_understanding', label: 'Challenge Understanding', score: analysis.evaluation?.challenge_understanding_score || 0 },
                                { key: 'hypothesis_coverage', label: 'Hypothesis Coverage', score: analysis.evaluation?.hypothesis_coverage_score || 0 },
                                { key: 'actionable_insights', label: 'Actionable Insights', score: analysis.evaluation?.actionable_insights_score || 0 },
                                { key: 'verification_reliability', label: 'Verification Reliability', score: analysis.evaluation?.verification_reliability_score || 0 },
                                { key: 'data_sufficiency', label: 'Data Sufficiency', score: analysis.evaluation?.data_sufficiency_score || 0 }
                              ].filter(item => item.score < 4).length === 0 && (
                                <div className="flex items-center">
                                  <CheckCircle className="h-3 w-3 text-green-500 mr-1" />
                                  <span>All metrics performing well</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
               
                  
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChallengeAnalysis;