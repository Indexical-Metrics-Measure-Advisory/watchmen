
import { Divide, FileText, Shield, Package, AlertCircle, TrendingUp, Wallet, Book, Globe, Database, Users, Layers, Activity } from "lucide-react";
import { INITIAL_CATALOGS } from "./DomainData";
import { Catalog, Topic, Space } from "./BusinessDomain";

// Interfaces
export interface DataZone {
  id: string;
  name: string;
  department: string;
  description: string;
  icon: string;
  nodeCount: number;
  totalVolume: string;
  status: 'healthy' | 'warning' | 'error';
  color: string;
}

export interface DataNode {
  id: string;
  name: string;
  type: 'source' | 'pipeline' | 'intermediate' | 'output';
  category?: 'database' | 'api' | 'etl' | 'transform' | 'staging' | 'metric' | 'dataset' | 'report';
  status?: 'healthy' | 'warning' | 'error';
  volume?: string;
  lastUpdate?: string;
  description?: string;
  dataZoneId: string; // Associated DataZone
}

export interface DataFlow {
  from: string;
  to: string;
  volume?: string;
  latency?: string;
}

export interface DataZoneFlow {
  from: string; // DataZone ID
  to: string;   // DataZone ID
  volume: string;
  flowCount: number;
}

// Helper to map Domain Tags to Icons and Colors
const getDomainStyle = (tags: string[]) => {
  if (tags.includes('PA')) return { icon: 'shield', color: 'blue' };
  if (tags.includes('CLM')) return { icon: 'alert-circle', color: 'orange' };
  if (tags.includes('PTY')) return { icon: 'users', color: 'green' };
  if (tags.includes('BCP')) return { icon: 'wallet', color: 'purple' };
  if (tags.includes('PRD')) return { icon: 'package', color: 'indigo' };
  if (tags.includes('SC')) return { icon: 'trending', color: 'cyan' };
  if (tags.includes('UW')) return { icon: 'shield', color: 'blue' };
  if (tags.includes('ILP')) return { icon: 'trending', color: 'indigo' };
  if (tags.includes('PAC')) return { icon: 'wallet', color: 'purple' };
  if (tags.includes('PROP')) return { icon: 'file-text', color: 'blue' };
  if (tags.includes('ACC')) return { icon: 'book', color: 'purple' };
  if (tags.includes('INT')) return { icon: 'globe', color: 'red' };
  if (tags.includes('CD')) return { icon: 'database', color: 'gray' };
  return { icon: 'layers', color: 'gray' };
};

// Generate DATA_ZONES from INITIAL_CATALOGS
export const DATA_ZONES: DataZone[] = INITIAL_CATALOGS.map(cat => {
  const style = getDomainStyle(cat.tags);
  return {
    id: cat.id,
    name: cat.name.split('(')[0].trim(), // Remove (PA) suffix for cleaner display if needed, or keep it. Let's keep it simple or trim. User asked for "same", let's keep name but maybe shorter? No, keep full name or main part.
    department: cat.owner,
    description: cat.description,
    icon: style.icon,
    nodeCount: cat.topics.length + cat.relatedSpaces.length * 2, // *2 because we'll add pipeline nodes
    totalVolume: Math.floor(Math.random() * 5 + 1) + 'TB', // Mock volume
    status: 'healthy',
    color: style.color
  };
});

// Generate DATA_NODES and DATA_FLOWS
export const DATA_NODES: DataNode[] = [];
export const DATA_FLOWS: DataFlow[] = [];

// Map to track Topic Name -> Node ID for connecting flows
const topicNameToNodeId = new Map<string, string>();

INITIAL_CATALOGS.forEach(cat => {
  // 1. Create Source Nodes from Topics
  cat.topics.forEach(topic => {
    const nodeId = topic.id; // Use topic ID as Node ID
    topicNameToNodeId.set(topic.name, nodeId);

    DATA_NODES.push({
      id: nodeId,
      name: topic.name,
      type: 'source',
      category: 'database',
      status: 'healthy',
      volume: Math.floor(Math.random() * 900 + 100) + 'GB',
      lastUpdate: '10 min ago',
      description: topic.description,
      dataZoneId: cat.id
    });
  });
});

INITIAL_CATALOGS.forEach(cat => {
  // 2. Create Output Nodes from Spaces AND Pipeline Nodes
  cat.relatedSpaces.forEach(space => {
    const pipelineId = `pipeline-${space.id}`;
    const outputId = space.id;

    // Create Pipeline Node
    DATA_NODES.push({
      id: pipelineId,
      name: `Build ${space.name}`,
      type: 'pipeline',
      category: 'etl',
      status: 'healthy',
      lastUpdate: 'Running',
      description: `ETL for ${space.name}`,
      dataZoneId: cat.id
    });

    // Create Output Node
    DATA_NODES.push({
      id: outputId,
      name: space.name,
      type: 'output',
      category: 'dataset',
      status: 'healthy',
      volume: Math.floor(Math.random() * 500 + 50) + 'GB',
      lastUpdate: '1 hour ago',
      description: space.description,
      dataZoneId: cat.id
    });

    // Flow: Pipeline -> Output
    DATA_FLOWS.push({
      from: pipelineId,
      to: outputId,
      volume: 'Stream',
      latency: '1h'
    });

    // Flow: Topics -> Pipeline
    // Space has 'topics' array with names. We need to find their Node IDs.
    space.topics.forEach(topicName => {
      const sourceNodeId = topicNameToNodeId.get(topicName);
      if (sourceNodeId) {
        DATA_FLOWS.push({
          from: sourceNodeId,
          to: pipelineId,
          volume: 'Stream',
          latency: '5min'
        });
      }
    });
  });
});

// Generate DATAZONE_FLOWS based on the Node Flows
// If a flow goes from Node A (Zone X) to Node B (Zone Y) and X != Y, it's a Zone Flow.
const zoneFlowMap = new Map<string, { from: string, to: string, count: number }>();

DATA_FLOWS.forEach(flow => {
  const fromNode = DATA_NODES.find(n => n.id === flow.from);
  const toNode = DATA_NODES.find(n => n.id === flow.to);

  if (fromNode && toNode && fromNode.dataZoneId !== toNode.dataZoneId) {
    const key = `${fromNode.dataZoneId}->${toNode.dataZoneId}`;
    if (!zoneFlowMap.has(key)) {
      zoneFlowMap.set(key, { from: fromNode.dataZoneId, to: toNode.dataZoneId, count: 0 });
    }
    const entry = zoneFlowMap.get(key)!;
    entry.count++;
  }
});

export const DATAZONE_FLOWS: DataZoneFlow[] = Array.from(zoneFlowMap.values()).map(item => ({
  from: item.from,
  to: item.to,
  volume: Math.floor(Math.random() * 500 + 100) + 'GB',
  flowCount: item.count
}));
