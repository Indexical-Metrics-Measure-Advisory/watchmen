import React, { useState, useEffect, useCallback } from 'react';
import { ReactFlowProvider } from 'reactflow';
import { Database, Search, Sparkles, Info, RefreshCw, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import DatabaseFlowChart from '@/components/discovery/DatabaseFlowChart';
import EntityDetails from '@/components/discovery/EntityDetails';
import DatabaseInsights from '@/components/discovery/DatabaseInsights';
import ModuleSelector from '@/components/ModuleSelector';
import ModelSelector from '@/components/ModelSelector';
import { discoveryService } from '@/services';
import { DatabaseEntity, DatabaseInsight } from '@/models/discovery.models';

const Discovery = () => {
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [entities, setEntities] = useState<DatabaseEntity[]>([]);
  const [filteredEntities, setFilteredEntities] = useState<DatabaseEntity[]>([]);
  const [relationships, setRelationships] = useState([]);
  const [selectedEntity, setSelectedEntity] = useState<DatabaseEntity | null>(null);
  const [insights, setInsights] = useState<DatabaseInsight[]>([]);
  const [activeTab, setActiveTab] = useState('visualization');
  const [selectedModule, setSelectedModule] = useState('');
  const [selectedModel, setSelectedModel] = useState('');

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // In a real application, these would be API calls
        // For now, we'll use the mock data from the service
        const mockEntities = discoveryService.getMockDatabaseEntities();
        const mockRelationships = discoveryService.getMockRelationships();
        const mockInsights = discoveryService.getMockInsights();
        
        setEntities(mockEntities);
        setFilteredEntities(mockEntities);
        setRelationships(mockRelationships);
        setInsights(mockInsights);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  // Filter entities based on search term, module, and model
  useEffect(() => {
    let filtered = entities;
    if (searchTerm.trim()) {
      filtered = filtered.filter(entity => 
        entity.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entity.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entity.columns.some(col => 
          col.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          col.description?.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }
    // if (selectedModule) {
    //   filtered = filtered.filter(entity => entity.module === selectedModule);
    // }
    // if (selectedModel) {
    //   filtered = filtered.filter(entity => entity.model === selectedModel);
    // }
    setFilteredEntities(filtered);
  }, [searchTerm, selectedModule, selectedModel, entities]);

  // Handle entity selection
  const handleEntitySelect = useCallback((entity: DatabaseEntity | null) => {
    setSelectedEntity(entity);
  }, []);

  // Handle insight click
  const handleInsightClick = useCallback((insight: DatabaseInsight) => {
    if (insight.relatedEntities && insight.relatedEntities.length > 0) {
      const entityId = insight.relatedEntities[0];
      const entity = entities.find(e => e.id === entityId);
      if (entity) {
        setSelectedEntity(entity);
        setActiveTab('visualization');
      }
    }
  }, [entities]);

  // Simulate AI analysis
  const runAnalysis = useCallback(async () => {
    setAnalyzing(true);
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // In a real application, this would be an API call
      const mockInsights = discoveryService.getMockInsights();
      setInsights(mockInsights);
      
      // Switch to insights tab
      setActiveTab('insights');
    } catch (error) {
      console.error('Error running analysis:', error);
    } finally {
      setAnalyzing(false);
    }
  }, []);

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Hero header */}
      <Card className="border-0 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl shadow-md">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-white/20 rounded-xl shadow-md">
                <Database className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Data Discovery</h1>
                <p className="text-indigo-100 mt-1">Explore database structure and discover insights</p>
              </div>
            </div>
            
          </div>
        </CardContent>
      </Card>
      
      {/* Info banner */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 flex items-start gap-3">
        <Info className="h-5 w-5 text-indigo-600 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-medium text-indigo-800">AI-Powered Database Discovery</h3>
          <p className="text-sm text-indigo-700 mt-1">
            This tool visualizes your database structure and uses AI to provide insights about relationships,
            optimization opportunities, and potential issues. Select tables to view details and run analysis
            to get AI-generated recommendations.
          </p>
        </div>
      </div>
      
      <Separator />
      
      {/* Filters and Actions - moved to top */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Module</label>
            <ModuleSelector
              selectedModule={selectedModule}
              onModuleSelect={setSelectedModule}
              aiEnabled={true}
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Model</label>
            <ModelSelector
              selectedModule={selectedModule}
              selectedModel={selectedModel}
              onModelSelect={setSelectedModel}
              aiEnabled={true}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search entities, columns..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Actions</label>
              <Button 
                className="w-full gap-2" 
                onClick={runAnalysis}
                disabled={analyzing || loading}
              >
                {analyzing ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Run AI Analysis
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </Card>
      
      {/* Main content with tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Tab content area */}
        <div className="lg:col-span-3">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex justify-between items-center mb-4">
              <TabsList>
              <TabsTrigger value="table" className="gap-2">
                  <FileText className="h-4 w-4" />
                  Table View
                </TabsTrigger>
                <TabsTrigger value="visualization" className="gap-2">
                  <Database className="h-4 w-4" />
                  Visualization
                </TabsTrigger>
                
                <TabsTrigger value="insights" className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  AI Insights
                  <Badge className="ml-1 h-5 w-5 p-0 flex items-center justify-center">
                    {insights.length}
                  </Badge>
                </TabsTrigger>
              </TabsList>
              
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-gradient-to-r from-purple-500 to-blue-500 text-white border-0 flex items-center gap-1 px-3 py-1">
                  <Sparkles className="h-3.5 w-3.5" />
                  AI Enhanced
                </Badge>
              </div>
            </div>
            
            <TabsContent value="visualization" className="m-0">
              {loading ? (
                <div className="h-[600px] bg-gray-50 rounded-lg border flex items-center justify-center">
                  <div className="text-center">
                    <RefreshCw className="h-8 w-8 text-gray-400 animate-spin mx-auto mb-4" />
                    <p className="text-gray-500">Loading database structure...</p>
                  </div>
                </div>
              ) : (
                <ReactFlowProvider>
                  <DatabaseFlowChart 
                    entities={filteredEntities}
                    relationships={relationships}
                    onEntitySelect={handleEntitySelect}
                  />
                </ReactFlowProvider>
              )}
              
              <div className="mt-4 text-sm text-gray-500 flex items-center gap-2">
                <Info className="h-4 w-4" />
                <span>Click on an entity to view its details. Drag to reposition entities.</span>
              </div>
            </TabsContent>
            
            <TabsContent value="table" className="m-0">
              {loading ? (
                <Card className="p-6 space-y-4">
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                  <Separator />
                  <div className="space-y-3">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                </Card>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Schema</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Columns</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEntities.map((entity) => (
                        <TableRow 
                          key={entity.id}
                          className="cursor-pointer hover:bg-gray-50"
                          onClick={() => handleEntitySelect(entity)}
                        >
                          <TableCell className="font-medium">{entity.name}</TableCell>
                          <TableCell>{entity.type}</TableCell>
                          <TableCell>{entity.schema}</TableCell>
                          <TableCell>{entity.description}</TableCell>
                          <TableCell>{entity.columns.length} columns</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="insights" className="m-0 space-y-4">
              {loading || analyzing ? (
                <Card className="p-6 space-y-4">
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                  <Separator />
                  <div className="space-y-3">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                </Card>
              ) : insights.length > 0 ? (
                <DatabaseInsights 
                  insights={insights} 
                  onInsightClick={handleInsightClick}
                />
              ) : (
                <Alert>
                  <Sparkles className="h-4 w-4" />
                  <AlertTitle>No insights available</AlertTitle>
                  <AlertDescription>
                    Run the AI analysis to generate insights about your database structure.
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>
          </Tabs>
        </div>
        
        {/* Entity details sidebar */}
        <div className="lg:col-span-1">
          {loading ? (
            <Card className="h-full p-6 space-y-4">
              <div className="space-y-2">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
              <Separator />
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </Card>
          ) : (
            <EntityDetails entity={selectedEntity} />
          )}
        </div>
      </div>
      
      {/* Help section */}
      <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Need Help?</h3>
        <p className="text-gray-600 mb-4">
          If you need assistance with data discovery, please refer to our documentation
          or contact the support team.
        </p>
        
      </div>
    </div>
  );
};

export default Discovery;