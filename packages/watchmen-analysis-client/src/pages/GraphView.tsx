
import React, { useEffect, useState } from 'react';
import { useSidebar } from '@/contexts/SidebarContext';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import GraphToolbar from '@/components/graph/GraphToolbar';
import { ChallengeNode, ProblemNode, HypothesisNode } from '@/components/graph/NodeTypes';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, GitGraph } from 'lucide-react';
import { generateGraphData } from '@/components/graph/GraphDataGenerator';
import { toast } from '@/components/ui/use-toast';

import { HypothesisType } from '@/model/Hypothesis';
import { businessService } from '@/services/businessService';
import { hypothesisService } from '@/services/hypothesisService';

const nodeTypes = {
  challenge: ChallengeNode,
  problem: ProblemNode,
  hypothesis: HypothesisNode,
};

// Create a separate component for the flow content so we can use the useReactFlow hook
const FlowContent = ({ onEntitySelect }: { onEntitySelect: (entity: any) => void }) => {
  const navigate = useNavigate();
  const location = useLocation();
  // Remove selectedEntity state from FlowContent


  
  // Set up React Flow state
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [hypotheses, setHypotheses] = useState<HypothesisType[]>([]);
  
  useEffect(() => {
    const fetchHypotheses = async () => {
      try {
        const data = await hypothesisService.getHypotheses();
        setHypotheses(data);
      } catch (error) {
        console.error('Error fetching hypotheses:', error);
        toast({
          title: "Error",
          description: "Failed to load hypothesis data. Please try again.",
          variant: "destructive",
        });
      }
    };
    
    fetchHypotheses();
  }, []);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load graph data
  useEffect(() => {
    const loadGraphData = async () => {
      try {
        const { nodes: graphNodes, edges: graphEdges } = await generateGraphData(hypotheses);
        setNodes(graphNodes);
        setEdges(graphEdges);
      } catch (error) {
        console.error('Error loading graph data:', error);
        toast({
          title: "Error",
          description: "Failed to load graph data. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    if (hypotheses.length > 0) {
      loadGraphData();
    }
  }, [hypotheses]);

  
  const reactFlowInstance = useReactFlow();
  
  useEffect(() => {
    // Automatically distribute nodes in a force-directed layout
    const nodesByType = {
      challenge: nodes.filter(node => node.type === 'challenge'),
      problem: nodes.filter(node => node.type === 'problem'),
      hypothesis: nodes.filter(node => node.type === 'hypothesis'),
    };
    
    // Position challenges at the top
    nodesByType.challenge.forEach((node, i) => {
      const spacing = window.innerWidth / (nodesByType.challenge.length + 1);
      node.position = { 
        x: spacing * (i + 1) - 100, 
        y: 100 
      };
    });
    
    // Position problems in the middle
    nodesByType.problem.forEach((node, i) => {
      const spacing = window.innerWidth / (nodesByType.problem.length + 1);
      node.position = { 
        x: spacing * (i + 1) - 100, 
        y: 300 
      };
    });
    
    // Position hypotheses at the bottom
    nodesByType.hypothesis.forEach((node, i) => {
      const spacing = window.innerWidth / (nodesByType.hypothesis.length + 1);
      node.position = { 
        x: spacing * (i + 1) - 100, 
        y: 500 
      };
    });
    
    setNodes([...nodesByType.challenge, ...nodesByType.problem, ...nodesByType.hypothesis]);
    
    // Check URL parameters for initial highlight
    const params = new URLSearchParams(location.search);
    const hypothesisId = params.get('hypothesis');
    
    if (hypothesisId) {
      const nodeId = `hypothesis_${hypothesisId}`;
      const node = nodes.find(n => n.id === nodeId);
      
      if (node) {
        const entityData = hypotheses.find(h => h.id === hypothesisId);
        if (entityData) {
          onEntitySelect({
            id: hypothesisId,
            type: 'hypothesis',
            data: {
              ...node.data,
              ...entityData,
              label: entityData.title || node.data.label
            }
          });
        }
        
        // Center view on this node
        setTimeout(() => {
          reactFlowInstance.fitView({ 
            nodes: [node],
            padding: 0.2
          });
        }, 100);
      }
    }
  }, []);
  
  // Handle node click
  const onNodeClick = async (_: React.MouseEvent, node: any) => {
    // console.log('Node clicked:', node);
    const [type, id] = node.id.split('_');
    // console.log('Parsed type:', type, 'id:', id);
    let entityData = null;

    try {
      switch(type) {
        case 'challenge':
          // console.log('Fetching challenge data for id:', id);
          entityData = await businessService.getBusinessChallengeById(id);
          break;
        case 'problem':
          // console.log('Fetching problem data for id:', id);
          entityData = await businessService.getBusinessProblemById(id);
          break;
        case 'hypothesis':
          // console.log('Finding hypothesis data for id:', id, 'in hypotheses:', hypotheses);
          entityData = hypotheses.find(h => h.id === id);
          break;
      }

      // console.log('Entity data found:', entityData);
      if (entityData) {
        const entityToSelect = {
          id,
          type: type as 'challenge' | 'problem' | 'hypothesis',
          data: {
            ...node.data,
            ...entityData,
            label: entityData.title || node.data.label
          }
        };
        // console.log('Calling onEntitySelect with:', entityToSelect);
        onEntitySelect(entityToSelect);
      } else {
        // console.log('No entity data found for type:', type, 'id:', id);
      }
    } catch (error) {
      console.error('Error fetching entity data:', error);
    }
  };
  
  const handleZoomIn = () => {
    reactFlowInstance.zoomIn();
  };
  
  const handleZoomOut = () => {
    reactFlowInstance.zoomOut();
  };
  
  const handleFitView = () => {
    reactFlowInstance.fitView({ padding: 0.2 });
  };
  
  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      const { nodes: refreshedNodes, edges: refreshedEdges } = await generateGraphData(hypotheses);
      setNodes(refreshedNodes);
      setEdges(refreshedEdges);
      toast({
        title: "Graph refreshed",
        description: "The business graph has been regenerated with the latest data.",
      });
    } catch (error) {
      console.error('Error refreshing graph data:', error);
      toast({
        title: "Error",
        description: "Failed to refresh graph data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleHelp = () => {
    toast({
      title: "Graph Navigation Help",
      description: "Click on nodes to view details. Drag to pan. Use the mouse wheel to zoom. Use the toolbar for additional controls.",
    });
  };
  
  // handleViewDetails moved to main component
  
  return (
    <Card className="h-[calc(100vh-12rem)] glass-card">
      <CardHeader className="pb-0">
        <GraphToolbar 
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onFitView={handleFitView}
          onRefresh={handleRefresh}
          onHelp={handleHelp}
        />
      </CardHeader>
      <CardContent className="h-[calc(100%-5rem)] overflow-hidden">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          minZoom={0.2}
          maxZoom={2}
        >
          <Controls position="bottom-right" />
          <MiniMap 
            nodeStrokeWidth={3}
            zoomable
            pannable
            position="bottom-left"
          />
          <Background gap={12} size={1} />
        </ReactFlow>
      </CardContent>
    </Card>
  );
};

// Main component that provides the ReactFlowProvider
const GraphView: React.FC = () => {
  const { collapsed } = useSidebar();
  const navigate = useNavigate();
  const [selectedEntity, setSelectedEntity] = useState<{
    id: string;
    type: 'challenge' | 'problem' | 'hypothesis';
    data: any;
  } | null>(null);

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleEntitySelect = (entity: any) => {

    console.log('Selected entity:', entity);
    setSelectedEntity(entity);
  };

  const handleViewDetails = () => {
    if (!selectedEntity) return;
    
    switch(selectedEntity.type) {
      case 'challenge':
        navigate(`/challenges?id=${selectedEntity.id}`);
        break;
      case 'problem':
        navigate(`/problems?id=${selectedEntity.id}`);
        break;
      case 'hypothesis':
        navigate(`/analysis?hypothesis=${selectedEntity.id}`);
        break;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      
      <div className={`${collapsed ? 'pl-20' : 'pl-56'} min-h-screen transition-all duration-300`}>
        <Header />
        
        <main className="container py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Button 
                variant="outline"
                size="sm"
                className="flex items-center gap-1"
                onClick={handleGoBack}
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <h1 className="text-2xl font-bold">Business Knowledge Graph</h1>
            </div>
            
          
          </div>
          
          <div className="grid grid-cols-3 gap-6 h-full">
            <div className="col-span-2">
              <ReactFlowProvider>
                <FlowContent onEntitySelect={handleEntitySelect} />
              </ReactFlowProvider>
            </div>
            <div className="col-span-1">
              <Card className="glass-card h-[calc(100vh-12rem)]">
                <CardHeader>
                  <CardTitle>Selected Entity</CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedEntity ? (
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <h3 className="text-lg font-medium">{selectedEntity.data.label}</h3>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={
                            selectedEntity.type === 'challenge' ? "bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300" :
                            selectedEntity.type === 'problem' ? "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300" :
                            "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300"
                          }>
                            {selectedEntity.type.charAt(0).toUpperCase() + selectedEntity.type.slice(1)}
                          </Badge>
                          
                          {selectedEntity.type == 'problem' &&  (
                            <Badge variant="outline" className={
                              selectedEntity.data.status === 'open' ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" :
                              selectedEntity.data.status === 'in_progress' ? "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300" :
                              "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                            }>
                              {selectedEntity.data.status === 'in_progress' ? 'In Progress' : selectedEntity.data.status.charAt(0).toUpperCase() + selectedEntity.data.status.slice(1)}
                            </Badge>
                          )}
                          
                          {selectedEntity.type == 'hypothesis' && (
                            <Badge variant="outline" className={
                              selectedEntity.data.status === 'validated' ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" :
                              selectedEntity.data.status === 'rejected' ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" :
                              selectedEntity.data.status === 'testing' ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" :
                              "bg-muted text-muted-foreground"
                            }>
                              {selectedEntity.data.status.charAt(0).toUpperCase() + selectedEntity.data.status.slice(1)}
                            </Badge>
                          )}
                          
                          {selectedEntity.type === 'hypothesis' && selectedEntity.data.confidence > 0 && (
                            <div className="text-xs bg-background border rounded px-2 py-1">
                              Confidence: {selectedEntity.data.confidence}%
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <p className="text-sm text-muted-foreground">{selectedEntity.data.description}</p>
                      
                      <div className="pt-4">
                        <Button 
                          className="w-full" 
                          onClick={handleViewDetails}
                        >
                          View Details
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-4">
                      <GitGraph className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium">No entity selected</h3>
                      <p className="text-sm text-muted-foreground mt-2">
                        Click on a node in the graph to view its details here.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default GraphView;
