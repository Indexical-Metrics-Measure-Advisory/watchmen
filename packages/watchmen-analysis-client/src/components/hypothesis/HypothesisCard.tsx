
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowUpRight, Edit, BarChart2, GraduationCap, Sparkles, Bot } from 'lucide-react';
import RelatedHypothesesBadges from './RelatedHypothesesBadges';
import { Link, useNavigate } from 'react-router-dom';
import { AgentCard as AgentCardType } from '@/model/A2ASpec';
import { HypothesisType } from '@/model/Hypothesis';
import { useToast } from '@/components/ui/use-toast';
import { useState, useEffect } from 'react';
import { 
  Menubar, 
  MenubarMenu, 
  MenubarTrigger, 
  MenubarContent, 
  MenubarItem,
  MenubarSeparator
} from '@/components/ui/menubar';
import { a2aService } from '@/services/a2aService';
import { HypothesisAnalysisService } from '@/services/hypothesisAnalysisService';

interface HypothesisCardProps {
  hypothesis: HypothesisType;
  onEdit: (id: string) => void;
  onViewMetrics: (id: string) => void;
  businessProblemTitle?: string; // Optional business problem title
  allHypotheses: HypothesisType[]; // Added for related hypotheses
}

const statusConfig = {
  drafted: { label: 'Draft', color: 'bg-muted text-muted-foreground' },
  testing: { label: 'Testing', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
  validated: { label: 'Validated', color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' },
};

const HypothesisCard: React.FC<HypothesisCardProps> = ({ 
  hypothesis, 
  onEdit, 
  onViewMetrics, 
  businessProblemTitle,
  allHypotheses
}) => {
  const { id, title, description, status, confidence, metrics, createdAt, relatedHypothesesIds, businessProblemId } = hypothesis;
  const { label, color } = statusConfig[status];
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisCompleted, setAnalysisCompleted] = useState(false);

  useEffect(() => {
    const analysisStatus = HypothesisAnalysisService.getAnalysisStatus(id);
    if (analysisStatus?.completed) {
      setAnalysisCompleted(true);
    }
  }, [id]);

  const handleStartAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      // Simulate analysis process
      await new Promise(resolve => setTimeout(resolve, 3000));
      HypothesisAnalysisService.markAnalysisCompleted(id);
      setAnalysisCompleted(true);
      toast({
        title: "Analysis Complete",
        description: "You can now view the analysis results",
      });
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
  // const handleCreateAIAgent = async () => {
  //   try {
  //     const newAgent: Omit<AgentCardType, 'lastActive'> = {
  //       id: `challenge-${id}`,
  //       name: `${title} Monitor`,
  //       description: `Monitors and analyzes the business challenge: ${title}`,
  //       role: 'client',
  //       capabilities: [
  //         {
  //           name: 'Challenge Analysis',
  //           description: 'Analyzes business challenges',
  //           type: 'action'
  //         },
  //         {
  //           name: 'Metric Monitoring',
  //           description: 'Monitors business metrics',
  //           type: 'knowledge'
  //         }
  //       ],
  //       supportedContentTypes: ['text/plain', 'application/json'],
  //       version: '1.0.0'
  //     };

  //     await a2aService.registerAgent(newAgent as AgentCardType);
  //     // setShowMonitoring(true);
  //     toast({
  //       title: "AI Agent Created",
  //       description: `AI Agent is now monitoring "${title}" challenge`,
  //     });
  //     navigate('/ai-agent-management');
  //   } catch (err) {
  //     toast({
  //       title: "Error",
  //       description: "Failed to create AI agent. Please try again later.",
  //       variant: "destructive"
  //     });
  //   }
  // };

  return (
    <Card className="glass-card overflow-hidden hover:shadow-glass-hover transition-all flex flex-col min-h-[400px]">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <Badge className={`mb-2 font-normal ${color}`}>{label}</Badge>
            {businessProblemTitle && (
              <div className="text-xs text-muted-foreground mb-2">
                Business Problem: {businessProblemTitle}
              </div>
            )}
            <CardTitle className="text-base">{title}</CardTitle>
          </div>

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => onEdit(id)}>
              <Edit className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <CardDescription className="text-sm mb-4 line-clamp-2">{description}</CardDescription>
        
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Confidence</span>
              <span className="font-medium">{confidence}%</span>
            </div>
            <Progress value={confidence} className="h-1.5" />
          </div>
          
          <div>
            <div className="text-sm mb-2">Related Metrics ({metrics.length})</div>
            <div className="flex flex-wrap gap-1">
              {metrics.slice(0, 3).map((metric, index) => (
                <Badge key={index} variant="outline" className="bg-background/50">
                  {metric}
                </Badge>
              ))}
              {metrics.length > 3 && (
                <Badge variant="outline" className="bg-background/50">
                  +{metrics.length - 3}
                </Badge>
              )}
            </div>
          </div>
          
          {relatedHypothesesIds && relatedHypothesesIds.length > 0 && (
            <div>
              <div className="text-sm mb-2">Related Hypotheses ({relatedHypothesesIds.length})</div>
              <RelatedHypothesesBadges 
                relatedIds={relatedHypothesesIds}
                allHypotheses={allHypotheses}
              />
            </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="mt-auto pt-4 flex justify-between items-center">
        <div className="text-xs text-muted-foreground">
          Created on {new Date(createdAt).toLocaleDateString()}
        </div>
        <div className="flex gap-2">
          <Link to={`/learning?businessProblemId=${businessProblemId}`}>
            <Button variant="ghost" size="sm" className="text-xs">
              <GraduationCap className="mr-1 h-3 w-3" />
              Feedback
            </Button>
          </Link>
          {!analysisCompleted ? (
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs"
              onClick={handleStartAnalysis}
              disabled={isAnalyzing}
            >
              {isAnalyzing ? (
                <>
                  <span className="loading-dots"></span>
                  Analyzing...
                </>
              ) : (
                <>Start Analysis</>
              )}
            </Button>
          ) : (
            <Link to={`/analysis?hypothesis=${id}`}>
              <Button variant="ghost" size="sm" className="text-xs">
                View Analysis
                <ArrowUpRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          )}
        </div>
      </CardFooter>
    </Card>
  );
};

export default HypothesisCard;
