import React, { useState } from 'react';
import { Target, TrendingUp, Users, GitBranch, Package, Calculator, Calendar, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getAIMetricsRecommendations } from '@/services/metricsManagementService';
import { Message } from '@/components/ai/AIMessage';

interface AIMetricsRecommendationsProps {
  selectedCategory?: string;
  onRecommendationGenerated?: (recommendation: Message) => void;
}

const AIMetricsRecommendations: React.FC<AIMetricsRecommendationsProps> = ({ 
  selectedCategory, 
  onRecommendationGenerated 
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [currentRecommendation, setCurrentRecommendation] = useState<Message | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | undefined>(selectedCategory);

  const categories = [
    {
      id: 'sales_performance',
      name: 'Sales Performance',
      icon: TrendingUp,
      color: 'bg-blue-100 text-blue-800',
      description: 'Optimize sales metrics and revenue growth'
    },
    {
      id: 'customer_analysis',
      name: 'Customer Analysis',
      icon: Users,
      color: 'bg-purple-100 text-purple-800',
      description: 'Improve customer acquisition and retention'
    },
    {
      id: 'channel_analysis',
      name: 'Channel Analysis',
      icon: GitBranch,
      color: 'bg-green-100 text-green-800',
      description: 'Enhance channel performance and partnerships'
    },
    {
      id: 'product_analysis',
      name: 'Product Analysis',
      icon: Package,
      color: 'bg-orange-100 text-orange-800',
      description: 'Optimize product mix and rider strategies'
    },
    {
      id: 'financial_ratios',
      name: 'Financial Ratios',
      icon: Calculator,
      color: 'bg-yellow-100 text-yellow-800',
      description: 'Improve financial efficiency and ratios'
    },
    {
      id: 'time_trends',
      name: 'Time Trends',
      icon: Calendar,
      color: 'bg-indigo-100 text-indigo-800',
      description: 'Analyze temporal patterns and forecasts'
    }
  ];

  const generateRecommendations = async (category?: string) => {
    setIsLoading(true);
    setActiveCategory(category);
    
    try {
      const recommendation = await getAIMetricsRecommendations(category);
      setCurrentRecommendation(recommendation);
      onRecommendationGenerated?.(recommendation);
    } catch (error) {
      console.error('Error generating recommendations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateGeneralRecommendations = () => {
    generateRecommendations();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-green-500" />
            AI-Powered Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2 mb-4">
            <Button
              variant={!activeCategory ? "default" : "outline"}
              onClick={generateGeneralRecommendations}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <Sparkles className="h-4 w-4" />
              General Recommendations
            </Button>
            
            {categories.map((category) => {
              const IconComponent = category.icon;
              return (
                <Button
                  key={category.id}
                  variant={activeCategory === category.id ? "default" : "outline"}
                  onClick={() => generateRecommendations(category.id)}
                  disabled={isLoading}
                  className="flex items-center gap-2"
                >
                  <IconComponent className="h-4 w-4" />
                  {category.name}
                </Button>
              );
            })}
          </div>

          {!currentRecommendation && !isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((category) => {
                const IconComponent = category.icon;
                return (
                  <Card 
                    key={category.id} 
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => generateRecommendations(category.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${category.color}`}>
                          <IconComponent className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-sm">{category.name}</h3>
                          <p className="text-xs text-gray-600 mt-1">{category.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500" />
              <span className="ml-2 text-gray-600">Generating AI recommendations...</span>
            </div>
          )}
        </CardContent>
      </Card>

      {currentRecommendation && !isLoading && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-green-500" />
                AI Recommendations
                {activeCategory && (
                  <Badge variant="secondary" className="ml-2">
                    {categories.find(c => c.id === activeCategory)?.name || 'General'}
                  </Badge>
                )}
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentRecommendation(null)}
              >
                Clear
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none">
              <div 
                className="whitespace-pre-wrap text-sm leading-relaxed"
                dangerouslySetInnerHTML={{ 
                  __html: currentRecommendation.content
                    .replace(/\n/g, '<br />')
                    .replace(/### (.*?)(<br \/>|$)/g, '<h3 class="text-lg font-semibold mt-4 mb-2 text-gray-800">$1</h3>')
                    .replace(/## (.*?)(<br \/>|$)/g, '<h2 class="text-xl font-bold mt-6 mb-3 text-gray-900">$1</h2>')
                    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-800">$1</strong>')
                    .replace(/- (.*?)(<br \/>|$)/g, '<div class="flex items-start gap-2 my-1"><span class="text-green-500 mt-1">•</span><span>$1</span></div>')
                }}
              />
            </div>
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Generated at {currentRecommendation.timestamp.toLocaleString()}</span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    AI-Powered
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    Actionable Insights
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AIMetricsRecommendations;