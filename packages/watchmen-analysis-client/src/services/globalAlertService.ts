import { GlobalAlertRule } from '@/model/biAnalysis';
import { AlertStatus } from '@/model/AlertConfig';
import { API_BASE_URL, getDefaultHeaders, checkResponse } from '@/utils/apiConfig';

const isMockMode = false;
const BASE_URL = `${API_BASE_URL}/metricflow/alert-rule`;

const mockGlobalAlertRules: GlobalAlertRule[] = [
  {
    id: 'global-rule-1',
    enabled: true,
    conditions: [{ metricId: 'total_revenue', metricName: 'Total Revenue', operator: '>', value: 100000 }],
    nextAction: { type: 'notification' },
    name: 'High Revenue Alert',
    priority: 'high',
    description: 'Alert when revenue exceeds 100k',
  }
];

class GlobalAlertService {
  private static instance: GlobalAlertService;

  private constructor() {}

  public static getInstance(): GlobalAlertService {
    if (!GlobalAlertService.instance) {
      GlobalAlertService.instance = new GlobalAlertService();
    }
    return GlobalAlertService.instance;
  }

  async getGlobalAlertRules(): Promise<GlobalAlertRule[]> {
    if (isMockMode) {
      await new Promise(resolve => setTimeout(resolve, 300));
      return mockGlobalAlertRules;
    }
    const response = await fetch(`${BASE_URL}/all`, {
      headers: getDefaultHeaders(),
    });
    return checkResponse(response);
  }

  async loadAlertRulesByMetricId(metricId: string): Promise<GlobalAlertRule[]> {
    if (isMockMode) {
        await new Promise(resolve => setTimeout(resolve, 300));
        return mockGlobalAlertRules.filter(rule => rule.conditions?.some(c => c.metricId === metricId));
    }
    const response = await fetch(`${BASE_URL}/metric/${metricId}`, {
        headers: getDefaultHeaders(),
    });
    return checkResponse(response);
  }

  async createGlobalAlertRule(rule: Omit<GlobalAlertRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<GlobalAlertRule> {
    if (isMockMode) {
      await new Promise(resolve => setTimeout(resolve, 500));
      const newRule: GlobalAlertRule = {
        ...rule,
        id: `global-rule-${Date.now()}`,
      };
      mockGlobalAlertRules.push(newRule);
      return newRule;
    }
    const response = await fetch(`${BASE_URL}`, {
      method: 'POST',
      headers: getDefaultHeaders(),
      body: JSON.stringify(rule),
    });
    return checkResponse(response);
  }

  async updateGlobalAlertRule(id: string, updates: Partial<GlobalAlertRule>): Promise<GlobalAlertRule> {
    if (isMockMode) {
      await new Promise(resolve => setTimeout(resolve, 500));
      const index = mockGlobalAlertRules.findIndex(rule => rule.id === id);
      if (index === -1) {
        throw new Error('Global alert rule not found');
      }
      
      mockGlobalAlertRules[index] = {
        ...mockGlobalAlertRules[index],
        ...updates,
      };
      
      return mockGlobalAlertRules[index];
    }
    const response = await fetch(`${BASE_URL}/update`, {
      method: 'POST',
      headers: getDefaultHeaders(),
      body: JSON.stringify({ ...updates, id }),
    });
    return checkResponse(response);
  }

  async deleteGlobalAlertRule(id: string): Promise<void> {
    if (isMockMode) {
      await new Promise(resolve => setTimeout(resolve, 300));
      const index = mockGlobalAlertRules.findIndex(rule => rule.id === id);
      if (index === -1) {
        throw new Error('Global alert rule not found');
      }
      mockGlobalAlertRules.splice(index, 1);
      return;
    }
    const response = await fetch(`${BASE_URL}/delete/${id}`, {
      method: 'GET',
      headers: getDefaultHeaders(),
    });
    return checkResponse(response);
  }

  async fetchAlertData(rule: GlobalAlertRule): Promise<any> {
    if (isMockMode) {
      await new Promise(resolve => setTimeout(resolve, 300));
      // Return a random value close to the condition value to simulate checking
      const firstCondition = rule.conditions?.[0];
      const baseValue = firstCondition && typeof firstCondition.value === 'number' ? Number(firstCondition.value) : 0;
      const randomFactor = 0.8 + Math.random() * 0.4; // 0.8 to 1.2
      // Mock response structure with triggered status
      const value = Math.round(baseValue * randomFactor);
      
      let isTriggered = false;
      const results: any[] = [];
      
      if (rule.conditions && rule.conditions.length > 0) {
          rule.conditions.forEach(cond => {
             const condValue = Number(cond.value);
             let triggered = false;
             switch (cond.operator) {
                 case '>': triggered = value > condValue; break;
                 case '<': triggered = value < condValue; break;
                 case '>=': triggered = value >= condValue; break;
                 case '<=': triggered = value <= condValue; break;
                 case '==': triggered = value === condValue; break;
                 case '!=': triggered = value !== condValue; break;
             }
             results.push({
                 metricId: cond.metricId || '',
                 metricName: cond.metricName || '',
                 operator: cond.operator,
                 value: cond.value,
                 currentValue: value,
                 triggered
             });
          });
          
          if (rule.conditionLogic === 'or') {
              isTriggered = results.some(r => r.triggered);
          } else {
              isTriggered = results.every(r => r.triggered);
          }
      } else {
          isTriggered = false;
      }
      
      return {
        triggered: isTriggered,
        data: [{ value }],
        alertStatus: {
           id: `alert-${Date.now()}`,
           ruleId: rule.id,
           ruleName: rule.name,
           triggered: isTriggered,
           severity: rule.priority,
           message: isTriggered ? `Rule ${rule.name} triggered` : 'Normal',
           acknowledged: false,
           conditionResults: results
        }
      };
    }
    
    // In real mode, we might want to call a specific alert evaluation endpoint
    // For now, let's assume there is an endpoint or we can't implement it fully without backend specs
    // But per requirement, we must have this service method.
    // If no specific endpoint exists, we might default to returning empty or calling a placeholder
    const response = await fetch(`${BASE_URL}/run/${rule.id}`, {
        headers: getDefaultHeaders(),
    });
    return checkResponse(response);
  }

  async getAlertStatus(ruleId: string): Promise<AlertStatus> {
    if (isMockMode) {
      await new Promise(resolve => setTimeout(resolve, 300));
      // Find the rule to generate realistic mock status
      const rule = mockGlobalAlertRules.find(r => r.id === ruleId);
      const isTriggered = true; // Always triggered for demo purposes, or Math.random() > 0.5
      
      return {
        id: `status-${ruleId}`,
        ruleId: ruleId,
        ruleName: rule?.name || 'Unknown Rule',
        triggered: isTriggered,
        triggeredAt: isTriggered ? new Date().toISOString() : undefined,
        severity: (rule?.priority as any) || 'medium',
        message: isTriggered ? `Rule ${rule?.name} triggered` : 'Normal',
        acknowledged: false,
        conditionResults: rule?.conditions?.map(c => ({
            metricId: c.metricId || '',
            metricName: c.metricName || c.metricId || '',
            operator: c.operator,
            value: c.value,
            currentValue: typeof c.value === 'number' ? Number(c.value) * (isTriggered ? 1.5 : 0.8) : 0,
            triggered: isTriggered
        })) || []
      };
    }
    const response = await fetch(`${BASE_URL}/status/${ruleId}`, {
        headers: getDefaultHeaders(),
    });
    return checkResponse(response);
  }

  async acknowledgeAlert(alertId: string): Promise<void> {
    if (isMockMode) {
        await new Promise(resolve => setTimeout(resolve, 300));
        return;
    }
    const response = await fetch(`${BASE_URL}/acknowledge/${alertId}`, {
        method: 'POST',
        headers: getDefaultHeaders(),
    });
    return checkResponse(response);
  }
}

export const globalAlertService = GlobalAlertService.getInstance();
