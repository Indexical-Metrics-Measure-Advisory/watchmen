
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, Sparkles, Play, Loader2, ArrowRight } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import ModuleSelector from '@/components/ModuleSelector';
import ModelSelector from '@/components/ModelSelector';
import { moduleService, modelService, tableService, collectorService } from '@/services';

const ConfigurationForm = () => {
  const [selectedModule, setSelectedModule] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [isAiEnabled, setIsAiEnabled] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testSucceeded, setTestSucceeded] = useState(false);
  const [startTime, setStartTime] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');
  const [activeStep, setActiveStep] = useState(1);

  // Ensure all services use real data instead of mock data
  useEffect(() => {
    moduleService.setMockDataMode(false);
    modelService.setMockDataMode(false);
    tableService.setMockDataMode(false);
  }, []);

  const handleTestConfiguration = async () => {
    if (!selectedModule || !selectedModel) {
      toast({
        title: "Incomplete Configuration",
        description: "Please complete the configuration before testing.",
        variant: "destructive"
      });
      return;
    }
    if (!startTime || !endTime) {
      toast({
        title: "Missing Time Range",
        description: "Please select start and end time for the test.",
        variant: "destructive",
      });
      return;
    }
    if (new Date(endTime) <= new Date(startTime)) {
      toast({
        title: "Invalid Time Range",
        description: "End time must be after the start time.",
        variant: "destructive",
      });
      return;
    }
    
    setIsTesting(true);
    
    try {
      toast({
        title: "Test Started",
        description: "Triggering test event for selected model...",
      });
      
      // Format datetime values to MySQL DATETIME (YYYY-MM-DD HH:mm:ss) without timezone
      const formatToMySQLDateTime = (input: string) => {
        const d = new Date(input);
        const pad = (n: number) => n.toString().padStart(2, '0');
        const year = d.getFullYear();
        const month = pad(d.getMonth() + 1);
        const day = pad(d.getDate());
        const hours = pad(d.getHours());
        const minutes = pad(d.getMinutes());
        const seconds = pad(d.getSeconds());
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
      };

      // Call collector service to trigger event by model
      const payload = {
        startTime: formatToMySQLDateTime(startTime),
        endTime: formatToMySQLDateTime(endTime),
        modelId: selectedModel,
      };
      const response = await collectorService.triggerEventByModel(payload);
      
      toast({
        title: "Test Completed",
        description: "Event triggered successfully for the selected time range.",
      });
      setTestSucceeded(true);
    } catch (error: any) {
      toast({
        title: "Test Failed",
        description: error.message || "An error occurred while testing the configuration.",
        variant: "destructive"
      });
      setTestSucceeded(false);
    } finally {
      setIsTesting(false);
    }
  };

  const isConfigurationComplete = selectedModule && selectedModel;
  
  const handleNextStep = () => {
    if (activeStep < 2) {
      setActiveStep(activeStep + 1);
    }
  };
  
  const handlePrevStep = () => {
    if (activeStep > 1) {
      setActiveStep(activeStep - 1);
    }
  };

  // Reset test success state when configuration changes
  useEffect(() => {
    setTestSucceeded(false);
    // Also clear time range when module/model changes to avoid stale payloads
    setStartTime('');
    setEndTime('');
  }, [selectedModule, selectedModel]);

  return (
    <div className="space-y-8">
      {/* Header with AI Enhancement Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold text-gray-900">Configuration Wizard</h3>
          <p className="text-sm text-gray-600">Follow the steps below to configure your data extraction</p>
        </div>
        <Button
          variant={isAiEnabled ? "default" : "outline"}
          size="sm"
          onClick={() => setIsAiEnabled(!isAiEnabled)}
          className="gap-2 self-start sm:self-auto"
        >
          <Sparkles className="h-4 w-4" />
          AI Assistance {isAiEnabled ? 'On' : 'Off'}
        </Button>
      </div>

      <Separator className="my-6" />

      {/* Progress Indicator */}
      <div className="relative mb-8">
        <div className="overflow-hidden h-2 mb-6 text-xs flex rounded bg-gray-200">
          <div 
            className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-600 transition-all duration-500"
            style={{ width: `${(activeStep / 2) * 100}%` }}
          ></div>
        </div>
        <div className="flex justify-between">
          <div className={`text-center ${activeStep >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center ${activeStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
              {selectedModule ? <CheckCircle className="h-5 w-5" /> : "1"}
            </div>
            <div className="text-xs mt-1">Module</div>
          </div>
          <div className={`text-center ${activeStep >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center ${activeStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
              {selectedModel ? <CheckCircle className="h-5 w-5" /> : "2"}
            </div>
            <div className="text-xs mt-1">Model</div>
          </div>
        </div>
      </div>

      {/* Configuration Steps */}
      <div className="space-y-6">
        {/* Step 1: Module Selection */}
        <div className={`space-y-4 transition-all duration-300 ${activeStep === 1 ? 'block' : 'hidden'}`}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white text-sm flex items-center justify-center font-semibold">
              1
            </div>
            <Label className="text-lg font-semibold">Select Module</Label>
            {selectedModule && <CheckCircle className="h-5 w-5 text-green-600" />}
          </div>
          <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300">
            <CardContent className="p-6">
              <ModuleSelector 
                selectedModule={selectedModule}
                onModuleSelect={setSelectedModule}
                aiEnabled={isAiEnabled}
              />
            </CardContent>
          </Card>
          <div className="flex justify-end mt-4">
            <Button 
              onClick={handleNextStep} 
              disabled={!selectedModule}
              className="gap-2"
            >
              Next Step
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Step 2: Model Selection */}
        <div className={`space-y-4 transition-all duration-300 ${activeStep === 2 ? 'block' : 'hidden'}`}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white text-sm flex items-center justify-center font-semibold">
              2
            </div>
            <Label className="text-lg font-semibold">Select Model</Label>
            {selectedModel && <CheckCircle className="h-5 w-5 text-green-600" />}
          </div>
          <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300">
            <CardContent className="p-6">
              <ModelSelector
                selectedModule={selectedModule}
                selectedModel={selectedModel}
                onModelSelect={setSelectedModel}
                aiEnabled={isAiEnabled}
              />
            </CardContent>
          </Card>
          <div className="flex justify-between mt-4">
            <Button 
              variant="outline" 
              onClick={handlePrevStep}
            >
              Back
            </Button>
          </div>
        </div>
      </div>

      {/* Configuration Preview */}
      {/* {isConfigurationComplete && (
        <Card className="p-6 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 shadow-md">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <h4 className="font-semibold text-green-900">Configuration Preview</h4>
          </div>
          <ConfigurationPreview
            module={selectedModule}
            model={selectedModel}
            tables={[]}
            showSummary={testSucceeded}
          />
        </Card>
      )} */}

      <Separator className="my-6" />

      {/* Time Range Selection */}
      <Card className="border border-gray-200 shadow-sm">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startTime" className="text-sm font-medium">Start Time</Label>
              <Input
                id="startTime"
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="endTime" className="text-sm font-medium">End Time</Label>
              <Input
                id="endTime"
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="mt-2"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
        <Button
          variant="outline"
          onClick={handleTestConfiguration}
          disabled={!isConfigurationComplete || isTesting}
          className="gap-2"
        >
          {isTesting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          {isTesting ? "Testing..." : "Test Configuration"}
        </Button>
      </div>
    </div>
  );
};

export default ConfigurationForm;
