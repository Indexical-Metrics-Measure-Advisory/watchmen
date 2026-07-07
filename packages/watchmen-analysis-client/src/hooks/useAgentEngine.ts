import { useState, useEffect, useRef, useCallback } from 'react';
import { BusinessChallengeWithProblems } from '@/model/business';
import { AgentCard } from '@/model/A2ASpec';
import { analysis_service } from '@/services/analysisService';
import { cleanMetadataFields } from '@/utils/dataCleaningUtils';
import { stepManager } from '@/components/ai/steps/StepManager';

const AGENT_INTERVAL = 4000;

export interface AIAgentStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'error';
  result?: Record<string, unknown>;
  subSteps?: AIAgentStep[];
  progress?: number;
}

export interface AIAnalysisResult {
  businessChallenge: BusinessChallengeWithProblems;
  judgeChallengeResult: Record<string, unknown> | null;
  queryHistoryResult: Record<string, unknown> | null;
  queryKnowledgeBaseResult: Record<string, unknown> | null;
  simulationResult: Record<string, unknown> | null;
  answerBusinessChallengeResult: Record<string, unknown> | null;
  generateReportResult: Record<string, unknown> | null;
}

interface StepContext {
  additionalInfo?: string;
  manualApproval?: boolean;
  retryCount?: number;
}

interface LogEntry {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: string;
  status: string;
}

export const initialSteps: AIAgentStep[] = [
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
      { id: 'simAnalyze', title: 'Execute Simulation Analysis', description: '', status: 'pending' },
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

export function useAgentEngine(
  currentAgent: AgentCard | null,
  businessChallenge: BusinessChallengeWithProblems | null,
  resourcesLoaded: { agentLoaded: boolean; challengeLoaded: boolean },
  onComplete?: (result: Record<string, unknown>) => void
) {
  const [steps, setSteps] = useState<AIAgentStep[]>(initialSteps);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [stepContexts, setStepContexts] = useState<Record<number, StepContext>>({});
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isAutoMode, setIsAutoMode] = useState<boolean>(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [analysisReport, setAnalysisReport] = useState<Record<string, unknown> | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AIAnalysisResult | null>(null);
  const [analysisConfirmed, setAnalysisConfirmed] = useState<boolean>(false);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [businessChallengeWithProblems, setBusinessChallengeWithProblems] = useState<BusinessChallengeWithProblems | null>(null);

  // Initialize analysis result when challenge loads
  useEffect(() => {
    if (businessChallenge && !analysisResult) {
      setAnalysisResult({
        businessChallenge,
        judgeChallengeResult: null,
        queryHistoryResult: null,
        queryKnowledgeBaseResult: null,
        simulationResult: null,
        answerBusinessChallengeResult: null,
        generateReportResult: null,
      });
    }
  }, [businessChallenge]);

  // Register callbacks with step manager
  useEffect(() => {
    stepManager.setLogCallback((log) => {
      addLog(log.type, log.title, log.description, log.status);
    });
    stepManager.setStepUpdateCallback(updateStepStatus);
  }, []);

  // Trigger execution when user clicks start
  useEffect(() => {
    if (isRunning && resourcesLoaded.agentLoaded && resourcesLoaded.challengeLoaded && currentAgent && businessChallenge && !isExecuting) {
      agentSenseAndAct();
    }
  }, [isRunning, resourcesLoaded, currentAgent, businessChallenge, isExecuting]);

  // Active analysis loop timer
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
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
  }, [isRunning, businessChallenge, isExecuting]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setIsExecuting(false);
    };
  }, []);

  const addLog = useCallback((type: string, title: string, description: string, status: string) => {
    setLogs(prev => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type, title, description,
        timestamp: new Date().toISOString(),
        status
      }
    ]);
  }, []);

  const updateStepStatus = useCallback((stepId: string, status: AIAgentStep['status'], result?: Record<string, unknown>, subStepId?: string) => {
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
  }, []);

  const agentSenseAndAct = useCallback(async () => {
    if (isExecuting) return;
    if (!currentAgent) {
      addLog('system', 'Agent Not Found', 'Waiting for agent to be loaded', 'warning');
      return;
    }
    if (!businessChallenge) {
      addLog('system', 'Challenge Not Found', 'Waiting for business challenge to be loaded', 'warning');
      return;
    }
    if (currentStepIndex >= steps.length) {
      setIsRunning(false);
      addLog('system', 'Analysis Complete', 'All steps have been executed successfully.', 'success');
      if (onComplete) onComplete({ report: analysisReport, logs });
      return;
    }

    if (!isAutoMode) {
      const currentContext = stepContexts[currentStepIndex] || {};
      if (currentStepIndex > 0 && currentContext.manualApproval === false) {
        addLog('system', 'Step Paused', `Waiting for manual approval for step: ${steps[currentStepIndex].title}`, 'info');
        setIsRunning(false);
        return;
      }
    }

    const currentStep = steps[currentStepIndex];
    if (currentStep.status === 'completed') {
      if (currentStepIndex < steps.length - 1) {
        setCurrentStepIndex(prev => prev + 1);
        addLog('system', 'Step Completed', `Moving to next step: ${steps[currentStepIndex + 1]?.title}`, 'info');
      }
      return;
    }
    if (currentStep.status === 'in-progress') return;

    setIsExecuting(true);

    const stepContext = stepContexts[currentStepIndex] || {};
    const executionContext = {
      businessChallenge,
      analysisResult,
      stepContext,
      agent: currentAgent,
      currentAgent,
      stepIndex: currentStepIndex
    };

    try {
      const result = await stepManager.executeStep(currentStep.id, executionContext);

      if (result.success) {
        if (result.result?.updatedAnalysisResult) {
          setAnalysisResult(result.result.updatedAnalysisResult);
        }

        if (result.shouldContinue !== undefined) {
          if (!result.shouldContinue) {
            setIsRunning(false);
            addLog('system', 'Execution Paused', 'Step execution paused due to shouldContinue = false', 'warning');
            return;
          }
        }

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
        addLog(currentStep.id, 'Step Execution Failed', result.error || 'Unknown error', 'error');
        updateStepStatus(currentStep.id, 'error', { error: result.error });
        setIsRunning(false);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown Error';
      addLog(currentStep.id, 'Step Execution Failed', errorMessage, 'error');
      updateStepStatus(currentStep.id, 'error', { error: errorMessage });
      setIsRunning(false);
    } finally {
      setIsExecuting(false);
    }
  }, [isExecuting, currentAgent, businessChallenge, currentStepIndex, steps, stepContexts, isAutoMode, analysisResult, analysisReport, onComplete, addLog, updateStepStatus]);

  const handleStepAction = useCallback((stepIndex: number, action: 'approve' | 'reject' | 'rerun') => {
    if (isExecuting) return;
    const step = steps[stepIndex];

    switch (action) {
      case 'approve':
        updateStepStatus(step.id, 'completed', step.result);
        setStepContexts(prev => ({
          ...prev,
          [stepIndex]: { ...prev[stepIndex], manualApproval: true }
        }));
        if (!isAutoMode) {
          setStepContexts(prev => ({
            ...prev,
            [stepIndex]: { ...prev[stepIndex], manualApproval: true }
          }));
          setIsRunning(true);
          addLog('system', 'Step Approved', `Step ${step.title} was approved by user, continuing execution`, 'success');
        } else {
          setCurrentStepIndex(stepIndex + 1);
        }
        break;

      case 'reject':
        updateStepStatus(step.id, 'error', { error: 'Step rejected by user' });
        setIsRunning(false);
        addLog('system', 'Step Rejected', `Step ${step.title} was rejected by user`, 'error');
        break;

      case 'rerun': {
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
    }
  }, [isExecuting, steps, stepContexts, isAutoMode, addLog, updateStepStatus]);

  const handleRerunAllSteps = useCallback(() => {
    if (isExecuting) return;
    setSteps(initialSteps.map(step => ({
      ...step,
      status: 'pending',
      result: undefined,
      subSteps: step.subSteps ? step.subSteps.map(subStep => ({
        ...subStep, status: 'pending', result: undefined
      })) : undefined
    })));
    setCurrentStepIndex(0);
    setStepContexts({});
    setAnalysisReport(null);
    setAnalysisConfirmed(false);
    if (businessChallenge) {
      setAnalysisResult({
        businessChallenge,
        judgeChallengeResult: null,
        queryHistoryResult: null,
        queryKnowledgeBaseResult: null,
        simulationResult: null,
        answerBusinessChallengeResult: null,
        generateReportResult: null,
      });
    }
    setIsRunning(true);
    addLog('system', 'Rerun All Steps', 'All steps have been reset and analysis will restart', 'info');
  }, [isExecuting, businessChallenge, addLog]);

  const handleConfirmAnalysis = useCallback(async () => {
    addLog('system', 'Analysis Confirmed', 'User confirmed the analysis results', 'success');
    try {
      if (analysisResult) {
        const cleanedSimulationResult = cleanMetadataFields(analysisResult.simulationResult);
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
  }, [analysisResult, analysisReport, onComplete, addLog]);

  const handleRating = useCallback((rating: number) => {
    if (analysisReport) {
      setAnalysisReport(prev => prev ? { ...prev, customerRating: rating } : null);
      addLog('feedback', 'Customer Rating', `Report Rating: ${rating} stars`, 'info');
    }
  }, [analysisReport, addLog]);

  return {
    // State
    steps, currentStepIndex, stepContexts, logs, isRunning, isAutoMode,
    analysisReport, analysisResult, analysisConfirmed, isExecuting,
    businessChallengeWithProblems,
    // Setters
    setStepContexts, setCurrentStepIndex,
    // Actions
    setIsRunning, setIsAutoMode, addLog, handleStepAction,
    handleRerunAllSteps, handleConfirmAnalysis, handleRating,
    updateStepStatus,
  };
}
