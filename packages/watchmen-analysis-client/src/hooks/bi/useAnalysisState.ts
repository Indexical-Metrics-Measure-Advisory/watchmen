import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { DateRange } from 'react-day-picker';
import { addDays, format } from 'date-fns';
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

export const useAnalysisState = (options: UseAnalysisStateOptions) => {
  const { clearCardDataMap, setAlertStatusMap } = options;
  const { toast } = useToast();
  const { user } = useAuth();
  const { token } = useAuth();

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
  const initialLoadDone = useRef(false);

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
    localStorage.removeItem('watchmen_bi_last_analysis_id');
    toast({ title: 'Board Reset', description: 'Started a new analysis' });
  }, [clearCardDataMap, toast]);

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
    setSaveOpen(false);
    refreshTemplates();
    toast({ title: 'Saved', description: 'Analysis saved as new copy' });
  }, [saveName, saveDesc, user?.userId, toast, refreshTemplates]);

  const loadTemplate = useCallback(async (id: string) => {
    const tpl = await getAnalysis(id);
    if (!tpl) return;
    clearCardDataMap();
    setCards(tpl.cards);
    if (tpl.isTemplate) {
      setCurrentAnalysisId(null);
      localStorage.removeItem('watchmen_bi_last_analysis_id');
      toast({ title: 'Template loaded', description: `Loaded "${tpl.name}" as a new board` });
    } else {
      setCurrentAnalysisId(tpl.id);
      localStorage.setItem('watchmen_bi_last_analysis_id', tpl.id);
      toast({ title: 'Analysis loaded', description: `Board switched to "${tpl.name}"` });
    }
    setSaveName(tpl.name);
    setSaveDesc(tpl.description || '');
    setActiveSection('dashboard');
    setPendingScrollToDashboard(true);
  }, [clearCardDataMap, toast]);

  // ── Load last visited analysis on mount ──
  useEffect(() => {
    if (initialLoadDone.current) return;
    initialLoadDone.current = true;

    const lastId = localStorage.getItem('watchmen_bi_last_analysis_id');
    if (lastId) {
      void loadTemplate(lastId);
    }
  }, [loadTemplate]);

  const deleteTemplate = useCallback(async (id: string) => {
    await deleteAnalysis(id);
    refreshTemplates();
    toast({ title: 'Deleted', description: 'Analysis deleted' });
  }, [toast, refreshTemplates]);

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

  const handleAcknowledge = useCallback(async (alertId: string) => {
    try {
      await globalAlertService.acknowledgeAlert(alertId);
      setAlertStatusMap(prev => {
        const next = { ...prev };
        const cardId = Object.keys(next).find(k => next[k].id === alertId);
        if (cardId && next[cardId]) {
          next[cardId] = {
            ...next[cardId],
            acknowledged: true,
            acknowledgedBy: user?.name || 'User',
            acknowledgedAt: new Date().toISOString()
          };
        }
        return next;
      });
      toast({ title: 'Acknowledged', description: 'Alert has been acknowledged' });
    } catch (e) {
      console.error('Failed to acknowledge alert', e);
      toast({ title: 'Error', description: 'Failed to acknowledge alert', variant: 'destructive' });
    }
  }, [user?.name, toast, setAlertStatusMap]);

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
    initialLoadDone,

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
    refreshTemplates,
  };
};
