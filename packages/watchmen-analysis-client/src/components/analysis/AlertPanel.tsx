import React, { useState, useEffect } from 'react';
import { AlertTriangle, Bell, CheckCircle, Clock, Settings, X, AlertCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertStatus, MetricAnomaly } from '@/model/AlertConfig';
import { alertService } from '@/services/alertService';
import { formatDistanceToNow } from 'date-fns';

interface AlertPanelProps {
  className?: string;
}

const AlertPanel: React.FC<AlertPanelProps> = ({ className }) => {
  const [activeAlerts, setActiveAlerts] = useState<AlertStatus[]>([]);
  const [anomalies, setAnomalies] = useState<MetricAnomaly[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const fetchAlertData = async () => {
      try {
        setLoading(true);
        const [alerts, anomalyData] = await Promise.all([
          alertService.getActiveAlerts(),
          alertService.getAnomalies()
        ]);
        setActiveAlerts(alerts);
        setAnomalies(anomalyData);
      } catch (error) {
        console.error('Error fetching alert data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAlertData();
    
    // Refresh alert data periodically
    const interval = setInterval(fetchAlertData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      await alertService.acknowledgeAlert(alertId, 'current-user@company.com');
      // Refresh alert list
      const updatedAlerts = await alertService.getActiveAlerts();
      setActiveAlerts(updatedAlerts);
    } catch (error) {
      console.error('Error acknowledging alert:', error);
    }
  };

  const getSeverityColor = (severity: 'info' | 'warning' | 'critical') => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'info':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSeverityIcon = (severity: 'info' | 'warning' | 'critical') => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="h-4 w-4" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4" />;
      case 'info':
        return <Bell className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getAnomalyScoreColor = (score: number) => {
    if (score >= 0.7) return 'text-red-600';
    if (score >= 0.4) return 'text-yellow-600';
    return 'text-blue-600';
  };

  const formatValue = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toLocaleString();
  };

  if (loading) {
    return (
      <Card className={`${className} animate-pulse`}>
        <CardHeader>
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalAlerts = activeAlerts.length;
  const criticalAlerts = activeAlerts.filter(a => a.severity === 'critical').length;
  const warningAlerts = activeAlerts.filter(a => a.severity === 'warning').length;

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Anomaly Alert Monitoring
            </CardTitle>
            <CardDescription>
              Real-time monitoring of key metric anomalies for timely business issue detection
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Alert Statistics */}
        <div className="flex items-center gap-4 mt-4">
          <div className="flex items-center gap-2">
            <Badge variant="destructive" className="px-2 py-1">
              {criticalAlerts}
            </Badge>
            <span className="text-sm text-muted-foreground">Critical</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="px-2 py-1 bg-yellow-100 text-yellow-800">
              {warningAlerts}
            </Badge>
            <span className="text-sm text-muted-foreground">Warning</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="px-2 py-1">
              {totalAlerts}
            </Badge>
            <span className="text-sm text-muted-foreground">Total</span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Active Alert List */}
        {activeAlerts.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Active Alerts ({activeAlerts.length})
            </h4>
            {activeAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-3 rounded-lg border ${getSeverityColor(alert.severity)} transition-all hover:shadow-sm`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {getSeverityIcon(alert.severity)}
                      <span className="font-medium text-sm">{alert.ruleName}</span>
                      <Badge variant="outline" className="text-xs">
                        {alert.metricName}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {alert.message}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {alert.triggeredAt && formatDistanceToNow(new Date(alert.triggeredAt), {
                          addSuffix: true
                        })}
                      </span>
                      <span>
                        Current: <span className="font-medium">{formatValue(alert.currentValue)}</span>
                      </span>
                      <span>
                        Threshold: <span className="font-medium">{formatValue(alert.thresholdValue)}</span>
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAcknowledgeAlert(alert.id)}
                      className="text-xs"
                    >
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Acknowledge
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Anomaly Detection Results */}
        {anomalies.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Anomaly Detection ({anomalies.length})
            </h4>
            {anomalies.map((anomaly, index) => (
              <div
                key={index}
                className="p-3 rounded-lg border border-blue-200 bg-blue-50 transition-all hover:shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingDown className="h-4 w-4 text-blue-600" />
                      <span className="font-medium text-sm">{anomaly.metricName}</span>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${getAnomalyScoreColor(anomaly.anomalyScore)}`}
                      >
                        Anomaly: {(anomaly.anomalyScore * 100).toFixed(0)}%
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {anomaly.description}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>
                        Current: <span className="font-medium">{anomaly.currentValue}</span>
                      </span>
                      <span>
                        Expected Range: <span className="font-medium">
                          {anomaly.expectedRange.min} - {anomaly.expectedRange.max}
                        </span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(anomaly.detectedAt), {
                          addSuffix: true
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* No Alert Status */}
        {activeAlerts.length === 0 && anomalies.length === 0 && (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">System Running Normally</h3>
            <p className="text-sm text-muted-foreground">
              No anomalous metrics or triggered alert rules detected
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AlertPanel;