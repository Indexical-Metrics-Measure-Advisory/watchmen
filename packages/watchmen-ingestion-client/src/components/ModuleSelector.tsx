
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building, Shield, DollarSign, FileText, Users, TrendingUp, Sparkles, Loader2 } from 'lucide-react';
import { moduleService } from '@/services';
import { Module } from '@/models';
import { toast } from '@/hooks/use-toast';

interface ModuleSelectorProps {
  selectedModule: string;
  onModuleSelect: (module: string) => void;
  aiEnabled: boolean;
}

const ModuleSelector: React.FC<ModuleSelectorProps> = ({
  selectedModule,
  onModuleSelect,
  aiEnabled
}) => {
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Icon mapping for different module types
  const getModuleIcon = (moduleName: string) => {
    const name = moduleName.toLowerCase();
    if (name.includes('policy')) return <Shield className="h-5 w-5" />;
    if (name.includes('claim')) return <FileText className="h-5 w-5" />;
    if (name.includes('finance') || name.includes('billing')) return <DollarSign className="h-5 w-5" />;
    if (name.includes('customer') || name.includes('user')) return <Users className="h-5 w-5" />;
    if (name.includes('report') || name.includes('analytic')) return <TrendingUp className="h-5 w-5" />;
    return <Building className="h-5 w-5" />;
  };

  // Load modules from service
  useEffect(() => {
    const loadModules = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Disable mock data mode to use real API
        moduleService.setMockDataMode(false);
        
        const moduleData = await moduleService.getAllModules();
        setModules(moduleData);
      } catch (err: any) {
        console.error('Error loading modules:', err);
        setError(err.message || 'Failed to load modules');
        toast({
          title: "Error Loading Modules",
          description: err.message || "Failed to load modules from server",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    loadModules();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span className="text-gray-600">Loading modules...</span>
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

  if (modules.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">No modules available</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {modules.map((module) => (
        <Card
          key={module.moduleId}
          className={`p-4 cursor-pointer transition-all duration-200 hover:shadow-md ${
            selectedModule === module.moduleId
              ? 'ring-2 ring-blue-500 bg-blue-50 border-blue-200'
              : 'hover:border-gray-300'
          }`}
          onClick={() => onModuleSelect(module.moduleId)}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${
                selectedModule === module.moduleId ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
              }`}>
                {getModuleIcon(module.moduleName)}
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">{module.moduleName}</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Version: {module.version} | Priority: {module.priority}
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2 flex-wrap">
            {module.priority <= 2 && (
              <Badge variant="secondary" className="text-xs">
                High Priority
              </Badge>
            )}
            {aiEnabled && module.priority === 1 && (
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

export default ModuleSelector;
