import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Sparkles, Search, ChevronRight, Database, Grid3x3, CheckCircle, Loader } from "lucide-react";
import { Catalog } from "./model/BusinessDomain";

interface AIDiscoveryPathDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  catalogs: Catalog[];
}

export function AIDiscoveryPathDialog({ open, onOpenChange, catalogs }: AIDiscoveryPathDialogProps) {
  const [query, setQuery] = useState("");
  const [currentStep, setCurrentStep] = useState(0);
  const [isSimulating, setIsSimulating] = useState(false);
  const [discoveryResult, setDiscoveryResult] = useState<any>(null);

  const exampleQueries = [
    "Find all data about policy claims and payment history",
    "Show me customer segmentation and behavior data",
    "I need financial transaction and reconciliation records",
    "Get product catalog and pricing information"
  ];

  const simulateAIDiscovery = async () => {
    setIsSimulating(true);
    setCurrentStep(0);
    setDiscoveryResult(null);

    // Step 1: Domain Discovery
    await new Promise(resolve => setTimeout(resolve, 1500));
    setCurrentStep(1);

    // Simulate catalog matching
    const matchedCatalogs = catalogs.filter(c => 
      c.name.toLowerCase().includes('policy') || 
      c.name.toLowerCase().includes('claims') ||
      c.description.toLowerCase().includes('policy') ||
      c.description.toLowerCase().includes('claims')
    );

    await new Promise(resolve => setTimeout(resolve, 1500));
    setCurrentStep(2);

    // Step 2: Structure Unfolding
    const selectedCatalog = matchedCatalogs[0] || catalogs[0];
    await new Promise(resolve => setTimeout(resolve, 1500));
    setCurrentStep(3);

    // Step 3: Mart Linkage
    await new Promise(resolve => setTimeout(resolve, 1500));
    setCurrentStep(4);

    setDiscoveryResult({
      matchedCatalogs,
      selectedCatalog,
      topics: selectedCatalog.topics,
      spaces: selectedCatalog.relatedSpaces
    });

    setIsSimulating(false);
  };

  const handleExampleQuery = (exampleQuery: string) => {
    setQuery(exampleQuery);
  };

  const resetSimulation = () => {
    setCurrentStep(0);
    setDiscoveryResult(null);
    setQuery("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-purple-600" />
            AI Discovery Path Simulation
          </DialogTitle>
          <DialogDescription>
            See how AI agents discover data through the three-layer semantic architecture: Catalog → Topic → Space
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Query Input */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">AI Agent Query</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Ask a natural language question about data..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="flex-1"
                />
                <Button 
                  onClick={simulateAIDiscovery}
                  disabled={!query || isSimulating}
                  className="gap-2"
                >
                  {isSimulating ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Discovering...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      Discover
                    </>
                  )}
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="text-sm text-gray-600">Examples:</span>
                {exampleQueries.map((example, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => handleExampleQuery(example)}
                    className="text-xs"
                  >
                    {example}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Discovery Steps */}
          <div className="space-y-4">
            {/* Step 1: Domain Discovery */}
            <Card className={currentStep >= 1 ? 'border-blue-500 border-2' : ''}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      currentStep >= 4 ? 'bg-green-500' : currentStep >= 1 ? 'bg-blue-500' : 'bg-gray-300'
                    } text-white`}>
                      {currentStep >= 4 ? <CheckCircle className="w-5 h-5" /> : '1'}
                    </div>
                    <CardTitle className="text-lg">Step 1: Domain Discovery (Macro)</CardTitle>
                  </div>
                  {currentStep === 1 && isSimulating && (
                    <Loader className="w-5 h-5 animate-spin text-blue-500" />
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-3">
                  AI searches Catalog descriptions and names to find relevant business domains
                </p>
                {currentStep >= 2 && discoveryResult && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-900">Found {discoveryResult.matchedCatalogs.length} matching catalogs:</p>
                    <div className="space-y-2">
                      {discoveryResult.matchedCatalogs.map((catalog: Catalog) => (
                        <div key={catalog.id} className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <Database className="w-5 h-5 text-blue-600" />
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{catalog.name}</p>
                            <p className="text-xs text-gray-600 line-clamp-1">{catalog.description}</p>
                          </div>
                          <Badge className="bg-blue-100 text-blue-700">
                            {catalog.topics.length} Topics
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-center">
              <ChevronRight className="w-6 h-6 text-gray-400 rotate-90" />
            </div>

            {/* Step 2: Structure Unfolding */}
            <Card className={currentStep >= 2 ? 'border-purple-500 border-2' : ''}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      currentStep >= 4 ? 'bg-green-500' : currentStep >= 2 ? 'bg-purple-500' : 'bg-gray-300'
                    } text-white`}>
                      {currentStep >= 4 ? <CheckCircle className="w-5 h-5" /> : '2'}
                    </div>
                    <CardTitle className="text-lg">Step 2: Structure Unfolding</CardTitle>
                  </div>
                  {currentStep === 2 && isSimulating && (
                    <Loader className="w-5 h-5 animate-spin text-purple-500" />
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-3">
                  AI explores the selected catalog to understand its Topics and entity relationships
                </p>
                {currentStep >= 3 && discoveryResult && (
                  <div className="space-y-3">
                    <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                      <p className="text-sm font-medium text-gray-900 mb-2">Selected: {discoveryResult.selectedCatalog.name}</p>
                      <div className="space-y-2">
                        {discoveryResult.topics.map((topic: any) => (
                          <div key={topic.id} className="flex items-start gap-2 text-sm">
                            <Database className="w-4 h-4 text-purple-600 mt-0.5" />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-900">{topic.name}</span>
                                <Badge variant="outline" className="text-xs">
                                  {topic.type}
                                </Badge>
                                <span className="text-xs text-gray-500">{topic.fields} fields</span>
                              </div>
                              <p className="text-xs text-gray-600 mt-1">{topic.description}</p>
                              <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                                <span>Relationships:</span>
                                {topic.relationships.slice(0, 3).map((rel: string, idx: number) => (
                                  <Badge key={idx} variant="outline" className="text-xs">
                                    {rel}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-center">
              <ChevronRight className="w-6 h-6 text-gray-400 rotate-90" />
            </div>

            {/* Step 3: Mart Linkage */}
            <Card className={currentStep >= 3 ? 'border-green-500 border-2' : ''}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      currentStep >= 4 ? 'bg-green-500' : currentStep >= 3 ? 'bg-green-500' : 'bg-gray-300'
                    } text-white`}>
                      {currentStep >= 4 ? <CheckCircle className="w-5 h-5" /> : '3'}
                    </div>
                    <CardTitle className="text-lg">Step 3: Mart Linkage (Optimization)</CardTitle>
                  </div>
                  {currentStep === 3 && isSimulating && (
                    <Loader className="w-5 h-5 animate-spin text-green-500" />
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-3">
                  AI discovers pre-aggregated Spaces (data marts) for faster analytical queries
                </p>
                {currentStep >= 4 && discoveryResult && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-900">Found {discoveryResult.spaces.length} related Spaces:</p>
                    <div className="space-y-2">
                      {discoveryResult.spaces.map((space: any) => (
                        <div key={space.id} className="p-3 bg-green-50 rounded-lg border border-green-200">
                          <div className="flex items-start gap-3">
                            <Grid3x3 className="w-5 h-5 text-green-600 mt-0.5" />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-gray-900">{space.name}</span>
                                <Badge variant="outline">
                                  {space.type === 'data_mart' ? '📊 Data Mart' : '🔗 Connected'}
                                </Badge>
                                <span className="text-xs text-gray-500">{space.subjects} subjects</span>
                              </div>
                              <p className="text-xs text-gray-600 mb-2">{space.description}</p>
                              <div className="flex items-center gap-2 text-xs">
                                <span className="text-gray-500">Source Topics:</span>
                                {space.topics.map((topicName: string, idx: number) => (
                                  <Badge key={idx} variant="outline" className="text-xs">
                                    {topicName}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Result Summary */}
          {currentStep >= 4 && discoveryResult && (
            <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-500">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Discovery Complete
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm text-gray-900">
                    ✅ AI successfully discovered the data through semantic layer navigation:
                  </p>
                  <ul className="text-sm text-gray-700 space-y-1 ml-4">
                    <li>• Found <strong>{discoveryResult.matchedCatalogs.length}</strong> relevant business domain(s)</li>
                    <li>• Identified <strong>{discoveryResult.topics.length}</strong> data entities with relationships</li>
                    <li>• Located <strong>{discoveryResult.spaces.length}</strong> pre-built data mart(s) for efficient querying</li>
                  </ul>
                  <div className="pt-3 border-t mt-3">
                    <p className="text-xs text-gray-600">
                      💡 <strong>Key Benefit:</strong> Instead of searching through thousands of raw tables, 
                      AI navigated the semantic layer efficiently using business-friendly metadata, 
                      discovering not just the raw data but also optimized analytical views.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            {discoveryResult && (
              <Button variant="outline" onClick={resetSimulation}>
                Try Another Query
              </Button>
            )}
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
