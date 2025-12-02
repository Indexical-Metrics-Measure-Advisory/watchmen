import React, { useState } from 'react';
import { Send, Sparkles, TrendingUp, Users, GitBranch, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { queryMetricsWithAI } from '@/services/metricsManagementService';
import { Message } from '@/components/ai/AIMessage';

interface AIMetricsQueryProps {
  onQueryResult?: (result: Message) => void;
}

const AIMetricsQuery: React.FC<AIMetricsQueryProps> = ({ onQueryResult }) => {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState<Message | null>(null);

  const suggestedQueries = [
    {
      text: "How are our sales performing this year?",
      icon: TrendingUp,
      category: "Sales"
    },
    {
      text: "What's our customer demographics breakdown?",
      icon: Users,
      category: "Customers"
    },
    {
      text: "Which channels are performing best?",
      icon: GitBranch,
      category: "Channels"
    },
    {
      text: "How are our products and riders doing?",
      icon: Package,
      category: "Products"
    }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;

    setIsLoading(true);
    try {
      const result = await queryMetricsWithAI({ query: query.trim() });
      setLastResult(result);
      onQueryResult?.(result);
    } catch (error) {
      console.error('Error querying AI metrics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestedQuery = async (suggestedQuery: string) => {
    setQuery(suggestedQuery);
    setIsLoading(true);
    try {
      const result = await queryMetricsWithAI({ query: suggestedQuery });
      setLastResult(result);
      onQueryResult?.(result);
    } catch (error) {
      console.error('Error querying AI metrics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            AI Metrics Assistant
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask me anything about your metrics... (e.g., 'How are sales trending?')"
              className="flex-1"
              disabled={isLoading}
            />
            <Button 
              type="submit" 
              disabled={!query.trim() || isLoading}
              className="px-4"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>

          <div className="space-y-2">
            <p className="text-sm text-gray-600">Try these suggested queries:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {suggestedQueries.map((suggestion, index) => {
                const IconComponent = suggestion.icon;
                return (
                  <Button
                    key={index}
                    variant="outline"
                    className="justify-start h-auto p-3 text-left"
                    onClick={() => handleSuggestedQuery(suggestion.text)}
                    disabled={isLoading}
                  >
                    <div className="flex items-start gap-2 w-full">
                      <IconComponent className="h-4 w-4 mt-0.5 text-gray-500" />
                      <div className="flex-1">
                        <div className="text-sm">{suggestion.text}</div>
                        <Badge variant="secondary" className="text-xs mt-1">
                          {suggestion.category}
                        </Badge>
                      </div>
                    </div>
                  </Button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {lastResult && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">AI Analysis Result</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none">
              <div 
                className="whitespace-pre-wrap text-sm"
                dangerouslySetInnerHTML={{ 
                  __html: lastResult.content.replace(/\n/g, '<br />') 
                }}
              />
            </div>
            <div className="mt-4 text-xs text-gray-500">
              Generated at {lastResult.timestamp.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AIMetricsQuery;