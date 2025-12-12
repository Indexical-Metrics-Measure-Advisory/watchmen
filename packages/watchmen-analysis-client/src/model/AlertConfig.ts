export interface AlertRule {
  id: string;
  name: string;
  metricId: string;
  metricName: string;
  thresholdValue: number;
  thresholdType: 'above' | 'below' | 'change_rate' | 'anomaly';
  severity: 'info' | 'warning' | 'critical';
  enabled: boolean;
  description?: string;
  // Change rate configuration
  changeRateConfig?: {
    timeWindow: '1h' | '24h' | '7d' | '30d';
    changeThreshold: number; // Percentage change threshold
  };
  // Anomaly detection configuration
  anomalyConfig?: {
    sensitivity: 'low' | 'medium' | 'high';
    historicalPeriod: '7d' | '30d' | '90d';
  };
  notificationChannels: Array<'email' | 'sms' | 'in-app'>;
  createdAt: string;
  updatedAt: string;
}

export interface AlertConfig {
  metricId: string;
  thresholdValue: number;
  thresholdType: 'above' | 'below';
  severity: 'warning' | 'critical';
  enabled: boolean;
  notificationChannels: Array<'email' | 'sms' | 'in-app'>;
}

export interface AlertStatus {
  id: string;
  ruleId: string;
  ruleName: string;
  triggered: boolean;
  currentValue: number;
  thresholdValue: number;
  triggeredAt?: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  metricName: string;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
}

export interface MetricAnomaly {
  metricId: string;
  metricName: string;
  currentValue: number;
  expectedRange: {
    min: number;
    max: number;
  };
  anomalyScore: number; // 0-1, higher value means more anomalous
  detectedAt: string;
  description: string;
}