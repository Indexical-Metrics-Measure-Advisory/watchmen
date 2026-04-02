import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { OntologyDomain } from '@/model/ontology';

interface OntologyDomainGraphProps {
  domains: OntologyDomain[];
  onSelectDomain: (domain: OntologyDomain) => void;
}

interface GraphNode {
  id: string;
  x: number;
  y: number;
  domain: OntologyDomain;
  color: string;
}

interface GraphLink {
  source: GraphNode;
  target: GraphNode;
  concepts: { from: string; to: string }[];
  isDirect: boolean;
  relationshipDetails?: { type: string; description?: string }[];
}

export const OntologyDomainGraph: React.FC<OntologyDomainGraphProps> = ({ domains, onSelectDomain }) => {
  const nodes = useMemo<GraphNode[]>(() => {
    const width = 1000;
    const height = 760;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) - 90;

    return domains.map((domain, index) => {
      const angle = (2 * Math.PI * index) / Math.max(domains.length, 1);
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      return {
        id: domain.id,
        x,
        y,
        domain,
        color: {
          public: '#22c55e',
          internal: '#3b82f6',
          confidential: '#f97316',
          restricted: '#ef4444'
        }[domain.sensitivity]
      };
    });
  }, [domains]);

  const links = useMemo<GraphLink[]>(() => {
    const linkMap = new Map<string, GraphLink>();
    const conceptToDomainMap = new Map<string, string>();

    domains.forEach(domain => domain.concepts.forEach(concept => conceptToDomainMap.set(concept.name, domain.id)));

    domains.forEach(sourceDomain => {
      const sourceNode = nodes.find(node => node.id === sourceDomain.id);
      if (!sourceNode) return;

      sourceDomain.concepts.forEach(concept => {
        concept.relationships.forEach(relatedConcept => {
          const targetDomainId = conceptToDomainMap.get(relatedConcept);
          if (!targetDomainId || targetDomainId === sourceDomain.id) return;
          const targetNode = nodes.find(node => node.id === targetDomainId);
          if (!targetNode) return;

          const linkId = [sourceDomain.id, targetDomainId].sort().join('-');
          if (!linkMap.has(linkId)) {
            linkMap.set(linkId, { source: sourceNode, target: targetNode, concepts: [], isDirect: false });
          }
          linkMap.get(linkId)?.concepts.push({ from: concept.name, to: relatedConcept });
        });
      });

      sourceDomain.relatedDomains?.forEach(rel => {
        const targetNode = nodes.find(node => node.id === rel.domainId);
        if (!targetNode) return;

        const linkId = [sourceDomain.id, rel.domainId].sort().join('-');
        if (!linkMap.has(linkId)) {
          linkMap.set(linkId, {
            source: sourceNode,
            target: targetNode,
            concepts: [],
            isDirect: true,
            relationshipDetails: []
          });
        }

        const link = linkMap.get(linkId);
        if (!link) return;
        link.isDirect = true;
        link.relationshipDetails = link.relationshipDetails ?? [];
        link.relationshipDetails.push({ type: rel.relationshipType, description: rel.description });
      });
    });

    return Array.from(linkMap.values());
  }, [domains, nodes]);

  return (
    <div className="w-full h-[760px] bg-slate-50 rounded-xl border border-slate-200 relative overflow-hidden">
      <svg className="w-full h-full pointer-events-none" viewBox="0 0 1000 760" preserveAspectRatio="xMidYMid meet">
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="28" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
          </marker>
        </defs>
        {links.map((link, index) => (
          <g key={index}>
            <line
              x1={link.source.x}
              y1={link.source.y}
              x2={link.target.x}
              y2={link.target.y}
              stroke={link.isDirect ? '#94a3b8' : '#cbd5e1'}
              strokeWidth={Math.max(1, Math.min(link.concepts.length + (link.isDirect ? 1 : 0), 5))}
              strokeDasharray={link.concepts.length === 0 ? '5,5' : 'none'}
              markerEnd="url(#arrowhead)"
            />
            <line
              x1={link.source.x}
              y1={link.source.y}
              x2={link.target.x}
              y2={link.target.y}
              stroke="transparent"
              strokeWidth={24}
              className="pointer-events-auto cursor-pointer"
            >
              <title>
                {link.concepts.length > 0
                  ? link.concepts.map(concept => `${concept.from} → ${concept.to}`).join('\n')
                  : link.relationshipDetails?.map(detail => `${detail.type}${detail.description ? `: ${detail.description}` : ''}`).join('\n') ||
                    'Direct domain relationship'}
              </title>
            </line>
          </g>
        ))}
      </svg>

      {nodes.map(node => (
        <motion.div
          key={node.id}
          className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
          style={{ left: `${(node.x / 1000) * 100}%`, top: `${(node.y / 760) * 100}%` }}
          onClick={() => onSelectDomain(node.domain)}
          whileHover={{ scale: 1.08 }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.25 }}
        >
          <div
            className="w-36 p-3 bg-white rounded-lg shadow-md border-2 transition-colors hover:border-blue-500 flex flex-col items-center gap-2"
            style={{ borderColor: node.color }}
          >
            <div className="font-semibold text-xs text-center text-slate-800 line-clamp-2">{node.domain.name}</div>
            <div className="flex gap-1">
              <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 rounded text-slate-600">{node.domain.concepts.length} concepts</span>
              <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 rounded text-slate-600">{node.domain.semanticViews.length} views</span>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};
