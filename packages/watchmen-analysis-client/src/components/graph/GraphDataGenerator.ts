
import { BusinessService } from '@/services/businessService';
import { HypothesisType } from '@/model/Hypothesis';

// Layout constants
const LEVEL_HEIGHT = 200; // Vertical spacing between levels
const NODE_SPACING = 500; // Horizontal spacing between nodes
const CANVAS_PADDING = 100; // Padding from canvas edges
const MIN_NODE_WIDTH = 300; // Minimum width for a node

export const generateGraphData = async (hypotheses: HypothesisType[]) => {
  const businessService = new BusinessService();
  const challenges = await businessService.getChallenges();
  const nodes = [];
  const edges = [];


  // console.log('challenges', challenges);
  
  // First pass: Calculate widths and positions
  const challengeWidths = new Map();
  
  challenges.forEach(challenge => {
    const hypothesesForChallenge = hypotheses.filter(h => h.businessChallengeId == challenge.id);
    const challengeWidth = Math.max(MIN_NODE_WIDTH, hypothesesForChallenge.length * NODE_SPACING * 1.2);
    challengeWidths.set(challenge.id, challengeWidth);
  });
  
  // Track positions
  let challengeX = CANVAS_PADDING;
  
  // Create challenge nodes and their connected hypotheses
  challenges.forEach(challenge => {
    const challengeWidth = challengeWidths.get(challenge.id);
    const challengeCenterX = challengeX + (challengeWidth / 2);
    
    // Add challenge node centered above its hypotheses
    nodes.push({
      id: `challenge_${challenge.id}`,
      type: 'challenge',
      data: { 
        label: challenge.title, 
        description: challenge.description,
        id: challenge.id
      },
      position: { x: challengeCenterX, y: 0 },
    });
    
    // Calculate initial hypothesis X position for this challenge
    const hypothesesForChallenge = hypotheses.filter(h => h.businessChallengeId == challenge.id);
    const totalHypothesisWidth = hypothesesForChallenge.length * NODE_SPACING;
    let hypothesisX = challengeCenterX - (totalHypothesisWidth / 2);
    
    // Create hypothesis nodes for this challenge
    hypothesesForChallenge.forEach(hypothesis => {
      // Add hypothesis node
      nodes.push({
        id: `hypothesis_${hypothesis.id}`,
        type: 'hypothesis',
        data: { 
          label: hypothesis.title, 
          description: hypothesis.description,
          status: hypothesis.status,
          confidence: hypothesis.confidence,
          id: hypothesis.id
        },
        position: { x: hypothesisX, y: LEVEL_HEIGHT },
      });
      
      // Connect challenge to hypothesis
      edges.push({
        id: `edge_challenge_${challenge.id}_hypothesis_${hypothesis.id}`,
        source: `challenge_${challenge.id}`,
        target: `hypothesis_${hypothesis.id}`,
        type: 'smoothstep',
        animated: false,
      });
      
      // Increment hypothesis X position
      hypothesisX += NODE_SPACING;
    });
    
    // Increment challenge X position based on its hypotheses
    challengeX += challengeWidth + NODE_SPACING;
  });
  
  // Add connections between related hypotheses
  hypotheses.forEach(hypothesis => {
    if (hypothesis.relatedHypothesesIds) {
      hypothesis.relatedHypothesesIds.forEach(relatedId => {
        // Check if both hypotheses exist in nodes
        const sourceExists = nodes.some(node => node.id === `hypothesis-${hypothesis.id}`);
        const targetExists = nodes.some(node => node.id === `hypothesis-${relatedId}`);
        
        if (sourceExists && targetExists) {
          edges.push({
            id: `edge_hypothesis_${hypothesis.id}_hypothesis_${relatedId}`,
            source: `hypothesis_${hypothesis.id}`,
            target: `hypothesis_${relatedId}`,
            type: 'smoothstep',
            animated: true,
            style: { stroke: '#9c69e2', strokeDasharray: '5,5' },
          });
        }
      });
    }
  });
  
  return { nodes, edges };
};
