import { HypothesisType } from "@/model/Hypothesis";
import { KnowledgeEntry } from "@/services/knowledgeService";
import { UserFeedback } from "@/services/feedbackService";

export interface OptimizationSuggestion {
  id: string;
  hypothesisId: string;
  suggestionType: 'refine' | 'extend' | 'pivot' | 'abandon';
  title: string;
  description: string;
  confidence: number;
  basedOn: 'knowledge' | 'feedback' | 'patterns';
  createdAt: string;
}

// Store optimization suggestions in memory
let optimizationSuggestions: OptimizationSuggestion[] = [];

// Simulate API delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const optimizationService = {
  // Get all optimization suggestions
  getAllSuggestions: async (): Promise<OptimizationSuggestion[]> => {
    await delay(500);
    return [...optimizationSuggestions];
  },

  // Get optimization suggestions for a specific hypothesis
  getSuggestionsForHypothesis: async (hypothesisId: string): Promise<OptimizationSuggestion[]> => {
    await delay(300);
    return optimizationSuggestions.filter(suggestion => suggestion.hypothesisId === hypothesisId);
  },

  // Generate optimization suggestions based on knowledge base
  generateFromKnowledge: async (
    hypothesis: HypothesisType, 
    knowledgeEntries: KnowledgeEntry[]
  ): Promise<OptimizationSuggestion[]> => {
    await delay(800);
    
    const newSuggestions: OptimizationSuggestion[] = [];
    
    // Find the most relevant knowledge entries (through related hypothesis IDs or content similarity)
    const relatedEntries = knowledgeEntries.filter(entry => 
      entry.relatedHypothesisIds?.includes(hypothesis.id) ||
      entry.topic.toLowerCase().includes(hypothesis.title.toLowerCase())
    );
    
    if (relatedEntries.length > 0) {
      // Generate refinement suggestions based on high-confidence knowledge
      const highConfidenceEntries = relatedEntries.filter(entry => entry.confidence > 75);
      if (highConfidenceEntries.length > 0) {
        newSuggestions.push({
          id: `${Date.now()}-refine`,
          hypothesisId: hypothesis.id,
          suggestionType: 'refine',
          title: `Refine "${hypothesis.title}"`,
          description: `Based on our high-confidence knowledge (${highConfidenceEntries[0].topic}), suggest refining this hypothesis to better reflect our findings.`,
          confidence: highConfidenceEntries[0].confidence,
          basedOn: 'knowledge',
          createdAt: new Date().toISOString()
        });
      }
      
      // Generate extension suggestions based on low-confidence knowledge
      const lowConfidenceEntries = relatedEntries.filter(entry => entry.confidence < 60);
      if (lowConfidenceEntries.length > 0) {
        newSuggestions.push({
          id: `${Date.now()}-extend`,
          hypothesisId: hypothesis.id,
          suggestionType: 'extend',
          title: `Extend "${hypothesis.title}"`,
          description: `Knowledge about "${lowConfidenceEntries[0].topic}" has low confidence. Suggest extending this hypothesis to collect more data.`,
          confidence: 60,
          basedOn: 'knowledge',
          createdAt: new Date().toISOString()
        });
      }
    } else {
      // No related knowledge, suggest pivoting
      newSuggestions.push({
        id: `${Date.now()}-pivot`,
        hypothesisId: hypothesis.id,
        suggestionType: 'pivot',
        title: `Pivot "${hypothesis.title}"`,
        description: `No knowledge related to this hypothesis found. Consider changing direction or redefining the hypothesis to find more verifiable areas.`,
        confidence: 40,
        basedOn: 'knowledge',
        createdAt: new Date().toISOString()
      });
    }
    
    // Store new suggestions
    optimizationSuggestions = [...optimizationSuggestions, ...newSuggestions];
    
    return newSuggestions;
  },

  // Generate optimization suggestions based on user feedback
  generateFromFeedback: async (
    hypothesis: HypothesisType, 
    feedbacks: UserFeedback[]
  ): Promise<OptimizationSuggestion[]> => {
    await delay(700);
    
    const newSuggestions: OptimizationSuggestion[] = [];
    
    if (feedbacks.length > 0) {
      // Calculate average rating
      const avgRating = feedbacks.reduce((sum, fb) => sum + fb.rating, 0) / feedbacks.length;
      
      // Determine suggestion type based on feedback results
      if (avgRating > 4) {
        newSuggestions.push({
          id: `${Date.now()}-extend`,
          hypothesisId: hypothesis.id,
          suggestionType: 'extend',
          title: `Extend "${hypothesis.title}"`,
          description: `Based on positive user feedback (average rating: ${avgRating.toFixed(1)}), suggest extending this hypothesis to explore more related areas.`,
          confidence: Math.round(avgRating * 20),
          basedOn: 'feedback',
          createdAt: new Date().toISOString()
        });
      } else if (avgRating < 2.5) {
        newSuggestions.push({
          id: `${Date.now()}-abandon`,
          hypothesisId: hypothesis.id,
          suggestionType: 'abandon',
          title: `Abandon "${hypothesis.title}"`,
          description: `Based on negative user feedback (average rating: ${avgRating.toFixed(1)}), suggest considering abandoning this hypothesis or making major modifications.`,
          confidence: Math.round((5 - avgRating) * 20),
          basedOn: 'feedback',
          createdAt: new Date().toISOString()
        });
      } else {
        newSuggestions.push({
          id: `${Date.now()}-refine`,
          hypothesisId: hypothesis.id,
          suggestionType: 'refine',
          title: `Refine "${hypothesis.title}"`,
          description: `Based on neutral user feedback (average rating: ${avgRating.toFixed(1)}), suggest refining this hypothesis to improve its effectiveness.`,
          confidence: 60,
          basedOn: 'feedback',
          createdAt: new Date().toISOString()
        });
        
      }
    } else {
      // No feedback, suggest getting user input
      newSuggestions.push({
        id: `${Date.now()}-extend`,
        hypothesisId: hypothesis.id,
        suggestionType: 'extend',
        title: `Extend "${hypothesis.title}"`,
        description: `No user feedback data available. Suggest extending this hypothesis to gather more user input.`,
        confidence: 50,
        basedOn: 'feedback',
        createdAt: new Date().toISOString()
      });
    }
    
    // Store new suggestions
    optimizationSuggestions = [...optimizationSuggestions, ...newSuggestions];
    
    return newSuggestions;
  },

  // Generate optimization suggestions from AI learning pattern recognition
  generateFromPatterns: async (hypothesis: HypothesisType): Promise<OptimizationSuggestion[]> => {
    await delay(900);
    
    // Simulate AI-based pattern recognition
    const patterns = [
      {
        type: 'refine',
        title: 'Refine Hypothesis Scope',
        description: 'This hypothesis scope may be too broad. Consider focusing on more specific customer segments or product features to improve validation efficiency.'
      },
      {
        type: 'extend',
        title: 'Extend Data Collection',
        description: 'Current data is insufficient for comprehensive hypothesis validation. Suggest expanding data collection scope, especially in customer behavior and preferences.'
      },
      {
        type: 'pivot',
        title: 'Pivot to Related Areas',
        description: 'Data indicates related areas may have higher potential value. Consider pivoting the hypothesis towards these areas for better results.'
      },
      {
        type: 'abandon',
        title: 'Abandon and Redirect Resources',
        description: 'Multiple rounds of testing show this hypothesis is difficult to validate or has limited value. Suggest abandoning and reallocating resources to more promising hypotheses.'
      }
    ];
    
    // Randomly select a pattern (should be based on real pattern recognition algorithm in production)
    const selectedPattern = patterns[Math.floor(Math.random() * patterns.length)];
    
    const newSuggestion: OptimizationSuggestion = {
      id: Date.now().toString(),
      hypothesisId: hypothesis.id,
      suggestionType: selectedPattern.type as 'refine' | 'extend' | 'pivot' | 'abandon',
      title: selectedPattern.title,
      description: selectedPattern.description,
      confidence: Math.round(50 + Math.random() * 30),
      basedOn: 'patterns',
      createdAt: new Date().toISOString()
    };
    
    // Store new suggestion
    optimizationSuggestions = [...optimizationSuggestions, newSuggestion];
    
    return [newSuggestion];
  }
};
