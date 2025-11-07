
import React from 'react';
import ConfigurationForm from '@/components/ConfigurationForm';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Settings, Info, Sparkles, Lightbulb, Clock } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

const Config = () => {
  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header with title and description */}
      <Card className="border-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl shadow-md">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-white/20 rounded-xl shadow-md">
                <Settings className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Test Config</h1>
                <p className="text-blue-100 mt-1">Test your data extraction configuration settings</p>
              </div>
            </div>
            
          </div>
        </CardContent>
      </Card>

      {/* Info banner */}
      <Alert className="bg-blue-50 border-blue-200 rounded-xl">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
            <Info className="h-5 w-5" />
          </div>
          <div>
            <div className="font-medium text-blue-900 flex items-center gap-2">
              Test Configuration Wizard <Sparkles className="h-4 w-4 text-blue-600" />
            </div>
            <AlertDescription className="text-sm text-blue-700 mt-1">
              This wizard guides you through selecting a module and model, choosing a time range, and triggering a test event.
            </AlertDescription>
          </div>
        </div>
      </Alert>

      <Separator />

      {/* Main grid layout */}
      <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
        {/* Main configuration card */}
        <Card className="lg:col-span-2 border border-gray-200 shadow-lg rounded-2xl bg-white">
          {/* <CardHeader className="pb-0">
            <CardTitle className="text-gray-900">Configuration Wizard</CardTitle>
            <CardDescription>Follow the steps to set up and test your configuration</CardDescription>
          </CardHeader> */}
          <CardContent className="p-6">
            <ConfigurationForm />
          </CardContent>
        </Card>

        {/* Sidebar with tips and help */}
        {/* <div className="space-y-6 lg:sticky lg:top-20">
          <Card className="border border-gray-200 rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-gray-900 flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-yellow-600" /> Tips
              </CardTitle>
              <CardDescription>Best practices for a smooth testing experience</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Clock className="h-4 w-4 text-gray-600" /> Choose a meaningful time range covering recent activity.
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Sparkles className="h-4 w-4 text-purple-600" /> Ensure module and model selection is correct before testing.
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Info className="h-4 w-4 text-blue-600" /> You can re-run tests any time; results won’t affect live data.
              </div>
            </CardContent>
          </Card>

          
        </div> */}
      </div>
    </div>
  );
};

export default Config;
