import { BusinessChallengeWithHypotheses } from "@/model/business";
import { AIAgentHypothesis, AIAgentMetric } from "../AIAnalysisAgent";

/**
 * Sanitizes a string for use in Mermaid diagrams by escaping special characters
 * and wrapping the text in quotes if it contains special characters
 */
const sanitizeMermaidText = (text: string): string => {
  if (!text) return '';
  
  // Check if the text contains special characters that need to be wrapped in quotes
  const containsSpecialChars = /[\s\/\-:;,\.\(\)\[\]\{\}\<\>\=\+\*\&\^\%\$\#\@\!\?\|\\]/.test(text);
  
  // Escape any quotes in the text
  const escapedText = text.replace(/"/g, '\\"');
  
  // Return the text wrapped in quotes if it contains special characters
  return containsSpecialChars ? `"${escapedText}"` : escapedText;
};

export const generateMermaidDiagram = (
  businessChallenge: BusinessChallengeWithHypotheses,
  validationResult?: any
) => {
  try {
    if (!businessChallenge) {
      console.warn('Business challenge is undefined or null');
      return 'graph TD;\n  A[Error: Invalid business challenge data]';
    }
    
    let diagram = 'graph TD;\n';
    
    // Add business challenge node
    const challengeTitle = sanitizeMermaidText(businessChallenge.title || 'Business Challenge');
    const challengeId = businessChallenge.id ? sanitizeMermaidText(businessChallenge.id) : '';
    
    // Use node ID for reference and label for display
    const challengeNodeId = `bc_${challengeId || 'main'}`;
    diagram += `    ${challengeNodeId}[${challengeTitle}]:::challengeNode;
`;
    
    // Add hypothesis nodes
    if (businessChallenge.hypotheses && Array.isArray(businessChallenge.hypotheses)) {
      businessChallenge.hypotheses.forEach((hypothesis, hIndex) => {
        if (!hypothesis) return; // Skip if hypothesis is null or undefined
        
        const hypothesisTitle = sanitizeMermaidText(hypothesis.title || 'Hypothesis');
        const hypothesisId = hypothesis.id ? sanitizeMermaidText(hypothesis.id) : `h${hIndex}`;
        
        // Use node ID for reference and label for display
        const hypothesisNodeId = `hyp_${hypothesis.id}`;
        diagram += `    ${hypothesisNodeId}[${hypothesisTitle}]:::hypothesisNode;
`;
        
        // Add relation between hypothesis and business challenge
        diagram += `    ${challengeNodeId} --> ${hypothesisNodeId};
`;
        
        // Add metric nodes and relations
        if (hypothesis.metrics_details && Array.isArray(hypothesis.metrics_details)) {
          hypothesis.metrics_details.forEach((metric, mIndex) => {
            if (!metric || !metric.metric) return; // Skip if metric is null or undefined
            
            const metricName = sanitizeMermaidText(metric.metric.name || 'Metric');
            const metricId = metric.metric.id ? sanitizeMermaidText(metric.metric.id) : `m${hIndex}_${mIndex}`;
            
            // Use node ID for reference and label for display
            const metricNodeId = `met_${metric.metric.name}`;
            diagram += `    ${metricNodeId}[${metricName}];\n`;
            
            // Add relation between metric and hypothesis
            diagram += `    ${hypothesisNodeId} --> ${metricNodeId};\n`;
          });
        }
      });
    }
    
    console.log('Generated Mermaid diagram:', diagram);
    
    // Add class definitions for different node types with distinct colors
    diagram += '    classDef challengeNode fill:#d0e0ff,stroke:#3080ff,stroke-width:2px;\n';
    diagram += '    classDef hypothesisNode fill:#ffff00,stroke:#e0c000,stroke-width:2px;';

    
    return diagram;
  } catch (error) {
    console.error('Error generating Mermaid diagram:', error);
    return 'graph TD;\n  A[Error: Failed to generate diagram]';
  }
};