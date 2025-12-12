export interface AlertAction {
  type: 'email' | 'webhook' | 'notification' | 'process';
  target?: string;
  template?: string;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  name?: string;
  content?: string;
  expectedEffect?: string;
}

export interface AlertCondition {
  field?: string; // Metric ID or 'value'
  operator: '>' | '<' | '>=' | '<=' | '==' | '!=';
  value: number | string;
}

export interface AlertConfig {
  enabled: boolean;
  name?: string;
  priority?: 'high' | 'medium' | 'low' | 'critical';
  description?: string;
  conditionLogic?: 'and' | 'or';
  conditions?: AlertCondition[];
  // Legacy support
  condition: {
    operator: '>' | '<' | '>=' | '<=' | '==' | '!=';
    value: number;
  };
  actions?: AlertAction[];
  nextAction?: AlertAction;
  decision?: string; // Description of the decision/recommendation
}

export interface GlobalAlertRule extends AlertConfig {
  id: string;
  metricId: string; // The metric this rule applies to
  createdAt: string;
  updatedAt: string;
}