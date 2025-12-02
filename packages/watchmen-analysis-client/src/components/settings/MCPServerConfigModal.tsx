import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';

interface MCPServerConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serverId: string;
  serverName: string;
  serverDescription: string;
}

const MCPServerConfigModal: React.FC<MCPServerConfigModalProps> = ({
  open,
  onOpenChange,
  serverId,
  serverName,
  serverDescription
}) => {
  const [config, setConfig] = useState('');
  const [jsonPreview, setJsonPreview] = useState({});
  
  useEffect(() => {
    // Load saved configuration
    const storedConfig = localStorage.getItem(`mcp_config_${serverId}`);
    if (storedConfig) {
      setConfig(storedConfig);
      try {
        setJsonPreview(JSON.parse(storedConfig));
      } catch (e) {
        console.error('Invalid JSON config:', e);
      }
    } else {
      // Set default configuration
      const defaultConfig = {
        mcpServers: {
          [serverName]: {
            command: "npx",
            args: [
              "-y",
              `@modelcontextprotocol/server-${serverId}`
            ],
            env: {}
          }
        }
      };
      setConfig(JSON.stringify(defaultConfig, null, 2));
      setJsonPreview(defaultConfig);
    }
  }, [serverId, serverName]);
  
  const handleConfigChange = (value: string) => {
    setConfig(value);
    try {
      const parsed = JSON.parse(value);
      setJsonPreview(parsed);
    } catch (e) {
      console.error('Invalid JSON:', e);
    }
  };
  
  const handleSave = () => {
    try {
      // Validate JSON format
      JSON.parse(config);
      
      // Save configuration
      localStorage.setItem(`mcp_config_${serverId}`, config);
      
      toast({
        title: `${serverName} Configured`,
        description: `${serverName} configuration has been saved successfully.`,
      });
      
      onOpenChange(false);
    } catch (e) {
      toast({
        title: "Configuration Error",
        description: "Please enter valid JSON configuration",
        variant: "destructive"
      });
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="glass-panel sm:max-w-[800px] slide-enter">
          <DialogHeader>
            <DialogTitle>Configure {serverName} MCP Server</DialogTitle>
            <DialogDescription>
              Edit {serverName} server configuration
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4">
            <Label>JSON Configuration</Label>
            <textarea
              value={config}
              onChange={(e) => handleConfigChange(e.target.value)}
              className="w-full h-[300px] mt-2 p-4 font-mono text-sm bg-muted/50 rounded-md"
              placeholder="Enter JSON configuration..."
            />
          </div>
          
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSave}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

export default MCPServerConfigModal;