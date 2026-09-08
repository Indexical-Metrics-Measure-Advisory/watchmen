
import { Toaster } from "@/components/ui/toaster";
import { lazy, Suspense } from "react";
import type { ReactNode } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route, BrowserRouter, Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { AuthProvider } from "@/contexts/AuthContext";
import { useTenantAiEnabled } from "@/hooks/useTenantAiEnabled";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { SidebarProvider } from "@/contexts/SidebarContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import FirstTimeOnboarding from "@/components/onboarding/FirstTimeOnboarding";
// keep the landing page, login and 404 eager so first paint and auth redirects stay fast
import BIAnalysisPage from './pages/BIAnalysis';
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

const Index = lazy(() => import("./pages/Index"));
const BusinessChallenges = lazy(() => import("./pages/BusinessChallenges"));
const Hypotheses = lazy(() => import("./pages/Hypotheses"));
const Analysis = lazy(() => import("./pages/Analysis"));
const ChallengeAnalysis = lazy(() => import("./pages/ChallengeAnalysis"));
const GraphView = lazy(() => import("./pages/GraphView"));
const Settings = lazy(() => import("./pages/Settings"));
const Learning = lazy(() => import('./pages/Learning'));
const AIMonitoring = lazy(() => import('./pages/AIMonitoring'));
const AIAgentManagement = lazy(() => import('./pages/AIAgentManagement'));
const AIAnalysisAgent = lazy(() => import('./components/ai/AIAnalysisAgent'));
const SemanticModelManagement = lazy(() => import('./pages/SemanticModelManagement'));
const MetricsManagement = lazy(() => import('./pages/MetricsManagement'));
const UserGroupMetrics = lazy(() => import('./pages/UserGroupMetrics'));
const DataProfileManagement = lazy(() => import('./pages/DataProfileManagement'));
const DataCatalog = lazy(() => import('./pages/DataCatalog'));
const BusinessDomainMap = lazy(() => import('./pages/BusinessDomainMap'));
const DataProductCatalog = lazy(() => import('./pages/DataProductCatalog'));
const AssetMap = lazy(() => import('./pages/AssetMap'));
const DataProductGraph = lazy(() => import('./pages/DataProductGraph'));
const OntologyDataTester = lazy(() => import('./pages/OntologyDataTester'));
const BusinessGlossary = lazy(() => import('./pages/BusinessGlossary'));
const RetrievalTesting = lazy(() => import("./pages/RetrievalTesting"));
const OfflineEvaluation = lazy(() => import("./pages/OfflineEvaluation"));
const EvaluationDatasetManagement = lazy(() => import("./pages/EvaluationDatasetManagement"));
const OnlineEvaluation = lazy(() => import("./pages/OnlineEvaluation"));
const ChatPage = lazy(() => import("./pages/chat"));
const AnalysisAssistantConfigPage = lazy(() => import('./pages/AnalysisAssistantConfig'));
const MetricDependencyTree = lazy(() => import('./pages/MetricDependencyTree'));
const MetricLineagePage = lazy(() => import('./pages/MetricLineage'));
const AlertConfigurationPage = lazy(() => import('./pages/AlertConfigurationPage').then(m => ({ default: m.AlertConfigurationPage })));
const SharedAnalysisPage = lazy(() => import('./pages/SharedAnalysisPage'));


const queryClient = new QueryClient();

const SHOW_METRIC_AI_AGENT = (import.meta.env.VITE_SHOW_METRIC_AI_AGENT ?? 'true') === 'true';

// keeps AI-only pages out of reach when the tenant has not enabled AI (tenant.enableAI)
const RequireTenantAi = ({ children }: { children: ReactNode }) => {
  const { aiEnabled, isLoading } = useTenantAiEnabled();
  if (!aiEnabled) {
    // hold rendering until the tenant flag is resolved, then bounce when AI is off
    return isLoading ? null : <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
       <BrowserRouter basename={import.meta.env.VITE_WEB_CONTEXT ?? '/'}>
        <ThemeProvider>
          <SidebarProvider>
            <AuthProvider>
              <FirstTimeOnboarding />
              <ErrorBoundary>
                <Suspense fallback={
                  <div className="flex items-center justify-center h-screen w-full">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                }>
                  <Routes>
                <Route path="/" element={< BIAnalysisPage/>} />
                <Route path="/challenges" element={<BusinessChallenges />} />
                <Route path="/hypotheses" element={<Hypotheses />} />
                {/* <Route path="/metrics" element={<Metrics />} /> */}
                <Route path="/metrics/semantic-models" element={<SemanticModelManagement />} />
                <Route path="/metrics/management" element={<MetricsManagement />} />
                <Route path="/metrics/user-groups" element={<UserGroupMetrics />} />
                {SHOW_METRIC_AI_AGENT && (
                  <Route path="/metrics/assistant-config" element={<RequireTenantAi><AnalysisAssistantConfigPage /></RequireTenantAi>} />
                )}
                <Route path="/metrics/bi-analysis" element={<BIAnalysisPage />} />
                <Route path="/metrics/tree" element={<MetricDependencyTree />} />
                <Route path="/metrics/lineage" element={<MetricLineagePage />} />
                <Route path="/metrics/alert-configuration" element={<AlertConfigurationPage />} />
                <Route path="/metrics/data-profiles" element={<DataProfileManagement />} />
                {/* <Route path="/data-catalog" element={<DataCatalog />} /> */}
                <Route path="/data-catalog/domain-map" element={<BusinessDomainMap />} />
                <Route path="/data-catalog/ontology-tester" element={<OntologyDataTester />} />
                <Route path="/data-catalog/business-glossary" element={<BusinessGlossary />} />
                <Route path="/data-asset/products" element={<DataProductCatalog />} />
                <Route path="/data-asset/map" element={<AssetMap />} />
                <Route path="/data-asset/graph" element={<DataProductGraph />} />
                {/* <Route path="/metric-detail" element={<MetricDetail />} /> */}
                <Route path="/analysis" element={<Analysis />} />
                <Route path="/challenge-analysis" element={<ChallengeAnalysis />} />
                <Route path="/graph" element={<GraphView />} />
                <Route path="/learning" element={<Learning />} />
                <Route path="/ai-monitoring" element={<AIMonitoring />} />
                <Route path="/ai-agent-management" element={<AIAgentManagement />} />
                <Route path="/ai-analysis-workflow" element={<AIAnalysisAgent />} />
                <Route path="/retrieval-testing" element={<RetrievalTesting />} />
                <Route path="/evaluation/offline" element={<OfflineEvaluation />} />
                <Route path="/evaluation/datasets" element={<EvaluationDatasetManagement />} />
                {SHOW_METRIC_AI_AGENT && (
                  <Route path="/chat" element={<RequireTenantAi><ChatPage /></RequireTenantAi>} />
                )}
                <Route path="/bi-analysis" element={<BIAnalysisPage />} />
                <Route path="/share/analysis/:id" element={<SharedAnalysisPage />} />
                {/* <Route path="/evaluation/online" element={<OnlineEvaluation />} /> */}
                {/* <Route path="/data-profiles" element={<DataProfileManagement />} /> */}
            
                <Route path="/login" element={<Login />} />
                <Route path="/settings" element={<Settings />} />
                
                <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </ErrorBoundary>
              {/** AI Assistant removed per request */}
            </AuthProvider>
          </SidebarProvider>
        </ThemeProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
