
import ConfigurationForm from '@/components/ConfigurationForm';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const Config = () => {
  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Test Config</h1>
          <p className="text-gray-500 mt-2">Test your data extraction configuration settings</p>
        </div>
      </div>

      {/* Info banner */}
      <Alert className="bg-blue-50/50 border-blue-100 text-blue-900">
        <Sparkles className="h-4 w-4 text-blue-600" />
        <AlertDescription className="ml-2">
          This wizard guides you through selecting a module and model, choosing a time range, and triggering a test event.
        </AlertDescription>
      </Alert>

      {/* Main content */}
      <Card className="border-gray-200 shadow-sm">
      
        <CardContent className="p-6">
          <ConfigurationForm />
        </CardContent>
      </Card>
    </div>
  );
};

export default Config;
