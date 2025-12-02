import React, { useState, useEffect } from 'react';
import { useSidebar } from '@/contexts/SidebarContext';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { useToast } from '@/components/ui/use-toast';
import AgentCard from '@/components/ai/AgentCard';
import { a2aService } from '@/services/a2aService';
import { AgentCard as AgentCardType } from '@/model/A2ASpec';



const AIAgentManagement: React.FC = () => {
  const { collapsed } = useSidebar();
  const [agents, setAgents] = useState<AgentCardType[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleAnalyzeAgent = async (agent: AgentCardType) => {
    // await a2aService.startAgent(agent);
    navigate(`/ai-analysis-workflow?agentId=${agent.id}`);
  };
  const { toast } = useToast();

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const agents = await a2aService.findAgents();
      if (agents) {
        setAgents(agents);
      }
    } catch (err) { 
      setError('Failed to load data. Please try again later.');
      toast({
        title: 'Error',
        description: 'Failed to load data. Please try again later.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [toast]);

  const filteredAgents = agents.filter(agent =>
    agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agent.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      
      <div className={`${collapsed ? 'pl-20' : 'pl-56'} min-h-screen transition-all duration-300`}>
        <Header />
        
        <main className="container py-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-semibold">AI Agent Management</h1>
          </div>
          
          <div className="glass-card p-4 mb-6">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search AI agents..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-6">
            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : error ? (
              <div className="text-center py-12 text-destructive">
                <p>{error}</p>
                <Button onClick={() => window.location.reload()} variant="outline" className="mt-4">
                  Try Again
                </Button>
              </div>
            ) : filteredAgents.map(agent => (
              <AgentCard
                key={agent.id}
                name={agent.name}
                description={agent.description}
                role={agent.role}
                capabilities={agent.capabilities}
                // version={agent.version}
                // lastActive={agent.lastActive}
                supportedContentTypes={agent.supportedContentTypes}
                isConnected={agent.isConnecting}
                isConnecting={false} // We now use isConnected for status, so isConnecting is for the transition state
                onAnalyze={() => handleAnalyzeAgent(agent)}
                onConnect={async () => {
                  try {
                    if (!agent.isConnecting) {
                      await a2aService.establishConnection('local-client', agent.id);
                      toast({
                        title: 'Connected',
                        description: `Successfully connected to ${agent.name}`,
                        variant: 'default'
                      });
                    } else {
                      await a2aService.disconnectAgent(`local-client-${agent.id}`);
                      toast({
                        title: 'Disconnected',
                        description: `Successfully disconnected from ${agent.name}`,
                        variant: 'default'
                      });
                    }
                    // Reload data to get the latest status
                    await loadData();
                  } catch (err) {
                    toast({
                      title: 'Error',
                      description: 'Failed to manage connection. Please try again.',
                      variant: 'destructive'
                    });
                  }
                }}
              />
            ))}
            
            {filteredAgents.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No matching AI agents found.</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AIAgentManagement;