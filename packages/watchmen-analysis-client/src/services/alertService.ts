import { AlertRule, AlertStatus, MetricAnomaly, AlertConfig as ServiceAlertConfig } from '@/model/AlertConfig';
import { MetricType } from '@/model/Metric';
import { API_BASE_URL, getDefaultHeaders, checkResponse } from '@/utils/apiConfig';

const isMockMode = true;
const BASE_URL = `${API_BASE_URL}/metricflow/alert/rules`; // Updated base URL for alert rules

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

const mockAlertStatuses: AlertStatus[] = [
  {
    id: 'alert-1',
    ruleId: 'rule-1',
    ruleName: 'Premium Revenue Abnormal Decline',
    triggered: true,
    triggeredAt: '2024-01-15T10:30:00Z',
    severity: 'critical',
    message: 'Total premium revenue (45 million) is below alert threshold (50 million)',
    acknowledged: false,
    conditionResults: [
      {
        metricId: 'total_premium',
        metricName: 'Total Premium Underwritten',
        operator: '<',
        value: 50000000,
        currentValue: 45000000,
        triggered: true,
      },
    ],
  },
  {
    id: 'alert-2',
    ruleId: 'rule-2',
    ruleName: 'Application Volume Abnormal Growth',
    triggered: true,
    triggeredAt: '2024-01-15T14:20:00Z',
    severity: 'warning',
    message: 'Application volume grew 25% (1250 vs 1000) within 24 hours, approaching alert threshold of 30%',
    acknowledged: true,
    acknowledgedBy: 'analyst@company.com',
    acknowledgedAt: '2024-01-15T15:00:00Z',
    conditionResults: [
      {
        metricId: 'application_count',
        metricName: 'Application Count',
        operator: 'change_rate',
        value: 30,
        currentValue: 25,
        triggered: true,
      },
    ],
  },
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
        triggeredAt: new Date().toISOString(),
        severity: config.severity,
        message: `${metric.name} is ${config.thresholdType} threshold`,
        acknowledged: false,
        conditionResults: [
          {
            metricId: metric.id,
            metricName: metric.name,
            operator: config.thresholdType === 'above' ? '>' : '<',
            value: config.thresholdValue,
            currentValue: metric.value,
            triggered: true,
          },
        ],
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
          console.log(`In-app alert for ${metric.name}: ${metric.value}${metric.unit}`);
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
}

export const alertService = AlertService.getInstance();
