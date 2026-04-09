import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { AnalysisBoard } from '@/components/bi/AnalysisBoard';
import { getAnalysis, getSharedAnalysis } from '@/services/biAnalysisService';
import { metricsService } from '@/services/metricsService';
import { alertService } from '@/services/alertService';
import { BIChartCard, GlobalAlertRule } from '@/model/biAnalysis';
import type { MetricFlowResponse, MetricQueryRequest } from '@/model/metricFlow';
import type { AlertStatus } from '@/model/AlertConfig';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { globalAlertService } from '@/services/globalAlertService';

import { authService } from '@/services/authService';
import { transformMetricFlowToChartData, timeRangeToBounds } from '@/utils/biAnalysisUtils';

const SharedAnalysisPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  useEffect(() => {
    if (token && !authService.getStoredToken()) {
      localStorage.setItem('authToken', token);
    }
  }, [token]);

  const [cards, setCards] = useState<BIChartCard[]>([]);
  const [cardDataMap, setCardDataMap] = useState<Record<string, { chartData: any[]; rawData: MetricFlowResponse | null }>>({});
  const [alertStatusMap, setAlertStatusMap] = useState<Record<string, AlertStatus>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [analysisName, setAnalysisName] = useState('');
  const { toast } = useToast();

  const loadCardDataFor = async (card: BIChartCard) => {
    try {
      if ((!card.selection.dimensions || card.selection.dimensions.length === 0) && card.chartType !== 'alert' && card.chartType !== 'kpi') {
        setCardDataMap(prev => ({ ...prev, [card.id]: { chartData: [], rawData: null } }));
        return;
      }

      if (card.chartType === 'alert' && card.alert) {
        if (!card.alert.enabled) {
          setCardDataMap(prev => ({ ...prev, [card.id]: { chartData: [], rawData: null } }));
          return;
        }
        const resp = await globalAlertService.fetchAlertData(card.alert as GlobalAlertRule);
        
        let chartData: any[] = [];
        if (resp && Array.isArray(resp.data)) {
           chartData = resp.data;
        } else if (Array.isArray(resp)) {
           chartData = resp;
        }

        setCardDataMap(prev => ({ ...prev, [card.id]: { chartData: chartData, rawData: null } }));

        if (resp && typeof resp.triggered === 'boolean') {
           // It has triggered status. 
           let status: AlertStatus;
           if (resp.alertStatus) {
              status = resp.alertStatus;
           } else {
              const alertRule = card.alert as GlobalAlertRule;
              const priority = alertRule.priority || 'medium';
              let severity: 'info' | 'warning' | 'critical' = 'info';
              if (priority === 'critical') severity = 'critical';
              else if (priority === 'high') severity = 'warning';

              // Construct minimal status if backend only returns { triggered: true, ... }
              status = {
                id: `alert-status-${card.id}`, 
                ruleId: alertRule.id || card.id,
                ruleName: alertRule.name || 'Alert',
                triggered: resp.triggered,
                severity: severity,
                message: resp.message || (resp.triggered ? 'Alert Triggered' : 'Normal'),
                acknowledged: resp.acknowledged || false,
                conditionResults: resp.conditionResults || []
              };
           }
           setAlertStatusMap(prev => ({ ...prev, [card.id]: status }));
        }
        return;
      }

      const { start, end } = timeRangeToBounds(card.selection.timeRange);
      const req: MetricQueryRequest = {
        metric: card.metricId,
        group_by: card.selection.dimensions && card.selection.dimensions.length > 0 ? card.selection.dimensions : undefined,
        start_time: start,
        end_time: end,
        order: [],
        limit: 500
      };
      const resp = await metricsService.getMetricValue(req);
      const data = transformMetricFlowToChartData(resp);
      setCardDataMap(prev => ({ ...prev, [card.id]: { chartData: data, rawData: resp } }));
    } catch (e) {
      console.warn(`Card ${card.id}: failed to load data.`, e);
      setCardDataMap(prev => ({ ...prev, [card.id]: { chartData: [], rawData: null } }));
    }
  };

  useEffect(() => {
    if (!id) {
      setError('Invalid Analysis ID');
      setLoading(false);
      return;
    }
    getSharedAnalysis(id, token || undefined).then(analysis => {
      if (analysis) {
         setCards(analysis.cards);
         setAnalysisName(analysis.name);
      } else {
         setError('Analysis not found');
      }
      setLoading(false);
    }).catch(e => {
       setError(e.message || 'Failed to load analysis');
       setLoading(false);
    });
  }, [id, token]);

  useEffect(() => {
     cards.forEach(card => {
        if (!cardDataMap[card.id]) {
           void loadCardDataFor(card);
        }
     });
  }, [cards]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <h2 className="text-xl font-semibold text-destructive">{error}</h2>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
       <div className="flex items-center justify-between border-b pb-4">
          <h1 className="text-2xl font-bold tracking-tight">{analysisName || 'Shared Analysis'}</h1>
          <div className="text-sm text-muted-foreground">Read Only</div>
       </div>
       <AnalysisBoard 
          cards={cards}
          cardDataMap={cardDataMap}
          readOnly={true}
          onDragStart={() => () => {}}
          onDragOver={() => {}}
          onDrop={() => () => {}}
          onResize={() => {}}
          onRemove={() => {}}
          alertStatusMap={alertStatusMap}
       />
    </div>
  )
}

export default SharedAnalysisPage;
