/**
 * A2A (Agent-to-Agent) Communication Protocol Specification
 */

export interface AgentCard {
  id: string;
  name: string;
  description: string;
  role: 'client' | 'remote';
  capabilities: AgentCapability[];
  lastActive?: string;
  supportedContentTypes: string[];
  isConnecting: boolean;
  metadata?: {
    businessChallengeId: string;
    businessChallengeTitle: string;
    businessChallengeDescription: string;
  }
}

export interface AgentCapability {
  name: string;
  description: string;
  type: 'action' | 'knowledge' | 'communication';
  parameters?: {
    name: string;
    type: string;
    description: string;
    required: boolean;
  }[];
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  clientAgentId: string;
  remoteAgentId: string;
  artifacts: Artifact[];
  messages: Message[];
}

export interface Artifact {
  id: string;
  taskId: string;
  type: string;
  content: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface Message {
  id: string;
  taskId: string;
  senderId: string;
  receiverId: string;
  type: 'context' | 'reply' | 'artifact' | 'instruction';
  content: string;
  parts?: MessagePart[];
  createdAt: string;
}

export interface MessagePart {
  type: string;
  content: string;
  metadata?: {
    format?: string;
    encoding?: string;
    schema?: string;
    uiCapabilities?: string[];
  };
}

export interface AgentConnection {
  id: string;
  clientAgentId: string;
  remoteAgentId: string;
  status: 'connected' | 'disconnected';
  establishedAt: string;
  lastPingAt: string;
  metadata?: Record<string, unknown>;
}