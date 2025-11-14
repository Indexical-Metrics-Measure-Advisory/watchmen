
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Brain, Cpu, Zap, Sparkles, Loader2 } from 'lucide-react';
import { modelService } from '@/services';
import { Model } from '@/models';
import { toast } from '@/hooks/use-toast';

interface ModelSelectorProps {
  selectedModule: string;
  selectedModel: string;
  onModelSelect: (model: string) => void;
  onModelSelectDetail?: (model: Model) => void;
  aiEnabled: boolean;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({
  selectedModule,
  selectedModel,
  onModelSelect,
  onModelSelectDetail,
  aiEnabled
}) => {
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Icon mapping for different model types
  const getModelIcon = (modelName: string) => {
    const name = modelName.toLowerCase();
    if (name.includes('gpt') || name.includes('llm')) return <Brain className="h-5 w-5" />;
    if (name.includes('fast') || name.includes('quick')) return <Zap className="h-5 w-5" />;
    return <Cpu className="h-5 w-5" />;
  };

  // Load models from service
  useEffect(() => {
    const loadModels = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Disable mock data mode to use real API
        modelService.setMockDataMode(false);
        
        const modelData = await modelService.getAllModels();
        
        // Filter models by selected module if needed
        const filteredModels = selectedModule 
          ? modelData.filter(model => model.moduleId === selectedModule)
          : modelData;
          
        setModels(filteredModels);
      } catch (err: any) {
        console.error('Error loading models:', err);
        setError(err.message || 'Failed to load models');
        toast({
          title: "Error Loading Models",
          description: err.message || "Failed to load models from server",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    if (selectedModule) {
      loadModels();
    } else {
      setModels([]);
      setLoading(false);
    }
  }, [selectedModule]);

  if (!selectedModule) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Please select a module first</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span className="text-gray-600">Loading models...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 mb-4">Error: {error}</p>
        <Button 
          variant="outline" 
          onClick={() => window.location.reload()}
          className="gap-2"
        >
          Retry
        </Button>
      </div>
    );
  }

  if (models.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">No models available for the selected module</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {models.map((model) => (
        <Card
          key={model.modelId}
          className={`p-4 cursor-pointer transition-all duration-200 hover:shadow-md ${
            selectedModel === model.modelId
              ? 'ring-2 ring-blue-500 bg-blue-50 border-blue-200'
              : 'hover:border-gray-300'
          }`}
          onClick={() => {
            onModelSelect(model.modelId);
            onModelSelectDetail?.(model);
          }}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${
                selectedModel === model.modelId ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
              }`}>
                {getModelIcon(model.modelName)}
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">{model.modelName}</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Version: {model.version} | Priority: {model.priority}
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2 flex-wrap">
            {model.priority <= 2 && (
              <Badge variant="secondary" className="text-xs">
                High Priority
              </Badge>
            )}
            {aiEnabled && model.priority === 1 && (
              <Badge variant="outline" className="text-xs bg-purple-50 border-purple-200 text-purple-700">
                <Sparkles className="h-3 w-3 mr-1" />
                AI Suggested
              </Badge>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
};

export default ModelSelector;
