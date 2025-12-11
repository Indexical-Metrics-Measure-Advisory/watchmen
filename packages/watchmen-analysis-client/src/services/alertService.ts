import { AlertRule, AlertStatus, MetricAnomaly, AlertConfig as ServiceAlertConfig } from '@/model/AlertConfig';
import { GlobalAlertRule } from '@/model/biAnalysis';
import { MetricType } from '@/model/Metric';
import { API_BASE_URL, getDefaultHeaders, checkResponse } from '@/utils/apiConfig';

const isMockMode = true;
const BASE_URL = `${API_BASE_URL}/metricflow/alert/global-rules`;

// Mock数据 - 在实际项目中应该从API获取
const mockAlertRules: AlertRule[] = [
  {
    id: 'rule-1',
    name: 'Premium Revenue Abnormal Decline',
    metricId: 'total_premium',
    metricName: 'Total Premium Underwritten',
    thresholdValue: 50000000,
    thresholdType: 'below',
    severity: 'critical',
    enabled: true,
    description: 'Trigger alert when total premium revenue is below 50 million',
    notificationChannels: ['in-app', 'email'],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'rule-2',
    name: 'Application Volume Abnormal Growth',
    metricId: 'application_count',
    metricName: 'Application Count',
    thresholdValue: 30,
    thresholdType: 'change_rate',
    severity: 'warning',
    enabled: true,
    description: 'Trigger alert when application volume grows more than 30% within 24 hours',
    changeRateConfig: {
      timeWindow: '24h',
      changeThreshold: 30
    },
    notificationChannels: ['in-app'],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'rule-3',
    name: 'Customer Age Distribution Anomaly',
    metricId: 'customer_age',
    metricName: 'Customer Age Distribution',
    thresholdValue: 0,
    thresholdType: 'anomaly',
    severity: 'info',
    enabled: true,
    description: 'Detect anomalous patterns in customer age distribution',
    anomalyConfig: {
      sensitivity: 'medium',
      historicalPeriod: '30d'
    },
    notificationChannels: ['in-app'],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }
];

const mockGlobalAlertRules: GlobalAlertRule[] = [
  {
    id: 'global-rule-1',
    metricId: 'total_revenue',
    enabled: true,
    condition: { operator: '>', value: 100000 },
    nextAction: { type: 'notification' },
    name: 'High Revenue Alert',
    priority: 'high',
    description: 'Alert when revenue exceeds 100k',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }
];

const mockAlertStatuses: AlertStatus[] = [
  {
    id: 'alert-1',
    ruleId: 'rule-1',
    ruleName: 'Premium Revenue Abnormal Decline',
    triggered: true,
    currentValue: 45000000,
    thresholdValue: 50000000,
    triggeredAt: '2024-01-15T10:30:00Z',
    severity: 'critical',
    message: 'Total premium revenue (45 million) is below alert threshold (50 million)',
    metricName: 'Total Premium Underwritten',
    acknowledged: false
  },
  {
    id: 'alert-2',
    ruleId: 'rule-2',
    ruleName: 'Application Volume Abnormal Growth',
    triggered: true,
    currentValue: 1250,
    thresholdValue: 1000,
    triggeredAt: '2024-01-15T14:20:00Z',
    severity: 'warning',
    message: 'Application volume grew 25% (1250 vs 1000) within 24 hours, approaching alert threshold of 30%',
    metricName: 'Application Count',
    acknowledged: true,
    acknowledgedBy: 'analyst@company.com',
    acknowledgedAt: '2024-01-15T15:00:00Z'
  }
];

const mockAnomalies: MetricAnomaly[] = [
  {
    metricId: 'customer_age',
    metricName: 'Customer Age Distribution',
    currentValue: 42.5,
    expectedRange: {
      min: 38.0,
      max: 45.0
    },
    anomalyScore: 0.3,
    detectedAt: '2024-01-15T12:00:00Z',
    description: 'Customer average age (42.5) is within normal range, but distribution pattern shows slight anomaly'
  }
];

class AlertService {
  private static instance: AlertService;
  private alertConfigs: Map<string, ServiceAlertConfig> = new Map();
  private alertStatuses: Map<string, AlertStatus> = new Map();

  private constructor() {}

  public static getInstance(): AlertService {
    if (!AlertService.instance) {
      AlertService.instance = new AlertService();
    }
    return AlertService.instance;
  }

  // Global Alert Rule Methods
  async getGlobalAlertRules(): Promise<GlobalAlertRule[]> {
    if (isMockMode) {
      await new Promise(resolve => setTimeout(resolve, 300));
      return mockGlobalAlertRules;
    }
    const response = await fetch(`${BASE_URL}`, {
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
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
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
        updatedAt: new Date().toISOString()
      };
      
      return mockGlobalAlertRules[index];
    }
    const response = await fetch(`${BASE_URL}/${id}`, {
      method: 'PUT',
      headers: getDefaultHeaders(),
      body: JSON.stringify(updates),
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
    const response = await fetch(`${BASE_URL}/${id}`, {
      method: 'DELETE',
      headers: getDefaultHeaders(),
    });
    return checkResponse(response);
  }

  // 新的API方法
  // 获取所有预警规则
  async getAlertRules(): Promise<AlertRule[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockAlertRules;
  }

  // 获取活跃的预警状态
  async getActiveAlerts(): Promise<AlertStatus[]> {
    await new Promise(resolve => setTimeout(resolve, 200));
    return mockAlertStatuses.filter(alert => alert.triggered && !alert.acknowledged);
  }

  // 获取所有预警状态（包括已确认的）
  async getAllAlerts(): Promise<AlertStatus[]> {
    await new Promise(resolve => setTimeout(resolve, 200));
    return mockAlertStatuses;
  }

  // 获取异常检测结果
  async getAnomalies(): Promise<MetricAnomaly[]> {
    await new Promise(resolve => setTimeout(resolve, 200));
    return mockAnomalies;
  }

  // 创建新的预警规则
  async createAlertRule(rule: Omit<AlertRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<AlertRule> {
    await new Promise(resolve => setTimeout(resolve, 500));
    const newRule: AlertRule = {
      ...rule,
      id: `rule-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    mockAlertRules.push(newRule);
    return newRule;
  }

  // 更新预警规则
  async updateAlertRule(id: string, updates: Partial<AlertRule>): Promise<AlertRule> {
    await new Promise(resolve => setTimeout(resolve, 500));
    const index = mockAlertRules.findIndex(rule => rule.id === id);
    if (index === -1) {
      throw new Error('Alert rule not found');
    }
    
    mockAlertRules[index] = {
      ...mockAlertRules[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    return mockAlertRules[index];
  }

  // 删除预警规则
  async deleteAlertRule(id: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 300));
    const index = mockAlertRules.findIndex(rule => rule.id === id);
    if (index === -1) {
      throw new Error('Alert rule not found');
    }
    mockAlertRules.splice(index, 1);
  }

  // 确认预警
  async acknowledgeAlert(alertId: string, acknowledgedBy: string): Promise<AlertStatus> {
    await new Promise(resolve => setTimeout(resolve, 300));
    const index = mockAlertStatuses.findIndex(alert => alert.id === alertId);
    if (index === -1) {
      throw new Error('Alert not found');
    }
    
    mockAlertStatuses[index] = {
      ...mockAlertStatuses[index],
      acknowledged: true,
      acknowledgedBy,
      acknowledgedAt: new Date().toISOString()
    };
    
    return mockAlertStatuses[index];
  }

  // 原有的方法保持兼容性
  public setAlertConfig(config: ServiceAlertConfig): void {
    this.alertConfigs.set(config.metricId, config);
  }

  public getAlertConfig(metricId: string): ServiceAlertConfig | undefined {
    return this.alertConfigs.get(metricId);
  }

  public checkMetricAlert(metric: MetricType): AlertStatus | null {
    const config = this.alertConfigs.get(metric.id);
    if (!config || !config.enabled) return null;

    const isTriggered = config.thresholdType === 'above'
      ? metric.value > config.thresholdValue
      : metric.value < config.thresholdValue;

    if (isTriggered) {
      const status: AlertStatus = {
        id: `alert-${Date.now()}`,
        ruleId: metric.id,
        ruleName: `Alert for ${metric.name}`,
        triggered: true,
        currentValue: metric.value,
        thresholdValue: config.thresholdValue,
        triggeredAt: new Date().toISOString(),
        severity: config.severity,
        message: `${metric.name} is ${config.thresholdType} threshold`,
        metricName: metric.name,
        acknowledged: false
      };
      this.alertStatuses.set(metric.id, status);
      this.notifyAlert(metric, status);
      return status;
    }

    return null;
  }

  private notifyAlert(metric: MetricType, status: AlertStatus): void {
    const config = this.alertConfigs.get(metric.id);
    if (!config) return;

    config.notificationChannels.forEach(channel => {
      switch (channel) {
        case 'in-app':
          console.log(`In-app alert for ${metric.name}: ${status.currentValue}${metric.unit}`);
          break;
        case 'email':
          console.log(`Email alert for ${metric.name}`);
          break;
        case 'sms':
          console.log(`SMS alert for ${metric.name}`);
          break;
      }
    });
  }

  public getAlertStatus(metricId: string): AlertStatus | undefined {
    return this.alertStatuses.get(metricId);
  }

  public clearAlert(metricId: string): void {
    this.alertStatuses.delete(metricId);
  }

  async fetchAlertData(rule: GlobalAlertRule): Promise<any[]> {
    if (isMockMode) {
      await new Promise(resolve => setTimeout(resolve, 300));
      // Return a random value close to the condition value to simulate checking
      const baseValue = typeof rule.condition.value === 'number' ? rule.condition.value : 0;
      const randomFactor = 0.8 + Math.random() * 0.4; // 0.8 to 1.2
      return [{ value: Math.round(baseValue * randomFactor) }];
    }
    
    // In real mode, we might want to call a specific alert evaluation endpoint
    // For now, let's assume there is an endpoint or we can't implement it fully without backend specs
    // But per requirement, we must have this service method.
    // If no specific endpoint exists, we might default to returning empty or calling a placeholder
    const response = await fetch(`${BASE_URL}/${rule.id}/data`, {
        headers: getDefaultHeaders(),
    });
    return checkResponse(response);
  }
}

export const alertService = AlertService.getInstance();