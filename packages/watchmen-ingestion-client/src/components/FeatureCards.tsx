
import React from 'react';
import { Card } from '@/components/ui/card';
import { CheckCircle, Clock, Shield, Workflow } from 'lucide-react';

const FeatureCards = () => {
  const features = [
    {
      icon: <Workflow className="h-5 w-5 text-blue-600" />,
      title: "Smart Workflow",
      description: "Guided configuration process with intelligent validations"
    },
    {
      icon: <CheckCircle className="h-5 w-5 text-green-600" />,
      title: "Auto-Validation",
      description: "Real-time validation of your configuration settings"
    },
    {
      icon: <Clock className="h-5 w-5 text-orange-600" />,
      title: "Quick Setup",
      description: "Get up and running in minutes, not hours"
    },
    {
      icon: <Shield className="h-5 w-5 text-purple-600" />,
      title: "Enterprise Ready",
      description: "Built for scale with security and compliance in mind"
    }
  ];

  return (
    <>
      {features.map((feature, index) => (
        <Card key={index} className="p-4 hover:shadow-lg transition-all duration-200 bg-white/70 backdrop-blur-sm border-gray-200/50">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-gray-50 rounded-lg">
              {feature.icon}
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-1">{feature.title}</h4>
              <p className="text-sm text-gray-600">{feature.description}</p>
            </div>
          </div>
        </Card>
      ))}
    </>
  );
};

export default FeatureCards;
