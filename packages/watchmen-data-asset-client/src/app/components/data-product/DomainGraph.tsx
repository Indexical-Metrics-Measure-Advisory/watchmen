import { useMemo } from 'react';
import { Catalog, Topic } from './model/BusinessDomain';
import { motion } from 'framer-motion';

interface DomainGraphProps {
  catalogs: Catalog[];
  onSelectCatalog: (catalog: Catalog) => void;
}

interface Node {
  id: string;
  x: number;
  y: number;
  catalog: Catalog;
  color: string;
}

interface Link {
  source: Node;
  target: Node;
  topics: { from: string; to: string }[];
  isDirect: boolean;
  relationshipDetails?: { type: string; description?: string }[];
}

export function DomainGraph({ catalogs, onSelectCatalog }: DomainGraphProps) {
  // 1. Calculate Layout (Hierarchical Top-Down)
  const nodes: Node[] = useMemo(() => {
    const width = 800;
    const height = 800; // Increased height for vertical layout
    const padding = 100;
    const availableHeight = height - padding * 2;
    
    // Define layout rows
    const layoutConfig: Record<string, { row: number; col: number; totalInRow: number }> = {
      // Row 0: Sources / Front Office
      'cat-003': { row: 0, col: 0, totalInRow: 3 }, // Customer
      'cat-006': { row: 0, col: 1, totalInRow: 3 }, // Sales
      'cat-010': { row: 0, col: 2, totalInRow: 3 }, // Proposal

      // Row 1: Inputs to Policy
      'cat-005': { row: 1, col: 0, totalInRow: 2 }, // Product
      'cat-007': { row: 1, col: 1, totalInRow: 2 }, // Underwriting

      // Row 2: Core (Policy)
      'cat-001': { row: 2, col: 0, totalInRow: 1 }, // Policy

      // Row 3: Downstream / Operations
      'cat-002': { row: 3, col: 0, totalInRow: 3 }, // Claims
      'cat-009': { row: 3, col: 1, totalInRow: 3 }, // Policy Acct
      'cat-008': { row: 3, col: 2, totalInRow: 3 }, // ILP

      // Row 4: Finance / Support
      'cat-004': { row: 4, col: 0, totalInRow: 4 }, // Finance
      'cat-012': { row: 4, col: 1, totalInRow: 4 }, // Accounting
      'cat-013': { row: 4, col: 2, totalInRow: 4 }, // Integration
      'cat-011': { row: 4, col: 3, totalInRow: 4 }, // Basic Code
    };

    const rowCount = 5;
    const rowHeight = availableHeight / (rowCount - 1);

    return catalogs.map((catalog) => {
      const config = layoutConfig[catalog.id];
      
      let x, y;
      
      if (config) {
        // Calculate position based on grid
        y = padding + config.row * rowHeight;
        
        // Distribute horizontally
        // width partition = width / totalInRow
        // center in partition = (col + 0.5) * partition
        const partitionWidth = width / config.totalInRow;
        x = partitionWidth * (config.col + 0.5);
      } else {
        // Fallback for unknown domains - place them at the bottom
        y = height - 50;
        x = width / 2;
      }

      return {
        id: catalog.id,
        x,
        y,
        catalog,
        color: getColorForSensitivity(catalog.sensitivity),
      };
    });
  }, [catalogs]);

  // 2. Calculate Links based on Topic Relationships AND Direct Domain Relationships
  const links: Link[] = useMemo(() => {
    const linkMap = new Map<string, Link>();
    const topicToCatalogMap = new Map<string, string>(); // TopicName -> CatalogID

    // Build lookup map
    catalogs.forEach(c => {
      c.topics.forEach(t => {
        topicToCatalogMap.set(t.name, c.id);
      });
    });

    // Find connections
    catalogs.forEach(sourceCat => {
      const sourceNode = nodes.find(n => n.id === sourceCat.id);
      if (!sourceNode) return;

      // 1. Topic-based relationships
      sourceCat.topics.forEach(topic => {
        topic.relationships.forEach(relName => {
          const targetCatId = topicToCatalogMap.get(relName);
          if (targetCatId && targetCatId !== sourceCat.id) {
            const targetNode = nodes.find(n => n.id === targetCatId);
            if (targetNode) {
              const linkId = [sourceCat.id, targetCatId].sort().join('-');
              if (!linkMap.has(linkId)) {
                linkMap.set(linkId, {
                  source: sourceNode,
                  target: targetNode,
                  topics: [],
                  isDirect: false
                });
              }
              linkMap.get(linkId)?.topics.push({ from: topic.name, to: relName });
            }
          }
        });
      });

      // 2. Direct Domain Relationships
      if (sourceCat.relatedDomains) {
        sourceCat.relatedDomains.forEach(rel => {
          const targetCatId = rel.domainId;
          const type = rel.relationshipType;
          const desc = rel.description;

          const targetNode = nodes.find(n => n.id === targetCatId);
          if (targetNode) {
            const linkId = [sourceCat.id, targetCatId].sort().join('-');
            if (!linkMap.has(linkId)) {
              linkMap.set(linkId, {
                source: sourceNode,
                target: targetNode,
                topics: [],
                isDirect: true,
                relationshipDetails: []
              });
            }
            
            const link = linkMap.get(linkId);
            if (link) {
              link.isDirect = true;
              if (!link.relationshipDetails) link.relationshipDetails = [];
              link.relationshipDetails.push({ type, description: desc });
            }
          }
        });
      }
    });

    return Array.from(linkMap.values());
  }, [catalogs, nodes]);

  function getColorForSensitivity(sensitivity: string) {
    switch (sensitivity) {
      case 'public': return '#22c55e'; // green-500
      case 'internal': return '#3b82f6'; // blue-500
      case 'confidential': return '#f97316'; // orange-500
      case 'restricted': return '#ef4444'; // red-500
      default: return '#6b7280'; // gray-500
    }
  }

  return (
    <div className="w-full h-[800px] bg-slate-50 rounded-xl border border-slate-200 relative overflow-hidden">
      {/* Layer Backgrounds/Labels could be added here */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Optional: Add layer labels if needed */}
      </div>
      <svg className="w-full h-full pointer-events-none">
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="28"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
          </marker>
        </defs>
        {links.map((link, i) => (
          <g key={i}>
            <line
              x1={link.source.x}
              y1={link.source.y}
              x2={link.target.x}
              y2={link.target.y}
              stroke={link.isDirect ? "#94a3b8" : "#cbd5e1"}
              strokeWidth={Math.max(1, Math.min(link.topics.length + (link.isDirect ? 1 : 0), 5))}
              strokeDasharray={link.topics.length === 0 ? "5,5" : "none"}
              markerEnd="url(#arrowhead)"
            />
             {/* Interaction Hit Area */}
             <line
              x1={link.source.x}
              y1={link.source.y}
              x2={link.target.x}
              y2={link.target.y}
              stroke="transparent"
              strokeWidth={20}
              className="pointer-events-auto cursor-pointer hover:stroke-blue-100/50 transition-colors"
            >
              <title>
                {link.topics.length > 0 
                  ? link.topics.map(t => `${t.from} → ${t.to}`).join('\n') 
                  : link.relationshipDetails?.map(d => `${d.type}${d.description ? `: ${d.description}` : ''}`).join('\n') || 'Direct Domain Relationship'}
              </title>
            </line>
          </g>
        ))}
      </svg>
      
      {nodes.map((node) => (
        <motion.div
          key={node.id}
          className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
          style={{ left: node.x, top: node.y }}
          onClick={() => onSelectCatalog(node.catalog)}
          whileHover={{ scale: 1.1 }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div 
            className="w-32 p-3 bg-white rounded-lg shadow-md border-2 transition-colors hover:border-blue-500 flex flex-col items-center gap-2"
            style={{ borderColor: node.color }}
          >
            <div className="font-semibold text-xs text-center text-gray-800 line-clamp-2">
              {node.catalog.name}
            </div>
            <div className="flex gap-1">
              <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 rounded text-slate-600">
                {node.catalog.topics.length} topics
              </span>
            </div>
          </div>
        </motion.div>
      ))}

      <div className="absolute bottom-4 right-4 bg-white/90 p-3 rounded-lg shadow border text-xs space-y-2">
        <div className="font-medium mb-1">Legend</div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span>Public</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
          <span>Internal</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-orange-500"></div>
          <span>Confidential</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span>Restricted</span>
        </div>
      </div>
    </div>
  );
}
