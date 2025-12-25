
export type ActionExecutionMode = 'auto' | 'manual' | 'approval';
export type ActionRiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type ActionPriority = 'low' | 'medium' | 'high';

export interface ActionType {
  id: string;
  name: string;
  code: string; // e.g. 'notification', 'email', 'policy_adjust'
  description?: string;
  requiresApproval?: boolean;
  enabled: boolean;
  category: string; // e.g. 'Notification', 'Policy Operation'
}

export interface SuggestedAction {
  id: string;
  name: string;
  typeId: string; // Reference to ActionType
  riskLevel: ActionRiskLevel;
  description: string;
  expectedOutcome?: string;
  conditions: string[]; // Simplified for now, or use AlertCondition[]
  executionMode: ActionExecutionMode;
  priority: ActionPriority;
  enabled: boolean;
  
  // Stats
  executionCount?: number;
  successRate?: number;
  lastExecuted?: string;
}
