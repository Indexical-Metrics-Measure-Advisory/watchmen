import { ActionType, SuggestedAction } from '@/model/suggestedAction';

const mockActionTypes: ActionType[] = [
  {
    id: 'type-1',
    name: 'Send Notification',
    code: 'notification',
    description: 'Send system notification to relevant personnel',
    requiresApproval: false,
    enabled: true,
    category: 'Notification'
  },
  {
    id: 'type-2',
    name: 'Email Alert',
    code: 'email',
    description: 'Send email to specified address',
    requiresApproval: false,
    enabled: true,
    category: 'Notification'
  },
  {
    id: 'type-3',
    name: 'Policy Adjustment',
    code: 'policy_adjust',
    description: 'Adjust policy terms or coverage',
    requiresApproval: true,
    enabled: true,
    category: 'Policy Operation'
  },
  {
    id: 'type-4',
    name: 'Rate Change',
    code: 'rate_change',
    description: 'Adjust product rates or pricing strategy',
    requiresApproval: true,
    enabled: true,
    category: 'Financial'
  }
];

const mockSuggestedActions: SuggestedAction[] = [
  {
    id: 'action-1',
    name: 'High Compensation Pre-warning Notification',
    typeId: 'type-1',
    riskLevel: 'low',
    description: 'Send notification when compensation rate exceeds threshold',
    expectedOutcome: 'Pre-warn 24h ahead, expected loss reduction 15%',
    conditions: ['Loss Ratio > 80%', 'Continuous 3 days increase'],
    executionMode: 'auto',
    priority: 'high',
    enabled: true,
    executionCount: 45,
    successRate: 98.5,
    lastExecuted: '2024-01-20'
  },
  {
    id: 'action-2',
    name: 'Abnormal Policy Adjustment',
    typeId: 'type-3',
    riskLevel: 'high',
    description: 'Suggest term adjustments for identified high-risk policies',
    expectedOutcome: 'Reduce high risk exposure',
    conditions: ['Risk Score > 90'],
    executionMode: 'approval',
    priority: 'high',
    enabled: true,
    executionCount: 12,
    successRate: 100,
    lastExecuted: '2024-01-18'
  }
];

class SuggestedActionService {
  private static instance: SuggestedActionService;

  private constructor() {}

  public static getInstance(): SuggestedActionService {
    if (!SuggestedActionService.instance) {
      SuggestedActionService.instance = new SuggestedActionService();
    }
    return SuggestedActionService.instance;
  }

  async getActionTypes(): Promise<ActionType[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return [...mockActionTypes];
  }

  async saveActionType(type: ActionType): Promise<ActionType> {
    await new Promise(resolve => setTimeout(resolve, 300));
    const index = mockActionTypes.findIndex(t => t.id === type.id);
    if (index >= 0) {
      mockActionTypes[index] = type;
    } else {
      mockActionTypes.push({ ...type, id: `type-${Date.now()}` });
    }
    return type;
  }

  async deleteActionType(id: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 300));
    const index = mockActionTypes.findIndex(t => t.id === id);
    if (index >= 0) {
      mockActionTypes.splice(index, 1);
    }
  }

  async getSuggestedActions(): Promise<SuggestedAction[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return [...mockSuggestedActions];
  }

  async saveSuggestedAction(action: SuggestedAction): Promise<SuggestedAction> {
    await new Promise(resolve => setTimeout(resolve, 300));
    const index = mockSuggestedActions.findIndex(a => a.id === action.id);
    if (index >= 0) {
      mockSuggestedActions[index] = action;
    } else {
      mockSuggestedActions.push({ ...action, id: `action-${Date.now()}` });
    }
    return action;
  }

  async deleteSuggestedAction(id: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 300));
    const index = mockSuggestedActions.findIndex(a => a.id === id);
    if (index >= 0) {
      mockSuggestedActions.splice(index, 1);
    }
  }
}

export const suggestedActionService = SuggestedActionService.getInstance();
