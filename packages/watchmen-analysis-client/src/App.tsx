
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route, BrowserRouter } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { SidebarProvider } from "@/contexts/SidebarContext";
import Index from "./pages/Index";
import BusinessChallenges from "./pages/BusinessChallenges";
import BusinessProblems from "./pages/BusinessProblems";
import Hypotheses from "./pages/Hypotheses";
// import MetricDetail from "./pages/MetricDetail";
import Analysis from "./pages/Analysis";
import ChallengeAnalysis from "./pages/ChallengeAnalysis";
import GraphView from "./pages/GraphView";
import Login from "./pages/Login";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import Learning from './pages/Learning';
import AIMonitoring from './pages/AIMonitoring';
import AIAgentManagement from './pages/AIAgentManagement';
import AIAnalysisAgent from './components/ai/AIAnalysisAgent';
import SemanticModelManagement from './pages/SemanticModelManagement';
import MetricsManagement from './pages/MetricsManagement';
import DataProfileManagement from './pages/DataProfileManagement';
import DataCatalog from './pages/DataCatalog';
import FirstTimeOnboarding from "@/components/onboarding/FirstTimeOnboarding";
import RetrievalTesting from "./pages/RetrievalTesting";
import OfflineEvaluation from "./pages/OfflineEvaluation";
import EvaluationDatasetManagement from "./pages/EvaluationDatasetManagement";
import OnlineEvaluation from "./pages/OnlineEvaluation";
import ChatPage from "./pages/chat";
import AnalysisAssistantConfigPage from './pages/AnalysisAssistantConfig';
import BIAnalysisPage from './pages/BIAnalysis';


const queryClient = new QueryClient();

const SHOW_METRIC_AI_AGENT = (import.meta.env.VITE_SHOW_METRIC_AI_AGENT ?? 'true') === 'true';

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ThemeProvider>
          <SidebarProvider>
            <AuthProvider>
              <FirstTimeOnboarding />
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/challenges" element={<BusinessChallenges />} />
                <Route path="/problems" element={<BusinessProblems />} />
                <Route path="/hypotheses" element={<Hypotheses />} />
                {/* <Route path="/metrics" element={<Metrics />} /> */}
                <Route path="/metrics/semantic-models" element={<SemanticModelManagement />} />
                <Route path="/metrics/management" element={<MetricsManagement />} />
                {SHOW_METRIC_AI_AGENT && (
                  <Route path="/metrics/assistant-config" element={<AnalysisAssistantConfigPage />} />
                )}
                <Route path="/metrics/bi-analysis" element={<BIAnalysisPage />} />
                <Route path="/metrics/data-profiles" element={<DataProfileManagement />} />
                <Route path="/data-catalog" element={<DataCatalog />} />
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
                  <Route path="/chat" element={<ChatPage />} />
                )}
                <Route path="/bi-analysis" element={<BIAnalysisPage />} />
                {/* <Route path="/evaluation/online" element={<OnlineEvaluation />} /> */}
                {/* <Route path="/data-profiles" element={<DataProfileManagement />} /> */}
            
                <Route path="/login" element={<Login />} />
                <Route path="/settings" element={<Settings />} />
                
                <Route path="*" element={<NotFound />} />
              </Routes>
              {/** AI Assistant removed per request */}
            </AuthProvider>
          </SidebarProvider>
        </ThemeProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
