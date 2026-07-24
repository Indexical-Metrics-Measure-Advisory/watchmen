import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { DateRange } from 'react-day-picker';
import { addDays } from 'date-fns';
import type { BIChartCard, BICardSize, GlobalAlertRule } from '@/model/biAnalysis';
import type { AlertStatus } from '@/model/AlertConfig';
import { saveAnalysis, listAnalyses, getAnalysis, deleteAnalysis, updateAnalysis, updateAnalysisTemplate } from '@/services/biAnalysisService';
import { globalAlertService } from '@/services/globalAlertService';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { toTimeRangeValue } from '@/utils/biAnalysisUtils';

// ─────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────

interface UseAnalysisStateOptions {
  clearCardDataMap: () => void;
  setAlertStatusMap: React.Dispatch<React.SetStateAction<Record<string, AlertStatus>>>;
}

const LAST_ANALYSIS_STORAGE_KEY = 'watchmen_bi_last_analysis_id';

const getLastAnalysisStorageKey = (tenantId?: string | null): string =>
  tenantId ? `${LAST_ANALYSIS_STORAGE_KEY}:${tenantId}` : LAST_ANALYSIS_STORAGE_KEY;

const clearLegacyLastAnalysisStorageKey = (): void => {
  localStorage.removeItem(LAST_ANALYSIS_STORAGE_KEY);
};

export const useAnalysisState = (options: UseAnalysisStateOptions) => {
  const { clearCardDataMap, setAlertStatusMap } = options;
  const { toast } = useToast();
  const { user, token } = useAuth();

  // ── Analysis & Navigation ──
  const [currentAnalysisId, setCurrentAnalysisId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'dashboard' | 'saved'>('dashboard');

  // ── Dashboard Cards ──
  const [cards, setCards] = useState<BIChartCard[]>([]);
  const [metricBuilderOpen, setMetricBuilderOpen] = useState(false);
  const dashboardViewRef = useRef<HTMLDivElement>(null);
  const [pendingScrollToDashboard, setPendingScrollToDashboard] = useState(false);

  // ── Alert Dialog ──
  const [addAlertOpen, setAddAlertOpen] = useState(false);
  const [alertRuleId, setAlertRuleId] = useState('');
  const [dialogRules, setDialogRules] = useState<GlobalAlertRule[]>([]);
  const [alertTimeRange, setAlertTimeRange] = useState<string>('Past 30 days');
  const [alertCustomDateRange, setAlertCustomDateRange] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });

  // ── Save/Share Dialogs ──
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveDesc, setSaveDesc] = useState('');
  const [shareOpen, setShareOpen] = useState(false);
  const [subscriptionOpen, setSubscriptionOpen] = useState(false);

  // ── Templates ──
  const [templates, setTemplates] = useState<{ id: string; name: string; description?: string; isTemplate?: boolean }[]>([]);

  // ── Refs ──
  const cardsRef = useRef(cards);
  cardsRef.current = cards;
  const initializedTenantIdRef = useRef<string | null>(null);

  // ── Scroll to dashboard when switching section ──
  useEffect(() => {
    if (activeSection !== 'dashboard') return;
    if (!pendingScrollToDashboard) return;
    dashboardViewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setPendingScrollToDashboard(false);
  }, [activeSection, pendingScrollToDashboard]);

  // ── Fetch alert rules when dialog opens ──
  useEffect(() => {
    if (addAlertOpen) {
      globalAlertService.getGlobalAlertRules().then(rules => {
        setDialogRules(rules);
        setAlertRuleId('');
      });
    } else {
      setDialogRules([]);
    }
  }, [addAlertOpen]);

  // ── Refresh templates list ──
  const refreshTemplates = useCallback(() => {
    listAnalyses().then(list => {
      if (Array.isArray(list)) {
        setTemplates(list.map(i => ({ id: i.id, name: i.name, description: i.description, isTemplate: i.isTemplate })));
      } else {
        setTemplates([]);
      }
    }).catch(e => {
      console.error("Failed to load templates", e);
      setTemplates([]);
    });
  }, []);

  // ── Load templates on mount ──
  useEffect(() => {
    refreshTemplates();
  }, [refreshTemplates]);

  // ── Drag and drop ──
  const onDragStart = useCallback((index: number) => (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData('text/plain', String(index));
  }, []);

  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const onDrop = useCallback((index: number) => (e: React.DragEvent<HTMLDivElement>) => {
    const fromIndex = Number(e.dataTransfer.getData('text/plain'));
    if (Number.isNaN(fromIndex)) return;
    setCards(prev => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(index, 0, moved);
      return next;
    });
  }, []);

  // ── Card operations ──
  const resizeCard = useCallback((index: number, size: BICardSize) => {
    setCards(prev => prev.map((c, i) => i === index ? { ...c, size } : c));
  }, []);

  const removeCard = useCallback((index: number) => {
    setCards(prev => prev.filter((_, i) => i !== index));
  }, []);

  // ── Board management ──
  const resetBoard = useCallback(() => {
    setCards([]);
    clearCardDataMap();
    setCurrentAnalysisId(null);
    setSaveName('');
    setSaveDesc('');
    localStorage.removeItem(getLastAnalysisStorageKey(user?.tenantId));
    clearLegacyLastAnalysisStorageKey();
    toast({ title: 'Board Reset', description: 'Started a new analysis' });
  }, [clearCardDataMap, toast, user?.tenantId]);

  const handleSave = useCallback(async () => {
    if (!saveName.trim()) {
      toast({ title: 'Enter analysis name', description: 'Name cannot be empty' });
      return;
    }

    if (!user) {
      toast({ title: 'Error', description: 'User not authenticated', variant: 'destructive' });
      return;
    }

    const currentCards = cardsRef.current;
    if (currentAnalysisId) {
      await updateAnalysis({ id: currentAnalysisId, userId: user.userId, name: saveName.trim(), description: saveDesc.trim(), cards: currentCards });
      toast({ title: 'Updated', description: 'Analysis board has been updated' });
    } else {
      const record = await saveAnalysis({ id: "", name: saveName.trim(), description: saveDesc.trim(), cards: currentCards, userId: user.userId });
      setCurrentAnalysisId(record.id);
      localStorage.setItem(getLastAnalysisStorageKey(user.tenantId), record.id);
      clearLegacyLastAnalysisStorageKey();
      toast({ title: 'Saved', description: 'Analysis board has been saved' });
    }

    setSaveOpen(false);
    refreshTemplates();
  }, [currentAnalysisId, saveName, saveDesc, user?.userId, toast, refreshTemplates]);

  const handleSaveAsNew = useCallback(async () => {
    if (!saveName.trim()) {
      toast({ title: 'Enter analysis name', description: 'Name cannot be empty' });
      return;
    }
    if (!user) {
      toast({ title: 'Error', description: 'User not authenticated', variant: 'destructive' });
      return;
    }

    const currentCards = cardsRef.current;
    const record = await saveAnalysis({ id: "", name: saveName.trim(), description: saveDesc.trim(), cards: currentCards, userId: user.userId });
    setCurrentAnalysisId(record.id);
    localStorage.setItem(getLastAnalysisStorageKey(user.tenantId), record.id);
    clearLegacyLastAnalysisStorageKey();
    setSaveOpen(false);
    refreshTemplates();
    toast({ title: 'Saved', description: 'Analysis saved as new copy' });
  }, [saveName, saveDesc, user?.userId, toast, refreshTemplates]);

  const loadTemplate = useCallback(async (id: string, fromStorage = false) => {
    try {
      const tpl = await getAnalysis(id);
      if (!tpl) return;
      clearCardDataMap();
      setCards(tpl.cards);
      if (tpl.isTemplate) {
        setCurrentAnalysisId(null);
        localStorage.removeItem(getLastAnalysisStorageKey(user?.tenantId));
        clearLegacyLastAnalysisStorageKey();
        toast({ title: 'Template loaded', description: `Loaded "${tpl.name}" as a new board` });
      } else {
        setCurrentAnalysisId(tpl.id);
        localStorage.setItem(getLastAnalysisStorageKey(user?.tenantId), tpl.id);
        clearLegacyLastAnalysisStorageKey();
        toast({ title: 'Analysis loaded', description: `Board switched to "${tpl.name}"` });
      }
      setSaveName(tpl.name);
      setSaveDesc(tpl.description || '');
      setActiveSection('dashboard');
      setPendingScrollToDashboard(true);
    } catch (error) {
      if (fromStorage) {
        localStorage.removeItem(getLastAnalysisStorageKey(user?.tenantId));
        clearLegacyLastAnalysisStorageKey();
      }
      throw error;
    }
  }, [clearCardDataMap, toast, user?.tenantId]);

  // ── Load last visited analysis on mount ──
  useEffect(() => {
    const tenantId = user?.tenantId;
    if (!tenantId) return;
    if (initializedTenantIdRef.current === tenantId) return;
    initializedTenantIdRef.current = tenantId;

    clearLegacyLastAnalysisStorageKey();

    const lastId = localStorage.getItem(getLastAnalysisStorageKey(tenantId));
    if (lastId) {
      void loadTemplate(lastId, true).catch(error => {
        console.error('Failed to restore last analysis', error);
      });
    }
  }, [loadTemplate, user?.tenantId]);

  const deleteTemplate = useCallback(async (id: string) => {
    await deleteAnalysis(id);
    if (currentAnalysisId === id) {
      localStorage.removeItem(getLastAnalysisStorageKey(user?.tenantId));
      clearLegacyLastAnalysisStorageKey();
      setCurrentAnalysisId(null);
    }
    refreshTemplates();
    toast({ title: 'Deleted', description: 'Analysis deleted' });
  }, [currentAnalysisId, toast, refreshTemplates, user?.tenantId]);

  const toggleTemplate = useCallback(async (template: typeof templates[0]) => {
    const newStatus = !template.isTemplate;
    setTemplates(prev => prev.map(t => t.id === template.id ? { ...t, isTemplate: newStatus } : t));
    await updateAnalysisTemplate({ id: template.id, isTemplate: newStatus });
    toast({ title: 'Updated', description: `Analysis ${newStatus ? 'set as template' : 'removed from templates'}` });
  }, [toast]);

  const copyShareLink = useCallback(() => {
    if (!currentAnalysisId) return;
    let url = `${window.location.origin}/share/analysis/${currentAnalysisId}`;
    if (token) {
      url += `?token=${token}`;
    }
    navigator.clipboard.writeText(url);
    toast({ title: 'Copied', description: 'Share link copied to clipboard' });
  }, [currentAnalysisId, token, toast]);

  const confirmAddAlert = useCallback(() => {
    if (!alertRuleId) return;
    const rule = dialogRules.find(r => r.id === alertRuleId);
    if (!rule) return;

    const metricId = rule.conditions?.[0]?.metricId || '';
    const metricName = rule.conditions?.[0]?.metricName || metricId;

    const rangeStr = toTimeRangeValue(alertTimeRange, alertCustomDateRange);
    if (rangeStr === null) {
      toast({ title: 'Invalid Date Range', description: 'Please select start and end dates' });
      return;
    }

    const newCard: BIChartCard = {
      id: `card_${Date.now()}`,
      title: rule.name || `${metricName} · Alert`,
      metricId: metricName, // Use metricName for compatibility with MetricFlow
      chartType: 'alert',
      size: 'md',
      selection: { dimensions: [], timeRange: rangeStr },
      alert: rule
    };

    setCards(prev => [...prev, newCard]);
    toast({ title: 'Added', description: 'Alert card added to dashboard' });
    setAddAlertOpen(false);
    setAlertRuleId('');
    setAlertTimeRange('Past 30 days');
  }, [alertRuleId, dialogRules, alertTimeRange, alertCustomDateRange, toast]);

  // ── Alert Acknowledge Dialog ──
  const [ackAlertId, setAckAlertId] = useState<string | null>(null);

  const handleAcknowledge = useCallback((alertId: string) => {
    setAckAlertId(alertId);
  }, []);

  const confirmAcknowledge = useCallback(async (reason?: string, intervalDays?: number) => {
    if (!ackAlertId) return;
    try {
      const intervalMinutes = intervalDays ? intervalDays * 24 * 60 : undefined;
      const result = await globalAlertService.acknowledgeAlert(ackAlertId, reason, intervalMinutes);

      setAlertStatusMap(prev => {
        const next = { ...prev };
        const cardId = Object.keys(next).find(k => next[k].id === ackAlertId);
        if (cardId && next[cardId]) {
          next[cardId] = {
            ...next[cardId],
            acknowledged: true,
            acknowledgedBy: result?.acknowledgedBy || user?.name || 'User',
            acknowledgedAt: result?.acknowledgedAt || new Date().toISOString(),
            acknowledgeReason: reason,
            actionExecuted: result?.actionExecuted,
            nextTriggerTime: result?.nextTriggerTime,
            intervalMinutes: result?.intervalMinutes
          };
        }
        return next;
      });

      const messages: string[] = [];
      if (result?.actionExecuted) {
        messages.push('Notification sent');
      }
      if (result?.nextTriggerTime) {
        const muteUntil = new Date(result.nextTriggerTime).toLocaleString();
        messages.push(`Muted until ${muteUntil}`);
      } else if (result?.intervalMinutes) {
        const muteMins = result.intervalMinutes;
        const muteLabel = muteMins >= 1440 ? `${Math.round(muteMins / 1440)} days` : muteMins >= 60 ? `${Math.round(muteMins / 60)} hours` : `${muteMins} minutes`;
        messages.push(`Mute period: ${muteLabel}`);
      }

      toast({
        title: 'Confirmed',
        description: messages.length > 0 ? messages.join(', ') : 'Alert confirmed'
      });
    } catch (e) {
      console.error('Failed to acknowledge alert', e);
      toast({ title: 'Error', description: 'Failed to acknowledge alert', variant: 'destructive' });
    } finally {
      setAckAlertId(null);
    }
  }, [ackAlertId, user?.name, toast, setAlertStatusMap]);

  return {
    // State
    currentAnalysisId,
    activeSection,
    cards,
    setCards,
    metricBuilderOpen,
    setMetricBuilderOpen,
    dashboardViewRef,
    pendingScrollToDashboard,
    setPendingScrollToDashboard,
    addAlertOpen,
    setAddAlertOpen,
    alertRuleId,
    setAlertRuleId,
    dialogRules,
    setDialogRules,
    alertTimeRange,
    setAlertTimeRange,
    alertCustomDateRange,
    setAlertCustomDateRange,
    saveOpen,
    setSaveOpen,
    saveName,
    setSaveName,
    saveDesc,
    setSaveDesc,
    shareOpen,
    setShareOpen,
    subscriptionOpen,
    setSubscriptionOpen,
    templates,
    cardsRef,
    ackAlertId,
    setAckAlertId,

    // Actions
    setActiveSection,
    onDragStart,
    onDragOver,
    onDrop,
    resizeCard,
    removeCard,
    resetBoard,
    handleSave,
    handleSaveAsNew,
    loadTemplate,
    deleteTemplate,
    toggleTemplate,
    copyShareLink,
    confirmAddAlert,
    handleAcknowledge,
    confirmAcknowledge,
    refreshTemplates,
  };
};
