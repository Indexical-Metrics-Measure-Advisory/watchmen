import React, { useState, useEffect, useRef } from 'react';
import { useSidebar } from '@/contexts/SidebarContext';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BrainCircuit, CheckCircle, RefreshCw, Loader2, XCircle, Maximize2, Minimize2, X, FileText, Lightbulb } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { MermaidDiagram } from 'react-mermaid-js';
import { generateMermaidDiagram } from './utils/AnalysisUtils';
import { useAgentEngine, initialSteps, AIAgentStep } from '@/hooks/useAgentEngine';
import { useAgentResources } from '@/hooks/useAgentResources';
import { AgentStepResult } from './AgentStepResult';

interface AIAnalysisAgentProps {
  challengeId?: string;
  onComplete?: (result: Record<string, unknown>) => void;
}

const AIAnalysisAgent: React.FC<AIAnalysisAgentProps> = ({
  challengeId: propChallengeId,
  onComplete
}) => {
  const { collapsed } = useSidebar();
  const navigate = useNavigate();

  // Get agentId from URL query parameters
  const searchParams = new URLSearchParams(window.location.search);
  const agentId = searchParams.get('agentId');
  const challengeId = propChallengeId || agentId;

  // Resource loading (before engine starts)
  const { currentAgent, businessChallenge, resourcesLoaded } = useAgentResources(agentId, () => {});

  // Core engine
  const {
    steps, currentStepIndex, stepContexts, logs, isRunning, isAutoMode,
    analysisReport, analysisConfirmed, isExecuting,
    businessChallengeWithProblems,
    setStepContexts, setCurrentStepIndex,
    setIsRunning, setIsAutoMode, addLog, handleStepAction,
    handleRerunAllSteps, handleConfirmAnalysis, handleRating,
  } = useAgentEngine(currentAgent, businessChallenge, resourcesLoaded, onComplete);

  // Local UI state
  const [mermaidKey, setMermaidKey] = useState<number>(0);
  const [showMermaidDiagram, setShowMermaidDiagram] = useState<boolean>(false);
  const [isFullscreenDiagram, setIsFullscreenDiagram] = useState<boolean>(false);
  const [fullscreenElement, setFullscreenElement] = useState<HTMLElement | null>(null);

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setIsFullscreenDiagram(false);
        if (fullscreenElement) {
          const cleanupEvent = new Event('remove');
          fullscreenElement.dispatchEvent(cleanupEvent);
          fullscreenElement.remove();
          setFullscreenElement(null);
        }
      }
    };
    const handleFullscreenError = () => {
      setIsFullscreenDiagram(false);
      if (fullscreenElement) {
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

  // Open fullscreen mermaid
  const openFullscreenMermaid = async () => {
    try {
      const container = document.createElement('div');
      container.id = 'mermaid-fullscreen-container';
      container.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:white;z-index:9999;display:flex;flex-direction:column;padding:20px;box-sizing:border-box;overflow:hidden;';

      const header = document.createElement('div');
      header.style.cssText = 'display:flex;justify-content:center;align-items:center;margin-bottom:20px;padding-bottom:10px;border-bottom:1px solid #e5e7eb;';
      const title = document.createElement('h2');
      title.textContent = 'Business Challenge Hierarchy Visualization - Fullscreen';
      title.style.cssText = 'margin:0;font-size:1.25rem;font-weight:600;color:#111827;';
      header.appendChild(title);

      const mermaidContainer = document.createElement('div');
      mermaidContainer.style.cssText = 'flex:1;display:flex;align-items:center;justify-content:center;overflow:hidden;position:relative;cursor:grab;';
      const zoomWrapper = document.createElement('div');
      zoomWrapper.style.cssText = 'transform-origin:center center;transition:transform 0.1s ease;width:100%;height:100%;display:flex;align-items:center;justify-content:center;';

      const originalMermaid = document.querySelector('.mermaid-container');
      if (originalMermaid) {
        const clonedMermaid = originalMermaid.cloneNode(true) as HTMLElement;
        clonedMermaid.style.cssText = 'width:auto;height:auto;max-width:none;max-height:none;';
        zoomWrapper.appendChild(clonedMermaid);
      }
      mermaidContainer.appendChild(zoomWrapper);

      let scale = 1.5, isDragging = false, startX = 0, startY = 0, translateX = 0, translateY = 0;
      zoomWrapper.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;

      mermaidContainer.addEventListener('wheel', (e) => {
        e.preventDefault();
        const rect = mermaidContainer.getBoundingClientRect();
        const mouseX = e.clientX - rect.left, mouseY = e.clientY - rect.top;
        const centerX = rect.width / 2, centerY = rect.height / 2;
        const offsetX = mouseX - centerX, offsetY = mouseY - centerY;
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        const newScale = Math.max(0.1, Math.min(10, scale * delta));
        const scaleChange = newScale / scale;
        translateX = translateX - offsetX * (scaleChange - 1);
        translateY = translateY - offsetY * (scaleChange - 1);
        scale = newScale;
        zoomWrapper.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
      });

      mermaidContainer.addEventListener('mousedown', (e) => { isDragging = true; startX = e.clientX - translateX; startY = e.clientY - translateY; mermaidContainer.style.cursor = 'grabbing'; });
      document.addEventListener('mousemove', (e) => { if (!isDragging) return; translateX = e.clientX - startX; translateY = e.clientY - startY; zoomWrapper.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`; });
      document.addEventListener('mouseup', () => { isDragging = false; mermaidContainer.style.cursor = 'grab'; });
      mermaidContainer.addEventListener('dblclick', () => { scale = 1.5; translateX = 0; translateY = 0; zoomWrapper.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`; });

      const handleKeyDown = (e: KeyboardEvent) => {
        switch(e.key) {
          case '0': case 'r': scale = 1.5; translateX = 0; translateY = 0; break;
          case '+': case '=': scale = Math.min(10, scale * 1.2); break;
          case '-': scale = Math.max(0.1, scale * 0.8); break;
          case 'ArrowUp': translateY += 50; break;
          case 'ArrowDown': translateY -= 50; break;
          case 'ArrowLeft': translateX += 50; break;
          case 'ArrowRight': translateX -= 50; break;
          default: return;
        }
        e.preventDefault();
        zoomWrapper.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
      };
      document.addEventListener('keydown', handleKeyDown);
      container.addEventListener('remove', () => document.removeEventListener('keydown', handleKeyDown));

      const footer = document.createElement('div');
      footer.style.cssText = 'margin-top:20px;padding-top:10px;border-top:1px solid #e5e7eb;text-align:center;color:#6b7280;font-size:14px;';
      footer.innerHTML = '<div style="margin-bottom:8px"><strong>Mouse:</strong> Wheel to zoom, drag to pan, double-click to reset</div><div><strong>Keyboard:</strong> +/- to zoom, arrows to pan, 0/R to reset, ESC to exit</div>';

      container.appendChild(header);
      container.appendChild(mermaidContainer);
      container.appendChild(footer);
      document.body.appendChild(container);
      setFullscreenElement(container);
      await container.requestFullscreen();
      setIsFullscreenDiagram(true);
      setMermaidKey(prevKey => prevKey + 1);
    } catch (error) {
      console.error('Failed to enter fullscreen:', error);
      setIsFullscreenDiagram(true);
      setMermaidKey(prevKey => prevKey + 1);
    }
  };

  const completedCount = steps.filter(step => step.status === 'completed').length;

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
              </CardTitle>
              <div className="mt-2 text-sm text-muted-foreground">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Challenge ID:</span>
                    <span>{challengeId || 'Not specified'}</span>
                  </div>
                  {currentAgent && currentAgent.metadata && (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Agent:</span>
                        <span>{currentAgent.name || currentAgent.id}</span>
                      </div>
                      {currentAgent.metadata.businessChallengeId && (
                        <div className="flex gap-2">
                          <span className="font-medium">Title:</span>
                          <span>{currentAgent.metadata?.businessChallengeTitle || ''}</span>
                        </div>
                      )}
                      {currentAgent.metadata.businessChallengeId && (
                        <div className="flex gap-2">
                          <span className="font-medium">Description:</span>
                          <span>{currentAgent.metadata?.businessChallengeDescription || ''}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-8 pt-6">
              {/* Control Panel */}
              <div className="mb-6 pb-6 border-b border-border/50 space-y-6">
                {/* Status overview */}
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
                    <div className="bg-white/80 dark:bg-gray-900/80 px-4 py-3 rounded-lg border border-white/50 dark:border-gray-700/50 min-w-[200px]">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Analysis Progress</span>
                        <span className="text-sm text-muted-foreground">{completedCount}/{steps.length}</span>
                      </div>
                      <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500 ease-out"
                          style={{ width: `${(completedCount / steps.length) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  <Button variant={isRunning ? 'destructive' : 'default'} size="lg" onClick={() => {
                    if (isRunning) { setIsRunning(false); addLog('system', 'Analysis Paused', 'User paused the analysis process', 'info'); }
                    else {
                      if (currentStepIndex >= steps.length) { setCurrentStepIndex(0); addLog('system', 'Restart Analysis', 'Starting analysis process from the beginning', 'info'); }
                      else { addLog('system', 'Start Analysis', 'User initiated AI analysis process', 'info'); }
                      setIsRunning(true);
                    }
                  }} className="h-12 font-medium shadow-md hover:shadow-lg transition-all duration-200" disabled={!resourcesLoaded.agentLoaded || !resourcesLoaded.challengeLoaded}>
                    {isRunning ? <><Loader2 className="h-5 w-5 mr-2 animate-spin" />Pause Analysis</>
                      : currentStepIndex >= steps.length ? <><RefreshCw className="h-5 w-5 mr-2" />Restart</>
                      : <><BrainCircuit className="h-5 w-5 mr-2" />Start Analysis</>}
                  </Button>

                  <Button variant={isAutoMode ? 'default' : 'secondary'} size="lg" onClick={() => {
                    setIsAutoMode(!isAutoMode);
                    addLog('system', 'Mode Switch', `Switched to ${!isAutoMode ? 'Auto' : 'Manual Approval'} mode`, 'info');
                  }} className="h-12 transition-all duration-200 hover:shadow-md">
                    {isAutoMode ? <><div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />Auto Mode</>
                      : <><div className="w-2 h-2 bg-orange-500 rounded-full mr-2" />Manual Mode</>}
                  </Button>

                  <Button variant="outline" size="lg" onClick={handleRerunAllSteps} disabled={isExecuting || isRunning}
                    className="h-12 hover:bg-muted/50 hover:shadow-md transition-all duration-200">
                    <RefreshCw className="h-5 w-5 mr-2" />Reset Process
                  </Button>

                  {(currentStepIndex >= steps.length || steps.every(s => s.status === 'completed')) && !isRunning ? (
                    <Button variant="default" size="lg" onClick={handleConfirmAnalysis}
                      className="h-12 bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg transition-all duration-200">
                      <CheckCircle className="h-5 w-5 mr-2" />Confirm Analysis
                    </Button>
                  ) : (
                    <div className="h-12 flex items-center justify-center text-sm text-muted-foreground bg-muted/30 rounded-md border border-dashed">Confirm after completion</div>
                  )}
                </div>

                {/* Secondary actions */}
                <div className="flex flex-wrap gap-3 pt-4 border-t border-muted/30">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2 w-full">
                    <FileText className="h-4 w-4" /><span className="font-medium">View Results</span>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => {
                    const storageKey = localStorage.getItem('analysis_storage_key');
                    if (storageKey) { navigate(`/challenge-analysis?analysisId=${storageKey}&challengeId=${businessChallengeWithProblems.id}`); }
                    else { addLog('system', 'No Storage Key', 'Analysis storage key not found, please confirm first', 'warning'); }
                  }} disabled={!analysisConfirmed} className="hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-all duration-200">
                    <FileText className="h-4 w-4 mr-2" />Detailed Analysis Report
                    {!analysisConfirmed && <span className="ml-2 text-xs text-muted-foreground">(Confirm first)</span>}
                  </Button>
                </div>
              </div>

              {/* Steps list */}
              <div className="space-y-4">
                {steps.map((step, index) => (
                  <motion.div key={step.id} initial={{ opacity: 0.6, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: index * 0.05 }}
                    className={`p-4 rounded-lg border ${step.status === 'in-progress' ? 'border-primary shadow-md' : step.status === 'completed' ? 'border-green-500 bg-green-50/30 dark:bg-green-900/20' : step.status === 'error' ? 'border-red-500 bg-red-50/30 dark:bg-red-900/20' : 'border-border'}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {step.status === 'in-progress' && <Loader2 className="h-5 w-5 text-primary animate-spin flex-shrink-0" />}
                        {step.status === 'completed' && <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />}
                        {step.status === 'error' && <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />}
                        {step.status === 'pending' && <Lightbulb className="h-5 w-5 text-muted-foreground flex-shrink-0" />}
                        <h3 className="font-medium text-md truncate">{index + 1}. {step.title}</h3>
                        <Badge variant={step.status === 'completed' ? 'default' : step.status === 'error' ? 'destructive' : 'outline'} className="capitalize flex-shrink-0">{step.status}</Badge>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {step.status === 'in-progress' && (<>
                          <Button variant="outline" size="sm" onClick={() => handleStepAction(index, 'approve')} className="min-w-[5rem] hover:bg-green-50 hover:border-green-300 hover:text-green-700"><CheckCircle className="h-4 w-4 mr-1" /><span className="hidden sm:inline">Approve</span></Button>
                          <Button variant="outline" size="sm" onClick={() => handleStepAction(index, 'reject')} className="min-w-[5rem] hover:bg-red-50 hover:border-red-300 hover:text-red-700"><XCircle className="h-4 w-4 mr-1" /><span className="hidden sm:inline">Reject</span></Button>
                        </>)}
                        {(step.status === 'completed' || step.status === 'error') && (
                          <Button variant="outline" size="sm" onClick={() => handleStepAction(index, 'rerun')} className="min-w-[5rem] hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700"><RefreshCw className="h-4 w-4 mr-1" /><span className="hidden sm:inline">Retry</span></Button>
                        )}
                      </div>
                    </div>
                    <div className="ml-8 mt-2 space-y-2">
                      <p className="text-sm text-muted-foreground">{step.description}</p>
                      {stepContexts[index]?.retryCount && <p className="text-xs text-muted-foreground">retry count: {stepContexts[index].retryCount}</p>}
                      {stepContexts[index]?.manualApproval && <Badge variant="outline" className="text-xs">Confirm</Badge>}
                      {(step.status === 'error' || step.status === 'completed') && (
                        <input type="text" placeholder="Add context information or special requirements for retry"
                          className="flex h-8 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 min-w-0 hover:border-primary/50 focus:border-primary"
                          value={stepContexts[index]?.additionalInfo || ''} onChange={(e) => setStepContexts(prev => ({ ...prev, [index]: { ...prev[index], additionalInfo: e.target.value } }))} />
                      )}
                    </div>

                    {/* Step result */}
                    <AgentStepResult step={step} />

                    {/* Error display */}
                    {step.status === 'error' && step.result && (step.result as Record<string, any>).error && (
                      <p className="mt-2 ml-8 text-red-600 text-xs">Error: {(step.result as Record<string, any>).error}</p>
                    )}

                    {/* Sub-steps */}
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

                    {/* Generate report section */}
                    {step.id === 'generateReport' && step.status === 'completed' && analysisReport && (
                      <div className="mt-4 ml-8 p-4 border-t">
                        <h4 className="font-semibold text-lg mb-2">Final Analysis Report</h4>
                        <p className="text-sm mb-1"><span className="font-medium">Summary:</span> {(analysisReport as Record<string, any>).summary}</p>
                        {(analysisReport as Record<string, any>).findings?.length > 0 && (
                          <div className="mb-2">
                            <p className="font-medium text-sm">Key Findings:</p>
                            <ul className="list-disc list-inside text-sm">{((analysisReport as Record<string, any>).findings as string[]).map((f, i) => <li key={i}>{f}</li>)}</ul>
                          </div>
                        )}
                        <p className="text-sm mb-1"><span className="font-medium">Confidence Score:</span> {(analysisReport as Record<string, any>).confidenceScore}%</p>

                        <div className="mt-3 flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => { if (!showMermaidDiagram) setMermaidKey(prevKey => prevKey + 1); setShowMermaidDiagram(!showMermaidDiagram); }} className="mb-4">
                            <BrainCircuit className="h-4 w-4 mr-2" />{showMermaidDiagram ? 'Hide Relationship Diagram' : 'Show Relationship Diagram'}
                          </Button>
                          <Button variant="outline" size="sm" onClick={openFullscreenMermaid} className="mb-4"><Maximize2 className="h-4 w-4 mr-2" />Fullscreen View</Button>
                        </div>

                        {showMermaidDiagram && (
                          <div className="mt-4 p-4 bg-muted/20 dark:bg-muted/5 rounded-md overflow-auto">
                            <h4 className="text-sm font-medium mb-2">Business Challenge Hierarchy Visualization</h4>
                            <div className="mermaid-container" style={{ maxWidth: '100%', overflowX: 'auto' }}>
                              <MermaidDiagram key={mermaidKey} diagram={generateMermaidDiagram(businessChallengeWithProblems)} />
                            </div>
                          </div>
                        )}

                        {(analysisReport as Record<string, any>).isLogical ? (
                          <div className="mt-3 p-4 bg-green-50/50 dark:bg-green-900/10 rounded-lg border border-green-200/50">
                            <p className="text-sm text-green-700 dark:text-green-400 mb-3">✅ AI analysis logic is clear and has successfully answered the business challenge</p>
                            <p className="text-sm mb-2 font-medium">Please rate the quality of this analysis:</p>
                            <div className="flex gap-1 mb-4">
                              {[1, 2, 3, 4, 5].map(star => (
                                <Button key={star} variant={((analysisReport as Record<string, any>).customerRating ?? 0) >= star ? 'default' : 'outline'} size="icon" onClick={() => handleRating(star)} className="h-8 w-8 hover:scale-105 transition-transform">
                                  <span className="text-sm font-medium">{star}⭐</span>
                                </Button>
                              ))}
                            </div>
                            <div className="mt-4">
                              <p className="text-sm mb-2 font-medium">💡 Suggest new metrics or domain data:</p>
                              <textarea className="w-full p-3 border border-gray-300 rounded-md text-sm resize-vertical min-h-[90px] focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary" placeholder="If you think the analysis needs improvement, please suggest new metrics or domain data here..." onChange={(e) => { if (e.target.value.trim()) addLog('customer_feedback', 'Customer Suggestion', `Customer suggestion: ${e.target.value}`, 'info'); }} />
                            </div>
                          </div>
                        ) : (
                          <div className="mt-3 p-4 bg-amber-50/50 dark:bg-amber-900/10 rounded-lg border border-amber-200/50">
                            <p className="text-sm text-amber-700 dark:text-amber-400">⚠️ AI analysis may need further refinement</p>
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>

              {/* Execution Log */}
              <div className="mt-8">
                <h3 className="font-medium text-md mb-2 flex items-center gap-2">
                  <span>🤖 AI Agent Execution Log</span>
                  <Badge variant="secondary" className="text-xs">{logs.length}</Badge>
                </h3>
                <div className="max-h-60 overflow-y-auto bg-muted/20 dark:bg-muted/5 p-3 rounded-md text-xs space-y-1.5 border">
                  <AnimatePresence>
                    {logs.length === 0 ? (
                      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-muted-foreground italic text-center py-4">📝 No log records yet, AI agent will record analysis steps here</motion.p>
                    ) : (
                      logs.slice().reverse().map(log => (
                        <motion.div key={log.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.2 }}
                          className="flex gap-2 items-start hover:bg-muted/30 p-1.5 rounded transition-colors">
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

      {/* Fallback Fullscreen Mermaid Modal */}
      {isFullscreenDiagram && !document.fullscreenElement && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full h-full max-w-7xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold">Business Challenge Hierarchy Visualization - Fullscreen</h2>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setMermaidKey(prevKey => prevKey + 1)}><RefreshCw className="h-4 w-4 mr-2" />Refresh</Button>
                <Button variant="outline" size="sm" onClick={() => setIsFullscreenDiagram(false)}><Minimize2 className="h-4 w-4 mr-2" />Exit</Button>
                <Button variant="ghost" size="sm" onClick={() => setIsFullscreenDiagram(false)}><X className="h-4 w-4" /></Button>
              </div>
            </div>
            <div className="flex-1 p-6 overflow-auto">
              <div className="w-full h-full flex items-center justify-center">
                <div className="mermaid-container-fullscreen" style={{ width: '100%', height: '100%', minHeight: '500px' }}>
                  <MermaidDiagram key={`fullscreen-${mermaidKey}`} diagram={generateMermaidDiagram(businessChallengeWithProblems)} />
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400 text-center">Use mouse wheel to zoom and drag to pan around the diagram.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIAnalysisAgent;
