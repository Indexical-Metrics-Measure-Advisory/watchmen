import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Save, X, AlertTriangle, TrendingUp, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { AlertRule } from '@/model/AlertConfig';
import { alertService } from '@/services/alertService';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface AlertRuleSettingsProps {
  className?: string;
  onClose?: () => void;
}

const AlertRuleSettings: React.FC<AlertRuleSettingsProps> = ({ className, onClose }) => {
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<Partial<AlertRule>>({});

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      setLoading(true);
      const alertRules = await alertService.getAlertRules();
      setRules(alertRules);
    } catch (error) {
      console.error('Error fetching alert rules:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRule = () => {
    setIsCreating(true);
    setEditingRule(null);
    setFormData({
      name: '',
      metricId: '',
      metricName: '',
      thresholdType: 'above',
      thresholdValue: 0,
      severity: 'warning',
      enabled: true,
      description: '',
      notificationChannels: ['email']
    });
  };

  const handleEditRule = (rule: AlertRule) => {
    setEditingRule(rule);
    setIsCreating(false);
    setFormData({ ...rule });
  };

  const handleSaveRule = async () => {
    try {
      if (!formData.name || !formData.metricId) {
        alert('Please fill in rule name and metric ID');
        return;
      }

      const ruleData: AlertRule = {
        id: editingRule?.id || `rule_${Date.now()}`,
        name: formData.name!,
        metricId: formData.metricId!,
        metricName: formData.metricName || formData.metricId!,
        thresholdType: formData.thresholdType || 'above',
        thresholdValue: formData.thresholdValue || 0,
        changeRateConfig: formData.changeRateConfig,
        anomalyConfig: formData.anomalyConfig,
        severity: formData.severity || 'warning',
        enabled: formData.enabled !== false,
        description: formData.description || '',
        notificationChannels: formData.notificationChannels || ['email'],
        createdAt: editingRule?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (editingRule) {
        await alertService.updateAlertRule(editingRule.id, ruleData);
      } else {
        await alertService.createAlertRule(ruleData);
      }

      await fetchRules();
      setEditingRule(null);
      setIsCreating(false);
      setFormData({});
    } catch (error) {
      console.error('Error saving alert rule:', error);
      alert('Failed to save rule, please try again');
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this alert rule?')) {
      return;
    }

    try {
      await alertService.deleteAlertRule(ruleId);
      await fetchRules();
    } catch (error) {
      console.error('Error deleting alert rule:', error);
      alert('Failed to delete rule, please try again');
    }
  };

  const handleCancel = () => {
    setEditingRule(null);
    setIsCreating(false);
    setFormData({});
  };

  const getSeverityColor = (severity: 'info' | 'warning' | 'critical') => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'info':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRuleTypeIcon = (thresholdType: string) => {
    switch (thresholdType) {
      case 'above':
      case 'below':
        return <BarChart3 className="h-4 w-4" />;
      case 'change_rate':
        return <TrendingUp className="h-4 w-4" />;
      case 'anomaly':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <BarChart3 className="h-4 w-4" />;
    }
  };

  const isEditing = editingRule !== null || isCreating;

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="h-6 bg-gray-200 rounded w-1/3 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3 animate-pulse"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-200 rounded animate-pulse"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Alert Rule Settings
            </CardTitle>
            <CardDescription>
              Configure and manage metric alert rules to detect business anomalies in time
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {!isEditing && (
              <Button onClick={handleCreateRule} size="sm">
                <Plus className="h-4 w-4 mr-1" />
                New Rule
              </Button>
            )}
            {onClose && (
              <Button variant="outline" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 编辑表单 */}
        {isEditing && (
          <Card className="border-2 border-blue-200 bg-blue-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">
                {editingRule ? 'Edit Alert Rule' : 'Create New Alert Rule'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ruleName">Rule Name *</Label>
                  <Input
                    id="ruleName"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter rule name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="metricId">Metric ID *</Label>
                  <Input
                    id="metricId"
                    value={formData.metricId || ''}
                    onChange={(e) => setFormData({ ...formData, metricId: e.target.value })}
                    placeholder="Enter metric ID"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="metricName">Metric Name</Label>
                  <Input
                    id="metricName"
                    value={formData.metricName || ''}
                    onChange={(e) => setFormData({ ...formData, metricName: e.target.value })}
                    placeholder="Enter metric display name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="thresholdType">Rule Type</Label>
                  <Select
                    value={formData.thresholdType || 'above'}
                    onValueChange={(value) => setFormData({ ...formData, thresholdType: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="above">Above Threshold</SelectItem>
                      <SelectItem value="below">Below Threshold</SelectItem>
                      <SelectItem value="change_rate">Change Rate Detection</SelectItem>
                      <SelectItem value="anomaly">Anomaly Detection</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* 阈值配置 */}
              {(formData.thresholdType === 'above' || formData.thresholdType === 'below') && (
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="thresholdValue">Threshold</Label>
                    <Input
                      id="thresholdValue"
                      type="number"
                      value={formData.thresholdValue || 0}
                      onChange={(e) => setFormData({
                        ...formData,
                        thresholdValue: parseFloat(e.target.value) || 0
                      })}
                    />
                  </div>
                </div>
              )}

              {/* 变化率配置 */}
              {formData.thresholdType === 'change_rate' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="changeThreshold">Change Rate Threshold (%)</Label>
                    <Input
                      id="changeThreshold"
                      type="number"
                      value={formData.changeRateConfig?.changeThreshold || 0}
                      onChange={(e) => setFormData({
                        ...formData,
                        changeRateConfig: {
                          ...formData.changeRateConfig,
                          changeThreshold: parseFloat(e.target.value) || 0,
                          timeWindow: formData.changeRateConfig?.timeWindow || '1h'
                        }
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timeWindow">Time Window</Label>
                    <Select
                      value={formData.changeRateConfig?.timeWindow || '1h'}
                      onValueChange={(value) => setFormData({
                        ...formData,
                        changeRateConfig: {
                          ...formData.changeRateConfig,
                          changeThreshold: formData.changeRateConfig?.changeThreshold || 0,
                          timeWindow: value as any
                        }
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1h">1 Hour</SelectItem>
                        <SelectItem value="24h">24 Hours</SelectItem>
                        <SelectItem value="7d">7 Days</SelectItem>
                        <SelectItem value="30d">30 Days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* 异常检测配置 */}
              {formData.thresholdType === 'anomaly' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sensitivity">Sensitivity</Label>
                    <Select
                      value={formData.anomalyConfig?.sensitivity || 'medium'}
                      onValueChange={(value) => setFormData({
                        ...formData,
                        anomalyConfig: {
                          ...formData.anomalyConfig,
                          sensitivity: value as any,
                          historicalPeriod: formData.anomalyConfig?.historicalPeriod || '30d'
                        }
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="historicalPeriod">Historical Period</Label>
                    <Select
                      value={formData.anomalyConfig?.historicalPeriod || '30d'}
                      onValueChange={(value) => setFormData({
                        ...formData,
                        anomalyConfig: {
                          ...formData.anomalyConfig,
                          sensitivity: formData.anomalyConfig?.sensitivity || 'medium',
                          historicalPeriod: value as any
                        }
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7d">7 Days</SelectItem>
                        <SelectItem value="30d">30 Days</SelectItem>
                        <SelectItem value="90d">90 Days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="severity">Severity</Label>
                  <Select
                    value={formData.severity || 'warning'}
                    onValueChange={(value) => setFormData({ ...formData, severity: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">Info</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="enabled" className="flex items-center gap-2">
                    Enable Rule
                    <Switch
                      id="enabled"
                      checked={formData.enabled !== false}
                      onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
                    />
                  </Label>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter rule description"
                  rows={3}
                />
              </div>

              <div className="flex items-center gap-2 pt-4">
                <Button onClick={handleSaveRule}>
                  <Save className="h-4 w-4 mr-1" />
                  Save Rule
                </Button>
                <Button variant="outline" onClick={handleCancel}>
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 规则列表 */}
        {!isEditing && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-foreground">
              Configured Rules ({rules.length})
            </h4>
            {rules.length === 0 ? (
              <div className="text-center py-8">
                <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No Alert Rules</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Create your first alert rule to monitor key metrics
                </p>
                <Button onClick={handleCreateRule}>
                  <Plus className="h-4 w-4 mr-1" />
                  Create Rule
                </Button>
              </div>
            ) : (
              rules.map((rule) => (
                <div
                  key={rule.id}
                  className="p-4 rounded-lg border border-gray-200 bg-white hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getRuleTypeIcon(rule.thresholdType)}
                        <span className="font-medium">{rule.name}</span>
                        <Badge className={getSeverityColor(rule.severity)}>
                          {rule.severity === 'critical' ? 'Critical' : rule.severity === 'warning' ? 'Warning' : 'Info'}
                        </Badge>
                        <Badge variant="outline">
                          {rule.metricName || rule.metricId}
                        </Badge>
                        {!rule.enabled && (
                          <Badge variant="secondary">Disabled</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {rule.description || 'No description'}
                      </p>
                      <div className="text-xs text-muted-foreground">
                        {(rule.thresholdType === 'above' || rule.thresholdType === 'below') && (
                          <span>
                            Threshold: {rule.thresholdType === 'above' ? '>' : '<'} {rule.thresholdValue}
                          </span>
                        )}
                        {rule.thresholdType === 'change_rate' && rule.changeRateConfig && (
                          <span>
                            Change Rate: {rule.changeRateConfig.changeThreshold}% / {rule.changeRateConfig.timeWindow}
                          </span>
                        )}
                        {rule.thresholdType === 'anomaly' && rule.anomalyConfig && (
                          <span>
                            Anomaly Detection: {rule.anomalyConfig.sensitivity} sensitivity
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditRule(rule)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteRule(rule.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AlertRuleSettings;