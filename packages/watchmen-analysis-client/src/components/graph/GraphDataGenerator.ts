
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
  const problems = await businessService.getProblems();
  const nodes = [];
  const edges = [];


  // console.log('challenges', challenges);
  
  // First pass: Calculate widths and positions
  const challengeWidths = new Map();
  const problemWidths = new Map();
  
  challenges.forEach(challenge => {
    let totalWidth = 0;
    const problemsForChallenges = problems.filter(p => challenge.id == p.businessChallengeId);

    for (let index = 0; index < problemsForChallenges.length; index++) {
      const problem = problemsForChallenges[index];
      if (problem) {
        const hypothesisCount = problem.hypothesisIds.length;
        const problemWidth = Math.max(MIN_NODE_WIDTH, hypothesisCount * NODE_SPACING * 1.2);
        problemWidths.set(problem.id, problemWidth);
        totalWidth += problemWidth;
      }
    }
      
    
    challengeWidths.set(challenge.id, Math.max(MIN_NODE_WIDTH, totalWidth));
  });
  
  // Track positions
  let challengeX = CANVAS_PADDING;
  
  // Create challenge nodes and their connected problems and hypotheses
  challenges.forEach(challenge => {
    const challengeWidth = challengeWidths.get(challenge.id);
    const challengeCenterX = challengeX + (challengeWidth / 2);
    
    // Add challenge node centered above its problems
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
    
    // Calculate initial problem X position for this challenge
    let problemX = challengeX;
    
    // Create problem nodes for this challenge
    const problemsForChallenges = problems.filter(p => challenge.id == p.businessChallengeId);
    for (let index = 0; index < problemsForChallenges.length; index++) {
      const problem = problemsForChallenges[index];
      if (problem) {
        const problemWidth = problemWidths.get(problem.id);
        const problemCenterX = problemX + (problemWidth / 2);
        
        // Add problem node centered above its hypotheses
        nodes.push({
          id: `problem_${problem.id}`,
          type: 'problem',
          data: { 
            label: problem.title, 
            description: problem.description,
            status: problem.status,
            id: problem.id
          },
          position: { x: problemCenterX, y: LEVEL_HEIGHT },
        });
        
        // Connect challenge to problem
        edges.push({
          id: `edge_challenge_${challenge.id}_problem_${problem.id}`,
          source: `challenge_${challenge.id}`,
          target: `problem_${problem.id}`,
          type: 'smoothstep',
          animated: false,
        });
        
        // Calculate initial hypothesis X position for this problem
        const hypothesisCount = problem.hypothesisIds.length;
        const totalHypothesisWidth = hypothesisCount * NODE_SPACING;
        let hypothesisX = problemCenterX - (totalHypothesisWidth / 2);
        
        // Create hypothesis nodes for this problem
        problem.hypothesisIds.forEach(hypothesisId => {
          const hypothesis = hypotheses.find(h => h.id === hypothesisId);
          if (hypothesis) {
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
              position: { x: hypothesisX, y: LEVEL_HEIGHT * 2 },
            });
            
            // Connect problem to hypothesis
            edges.push({
              id: `edge_problem_${problem.id}_hypothesis_${hypothesis.id}`,
              source: `problem_${problem.id}`,
              target: `hypothesis_${hypothesis.id}`,
              type: 'smoothstep',
              animated: false,
            });
            
            // Increment hypothesis X position
            hypothesisX += NODE_SPACING;
          }
        });
        
        // Increment problem X position by the problem's width plus spacing
        problemX += problemWidth + NODE_SPACING * 1.5;
      }
  
    }
    // Increment challenge X position based on its problems
    challengeX = problemX + NODE_SPACING;
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
