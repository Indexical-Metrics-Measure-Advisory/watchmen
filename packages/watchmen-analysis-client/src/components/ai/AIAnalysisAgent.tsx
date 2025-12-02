import React, { useEffect, useRef, useState } from 'react';
import { useSidebar } from '@/contexts/SidebarContext';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BrainCircuit, Lightbulb, CheckCircle, RefreshCw, Loader2, XCircle, Maximize2, Minimize2, X, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { MermaidDiagram } from 'react-mermaid-js';
import { BusinessChallenge, BusinessChallengeWithProblems } from '@/model/business';
import { cleanMetadataFields } from '@/utils/dataCleaningUtils';
import { a2aService } from '@/services/a2aService';
import { businessService } from '@/services/businessService';
import { AgentCard } from '@/model/A2ASpec';
import { generateMermaidDiagram } from './utils/AnalysisUtils';
import { stepManager } from './steps/StepManager';
import { analysis_service } from '@/services/analysisService';

// AI Agent Service class

export interface AIAgentStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'error';
  result?: any; // Stores the output of the step
  subSteps?: AIAgentStep[]; // For nested steps like simulation environment
  progress?: number; // Optional progress for individual steps
}

export interface AIAgentMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  relevance: number;
}

export interface AIAgentHypothesis {
  id: string;
  title: string;
  description: string;
  confidence: number;
  metrics: string[];
  status: 'proposed' | 'testing' | 'validated' | 'rejected';
}

interface AIAnalysisAgentProps {
  challengeId?: string;
  onComplete?: (result: any) => void;
}

// ai agent analisys result class 

export interface AIAnalysisResult {
  businessChallenge: BusinessChallenge;
  judgeChallengeResult: any;
  queryHistoryResult: any;
  queryKnowledgeBaseResult: any;
  simulationResult: any;
  answerBusinessChallengeResult: any;
  generateReportResult: any;
} 



const AGENT_INTERVAL = 4000; // Reduced interval for faster UI updates during dev

const initialSteps: AIAgentStep[] = [
  {
    id: 'judgeChallenge',
    title: 'Evaluate Insurance Business Challenge',
    description: 'Assess if the current business challenge is suitable for AI analysis and provide initial recommendations.',
    status: 'pending',
  },
  {
    id: 'queryHistory',
    title: 'Query Historical Experience',
    description: 'Search for similar business challenge analysis cases and results from the past.',
    status: 'pending',
  },
  {
    id: 'queryKnowledgeBase',
    title: 'Query Knowledge Base',
    description: 'Retrieve relevant insurance industry knowledge, analysis logic, and models.',
    status: 'pending',
  },
  {
    id: 'buildSimulation',
    title: 'Build Business Problem Simulation Environment',
    description: 'Create simulation analysis environment based on historical experience and knowledge base.',
    status: 'pending',
    subSteps: [
      { id: 'simDefineProblem', title: 'Define Simulation Business Problem', description: '', status: 'pending' },
      { id: 'simCreateHypothesis', title: 'Create Hypothesis Simulation Environment', description: '', status: 'pending' },
      { id: 'simLinkMetrics', title: 'Link Metrics and Dimensions', description: '', status: 'pending' },
      { id: 'simConcludeHypothesis', title: 'Build Hypothesis Conclusions', description: '', status: 'pending' },
      { id: 'simAnalyze', title: 'Execute Simulation Analysis', description: '', status: 'pending' }
      
    ],
  },

  {
    id: 'answerBusinessChallenge',
    title: 'Attempt to Answer Business Challenge',
    description: 'Provide answers to the original business challenge based on simulation results.',
    status: 'pending',
  },
  {
    id: 'generateReport',
    title: 'Build Conclusions and Generate Analysis Report',
    description: 'Summarize the analysis process, generate final report, and provide feedback mechanism.',
    status: 'pending',
  },
];

interface StepContext {
  additionalInfo?: string;
  manualApproval?: boolean;
  retryCount?: number;
}

// Function to generate Mermaid chart definitions


const AIAnalysisAgent: React.FC<AIAnalysisAgentProps> = ({
  challengeId: propChallengeId,
  onComplete
}) => {
  const { collapsed } = useSidebar();
  const navigate = useNavigate();
  
  // Get agentId from URL query parameters
  const location = window.location;
  const searchParams = new URLSearchParams(location.search);
  const agentId = searchParams.get('agentId');
  const [current_agent,setCurrentAgent] = useState<AgentCard>(null);
  const [businessChallenge, setBusinessChallenge] = useState<BusinessChallengeWithProblems>(null);
  const [businessChallengeWithProblems, setBusinessChallengeWithProblems] = useState<BusinessChallengeWithProblems>(null);
  const [steps, setSteps] = useState<AIAgentStep[]>(initialSteps);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [stepContexts, setStepContexts] = useState<Record<number, StepContext>>({});
  const [analysisConfirmed, setAnalysisConfirmed] = useState<boolean>(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isAutoMode, setIsAutoMode] = useState<boolean>(true); // Whether to automatically execute next step
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [analysisReport, setAnalysisReport] = useState<any>(null);
  const [analisysResult, setAnalisysResult] = useState<any>(null);
  const [mermaidKey, setMermaidKey] = useState<number>(0); // Key for Mermaid diagram to force re-render
  const [showMermaidDiagram, setShowMermaidDiagram] = useState<boolean>(false);
  const [isFullscreenDiagram, setIsFullscreenDiagram] = useState<boolean>(false);
  const [fullscreenElement, setFullscreenElement] = useState<HTMLElement | null>(null);
  
  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        // Exited fullscreen
        setIsFullscreenDiagram(false);
        if (fullscreenElement) {
          // Trigger cleanup event before removing
          const cleanupEvent = new Event('remove');
          fullscreenElement.dispatchEvent(cleanupEvent);
          // Remove the fullscreen container from DOM
          fullscreenElement.remove();
          setFullscreenElement(null);
        }
      }
    };
    
    const handleFullscreenError = (e) => {
      console.error('Fullscreen error:', e);
      setIsFullscreenDiagram(false);
      if (fullscreenElement) {
        // Trigger cleanup event before removing
        const cleanupEvent = new Event('remove');
        fullscreenElement.dispatchEvent(cleanupEvent);
        fullscreenElement.remove();
        setFullscreenElement(null);
      }
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('fullscreenerror', handleFullscreenError);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('fullscreenerror', handleFullscreenError);
    };
  }, [fullscreenElement]);
  
  // Use agentId from URL params if available
  const challengeId = propChallengeId || agentId;

  const [problem, setProblem] = useState<string>('');
  const [hypotheses, setHypotheses] = useState<AIAgentHypothesis[]>([]);
  const [selectedHypothesis, setSelectedHypothesis] = useState<string>('');
  const [availableMetrics, setAvailableMetrics] = useState<AIAgentMetric[]>([
    { id: 'metric1', name: 'Customer Retention Rate', value: 68, unit: '%', relevance: 95 },
    { id: 'metric2', name: 'Customer Satisfaction', value: 7.2, unit: '/10', relevance: 85 },
    { id: 'metric3', name: 'Product Usage Frequency', value: 3.5, unit: 'times/week', relevance: 75 },
  ]);

   const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    confidence: number;
    insights: string[];
  }>({ isValid: false, confidence: 0, insights: [] });

  // Add execution lock to prevent multiple steps from executing simultaneously
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [shouldContinue, setShouldContinue] = useState<boolean>(true);

  const [resourcesLoaded, setResourcesLoaded] = useState({
    agentLoaded: false,
    challengeLoaded: false
  });

  useEffect(() => {
    // Reset loading status
    setResourcesLoaded({
      agentLoaded: false,
      challengeLoaded: false
    });
    
    if (agentId) {
      console.log('Agent ID from URL parameters:', agentId);
      addLog('system', 'Agent ID Detected', `Using Agent ID from URL: ${agentId}`, 'info');
      
      // Load agent
      a2aService.getAgent(agentId).then((agent) => {
        console.log("agent", agent);
        if (agent) {
          setCurrentAgent(agent);
          setResourcesLoaded(prev => ({ ...prev, agentLoaded: true }));
          
          // Get challenge ID and load challenge
          const challengeId: string = agent.metadata?.businessChallengeId;
          if (challengeId) {
            businessService.getBusinessChallengeById(challengeId)
              .then((challenge) => {
                if (challenge) {
                  addLog('system', 'Challenge Loaded', `Business challenge ${challenge.id} loaded successfully`, 'success');
                  setBusinessChallenge(challenge);
                  setResourcesLoaded(prev => ({ ...prev, challengeLoaded: true }));
                  // ai analysis result class
                  const aiAnalysisResult: AIAnalysisResult = {
                    businessChallenge: challenge,
                    judgeChallengeResult: null,
                    queryHistoryResult: null, 
                    queryKnowledgeBaseResult: null,
                    simulationResult: null,

                    answerBusinessChallengeResult: null,
                    generateReportResult: null
                  };
                  setAnalisysResult(aiAnalysisResult);
                } else {
                  addLog('system', 'Challenge Not Found', `No business challenge found with ID: ${challengeId}`, 'error');
                  setIsRunning(false);
                }
              })
              .catch(error => {
                addLog('system', 'Challenge Load Error', `Error loading business challenge: ${error.message}`, 'error');
                setIsRunning(false);
              });
          } else {
            addLog('system', 'Challenge ID Missing', `Agent does not have a business challenge ID`, 'warning');
            setIsRunning(false);
          }
        } else {
          addLog('system', 'Agent Not Found', `No agent found with ID: ${agentId}`, 'error');
          setIsRunning(false);
        }
      }).catch(error => {
        addLog('system', 'Agent Load Error', `Error loading agent: ${error.message}`, 'error');
        setIsRunning(false);
      });
    }
  }, [agentId]);
  
  // Set callback functions for step manager
  useEffect(() => {
    stepManager.setLogCallback((log) => {
      addLog(log.type, log.title, log.description, log.status);
    });
    stepManager.setStepUpdateCallback(updateStepStatus);
  }, []);

  // When both agent and challenge are loaded, record loading status but don't auto-execute
  useEffect(() => {
    if (resourcesLoaded.agentLoaded && resourcesLoaded.challengeLoaded && current_agent && businessChallenge) {
      console.log('Resources loaded, ready for execution:', { agent: current_agent, challenge: businessChallenge });
      addLog('system', 'Resources Loaded', `Agent ${current_agent.name || current_agent.id} and challenge loaded successfully. Click 'Start Agent' to begin analysis.`, 'success');
    }
  }, [resourcesLoaded, current_agent, businessChallenge]);

  // Trigger execution when user clicks start button
  useEffect(() => {
    if (isRunning && resourcesLoaded.agentLoaded && resourcesLoaded.challengeLoaded && current_agent && businessChallenge && !isExecuting) {
      console.log('Starting execution after user clicked start');
      agentSenseAndAct();
    }
  }, [isRunning, resourcesLoaded, current_agent, businessChallenge, isExecuting]);

  // Dummy data for now
 
  // Agent active analysis loop - optimized timer management
  useEffect(() => {
    // Clear previous timer
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Check if timer should be started
    if (isRunning && businessChallenge && !isExecuting) {
      intervalRef.current = setInterval(() => {
        agentSenseAndAct();
      }, AGENT_INTERVAL);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning, businessChallenge, isExecuting]); // Add isExecuting dependency

  // Cleanup when component unmounts
  useEffect(() => {
    return () => {
      // Clear timer
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      // Reset execution state
      setIsExecuting(false);
    };
  }, []);

  const updateStepStatus = (stepId: string, status: AIAgentStep['status'], result?: any, subStepId?: string) => {
    
    console.log('Updating step status:', { stepId,  result });
    setSteps(prevSteps =>
      prevSteps.map(step => {
        if (step.id === stepId) {
          if (subStepId && step.subSteps) {
            return {
              ...step,
              status: step.subSteps.every(ss => ss.status === 'completed') ? 'completed' : 'in-progress',
              subSteps: step.subSteps.map(subStep =>
                subStep.id === subStepId ? { ...subStep, status, result } : subStep
              ),
            };
          }
          return { ...step, status, result };
        }
        return step;
      })
    );
  };


  // agent sense-decide-act main logic
  const agentSenseAndAct = async () => {
    // Prevent duplicate execution
    if (isExecuting) {
      console.log('Agent is already executing, skipping this cycle');
      return;
    }

    // Check if agent exists, stop execution if not
    if (!current_agent) {
      addLog('system', 'Agent Not Found', 'Waiting for agent to be loaded before proceeding', 'warning');
      return;
    }
    
    // Check if businessChallenge exists, stop execution if not
    if (!businessChallenge) {
      addLog('system', 'Challenge Not Found', 'Waiting for business challenge to be loaded before proceeding', 'warning');
      return;
    }

    // If all steps are completed, stop execution
    if (currentStepIndex >= steps.length) {
      setIsRunning(false);
      addLog('system', 'Analysis Complete', 'All steps have been executed successfully.', 'success');
      if (onComplete) {
        onComplete({ report: analysisReport, logs });
      }
      return;
    }
   
    // Check if current step needs manual approval (only in manual approval mode)
    if (!isAutoMode) {
      const currentContext = stepContexts[currentStepIndex] || {};
      // Auto-approve first step; otherwise check if manually approved
      if (currentStepIndex > 0 && currentContext.manualApproval === false) {
        addLog('system', 'Step Paused', `Waiting for manual approval for step: ${steps[currentStepIndex].title}`, 'info');
        setIsRunning(false);
        return;
      }
    }

    const currentStep = steps[currentStepIndex];
    
    // If current step is completed, move to next step
    if (currentStep.status === 'completed') {
      if (currentStepIndex < steps.length - 1) {
        setCurrentStepIndex(prev => prev + 1);
        addLog('system', 'Step Completed', `Moving to next step: ${steps[currentStepIndex + 1]?.title}`, 'info');
      }
      return;
    }
    
    // If current step is in progress, skip this execution
    if (currentStep.status === 'in-progress') {
      console.log(`Step ${currentStep.id} is already in progress, waiting...`);
      return;
    }

    // Set execution lock
    setIsExecuting(true);
    
    // Use step manager to execute current step
    const stepContext = stepContexts[currentStepIndex] || {};
    const executionContext = {
      businessChallenge,
      analysisResult: analisysResult,
      stepContext,
      agent: current_agent,
      currentAgent: current_agent,
      stepIndex: currentStepIndex
    };

    try {
      const result = await stepManager.executeStep(currentStep.id, executionContext);
      
      if (result.success) {
        // Update analysis result
        if (result.result?.updatedAnalysisResult) {
          setAnalisysResult(result.result.updatedAnalysisResult);
        }
        

        console.log('Step execution result shouldContinue:', result.shouldContinue);
        const should_continue = result.shouldContinue
        // Check if step return result contains shouldContinue field
        if (should_continue !== undefined) {
          setShouldContinue(should_continue);
          addLog('system', 'Continue Control', `Step returned shouldContinue: ${should_continue}`, 'info');
          
          // If step returns shouldContinue as false, stop execution immediately
          if (!should_continue) {
            setIsRunning(false);
            addLog('system', 'Execution Paused', 'Step execution paused due to shouldContinue = false', 'warning');
            return;
          }
        }
        
        // Handle additional status updates for special steps
        if (currentStep.id === 'buildSimulation' && result.result?.challenge) {
          setBusinessChallengeWithProblems(result.result.challenge);
        }
        
        if (currentStep.id === 'generateReport' && result.result) {
          setAnalysisReport(result.result);
          if (onComplete) onComplete(result.result);
        }
        
      

        if (currentStepIndex < steps.length - 1) {
          if (isAutoMode) {
            setCurrentStepIndex(prev => prev + 1);
            addLog('system', 'Auto Mode', `Automatically proceeding to next step: ${steps[currentStepIndex + 1]?.title}`, 'info');
          } else {
            setStepContexts(prev => ({
              ...prev,
              [currentStepIndex + 1]: { ...prev[currentStepIndex + 1], manualApproval: false }
            }));
            setCurrentStepIndex(prev => prev + 1);
            addLog('system', 'Manual Approval Mode', `Waiting for user approval before executing: ${steps[currentStepIndex + 1]?.title}`, 'info');
            setIsRunning(false);
          }
        } else {
          setIsRunning(false);
          addLog('system', 'All Steps Complete', 'AI Analysis Process Ended.', 'success');
        }
      } else {
        // Handle execution failure
        addLog(currentStep.id, 'Step Execution Failed', result.error || 'Unknown error', 'error');
        updateStepStatus(currentStep.id, 'error', { error: result.error });
        setIsRunning(false);
      }
    } catch (error) {
      console.error('Error during agent step:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown Error';
      addLog(currentStep.id, 'Step Execution Failed', errorMessage, 'error');
      updateStepStatus(currentStep.id, 'error', { error: errorMessage });
      setIsRunning(false);
    } finally {
      // Release execution lock regardless of success or failure
      setIsExecuting(false);
    }
  };


  // Logging
  const addLog = (type: string, title: string, description: string, status: string) => {
    setLogs(prev => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type,
        title,
        description,
        timestamp: new Date().toISOString(),
        status
      }
    ]);
  };

  // Manually trigger agent analysis for the current step or restart if all done
  const handleStepAction = (stepIndex: number, action: 'approve' | 'reject' | 'rerun') => {
    // Prevent manual operations during execution
    if (isExecuting) {
      addLog('system', 'Action Blocked', 'Cannot perform manual action while step is executing', 'warning');
      return;
    }

    const step = steps[stepIndex];
    
    switch (action) {
      case 'approve':
        // Update step status to completed and record manual confirmation
        updateStepStatus(step.id, 'completed', step.result);
        setStepContexts(prev => ({
          ...prev,
          [stepIndex]: { ...prev[stepIndex], manualApproval: true }
        }));
        
        // If in manual approval mode, resume execution flow
        if (!isAutoMode) {
          // Mark current step as approved
          setStepContexts(prev => ({
            ...prev,
            [stepIndex]: { ...prev[stepIndex], manualApproval: true }
          }));
          // Resume execution flow
          setIsRunning(true);
          addLog('system', 'Step Approved', `Step ${step.title} was approved by user, continuing execution`, 'success');
        } else {
          // In auto mode, move directly to next step
          setCurrentStepIndex(stepIndex + 1);
        }
        break;

      case 'reject':
        // Update step status to error, stop execution
        updateStepStatus(step.id, 'error', { error: 'Step rejected by user' });
        setIsRunning(false);
        addLog('system', 'Step Rejected', `Step ${step.title} was rejected by user`, 'error');
        break;

      case 'rerun':
        // Reset current step status, update retry count
        const currentContext = stepContexts[stepIndex] || {};
        const retryCount = (currentContext.retryCount || 0) + 1;
        
        updateStepStatus(step.id, 'pending');
        setStepContexts(prev => ({
          ...prev,
          [stepIndex]: { ...prev[stepIndex], retryCount }
        }));
        setCurrentStepIndex(stepIndex);
        setIsRunning(true);
        addLog('system', 'Step Rerun', `Rerunning step ${step.title} (Attempt ${retryCount})`, 'info');
        break;
    }
  };



  const handleRating = (rating: number) => {
    if (analysisReport) {
      const updatedReport = { ...analysisReport, customerRating: rating };
      setAnalysisReport(updatedReport);
      addLog('feedback', 'Customer Rating', `Report Rating: ${rating} stars`, 'info');
      // Potentially send this feedback to a backend
    }
  };

  // Function to rerun all steps
  const handleRerunAllSteps = () => {
    // Prevent rerun operations during execution
    if (isExecuting) {
      addLog('system', 'Action Blocked', 'Cannot rerun all steps while a step is executing', 'warning');
      return;
    }

    // Reset all step statuses
    setSteps(initialSteps.map(step => ({
      ...step,
      status: 'pending',
      result: undefined,
      subSteps: step.subSteps ? step.subSteps.map(subStep => ({
        ...subStep,
        status: 'pending',
        result: undefined
      })) : undefined
    })));

    // Reset related states
    setCurrentStepIndex(0);
    setStepContexts({});
    setAnalysisReport(null);
    setValidationResult({ isValid: false, confidence: 0, insights: [] });
    
    // Reset analysis result, keep business challenge
    if (businessChallenge) {
      const resetAnalysisResult: AIAnalysisResult = {
        businessChallenge,
        judgeChallengeResult: null,
        queryHistoryResult: null,
        queryKnowledgeBaseResult: null,
        simulationResult: null,

        answerBusinessChallengeResult: null,
        generateReportResult: null
      };
      setAnalisysResult(resetAnalysisResult);
    }

    // Restart execution
    setIsRunning(true);
    addLog('system', 'Rerun All Steps', 'All steps have been reset and analysis will restart', 'info');
  };

  // UI Rendering
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className={`${collapsed ? 'pl-20' : 'pl-56'} min-h-screen transition-all duration-300`}>
        <Header />
        <main className="container py-4 sm:py-6 px-4 sm:px-6 max-w-full overflow-hidden">
          <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BrainCircuit className="h-6 w-6 text-primary" />
          <span className="text-xl font-semibold">AI Agent Analysis</span>
          {/* <Badge variant="outline" className="ml-auto text-sm">{challengeTitle}</Badge> */}
        </CardTitle>
        <div className="mt-2 text-sm text-muted-foreground">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">Challenge ID:</span>
              <span>{challengeId || 'Not specified'}</span>
            </div>
            {current_agent && current_agent.metadata && (
              <>
                <div className="flex items-center gap-2">
                  <span className="font-medium">Agent:</span>
                  <span>{current_agent.name || current_agent.id}</span>
                </div>
                {current_agent.metadata.businessChallengeId && (
                  <div className="flex  gap-2">
                    <span className="font-medium">Title:</span>
                    <span>{current_agent?.metadata?.businessChallengeTitle || ''}</span>
                  </div>
                  
                )}
                {current_agent.metadata.businessChallengeId && (
                  <div className="flex  gap-2">
                    <span className="font-medium">Description:</span>
                    <span>{current_agent?.metadata?.businessChallengeDescription|| ''}</span>
                  </div>
                  
                )}
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-8 pt-6">
        {/* Optimized control panel - clear visual hierarchy and user-friendly design */}
        <div className="mb-6 pb-6 border-b border-border/50 space-y-6">
          {/* Status overview card */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 p-4 rounded-xl border border-blue-200/50 dark:border-blue-800/50">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${isRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                  <h3 className="text-lg font-semibold text-foreground">
                    {isRunning ? '🔄 Analysis in Progress...' : currentStepIndex >= steps.length ? '✅ Analysis Completed' : '⏸️ Analysis Paused'}
                  </h3>
                </div>
                <div className="text-sm text-muted-foreground">
                  Current Step: {currentStepIndex < steps.length ? `${currentStepIndex + 1}. ${steps[currentStepIndex].title}` : 'All steps completed'}
                </div>
              </div>
              
              {/* Progress indicator */}
              <div className="bg-white/80 dark:bg-gray-900/80 px-4 py-3 rounded-lg border border-white/50 dark:border-gray-700/50 min-w-[200px]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Analysis Progress</span>
                  <span className="text-sm text-muted-foreground">
                    {steps.filter(step => step.status === 'completed').length}/{steps.length}
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500 ease-out"
                    style={{ width: `${(steps.filter(step => step.status === 'completed').length / steps.length) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Main action button group */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Main control button */}
            <Button 
              variant={isRunning ? 'destructive' : 'default'} 
              size="lg" 
              onClick={() => {
                if (isRunning) {
                  setIsRunning(false);
                  addLog('system', 'Analysis Paused', 'User paused the analysis process', 'info');
                } else {
                  if (currentStepIndex >= steps.length) {
                    // Restart analysis
                    setCurrentStepIndex(0);
                    setSteps(initialSteps);
                    setStepContexts({});
                    addLog('system', 'Restart Analysis', 'Starting analysis process from the beginning', 'info');
                  } else {
                    addLog('system', 'Start Analysis', 'User initiated AI analysis process', 'info');
                  }
                  setIsRunning(true);
                }
              }}
              className="h-12 font-medium shadow-md hover:shadow-lg transition-all duration-200"
              disabled={!resourcesLoaded.agentLoaded || !resourcesLoaded.challengeLoaded}
            >
              {isRunning ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Pause Analysis
                </> 
              ) : (
                currentStepIndex >= steps.length ? (
                  <>
                    <RefreshCw className="h-5 w-5 mr-2" />
                    Restart
                  </>
                ) : (
                  <>
                    <BrainCircuit className="h-5 w-5 mr-2" />
                    Start Analysis
                  </>
                )
              )}
            </Button>
            
            {/* Execution mode toggle */}
            <Button 
              variant={isAutoMode ? 'default' : 'secondary'} 
              size="lg" 
              onClick={() => {
                setIsAutoMode(!isAutoMode);
                addLog('system', 'Mode Switch', `Switched to ${!isAutoMode ? 'Auto' : 'Manual Approval'} mode`, 'info');
              }}
              className="h-12 transition-all duration-200 hover:shadow-md"
            >
              {isAutoMode ? (
                <>
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
                  Auto Mode
                </>
              ) : (
                <>
                  <div className="w-2 h-2 bg-orange-500 rounded-full mr-2" />
                  Manual Mode
                </>
              )}
            </Button>

            {/* Reset process */}
            <Button 
              variant="outline" 
              size="lg" 
              onClick={handleRerunAllSteps}
              disabled={isExecuting || isRunning}
              className="h-12 hover:bg-muted/50 hover:shadow-md transition-all duration-200"
            >
              <RefreshCw className="h-5 w-5 mr-2" />
              Reset Process
            </Button>

            {/* Confirm analysis result button - only shown when all steps are completed and not running */}
            {(currentStepIndex >= steps.length || steps.every(step => step.status === 'completed')) && !isRunning ? (
              <Button 
                variant="default" 
                size="lg" 
                onClick={async () => {
                  addLog('system', 'Analysis Confirmed', 'User confirmed the analysis results', 'success');
                  try {
                    if (analisysResult) {
                      const cleanedSimulationResult = cleanMetadataFields(analisysResult.simulationResult);
                      const response = await analysis_service.save_analysis_result(cleanedSimulationResult);
                      if (response && response.success && response.storage_key) {
                        addLog('system', 'Analysis Saved', `Analysis results saved successfully, storage key: ${response.storage_key}`, 'success');
                        localStorage.setItem('analysis_storage_key', response.storage_key);
                        setAnalysisConfirmed(true);
                      } else {
                        addLog('system', 'Analysis Saved', 'Analysis results saved successfully', 'success');
                        setAnalysisConfirmed(true);
                      }
                    }
                  } catch (error) {
                    addLog('system', 'Save Failed', 'Failed to save analysis results: ' + (error as Error).message, 'error');
                  }
                  if (onComplete && analysisReport) {
                    onComplete({ report: analysisReport, logs, confirmed: true });
                  }
                }}
                className="h-12 bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
              >
                <CheckCircle className="h-5 w-5 mr-2" />
                Confirm Analysis
              </Button>
            ) : (
              <div className="h-12 flex items-center justify-center text-sm text-muted-foreground bg-muted/30 rounded-md border border-dashed">
                Confirm after analysis completion
              </div>
            )}
          </div>

          {/* Secondary action button group */}
          <div className="flex flex-wrap gap-3 pt-4 border-t border-muted/30">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2 w-full">
              <FileText className="h-4 w-4" />
              <span className="font-medium">View Results</span>
            </div>
            
            {/* View detailed analysis */}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                const storageKey = localStorage.getItem('analysis_storage_key');
                if (storageKey) {
                  const detailsUrl = `/challenge-analysis?analysisId=${storageKey}&challengeId=${businessChallengeWithProblems.id}`;
                  navigate(detailsUrl);
                  addLog('system', 'View Details', `Opening detailed analysis page, storage key: ${storageKey}`, 'info');
                } else {
                  addLog('system', 'No Storage Key', 'Analysis storage key not found, please confirm analysis results first', 'warning');
                }
              }}
              disabled={!analysisConfirmed}
              className="hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-all duration-200"
            >
              <FileText className="h-4 w-4 mr-2" />
              Detailed Analysis Report
              {!analysisConfirmed && <span className="ml-2 text-xs text-muted-foreground">(Confirm first)</span>}
            </Button>
            
            {/* View challenge report */}
            {analisysResult?.generateReportResult?.result?.challengeMarkdown && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  const challengeMarkdown = analisysResult?.generateReportResult?.result?.challengeMarkdown;
                  if (challengeMarkdown) {
                    const newWindow = window.open('', '_blank');
                    if (newWindow) {
                      newWindow.document.write(`
                        <!DOCTYPE html>
                        <html>
                        <head>
                          <title>Challenge Analysis Report</title>
                          <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
                          <style>
                            body { 
                              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                              max-width: 1200px; 
                              margin: 0 auto; 
                              padding: 2rem 3rem; 
                              line-height: 1.6; 
                              color: #333;
                              min-height: 100vh;
                            }
                            h1, h2, h3 { color: #2563eb; }
                            pre { background: #f8f9fa; padding: 1rem; border-radius: 0.5rem; overflow-x: auto; }
                            code { background: #f1f5f9; padding: 0.2rem 0.4rem; border-radius: 0.25rem; }
                            blockquote { border-left: 4px solid #e5e7eb; margin: 0; padding-left: 1rem; }
                            table { border-collapse: collapse; width: 100%; }
                            th, td { border: 1px solid #e5e7eb; padding: 0.5rem; text-align: left; }
                            th { background: #f9fafb; }
                          </style>
                        </head>
                        <body>
                          <div id="content"></div>
                          <script>
                            document.getElementById('content').innerHTML = marked.parse(${JSON.stringify(challengeMarkdown)});
                          </script>
                        </body>
                        </html>
                      `);
                      newWindow.document.close();
                    }
                  }
                }}
                className="hover:bg-green-50 hover:border-green-300 hover:text-green-700 transition-all duration-200"
              >
                <FileText className="h-4 w-4 mr-2" />
                Challenge Analysis Report
              </Button>
            )}
          </div>
        </div>

        {/* Overall Progress (Optional) */}
        {/* <Progress value={(currentStepIndex / steps.length) * 100} className="w-full h-2 mb-6" /> */}

        <div className="space-y-4">
          {steps.map((step, index) => (
            <motion.div
              key={step.id}
              initial={{ opacity: 0.6, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className={`p-4 rounded-lg border ${step.status === 'in-progress' ? 'border-primary shadow-md' : step.status === 'completed' ? 'border-green-500 bg-green-50/30 dark:bg-green-900/20' : step.status === 'error' ? 'border-red-500 bg-red-50/30 dark:bg-red-900/20' : 'border-border'}`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {step.status === 'in-progress' && <Loader2 className="h-5 w-5 text-primary animate-spin flex-shrink-0" />}
                  {step.status === 'completed' && <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />}
                  {step.status === 'error' && <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />}
                  {step.status === 'pending' && <Lightbulb className="h-5 w-5 text-muted-foreground flex-shrink-0" />}
                  <h3 className="font-medium text-md truncate">{index + 1}. {step.title}</h3>
                  <Badge variant={step.status === 'completed' ? 'default' : step.status === 'error' ? 'destructive' : 'outline'} className="capitalize flex-shrink-0">
                    {step.status}
                   </Badge>
                 </div>
                 <div className="flex items-center gap-2 flex-shrink-0">
                   {step.status === 'in-progress' && (
                     <>
                       <Button 
                         variant="outline" 
                         size="sm" 
                         onClick={() => handleStepAction(index, 'approve')} 
                         className="min-w-[5rem] hover:bg-green-50 hover:border-green-300 hover:text-green-700"
                       >
                         <CheckCircle className="h-4 w-4 mr-1" />
                         <span className="hidden sm:inline">Approve</span>
                         <span className="sm:hidden">✓</span>
                       </Button>
                       <Button 
                         variant="outline" 
                         size="sm" 
                         onClick={() => handleStepAction(index, 'reject')} 
                         className="min-w-[5rem] hover:bg-red-50 hover:border-red-300 hover:text-red-700"
                       >
                         <XCircle className="h-4 w-4 mr-1" />
                         <span className="hidden sm:inline">Reject</span>
                         <span className="sm:hidden">✗</span>
                       </Button>
                     </>
                   )}
                   {(step.status === 'completed' || step.status === 'error') && (
                     <Button 
                       variant="outline" 
                       size="sm" 
                       onClick={() => handleStepAction(index, 'rerun')} 
                       className="min-w-[5rem] hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700"
                     >
                       <RefreshCw className="h-4 w-4 mr-1" />
                       <span className="hidden sm:inline">Retry</span>
                       <span className="sm:hidden">↻</span>
                     </Button>
                   )}
                 </div>
              </div>
              <div className="ml-8 mt-2 space-y-2">
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                  
                  {/* Display step context information */}
                  {stepContexts[index]?.retryCount && (
                    <p className="text-xs text-muted-foreground">retry count : {stepContexts[index].retryCount}</p>
                  )}
                  {stepContexts[index]?.manualApproval && (
                    <Badge variant="outline" className="text-xs">Confirm</Badge>
                  )}
                  
                  {/* Context input for retry */}
                  {(step.status === 'error' || step.status === 'completed') && (
                    <div className="w-full">
                      <input
                        type="text"
                        placeholder="Add context information or special requirements for retry"
                        className="flex h-8 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 min-w-0 hover:border-primary/50 focus:border-primary"
                        value={stepContexts[index]?.additionalInfo || ''}
                        onChange={(e) => setStepContexts(prev => ({
                          ...prev,
                          [index]: { ...prev[index], additionalInfo: e.target.value }
                        }))}
                      />
                    </div>
                  )}
                </div>
              
              {/* Display step result if available */}
              {step.status === 'completed' && step.result && (
                <div className="mt-3 ml-8 p-3 bg-background/50 rounded-md text-xs space-y-1 overflow-hidden">
                  <h4 className="font-semibold mb-1">Step Output:</h4>
                  {/* Customize display content based on different step types */}
                  {step.id === 'judgeChallenge' && typeof step.result === 'object' ? (
                    <div className="space-y-3">
                      <div className="flex items-center">
                        <span className="font-medium w-1/3">Challenge Assessment:</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${step.result.verification_pass ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                          {step.result.verification_pass ? 'Suitable for Analysis' : 'Needs Improvement'}
                        </span>
                      </div>
                      
                      {step.result.reason && (
                        <div>
                          <span className="font-medium block mb-1">Reason:</span>
                          <p className="text-sm">{step.result.reason}</p>
                        </div>
                      )}
                      
                      {step.result.clarity && (
                        <div className="border-t pt-2">
                          <div className="flex items-center mb-1">
                            <span className="font-medium">Clarity:</span>
                            <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${step.result.clarity.is_specific ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                              Score: {step.result.clarity.specificity_score.toFixed(1)}/10
                            </span>
                          </div>
                          <p className="text-xs">{step.result.clarity.specificity_feedback}</p>
                        </div>
                      )}
                      
                      {step.result.operability && (
                        <div className="border-t pt-2">
                          <div className="mb-1">
                            <span className="font-medium block mb-2">Operability:</span>
                            <div className="flex flex-wrap gap-1">
                              <span className={`px-2 py-0.5 rounded-full text-xs ${step.result.operability.is_actionable ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                                {step.result.operability.is_actionable ? 'Actionable' : 'Not Actionable'}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-xs ${step.result.operability.data_analyzable ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                                {step.result.operability.data_analyzable ? 'Analyzable' : 'Not Analyzable'}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-xs ${step.result.operability.strategy_adjustable ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                                {step.result.operability.strategy_adjustable ? 'Adjustable' : 'Not Adjustable'}
                              </span>
                            </div>
                          </div>
                          <p className="text-xs">{step.result.operability.operability_feedback}</p>
                        </div>
                      )}
                      
                      {step.result.impact && (
                        <div className="border-t pt-2">
                          <div className="flex items-center mb-1">
                            <span className="font-medium">Impact:</span>
                            <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${step.result.impact.impact_level === 'High' ? 'bg-green-100 text-green-800' : step.result.impact.impact_level === 'Medium' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'}`}>
                              {step.result.impact.impact_level} Impact
                            </span>
                          </div>
                          {step.result.impact.potential_impact_areas && step.result.impact.potential_impact_areas.length > 0 && (
                            <div>
                              <span className="text-xs font-medium">Potential Impact Areas:</span>
                              <ul className="list-disc list-inside pl-2 text-xs">
                                {step.result.impact.potential_impact_areas.map((area, i) => (
                                  <li key={i}>{area}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          <p className="text-xs mt-1">{step.result.impact.impact_feedback}</p>
                        </div>
                      )}
                      
                      {step.result.suggested_challenge && (
                        <div>
                          <span className="font-medium block mb-1">Suggested Challenge:</span>
                          <p className="text-sm">{step.result.suggested_challenge}</p>
                        </div>
                      )}
                    </div>
                  ) : step.id === 'queryHistory' && typeof step.result === 'object' ? (
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <span className="font-medium w-1/3">Similar Cases Found:</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${step.result.hasSimilar ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                          {step.result.hasSimilar ? 'Yes' : 'No'}
                        </span>
                      </div>
                      {step.result.similarChallenges && step.result.similarChallenges.length > 0 && (
                        <div>
                          <span className="font-medium block mb-1">Similar Challenges:</span>
                          <ul className="list-disc list-inside pl-2">
                            {step.result.similarChallenges.map((challenge: any, i: number) => (
                              <li key={i} className="text-xs">
                                <span className="font-medium">{challenge.title}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : step.id === 'queryKnowledgeBase' && typeof step.result === 'object' ? (
                    <div className="space-y-2">
                      <div>
                        <span className="font-medium block mb-1">Knowledge Base Status:</span>
                        <p className="text-xs pl-2">{step.result.hasKnowledgeBase ? 'Available' : 'Not Available'}</p>
                      </div>
                      {step.result.knowledgeBaseChallenges && step.result.knowledgeBaseChallenges.length > 0 && (
                        <div>
                          <span className="font-medium block mb-1">Knowledge Base Challenges:</span>
                          <ul className="list-disc list-inside pl-2">
                            {step.result.knowledgeBaseChallenges.map((challenge: string, i: number) => (
                              <li key={i} className="text-xs">{challenge}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : step.id === 'buildSimulation' && typeof step.result === 'object' ? (
                    <div className="space-y-3">
                      <div className="flex items-center">
                        <span className="font-medium w-1/3">Environment Status:</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${
                          step.result.environmentStatus === 'Simulation Environment Built' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {step.result.environmentStatus}
                        </span>
                      </div>
                      
                      {step.result.analysisDetails && (
                        <div className="border-t pt-2">
                          <span className="font-medium block mb-2">Analysis Summary:</span>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="flex justify-between">
                              <span>Business Problems:</span>
                              <span className="font-medium">{step.result.analysisDetails.businessProblemsCount}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Validated Hypotheses:</span>
                              <span className="font-medium text-green-600">{step.result.analysisDetails.validatedHypothesesCount}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Rejected Hypotheses:</span>
                              <span className="font-medium text-red-600">{step.result.analysisDetails.rejectedHypothesesCount}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Key Metrics:</span>
                              <span className="font-medium">{step.result.analysisDetails.keyMetricsCount}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Insights:</span>
                              <span className="font-medium text-blue-600">{step.result.analysisDetails.insightsCount}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Recommendations:</span>
                              <span className="font-medium">{step.result.analysisDetails.recommendationsCount}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Next Steps:</span>
                              <span className="font-medium">{step.result.analysisDetails.nextStepsCount}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Status:</span>
                              <span className={`font-medium ${
                                step.result.analysisDetails.analysisStatus === 'completed' 
                                  ? 'text-green-600' 
                                  : step.result.analysisDetails.analysisStatus === 'in_progress'
                                  ? 'text-blue-600'
                                  : 'text-amber-600'
                              }`}>
                                {step.result.analysisDetails.analysisStatus}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {step.result.challenge && (
                        <div className="border-t pt-2">
                          <span className="font-medium block mb-1">Enhanced Challenge:</span>
                          <p className="text-xs">{step.result.challenge.title}</p>
                          {step.result.challenge.problems && step.result.challenge.problems.length > 0 && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {step.result.challenge.problems.length} problems identified
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ) : step.id === 'answerBusinessProblem' && typeof step.result === 'object' ? (
                    <div className="space-y-2">
                      <div>
                        <span className="font-medium block mb-1">Answer:</span>
                        <p className="text-xs pl-2">{step.result.answer}</p>
                      </div>
                      <div className="flex items-center">
                        <span className="font-medium w-1/3">Confidence:</span>
                        <div className="w-2/3 flex items-center">
                          <div className="w-full bg-gray-200 rounded-full h-1.5 mr-2">
                            <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${step.result.confidence}%` }}></div>
                          </div>
                          <span className="text-xs">{step.result.confidence}%</span>
                        </div>
                      </div>
                    </div>
                  ) : step.id === 'answerBusinessChallenge' && typeof step.result === 'object' ? (
                    <div className="space-y-2">
                      <div>
                        <span className="font-medium block mb-1">Challenge Answer:</span>
                        <p className="text-xs pl-2">{step.result.challengeAnswer}</p>
                      </div>
                      {step.result.recommendations && step.result.recommendations.length > 0 && (
                        <div>
                          <span className="font-medium block mb-1">Recommendations:</span>
                          <ul className="list-disc list-inside pl-2">
                            {step.result.recommendations.map((rec: string, i: number) => (
                              <li key={i} className="text-xs">{rec}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : step.id === 'generateReport' && typeof step.result === 'object' ? (
                    <div className="space-y-2">
                      <div>
                        <span className="font-medium block mb-1">Summary:</span>
                        <p className="text-xs pl-2">{step.result.summary}</p>
                      </div>
                      <div className="flex items-center">
                        <span className="font-medium w-1/3">Confidence Score:</span>
                        <div className="w-2/3 flex items-center">
                          <div className="w-full bg-gray-200 rounded-full h-1.5 mr-2">
                            <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${step.result.confidenceScore}%` }}></div>
                          </div>
                          <span className="text-xs">{step.result.confidenceScore}%</span>
                        </div>
                      </div>
                      {step.result.findings && step.result.findings.length > 0 && (
                        <div>
                          <span className="font-medium block mb-1">Findings:</span>
                          <ul className="list-disc list-inside pl-2">
                            {step.result.findings.map((finding: string, i: number) => (
                              <li key={i} className="text-xs">{finding}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {step.result.recommendations && step.result.recommendations.length > 0 && (
                        <div>
                          <span className="font-medium block mb-1">Recommendations:</span>
                          <ul className="list-disc list-inside pl-2">
                            {step.result.recommendations.map((rec: string, i: number) => (
                              <li key={i} className="text-xs">{rec}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : typeof step.result === 'object' ? (
                    // Default object display method
                    Object.entries(step.result).map(([key, value]) => (
                      <div key={key} className="flex">
                        <span className="font-medium w-1/3 capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span> 
                        <span className="w-2/3">
                          {Array.isArray(value) ? value.join(', ') : 
                           typeof value === 'object' && value !== null ? 
                             Object.entries(value).map(([k, v]) => `${k}: ${String(v)}`).join(', ') : 
                             String(value)
                          }
                        </span>
                      </div>
                    ))
                  ) : (
                    // Non-object display method
                    <p>{String(step.result)}</p>
                  )}
                </div>
              )}
              {step.status === 'error' && step.result && step.result.error && (
                 <p className="mt-2 ml-8 text-red-600 text-xs">Error: {step.result.error}</p>
              )}

              {/* Display sub-steps if any */}
              {step.subSteps && step.subSteps.length > 0 && (
                <div className="mt-3 ml-12 space-y-2">
                  {step.subSteps.map(subStep => (
                    <div key={subStep.id} className="flex items-center gap-2 text-xs">
                      {subStep.status === 'in-progress' && <Loader2 className="h-3 w-3 text-primary animate-spin" />}
                      {subStep.status === 'completed' && <CheckCircle className="h-3 w-3 text-green-500" />}
                      {subStep.status === 'pending' && <div className="h-3 w-3 rounded-full bg-muted-foreground/50" />}
                      <span>{subStep.title}</span>
                      {subStep.result && <span className="text-muted-foreground truncate">- {typeof subStep.result === 'string' ? subStep.result : JSON.stringify(subStep.result)}</span>}
                    </div>
                  ))}
                </div>
              )}

              {/* Specific UI for Generate Report step */}
              {step.id === 'generateReport' && step.status === 'completed' && analysisReport && (
                <div className="mt-4 ml-8 p-4 border-t">
                  <h4 className="font-semibold text-lg mb-2">Final Analysis Report</h4>
                  <p className="text-sm mb-1"><span className="font-medium">Summary:</span> {analysisReport.summary}</p>
                  {analysisReport.findings && analysisReport.findings.length > 0 && (
                    <div className="mb-2">
                      <p className="font-medium text-sm">Key Findings:</p>
                      <ul className="list-disc list-inside text-sm">
                        {analysisReport.findings.map((f: string, i: number) => <li key={i}>{f}</li>)}
                      </ul>
                    </div>
                  )}
                  {/* {analysisReport.recommendations && analysisReport.recommendations.length > 0 && (
                     <div className="mb-2">
                      <p className="font-medium text-sm">Recommendations:</p>
                      <ul className="list-disc list-inside text-sm">
                        {analysisReport.recommendations.map((r: string, i: number) => <li key={i}>{r}</li>)}
                      </ul>
                    </div>
                  )} */}
                  <p className="text-sm mb-1"><span className="font-medium">Confidence Score:</span> {analysisReport.confidenceScore}%</p>
                  
                  <div className="mt-3 flex gap-2">
                    
                    <Button variant="outline" size="sm" onClick={() => {
                      if (!showMermaidDiagram) {
                        // Increment key when showing diagram to force a fresh render
                        setMermaidKey(prevKey => prevKey + 1);
                      }
                      setShowMermaidDiagram(!showMermaidDiagram);
                    }} className="mb-4">
                      <BrainCircuit className="h-4 w-4 mr-2" />
                      {showMermaidDiagram ? 'Hide Relationship Diagram' : 'Show Relationship Diagram'}
                    </Button>
                    {showMermaidDiagram && (
                      <Button variant="outline" size="sm" onClick={async () => {
                        try {
                          // Create a fullscreen container
                          const fullscreenContainer = document.createElement('div');
                          fullscreenContainer.id = 'mermaid-fullscreen-container';
                          fullscreenContainer.style.cssText = `
                            position: fixed;
                            top: 0;
                            left: 0;
                            width: 100vw;
                            height: 100vh;
                            background: white;
                            z-index: 9999;
                            display: flex;
                            flex-direction: column;
                            padding: 20px;
                            box-sizing: border-box;
                            overflow: hidden;
                          `;
                          
                          // Add header with title only (no exit button)
                          const header = document.createElement('div');
                          header.style.cssText = `
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            margin-bottom: 20px;
                            padding-bottom: 10px;
                            border-bottom: 1px solid #e5e7eb;
                          `;
                          
                          const title = document.createElement('h2');
                          title.textContent = 'Business Challenge Hierarchy Visualization - Fullscreen';
                          title.style.cssText = 'margin: 0; font-size: 1.25rem; font-weight: 600; color: #111827;';
                          
                          header.appendChild(title);
                          
                          // Add mermaid container with zoom and pan support
                          const mermaidContainer = document.createElement('div');
                          mermaidContainer.style.cssText = `
                            flex: 1;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            overflow: hidden;
                            position: relative;
                            cursor: grab;
                          `;
                          
                          // Create zoom wrapper
                          const zoomWrapper = document.createElement('div');
                          zoomWrapper.style.cssText = `
                            transform-origin: center center;
                            transition: transform 0.1s ease;
                            width: 100%;
                            height: 100%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                          `;
                          
                          // Clone the current mermaid diagram
                          const originalMermaid = document.querySelector('.mermaid-container');
                          if (originalMermaid) {
                            const clonedMermaid = originalMermaid.cloneNode(true) as HTMLElement;
                            clonedMermaid.style.cssText = 'width: auto; height: auto; max-width: none; max-height: none;';
                            
                            // Add node click event, zoom to node when clicked
                            const addNodeClickHandlers = () => {
                              const nodes = clonedMermaid.querySelectorAll('.node, .nodeLabel, rect, circle, ellipse');
                              nodes.forEach(node => {
                                node.addEventListener('click', (e) => {
                                  e.stopPropagation();
                                  const nodeRect = (node as HTMLElement).getBoundingClientRect();
                                  const containerRect = mermaidContainer.getBoundingClientRect();
                                  
                                  // Calculate node position relative to container center
                                  const nodeCenterX = nodeRect.left + nodeRect.width / 2 - containerRect.left;
                                  const nodeCenterY = nodeRect.top + nodeRect.height / 2 - containerRect.top;
                                  const containerCenterX = containerRect.width / 2;
                                  const containerCenterY = containerRect.height / 2;
                                  
                                  // Move node to container center and zoom in
                                  translateX = containerCenterX - nodeCenterX * scale;
                                  translateY = containerCenterY - nodeCenterY * scale;
                                  scale = Math.min(3, scale * 1.5); // Zoom 1.5x, max 3x
                                  
                                  zoomWrapper.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
                                  zoomWrapper.style.transition = 'transform 0.3s ease';
                                  setTimeout(() => {
                                    zoomWrapper.style.transition = 'transform 0.1s ease';
                                  }, 300);
                                });
                              });
                            };
                            
                            // Delay adding click events to ensure Mermaid rendering is complete
                            setTimeout(addNodeClickHandlers, 500);
                            
                            zoomWrapper.appendChild(clonedMermaid);
                          }
                          
                          mermaidContainer.appendChild(zoomWrapper);
                          
                          // Add zoom and pan functionality with default zoom
                          let scale = 1.5; // Default 1.5x zoom
                          let isDragging = false;
                          let startX = 0;
                          let startY = 0;
                          let translateX = 0;
                          let translateY = 0;
                          
                          // Set initial zoom
                          zoomWrapper.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
                          
                          // Zoom with mouse wheel (support larger zoom range)
                          mermaidContainer.addEventListener('wheel', (e) => {
                            e.preventDefault();
                            const rect = mermaidContainer.getBoundingClientRect();
                            const mouseX = e.clientX - rect.left;
                            const mouseY = e.clientY - rect.top;
                            
                            // Calculate mouse position relative to container center
                            const centerX = rect.width / 2;
                            const centerY = rect.height / 2;
                            const offsetX = mouseX - centerX;
                            const offsetY = mouseY - centerY;
                            
                            const delta = e.deltaY > 0 ? 0.9 : 1.1;
                            const newScale = Math.max(0.1, Math.min(10, scale * delta)); // Support 10x zoom
                            
                            // Zoom centered on mouse position
                            const scaleChange = newScale / scale;
                            translateX = translateX - offsetX * (scaleChange - 1);
                            translateY = translateY - offsetY * (scaleChange - 1);
                            
                            scale = newScale;
                            zoomWrapper.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
                          });
                          
                          // Pan with mouse drag
                          mermaidContainer.addEventListener('mousedown', (e) => {
                            isDragging = true;
                            startX = e.clientX - translateX;
                            startY = e.clientY - translateY;
                            mermaidContainer.style.cursor = 'grabbing';
                          });
                          
                          document.addEventListener('mousemove', (e) => {
                            if (!isDragging) return;
                            translateX = e.clientX - startX;
                            translateY = e.clientY - startY;
                            zoomWrapper.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
                          });
                          
                          document.addEventListener('mouseup', () => {
                            isDragging = false;
                            mermaidContainer.style.cursor = 'grab';
                          });
                          
                          // Double click to reset zoom and position to default
                          mermaidContainer.addEventListener('dblclick', () => {
                            scale = 1.5; // Reset to default 1.5x zoom
                            translateX = 0;
                            translateY = 0;
                            zoomWrapper.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
                          });
                          
                          // Add keyboard shortcut support
                          const handleKeyDown = (e) => {
                            switch(e.key) {
                              case '1':
                                scale = 1;
                                translateX = 0;
                                translateY = 0;
                                break;
                              case '2':
                                scale = 2;
                                translateX = 0;
                                translateY = 0;
                                break;
                              case '3':
                                scale = 3;
                                translateX = 0;
                                translateY = 0;
                                break;
                              case '5':
                                scale = 5;
                                translateX = 0;
                                translateY = 0;
                                break;
                              case '0':
                              case 'r':
                                scale = 1.5; // Reset to default zoom
                                translateX = 0;
                                translateY = 0;
                                break;
                              case '+':
                              case '=':
                                scale = Math.min(10, scale * 1.2);
                                break;
                              case '-':
                                scale = Math.max(0.1, scale * 0.8);
                                break;
                              case 'ArrowUp':
                                translateY += 50;
                                break;
                              case 'ArrowDown':
                                translateY -= 50;
                                break;
                              case 'ArrowLeft':
                                translateX += 50;
                                break;
                              case 'ArrowRight':
                                translateX -= 50;
                                break;
                              default:
                                return;
                            }
                            e.preventDefault();
                            zoomWrapper.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
                          };
                          
                          document.addEventListener('keydown', handleKeyDown);
                          
                          // Clean up keyboard event listeners
                          const cleanup = () => {
                            document.removeEventListener('keydown', handleKeyDown);
                          };
                          
                          // Clean up event listeners when exiting fullscreen
                          fullscreenContainer.addEventListener('remove', cleanup);
                          
                          // Add footer with instructions
                          const footer = document.createElement('div');
                          footer.style.cssText = `
                            margin-top: 20px;
                            padding-top: 10px;
                            border-top: 1px solid #e5e7eb;
                            text-align: center;
                            color: #6b7280;
                            font-size: 14px;
                          `;
                          footer.innerHTML = `
                            <div style="margin-bottom: 8px;">
                              <strong>Mouse:</strong> Wheel to zoom (up to 10x), drag to pan, double-click to reset, click nodes to focus
                            </div>
                            <div>
                              <strong>Keyboard:</strong> 1/2/3/5 for zoom levels, +/- to zoom, arrows to pan, 0/R to reset, ESC to exit
                            </div>
                          `;
                          
                          fullscreenContainer.appendChild(header);
                          fullscreenContainer.appendChild(mermaidContainer);
                          fullscreenContainer.appendChild(footer);
                          
                          document.body.appendChild(fullscreenContainer);
                          setFullscreenElement(fullscreenContainer);
                          
                          // Request fullscreen
                          await fullscreenContainer.requestFullscreen();
                          setIsFullscreenDiagram(true);
                          setMermaidKey(prevKey => prevKey + 1);
                        } catch (error) {
                          console.error('Failed to enter fullscreen:', error);
                          // Fallback to the old modal approach if fullscreen fails
                          setIsFullscreenDiagram(true);
                          setMermaidKey(prevKey => prevKey + 1);
                        }
                      }} className="mb-4">
                        <Maximize2 className="h-4 w-4 mr-2" />
                        Fullscreen View
                      </Button>
                    )}
                    {analisysResult?.generateReportResult?.result?.challengeMarkdown && (
                      <Button variant="outline" size="sm" onClick={() => {
                        // Create a new window to display challengeMarkdown content
                        const newWindow = window.open('', '_blank', 'width=800,height=600,scrollbars=yes');
                        if (newWindow) {
                          const markdownContent = analisysResult.generateReportResult.result.challengeMarkdown;
                          const content = `
                            <!DOCTYPE html>
                            <html>
                            <head>
                              <title>Challenge Analysis Report</title>
                              <meta charset="UTF-8">
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
                                  background: #f5f5f5; 
                                  padding: 2px 4px; 
                                  border-radius: 3px; 
                                  font-family: 'Monaco', 'Consolas', monospace;
                                }
                                pre { 
                                  background: #f5f5f5; 
                                  padding: 16px; 
                                  border-radius: 5px; 
                                  overflow-x: auto;
                                  border: 1px solid #ddd;
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
                                th {
                                  background-color: #f5f5f5;
                                  font-weight: bold;
                                }
                                .markdown-content {
                                  white-space: pre-wrap;
                                }
                              </style>
                              <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
                            </head>
                            <body>
                              <div id="markdown-content"></div>
                              <script>
                                const markdownText = ${JSON.stringify(markdownContent)};
                                document.getElementById('markdown-content').innerHTML = marked.parse(markdownText);
                              </script>
                            </body>
                            </html>
                          `;
                          newWindow.document.write(content);
                          newWindow.document.close();
                        }
                      }} className="mb-4">
                        <FileText className="h-4 w-4 mr-2" />
                        View Challenge Report
                      </Button>
                    )}
                  </div>
                  
                  {showMermaidDiagram && (
                    <div className="mt-4 p-4 bg-muted/20 dark:bg-muted/5 rounded-md overflow-auto">
                      <h4 className="text-sm font-medium mb-2">Business Challenge Hierarchy Visualization</h4>
                      <div className="mermaid-container" style={{ maxWidth: '100%', overflowX: 'auto' }}>
                        <MermaidDiagram
                          key={mermaidKey}
                          diagram={generateMermaidDiagram(
                            businessChallengeWithProblems 
                          )}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">This diagram visualizes the relationship between business challenge, problem, hypotheses, metrics, and insights.</p>
                    </div>
                  )}
                  {analysisReport.isLogical ? (
                    <div className="mt-3 p-4 bg-green-50/50 dark:bg-green-900/10 rounded-lg border border-green-200/50">
                      <p className="text-sm text-green-700 dark:text-green-400 mb-3 flex items-center gap-2">
                        <span>✅</span>
                        <span>AI analysis logic is clear and has successfully answered the business challenge</span>
                      </p>
                      <p className="text-sm mb-2 font-medium">Please rate the quality of this analysis:</p>
                      <div className="flex gap-1 mb-4">
                        {[1, 2, 3, 4, 5].map(star => (
                          <Button 
                            key={star} 
                            variant={analysisReport.customerRating && analysisReport.customerRating >= star ? 'default' : 'outline'} 
                            size="icon" 
                            onClick={() => handleRating(star)}
                            className="h-8 w-8 hover:scale-105 transition-transform"
                          >
                            <span className="text-sm font-medium">{star}⭐</span> 
                          </Button>
                        ))}
                      </div>
                      <div className="mt-4">
                        <p className="text-sm mb-2 font-medium flex items-center gap-2">
                          <span>💡</span>
                          <span>Suggest new metrics or domain data:</span>
                        </p>
                        <textarea 
                          className="w-full p-3 border border-gray-300 rounded-md text-sm resize-vertical min-h-[90px] focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary hover:border-primary/50 transition-colors"
                          placeholder="If you think the analysis needs improvement, please suggest new metrics or domain data here, for example:\n• Customer churn rate metrics\n• Regional economic data\n• Competitor analysis data\n• Industry trend indicators\n• Market share metrics\n• Customer satisfaction scores\n• Product usage frequency data"
                          onChange={(e) => {
                            // Handle user input suggestions
                            const suggestion = e.target.value;
                            if (suggestion.trim()) {
                              addLog('customer_feedback', 'Customer Suggestion', `Customer suggestion: ${suggestion}`, 'info');
                            }
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 p-4 bg-amber-50/50 dark:bg-amber-900/10 rounded-lg border border-amber-200/50">
                      <p className="text-sm text-amber-700 dark:text-amber-400 mb-1 flex items-center gap-2">
                        <span>⚠️</span>
                        <span>AI analysis may need further refinement</span>
                      </p>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </div>

        <div className="mt-8">
          <h3 className="font-medium text-md mb-2 flex items-center gap-2">
            <span>🤖 AI Agent Execution Log</span>
            <Badge variant="secondary" className="text-xs">{logs.length}</Badge>
          </h3>
          <div className="max-h-60 overflow-y-auto bg-muted/20 dark:bg-muted/5 p-3 rounded-md text-xs space-y-1.5 border">
            <AnimatePresence>
              {logs.length === 0 ? (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-muted-foreground italic text-center py-4"
                >
                  📝 No log records yet, AI agent will record analysis steps here
                </motion.p>
              ) : (
                logs.slice().reverse().map(log => (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.2 }}
                    className="flex gap-2 items-start hover:bg-muted/30 p-1.5 rounded transition-colors"
                  >
                    <Badge variant="outline" className="px-1.5 py-0.5 text-[10px] whitespace-nowrap capitalize">{log.type.replace('_', ' ')}</Badge>
                    <span className="font-semibold text-primary/80">{log.title}:</span>
                    <span className="text-muted-foreground flex-1">{log.description}</span>
                    <span className="text-muted-foreground/70 ml-auto text-[10px]">{new Date(log.timestamp).toLocaleTimeString()}</span>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>
      </CardContent>
          </Card>
        </main>
      </div>
      
      {/* Fallback Fullscreen Mermaid Diagram Modal - only shown if native fullscreen fails */}
      {isFullscreenDiagram && !document.fullscreenElement && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full h-full max-w-7xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Business Challenge Hierarchy Visualization - Fullscreen
              </h2>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setMermaidKey(prevKey => prevKey + 1);
                  }}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsFullscreenDiagram(false)}
                >
                  <Minimize2 className="h-4 w-4 mr-2" />
                  Exit Fullscreen
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsFullscreenDiagram(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {/* Content */}
            <div className="flex-1 p-6 overflow-auto">
              <div className="w-full h-full flex items-center justify-center">
                <div className="mermaid-container-fullscreen" style={{ width: '100%', height: '100%', minHeight: '500px' }}>
                  <MermaidDiagram
                    key={`fullscreen-${mermaidKey}`}
                    diagram={generateMermaidDiagram(
                      businessChallengeWithProblems 
                    )}
                  />
                </div>
              </div>
            </div>
            
            {/* Footer */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                This diagram visualizes the relationship between business challenge, problem, hypotheses, metrics, and insights.
                Use the mouse wheel to zoom and drag to pan around the diagram.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIAnalysisAgent;