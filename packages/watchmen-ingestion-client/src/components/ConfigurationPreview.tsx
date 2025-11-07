
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Database, ArrowRight, CheckCircle, Table, Layers } from 'lucide-react';

interface ConfigurationPreviewProps {
  module: string;
  model: string;
  tables: string[];
  showSummary?: boolean;
}

const ConfigurationPreview: React.FC<ConfigurationPreviewProps> = ({
  module,
  model,
  tables,
  showSummary = true,
}) => {
  const formatName = (id: string) => {
    return id.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
        <div className="flex items-center gap-2 bg-blue-50 p-2 rounded-lg">
          <div className="p-1.5 bg-blue-100 rounded-md">
            <Layers className="h-4 w-4 text-blue-700" />
          </div>
          <div>
            <span className="text-xs text-blue-600 font-medium">Module</span>
            <div className="font-semibold text-blue-800">{formatName(module)}</div>
          </div>
        </div>
        
        <ArrowRight className="hidden sm:block h-5 w-5 text-gray-400" />
        
        <div className="flex items-center gap-2 bg-purple-50 p-2 rounded-lg">
          <div className="p-1.5 bg-purple-100 rounded-md">
            <Database className="h-4 w-4 text-purple-700" />
          </div>
          <div>
            <span className="text-xs text-purple-600 font-medium">Model</span>
            <div className="font-semibold text-purple-800">{formatName(model)}</div>
          </div>
        </div>
      </div>

      <Separator className="bg-gray-200" />

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Table className="h-4 w-4 text-green-700" />
          <span className="text-sm font-medium text-gray-700">Selected Tables</span>
          <Badge variant="outline" className="ml-2 bg-green-50 text-green-700 border-green-200">
            {tables.length} selected
          </Badge>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 mt-2">
          {tables.map((table) => (
            <div 
              key={table} 
              className="flex items-center gap-2 p-2 bg-green-50 border border-green-100 rounded-md"
            >
              <CheckCircle className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
              <span className="text-sm text-green-800 truncate">{formatName(table)}</span>
            </div>
          ))}
        </div>
      </div>

      {showSummary && (
        <div className="bg-gradient-to-r from-blue-50 to-green-50 p-4 rounded-lg border border-blue-100 shadow-sm">
          <h4 className="text-sm font-semibold text-gray-800 mb-2">Configuration Summary</h4>
          <p className="text-sm text-gray-700">
            This configuration will extract data from <span className="font-medium">{tables.length} table{tables.length > 1 ? 's' : ''}</span> in 
            the <span className="font-medium text-purple-700">{formatName(model)}</span> model within 
            the <span className="font-medium text-blue-700">{formatName(module)}</span> module.
          </p>
          <div className="mt-3 flex items-center gap-2 text-xs text-green-700">
            <CheckCircle className="h-4 w-4" />
            <span>Ready for deployment</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConfigurationPreview;
