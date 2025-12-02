
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ArrowUpRight, Edit, Plus, MoreHorizontal, Bot, Sparkles, Search, BarChart2 } from 'lucide-react';
import { BusinessChallenge } from "@/model/business";
import { AgentCard as AgentCardType } from '@/model/A2ASpec';
import { a2aService } from '@/services/a2aService';
import { 
  Menubar, 
  MenubarMenu, 
  MenubarTrigger, 
  MenubarContent, 
  MenubarItem,
  MenubarSeparator
} from '@/components/ui/menubar';
import { useToast } from '@/components/ui/use-toast';
import AIMonitoringDashboard from '@/components/ai/AIMonitoringDashboard';
import AIMonitoringDetail from '@/components/ai/AIMonitoringDetail';

interface BusinessChallengeCardProps {
  businessChallenge: BusinessChallenge;
  onEdit: (id: string) => void;
  onAddProblem: (challengeId: string) => void;
  onViewProblems: (challengeId: string) => void;
  onGenerateProblem: (challengeId: string) => void;
  onViewAnalysis?: (id: string) => void;
  problemsCount: number;
  hasAnalyzedHypotheses?: boolean;
}

const BusinessChallengeCard: React.FC<BusinessChallengeCardProps> = ({
  businessChallenge,
  onEdit,
  onAddProblem,
  onViewProblems,
  onGenerateProblem,
  onViewAnalysis,
  problemsCount,
  hasAnalyzedHypotheses = false
}) => {
  const { id, title, description, createdAt } = businessChallenge;
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleViewProblems = () => {
    navigate(`/problems?challengeId=${id}`);
  };

  const [showMonitoring, setShowMonitoring] = useState(false);
  const [aiMetrics, setAiMetrics] = useState({
    validationScore: 85,
    improvementCount: 3,
    lastUpdated: new Date().toISOString(),
    status: 'active' as const
  });

  const handleCreateAIAgent = async () => {
    try {
      
      const newAgent: Omit<AgentCardType, 'lastActive'> = {
        id: `challenge-${id}`,
        name: `${title} Monitor`,
        description: `Monitors and analyzes the business challenge: ${title}`,
        role: 'client',
        capabilities: [
          {
            name: 'Challenge Analysis',
            description: 'Analyzes business challenges',
            type: 'action'
          },
          {
            name: 'Metric Monitoring',
            description: 'Monitors business metrics',
            type: 'knowledge'
          }
        ],
        supportedContentTypes: ['text/plain', 'application/json'],
        metadata: {
          businessChallengeId: id,
          businessChallengeTitle: title,
          businessChallengeDescription: description
        },
      };
      
      await a2aService.registerAgent(newAgent as AgentCardType);
      setShowMonitoring(true);
      toast({
        title: "AI Agent Created",
        description: `AI Agent is now monitoring "${title}" challenge`,
      });
      navigate('/ai-agent-management');
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to create AI agent. Please try again later.",
        variant: "destructive"
      });
    }
  };

  const handleValidateHypothesis = () => {
    navigate(`/hypotheses?challengeId=${id}&aiValidate=true`);
  };

  const handleImproveActions = () => {
    toast({
      title: "Generating Improvement Actions",
      description: "AI is analyzing data and generating improvement actions...",
    });
  };

  return (
    <Card className="glass-card overflow-hidden hover:shadow-glass-hover transition-all flex flex-col min-h-[400px] group relative bg-card/50 backdrop-blur-sm border-muted/30">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-muted/5 group-hover:to-muted/10 transition-colors" />
      <CardHeader className="pb-3 relative z-10 px-6">
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1">
            <div className="text-xs font-medium text-primary/80 mb-1.5 tracking-wide uppercase">Business Challenge</div>
            <CardTitle className="text-lg font-semibold leading-tight hover:text-primary transition-colors">{title}</CardTitle>
          </div>
          <div className="flex items-center gap-1">
            <Menubar className="border-none shadow-none p-0">
              <MenubarMenu>
                <MenubarTrigger className="p-1 cursor-pointer data-[state=open]:bg-accent">
                  <Bot className="h-4 w-4 text-primary" />
                </MenubarTrigger>
                <MenubarContent align="end" alignOffset={-5} className="w-56">
                  <MenubarItem onClick={handleCreateAIAgent}>
                    <Bot className="mr-2 h-4 w-4" />
                    <span>Create AI Monitor Agent</span>
                  </MenubarItem>
                  <MenubarSeparator />
                  <MenubarItem onClick={handleValidateHypothesis}>
                    <ArrowUpRight className="mr-2 h-4 w-4" />
                    <span>Validate Hypotheses</span>
                  </MenubarItem>
                  <MenubarItem onClick={() => navigate(`/retrieval-testing?challengeId=${id}`)}>
                    <Search className="mr-2 h-4 w-4" />
                    <span>Test Retrieval</span>
                  </MenubarItem>
                  {/* <MenubarItem onClick={handleImproveActions}>
                    <Plus className="mr-2 h-4 w-4" />
                    <span>Generate Improvement Actions</span>
                  </MenubarItem> */}
                  {/* <MenubarItem onClick={() => onGenerateProblem(id)}>
                    <Sparkles className="mr-2 h-4 w-4" />
                    <span>Generate AI Problem</span>
                  </MenubarItem> */}
                  {onViewAnalysis && (
                  <MenubarItem onClick={() => onViewAnalysis(id)}>
                    <BarChart2 className="mr-2 h-4 w-4" />
                    <span>View Analysis</span>
                  </MenubarItem>
                  )}
                </MenubarContent>
              </MenubarMenu>
            </Menubar>
            <Button variant="ghost" size="icon" onClick={() => onEdit(id)}>
              <Edit className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-grow relative z-10 pt-2 px-6">
        <CardDescription className="text-sm mb-6 line-clamp-2 text-muted-foreground/90 leading-relaxed">{description}</CardDescription>
        
        {(businessChallenge.datasetStartDate || businessChallenge.datasetEndDate) && (
          <div className="mt-2 mb-4 space-y-1">
            <CardDescription className="text-sm font-medium text-primary">Analysis Period</CardDescription>
            <div className="text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <span>From: {businessChallenge.datasetStartDate ? format(new Date(businessChallenge.datasetStartDate), 'MMMM d, yyyy') : 'N/A'}</span>
                {businessChallenge.datasetStartDate && (
                  <Badge variant="outline" className="text-xs">
                    Q{Math.floor(new Date(businessChallenge.datasetStartDate).getMonth() / 3) + 1} FY{new Date(businessChallenge.datasetStartDate).getFullYear()}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span>To: {businessChallenge.datasetEndDate ? format(new Date(businessChallenge.datasetEndDate), 'MMMM d, yyyy') : 'N/A'}</span>
                {businessChallenge.datasetEndDate && (
                  <Badge variant="outline" className="text-xs">
                    Q{Math.floor(new Date(businessChallenge.datasetEndDate).getMonth() / 3) + 1} FY{new Date(businessChallenge.datasetEndDate).getFullYear()}
                  </Badge>
                )}
              </div>
              {businessChallenge.datasetStartDate && businessChallenge.datasetEndDate && (
                <div className="mt-1 text-xs">
                  Duration: {Math.ceil((new Date(businessChallenge.datasetEndDate).getTime() - new Date(businessChallenge.datasetStartDate).getTime()) / (1000 * 60 * 60 * 24))} days
                </div>
              )}
            </div>
          </div>
        )}
        
        {showMonitoring && (
          <div className="mb-4 space-y-4">
            <AIMonitoringDashboard 
              metrics={aiMetrics}
              challengeTitle={title}
            />
            <AIMonitoringDetail
              logs={[
                {
                  id: '1',
                  type: 'challenge',
                  title: 'Challenge Monitoring Started',
                  description: 'AI agent is now monitoring this business challenge',
                  timestamp: new Date().toISOString(),
                  status: 'success'
                },
                {
                  id: '2',
                  type: 'metric',
                  title: 'Initial Validation Score',
                  description: 'Initial validation score calculated for challenge',
                  timestamp: new Date().toISOString(),
                  status: 'info',
                  value: 85
                }
              ]}
              challengeTitle={title}
            />
          </div>
        )}

        <div className="flex justify-between items-center mt-6 bg-muted/5 p-3 rounded-lg border border-border/5">
          <div className="text-sm flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-base text-primary">{problemsCount}</span>
              <span className="text-muted-foreground">Business Problems</span>
            </div>
          </div>
          {/* <Button 
            variant="outline" 
            size="sm" 
            className="text-xs hover:bg-primary hover:text-primary-foreground transition-colors"
            onClick={() => onAddProblem(id)}
          >
            <Plus className="mr-1.5 h-3 w-3" />
            Add Problem
          </Button> */}
        </div>
      </CardContent>
      
      <CardFooter className="mt-auto pt-6 pb-4 px-6 flex flex-col gap-4 relative z-10 border-t border-border/10">
        <div className="text-xs text-muted-foreground/75 flex items-center gap-2 w-full">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-primary/20" />
            <span className="text-muted-foreground/90">Created on</span>
            <span className="font-medium text-muted-foreground">{new Date(createdAt).toLocaleDateString()}</span>
          </span>
        </div>
        
        <div className="flex gap-3 items-center w-full justify-center">
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-xs hover:bg-primary/10 hover:text-primary transition-colors flex items-center"
            onClick={() => onGenerateProblem(id)}
          >
            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
            Generate
          </Button>
          {onViewAnalysis && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-xs hover:bg-primary/10 hover:text-primary transition-colors flex items-center"
            onClick={() => onViewAnalysis(id)}
            // disabled={!hasAnalyzedHypotheses}
            title={!hasAnalyzedHypotheses ? "No analyzed hypotheses available" : ""}
          >
            <BarChart2 className="mr-1.5 h-3.5 w-3.5" />
            Analysis
          </Button>
          )}
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-xs hover:bg-primary/10 hover:text-primary transition-colors flex items-center"
            onClick={handleViewProblems}
          >
            Problems
            <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

export default BusinessChallengeCard;
