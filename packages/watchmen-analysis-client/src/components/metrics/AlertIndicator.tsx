import React from 'react';
import { AlertConfig, AlertStatus } from '@/model/AlertConfig';
import { Bell, BellOff, BellRing } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { alertService } from '@/services/alertService';

interface AlertIndicatorProps {
  metricId?: string | null;
  metricName?: string | null;
  currentValue?: number | null;
  unit?: string | null;
}

export const AlertIndicator: React.FC<AlertIndicatorProps> = ({
  metricId = '',
  metricName = '',
  currentValue = 0,
  unit = '',
}) => {
  // Return null if essential data is missing
  if (!metricId || !metricName) {
    return null;
  }
  const [config, setConfig] = React.useState<AlertConfig | undefined>(
    alertService.getAlertConfig(metricId)
  );
  const [status, setStatus] = React.useState<AlertStatus | undefined>(
    alertService.getAlertStatus(metricId)
  );

  const handleConfigChange = (newConfig: Partial<AlertConfig>) => {
    const updatedConfig: AlertConfig = {
      ...config!,
      ...newConfig,
      metricId,
    };
    alertService.setAlertConfig(updatedConfig);
    setConfig(updatedConfig);
  };

  const handleEnableChange = (enabled: boolean) => {
    if (!config && enabled) {
      // Create default config when enabling for the first time
      const defaultConfig: AlertConfig = {
        metricId,
        thresholdValue: currentValue,
        thresholdType: 'above',
        severity: 'warning',
        enabled: true,
        notificationChannels: ['in-app'],
      };
      alertService.setAlertConfig(defaultConfig);
      setConfig(defaultConfig);
    } else if (config) {
      handleConfigChange({ enabled });
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'h-8 w-8',
            status?.severity === 'critical' && 'text-red-500',
            status?.severity === 'warning' && 'text-yellow-500'
          )}
        >
          {status ? (
            <BellRing className="h-4 w-4" />
          ) : config?.enabled ? (
            <Bell className="h-4 w-4" />
          ) : (
            <BellOff className="h-4 w-4" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">{metricName} Alerts</h4>
            <Switch
              checked={config?.enabled ?? false}
              onCheckedChange={handleEnableChange}
            />
          </div>

          {config?.enabled && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Threshold</Label>
                <div className="flex items-center gap-2">
                  <select
                    className="border rounded p-2"
                    value={config.thresholdType}
                    onChange={(e) =>
                      handleConfigChange({ thresholdType: e.target.value as 'above' | 'below' })
                    }
                  >
                    <option value="above">Above</option>
                    <option value="below">Below</option>
                  </select>
                  <Input
                    type="number"
                    value={config.thresholdValue}
                    onChange={(e) =>
                      handleConfigChange({ thresholdValue: parseFloat(e.target.value) })
                    }
                  />
                  <span className="text-sm text-muted-foreground">{unit}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Severity</Label>
                <select
                  className="w-full border rounded p-2"
                  value={config.severity}
                  onChange={(e) =>
                    handleConfigChange({ severity: e.target.value as 'warning' | 'critical' })
                  }
                >
                  <option value="warning">Warning</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label>Notifications</Label>
                <div className="flex gap-2">
                  {(['in-app', 'email', 'sms'] as const).map((channel) => (
                    <label key={channel} className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={config.notificationChannels.includes(channel)}
                        onChange={(e) => {
                          const channels = e.target.checked
                            ? [...config.notificationChannels, channel]
                            : config.notificationChannels.filter((c) => c !== channel);
                          handleConfigChange({ notificationChannels: channels });
                        }}
                      />
                      {channel}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};