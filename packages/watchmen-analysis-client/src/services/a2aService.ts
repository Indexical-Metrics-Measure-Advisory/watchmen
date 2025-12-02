import { AgentCard, Task, Message, Artifact, AgentConnection } from '@/model/A2ASpec';
import { API_BASE_URL, checkResponse, getDefaultHeaders } from '@/utils/apiConfig';
import { aiAgentService } from './aiAgentService';

// Demo agent data
const demoAgent: AgentCard = {
  id: '1',
  name: 'Business Challenge Monitor',
  description: 'Monitors and analyzes business challenges to provide insights and recommendations',
  role: 'client',
  isConnecting: false,
  capabilities: [
    {
      name: 'Challenge Analysis',
      description: 'Analyzes business challenges',
      type: 'action'
    },
    {
      name: 'Metric Monitoring',
      description: 'Monitors business metrics',
      type: 'knowledge'
    }
  ],
  supportedContentTypes: ['text/plain', 'application/json'],
};

class A2AService {
  private agents: Map<string, AgentCard> = new Map([[demoAgent.id, demoAgent]]);
  private tasks: Map<string, Task> = new Map();
  private connections: Map<string, AgentConnection> = new Map();


  async startAgent(agent: AgentCard): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/watchmen/ai/challenge/agent/start/${agent.metadata?.businessChallengeId}`, {
        method: 'GET',
        headers: getDefaultHeaders()
      });
      return await checkResponse(response);
    } catch (error) {
      console.error('Error updating challenge:', error);
      throw error;
    }
    
  }

  // Agent Management
  async registerAgent(agent: AgentCard): Promise<AgentCard> {

    // check if agent already exists and ignore if it does
    if (this.agents.has(agent.id)) {
      agent = await aiAgentService.create_or_update_agent(agent);
    }else{
      this.agents.set(agent.id, {
        ...agent
      });
      agent = await aiAgentService.create_or_update_agent(agent);
    }
    

    return agent;
  }

  async findAgents(): Promise<AgentCard[]> {
   

    const response = await fetch(API_BASE_URL+"/watchmen/ai/agent/list", {
      method: 'GET',
      headers: getDefaultHeaders()
    })
    const agents: AgentCard[] = await checkResponse(response);
    return agents
  }

  async getAgent(agentId: string): Promise<AgentCard | undefined> {
    const response = await fetch(`${API_BASE_URL}/watchmen/ai/agent/${agentId}`, {
      method: 'GET',
      headers: getDefaultHeaders()
    })
    const agent: AgentCard = await checkResponse(response);
    return agent


  }

  async updateAgentStatus(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (agent) {
      this.agents.set(agentId, agent);
    }
  }

  // Connection Management
  async establishConnection(clientId: string, agentId: string): Promise<AgentConnection> {
    try {
      // 调用后台服务建立连接
      const response = await fetch(`${API_BASE_URL}/watchmen/ai/agent/connect/${agentId}`, {
        method: 'GET',
        headers: getDefaultHeaders()
      });

      const agent_card: AgentCard = await checkResponse(response);

      const connection: AgentConnection = {
        id: Date.now().toString(),
        clientAgentId: clientId,
        remoteAgentId: agentId,
        status: 'connected',
        establishedAt: new Date().toISOString(),
        lastPingAt: new Date().toISOString(),
      }
      
      // 将连接信息缓存到本地
      this.connections.set(connection.id, connection);
      return connection;
    } catch (error) {
      console.error('Error establishing connection:', error);
      throw error;
    }
  }

  async disconnectAgent(connectionId: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.status = 'disconnected';
      this.connections.set(connectionId, connection);
    }
  }

  // Task Management
  async createTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'artifacts' | 'messages'>): Promise<Task> {
    const newTask: Task = {
      ...task,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      artifacts: [],
      messages: [],
      status: 'pending'
    };
    this.tasks.set(newTask.id, newTask);
    return newTask;
  }

  async updateTaskStatus(taskId: string, status: Task['status']): Promise<Task | undefined> {
    const task = this.tasks.get(taskId);
    if (task) {
      const updatedTask = {
        ...task,
        status,
        updatedAt: new Date().toISOString(),
        ...(status === 'completed' && { completedAt: new Date().toISOString() })
      };
      this.tasks.set(taskId, updatedTask);
      return updatedTask;
    }
    return undefined;
  }

  async getTask(taskId: string): Promise<Task | undefined> {
    return this.tasks.get(taskId);
  }

  // Message Handling
  async sendMessage(message: Omit<Message, 'id' | 'createdAt'>): Promise<Message> {
    const task = this.tasks.get(message.taskId);
    if (!task) throw new Error('Task not found');

    const newMessage: Message = {
      ...message,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    };

    task.messages.push(newMessage);
    task.updatedAt = new Date().toISOString();
    this.tasks.set(task.id, task);

    return newMessage;
  }

  // Artifact Management
  async addArtifact(taskId: string, artifact: Omit<Artifact, 'id' | 'createdAt'>): Promise<Artifact> {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error('Task not found');

    const newArtifact: Artifact = {
      ...artifact,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    };

    task.artifacts.push(newArtifact);
    task.updatedAt = new Date().toISOString();
    this.tasks.set(task.id, task);

    return newArtifact;
  }

  // Utility Methods
  async getAgentTasks(agentId: string): Promise<Task[]> {
    return Array.from(this.tasks.values())
      .filter(task => 
        task.clientAgentId === agentId || task.remoteAgentId === agentId
      );
  }

  async getActiveConnections(agentId: string): Promise<AgentConnection[]> {
    return Array.from(this.connections.values())
      .filter(conn => 
        (conn.clientAgentId === agentId || conn.remoteAgentId === agentId) &&
        conn.status === 'connected'
      );
  }
}

export const a2aService = new A2AService();