
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useTheme } from '@/contexts/ThemeContext';
import { useSidebar } from '@/contexts/SidebarContext';
import { cn } from '@/lib/utils';
import Header from '@/components/layout/Header';
import { Sun, Moon, ArrowLeft, Key, Search, Plus, Github, Database, Figma, MessageSquare, GitBranch } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { Separator } from '@/components/ui/separator';
import MCPServerConfigModal from '@/components/settings/MCPServerConfigModal';

const Settings = () => {
  const { theme, toggleTheme } = useTheme();
  const { collapsed } = useSidebar();
  const navigate = useNavigate();
  const [mcpToken, setMcpToken] = React.useState('');
  const [mcpUrl, setMcpUrl] = React.useState('');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [showManualConfig, setShowManualConfig] = React.useState(false);
  const [configModalOpen, setConfigModalOpen] = React.useState(false);
  const [selectedServer, setSelectedServer] = React.useState<{
    id: string;
    name: string;
    description: string;
  } | null>(null);
  
  // Knowledge base services data
  const mcpServers = [
    {
      id: 'chroma',
      name: 'Chroma',
      description: 'Open-source vector database optimized for AI applications with multi-model embedding support and efficient similarity search',
      icon: <Database className="h-5 w-5" />,
      iconBg: 'bg-emerald-500',
      iconColor: 'text-white',
      configType: 'API Configuration'
    },
    {
      id: 'qdrant',
      name: 'Qdrant',
      description: 'High-performance vector similarity search engine with real-time indexing and efficient data retrieval capabilities',
      icon: <Database className="h-5 w-5" />,
      iconBg: 'bg-blue-500',
      iconColor: 'text-white',
      configType: 'API Configuration'
    },
    {
      id: 'memory',
      name: 'Memory Store',
      description: 'In-memory vector storage system for fast data retrieval and real-time AI applications with low latency requirements',
      icon: <Database className="h-5 w-5" />,
      iconBg: 'bg-purple-500',
      iconColor: 'text-white',
      configType: 'Local Configuration'
    },
    {
      id: 'bedrock',
      name: 'AWS Bedrock KB',
      description: 'Fully managed RAG solution with built-in session context management and source attribution for enterprise knowledge bases',
      icon: <Database className="h-5 w-5" />,
      iconBg: 'bg-orange-500',
      iconColor: 'text-white',
      configType: 'AWS Credentials'
    },
    {
      id: 'notion',
      name: 'Notion',
      description: 'Connect to Notion workspace for accessing pages, databases, and content as a knowledge base for AI applications',
      icon: <Database className="h-5 w-5" />,
      iconBg: 'bg-gray-900',
      iconColor: 'text-white',
      configType: 'API Configuration'
    }
  ];
  
  // Filter servers based on search query
  const filteredServers = mcpServers.filter(server => 
    searchQuery === '' || 
    server.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    server.description.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Handle server selection
  const handleServerSelect = (serverId: string) => {
    const server = mcpServers.find(server => server.id === serverId);
    if (server) {
      setSelectedServer({
        id: server.id,
        name: server.name,
        description: server.description
      });
      setConfigModalOpen(true);
    }
  };

  React.useEffect(() => {
    const storedToken = localStorage.getItem('mcp_token');
    const storedUrl = localStorage.getItem('mcp_url');
    if (storedToken) {
      setMcpToken(storedToken);
    }
    if (storedUrl) {
      setMcpUrl(storedUrl);
    }
  }, []);

  const handleTokenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newToken = e.target.value;
    setMcpToken(newToken);
    localStorage.setItem('mcp_token', newToken);
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = e.target.value;
    setMcpUrl(newUrl);
    localStorage.setItem('mcp_url', newUrl);
  };
  
  return (
    <div className={cn(
      "min-h-screen flex flex-col transition-all duration-300",
      collapsed ? "ml-[80px]" : "ml-[224px]"
    )}>
      <Header />
      <Toaster />
      
      <main className="flex-1 container max-w-5xl mx-auto py-8 px-4">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(-1)}
            className="hover:bg-accent"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Settings</h1>
            <p className="text-muted-foreground">Customize your application preferences</p>
          </div>
        </div>
        
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>Customize how the application looks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {theme === 'dark' ? (
                  <Moon className="h-5 w-5" />
                ) : (
                  <Sun className="h-5 w-5" />
                )}
                <div>
                  <Label htmlFor="theme-toggle">Dark Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    {theme === 'dark' 
                      ? 'Using dark theme' 
                      : 'Using light theme'}
                  </p>
                </div>
              </div>
              <Switch
                id="theme-toggle"
                checked={theme === 'dark'}
                onCheckedChange={toggleTheme}
              />
            </div>
          </CardContent>
        </Card>

        
        
        
      </main>
      
      {/* MCP Server Configuration Modal */}
      {selectedServer && (
        <MCPServerConfigModal
          open={configModalOpen}
          onOpenChange={setConfigModalOpen}
          serverId={selectedServer.id}
          serverName={selectedServer.name}
          serverDescription={selectedServer.description}
        />
      )}
    </div>
  );
};

export default Settings;
