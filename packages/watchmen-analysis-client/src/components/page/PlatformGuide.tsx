import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface PlatformGuideProps {
  className?: string;
}

export const PlatformGuide: React.FC<PlatformGuideProps> = ({ className }) => {
  const navigate = useNavigate();

  const steps = [
    {
      id: 1,
      title: "Add Challenge",
      description: "Identify and define business challenges that need analysis",
      icon: "🎯",
      color: "blue",
      action: () => navigate('/challenges')
    },
    {
      id: 2,
      title: "Create Agent & Generate Report",
      description: "Deploy AI agents to analyze challenges and automatically generate comprehensive reports",
      icon: "🤖📊",
      color: "green",
      action: () => navigate('/ai-agent-management')
    },
    {
      id: 3,
      title: "Ask Questions",
      description: "Interact with reports through intelligent Q&A",
      icon: "💬",
      color: "orange",
      action: () => {}
    }
  ];

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          📋 Platform Usage Guide
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-muted-foreground mb-4">
            Follow these steps to maximize your insurance analytics platform experience:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {steps.map((step) => (
              <div
                key={step.id}
                className={`text-center p-4 bg-${step.color}-50 rounded-lg border cursor-pointer hover:shadow-md transition-all duration-200 hover:bg-${step.color}-100`}
                onClick={step.action}
              >
                <div className="text-2xl mb-2">{step.icon}</div>
                <h3 className={`font-semibold text-${step.color}-700 mb-2`}>
                  {step.id}. {step.title}
                </h3>
                <p className={`text-sm text-${step.color}-600`}>
                  {step.description}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              💡 <strong>Tip:</strong> Start by exploring the chat interface below to ask questions about insurance analytics, business challenges, or hypothesis testing. The AI will guide you through the analysis process.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};