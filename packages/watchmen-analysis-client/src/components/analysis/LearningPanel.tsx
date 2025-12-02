
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BrainCircuit, Sparkles, Book, MessageSquare, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { HypothesisType } from '@/model/Hypothesis';

interface LearningPanelProps {
  hypothesis: HypothesisType;
  className?: string;
}

const LearningPanel: React.FC<LearningPanelProps> = ({
  hypothesis,
  className
}) => {
  const navigate = useNavigate();
  
  const handleNavigate = (tab: string) => {
    if (hypothesis.businessProblemId) {
      navigate(`/learning?businessProblemId=${hypothesis.businessProblemId}&tab=${tab}`);
    } else {
      navigate(`/learning?hypothesis=${hypothesis.id}&tab=${tab}`);
    }
  };

  return (
    <Card className={`glass-card ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <BrainCircuit className="h-5 w-5 text-primary" />
          学习与优化
        </CardTitle>
        <CardDescription>
          基于业务问题的持续学习与优化功能
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pb-3">
        <div className="grid grid-cols-1 gap-3">
          <Button 
            variant="outline" 
            className="justify-start h-auto py-3"
            onClick={() => handleNavigate('knowledge')}
          >
            <div className="flex items-start">
              <Book className="h-5 w-5 text-blue-500 mr-3 mt-0.5" />
              <div className="text-left">
                <h3 className="font-medium mb-1">知识库更新</h3>
                <p className="text-sm text-muted-foreground">
                  基于分析结果自动更新知识库，积累项目知识
                </p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 ml-auto" />
          </Button>
          
          <Button 
            variant="outline" 
            className="justify-start h-auto py-3"
            onClick={() => handleNavigate('feedback')}
          >
            <div className="flex items-start">
              <MessageSquare className="h-5 w-5 text-green-500 mr-3 mt-0.5" />
              <div className="text-left">
                <h3 className="font-medium mb-1">用户反馈收集</h3>
                <p className="text-sm text-muted-foreground">
                  记录与此业务问题相关的用户反馈和决策结果
                </p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 ml-auto" />
          </Button>
          
          <Button 
            variant="outline" 
            className="justify-start h-auto py-3"
            onClick={() => handleNavigate('optimization')}
          >
            <div className="flex items-start">
              <Sparkles className="h-5 w-5 text-purple-500 mr-3 mt-0.5" />
              <div className="text-left">
                <h3 className="font-medium mb-1">优化建议</h3>
                <p className="text-sm text-muted-foreground">
                  获取智能生成的优化和下一步行动建议
                </p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 ml-auto" />
          </Button>
        </div>
      </CardContent>
      
      <CardFooter>
        <Button 
          className="w-full"
          onClick={() => handleNavigate('knowledge')}
        >
          <BrainCircuit className="h-4 w-4 mr-2" />
          打开学习与优化系统
        </Button>
      </CardFooter>
    </Card>
  );
};

export default LearningPanel;
