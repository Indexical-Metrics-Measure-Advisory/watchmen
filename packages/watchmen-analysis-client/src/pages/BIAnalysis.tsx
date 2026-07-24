import React, { useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { useSidebar } from '@/contexts/SidebarContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from '@/components/ui/label';
import { 
  LayoutDashboard, 
  Plus, 
  Save, 
  Trash2, 
  LayoutTemplate, 
  RotateCcw, 
  Share2, 
  Copy,
  Network
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AnalysisBoard } from '@/components/bi/AnalysisBoard';
import { MetricBuilderSheet } from '@/components/bi/MetricBuilderSheet';
import { AcknowledgeAlertDialog } from '@/components/bi/AcknowledgeAlertDialog';
const LazySubscriptionModal = lazy(() => import('@/components/bi/SubscriptionModal').then(m => ({ default: m.SubscriptionModal })));
import { BIChartCard, GlobalAlertRule } from '@/model/biAnalysis';
import type { DateRange } from 'react-day-picker';
import { useAuth } from '@/contexts/AuthContext';

// ── Custom hooks ──
import { useAnalysisState } from '@/hooks/bi/useAnalysisState';
import { useCardDataLoader } from '@/hooks/bi/useCardDataLoader';
import { useGlobalFilters, GLOBAL_TIME_RANGE_PER_CARD } from '@/hooks/bi/useGlobalFilters';
import { useMetricBuilder } from '@/hooks/bi/useMetricBuilder';

// ─────────────────────────────────────────────────────────────
// Page Component
// ─────────────────────────────────────────────────────────────

const BIAnalysisPage: React.FC = () => {
  const { toast } = useToast();
  const { collapsed } = useSidebar();
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation(['common', 'biAnalysis']);

  // ── Hook: Card data loader ──
  const {
    cardDataMap,
    alertStatusMap,
    isBoardRefreshing,
    setIsBoardRefreshing,
    loadCardDataFor,
    loadCardsDataFor,
    refreshCardsWithContext,
    refreshData,
    clearCardDataMap,
    loadedCardIdsRef,
    setAlertStatusMap,
  } = useCardDataLoader();

  // ── Hook: Analysis state ──
  const {
    currentAnalysisId,
    activeSection,
    cards,
    setCards,
    metricBuilderOpen,
    setMetricBuilderOpen,
    dashboardViewRef,
    pendingScrollToDashboard,
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
  } = useAnalysisState({
    clearCardDataMap,
    setAlertStatusMap,
  });

  // ── Hook: Global filters ──
  const {
    commonFilterDimensions,
    globalFilterValues,
    globalTimeRange,
    globalCustomDateRange,
    handleGlobalFilterChange,
    handleGlobalTimeRangeChange,
    handleGlobalCustomDateRangeChange,
    clearGlobalFilters,
    metricDimsCache,
  } = useGlobalFilters({
    cards,
    onRefreshCards: refreshCardsWithContext,
    setIsBoardRefreshing,
  });

  // ── Stable callbacks for AnalysisBoard ──
  const handleAddAlert = React.useCallback(() => setAddAlertOpen(true), []);
  const handleOpenSubscription = React.useCallback(() => setSubscriptionOpen(true), []);

  // ── Stable callback: add card from MetricBuilder ──
  // Directly load data for the new card instead of relying on useEffect traversal
  const handleCardAdded = React.useCallback((card: BIChartCard) => {
    setCards(prev => [...prev, card]);
    // Eagerly load data for the new card — avoids useEffect traversal over all cards
    void loadCardDataFor(card, {
      globalTimeRange,
      globalCustomDateRange,
      globalFilterValues,
    });
  }, [setCards, loadCardDataFor, globalTimeRange, globalCustomDateRange, globalFilterValues]);

  // ── Hook: Metric Builder ──
  const metricBuilder = useMetricBuilder({
    metricBuilderOpen,
    setMetricBuilderOpen,
    metricDimsCache,
    onCardAdded: handleCardAdded,
    setActiveSection,
  });

  // ── Refresh data button handler ──
  const onRefreshData = useCallback(async () => {
    setIsBoardRefreshing(true);
    toast({ title: t('biAnalysis:toast.refreshingTitle'), description: t('biAnalysis:toast.refreshingDescription') });
    await refreshCardsWithContext(cardsRef.current, {
      globalTimeRange,
      globalCustomDateRange,
      globalFilterValues,
    });
    setIsBoardRefreshing(false);
  }, [refreshCardsWithContext, globalTimeRange, globalCustomDateRange, globalFilterValues, cardsRef, toast, setIsBoardRefreshing, t]);

  // ── Stable card IDs key for effects — order-independent so drag reorder doesn't trigger ──
  const cardIdsKey = useMemo(() => cards.map(c => c.id).sort().join(','), [cards]);

  // ── Load card data when cards change (only for missing ones) ──
  // loadedCardIdsRef lives inside useCardDataLoader so it can be reset when loading a new template.
  // NOTE: Depends on cardIdsKey (order-independent), NOT the full cards reference,
  // so drag reorder (which changes array order but not IDs) does NOT trigger this.
  useEffect(() => {
    if (cards.length === 0) return;
    const newCards = cards.filter(c => !cardDataMap[c.id] && !loadedCardIdsRef.current.has(c.id));
    if (newCards.length === 0) return;
    newCards.forEach(c => loadedCardIdsRef.current.add(c.id));
    // Single batched load — one state update for all new cards instead of one per card
    void loadCardsDataFor(newCards, {
      globalTimeRange,
      globalCustomDateRange,
      globalFilterValues,
    });
    // Only clean up removed card IDs when the list actually changed
    const currentIds = new Set(cards.map(c => c.id));
    loadedCardIdsRef.current.forEach(id => {
      if (!currentIds.has(id)) loadedCardIdsRef.current.delete(id);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardIdsKey]);

  // ─────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />

      <div className={`${collapsed ? 'pl-20' : 'pl-56'} min-h-screen transition-[padding] duration-300`}>
        <Header />

        <main className="container py-6 space-y-6">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 border-b pb-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-xl">
                <LayoutDashboard className="h-8 w-8 text-primary" />
              </div>
              <div className="space-y-1">
                <h1 className="text-2xl font-bold tracking-tight">{t('biAnalysis:page.title')}</h1>
                <p className="text-sm text-muted-foreground">{t('biAnalysis:page.subtitle')}</p>
              </div>
            </div>
            <div className="flex items-center flex-wrap gap-2">
              <Button variant="outline" onClick={() => navigate('/metrics/tree', { state: { cards } })} className="gap-2">
                <Network className="h-4 w-4" />
                {t('biAnalysis:page.metricTree')}
              </Button>
              <Button variant="outline" onClick={() => setMetricBuilderOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                {t('biAnalysis:page.addMetric')}
              </Button>
              <Button variant="ghost" onClick={resetBoard} className="gap-2">
                <RotateCcw className="h-4 w-4" />
                {t('biAnalysis:page.reset')}
              </Button>
              <Button variant="outline" onClick={() => setShareOpen(true)} className="gap-2" disabled={!currentAnalysisId}>
                <Share2 className="h-4 w-4" />
                {t('biAnalysis:page.share')}
              </Button>
              <Button variant="default" onClick={() => setSaveOpen(true)} className="gap-2">
                <Save className="h-4 w-4" />
                {t('biAnalysis:page.saveAnalysis')}
              </Button>
            </div>
          </div>

          <Tabs value={activeSection} onValueChange={(v) => setActiveSection(v as 'dashboard' | 'saved')} className="w-full">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <TabsList className="w-fit">
                <TabsTrigger value="dashboard">{t('biAnalysis:page.dashboard')}</TabsTrigger>
                <TabsTrigger value="saved">{t('biAnalysis:page.saved')}</TabsTrigger>
              </TabsList>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">{t('biAnalysis:page.cardsCount', { count: cards.length })}</Badge>
                <Badge variant="outline" className="text-xs">{t('biAnalysis:page.globalDimsCount', { count: commonFilterDimensions.length })}</Badge>
              </div>
            </div>

            <TabsContent value="dashboard" className="mt-4">
              <div ref={dashboardViewRef}>
                <AnalysisBoard
                  cards={cards}
                  cardDataMap={cardDataMap}
                  onDragStart={onDragStart}
                  onDragOver={onDragOver}
                  onDrop={onDrop}
                  onResize={resizeCard}
                  onRemove={removeCard}
                  onAddAlert={handleAddAlert}
                  onSubscription={currentAnalysisId ? handleOpenSubscription : undefined}
                  alertStatusMap={alertStatusMap}
                  onAcknowledge={handleAcknowledge}
                  globalFilterDimensions={commonFilterDimensions}
                  globalFilterValues={globalFilterValues}
                  onGlobalFilterChange={handleGlobalFilterChange}
                  onClearGlobalFilters={clearGlobalFilters}
                  globalTimeRange={globalTimeRange}
                  globalCustomDateRange={globalCustomDateRange}
                  onGlobalTimeRangeChange={handleGlobalTimeRangeChange}
                  onGlobalCustomDateRangeChange={handleGlobalCustomDateRangeChange}
                  onRefresh={onRefreshData}
                  isRefreshing={isBoardRefreshing}
                />
              </div>
            </TabsContent>

            <TabsContent value="saved" className="mt-4 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-semibold tracking-tight">{t('biAnalysis:saved.title')}</h2>
                <Button variant="outline" onClick={() => setSaveOpen(true)} className="gap-2">
                  <Save className="h-4 w-4" />
                  {t('biAnalysis:saved.saveCurrent')}
                </Button>
              </div>

              {templates.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-muted-foreground border-2 border-dashed rounded-lg bg-muted/30">
                  <p>{t('biAnalysis:saved.emptyTitle')}</p>
                  <p className="text-sm">{t('biAnalysis:saved.emptyDescription')}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {templates.map(template => {
                    const isCurrentAnalysis = !template.isTemplate && currentAnalysisId === template.id;
                    return (
                    <Card key={template.id} className="group hover:shadow-md transition-all duration-200">
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start gap-2">
                          <CardTitle className="text-base font-medium truncate" title={template.name}>{template.name}</CardTitle>
                          {template.isTemplate && <Badge variant="secondary" className="text-[10px] h-5 px-1.5">{t('biAnalysis:saved.template')}</Badge>}
                        </div>
                        <CardDescription className="text-xs line-clamp-2 min-h-[2.5em]">
                          {template.description || t('biAnalysis:saved.noDescription')}
                        </CardDescription>
                      </CardHeader>

                      <CardFooter className="pt-0 flex justify-between gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => loadTemplate(template.id)}
                          disabled={isCurrentAnalysis}
                          title={isCurrentAnalysis ? t('biAnalysis:saved.alreadyOpen') : t('biAnalysis:saved.loadAnalysis')}
                        >
                          {isCurrentAnalysis ? t('biAnalysis:saved.opened') : t('biAnalysis:saved.load')}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={template.isTemplate ? "text-primary bg-primary/10 hover:bg-primary/20" : "text-muted-foreground hover:text-primary"}
                          title={template.isTemplate ? t('biAnalysis:saved.unsetTemplate') : t('biAnalysis:saved.setTemplate')}
                          onClick={() => toggleTemplate(template)}
                        >
                          <LayoutTemplate className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => deleteTemplate(template.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </CardFooter>
                    </Card>
                  )})}
                </div>
              )}
            </TabsContent>
          </Tabs>

          <MetricBuilderSheet
            {...metricBuilder.sheetProps}
            {...metricBuilder.metricSelectionProps}
            {...metricBuilder.dimensionProps}
            {...metricBuilder.configProps}
            {...metricBuilder.previewProps}
            onAddToDashboard={metricBuilder.onAddToDashboard}
          />

          <AddAlertCardDialog
            open={addAlertOpen}
            onOpenChange={setAddAlertOpen}
            alertRuleId={alertRuleId}
            onAlertRuleIdChange={setAlertRuleId}
            dialogRules={dialogRules}
            alertTimeRange={alertTimeRange}
            onAlertTimeRangeChange={setAlertTimeRange}
            alertCustomDateRange={alertCustomDateRange}
            onAlertCustomDateRangeChange={setAlertCustomDateRange}
            onConfirm={confirmAddAlert}
          />

          <SaveAnalysisDialog
            open={saveOpen}
            onOpenChange={setSaveOpen}
            currentAnalysisId={currentAnalysisId}
            saveName={saveName}
            onSaveNameChange={setSaveName}
            saveDesc={saveDesc}
            onSaveDescChange={setSaveDesc}
            onSave={handleSave}
            onSaveAsNew={handleSaveAsNew}
          />

          <ShareAnalysisDialog
            open={shareOpen}
            onOpenChange={setShareOpen}
            currentAnalysisId={currentAnalysisId}
            onCopyLink={copyShareLink}
            token={token || undefined}
          />

          <AcknowledgeAlertDialog
            open={!!ackAlertId}
            onOpenChange={(open) => !open && setAckAlertId(null)}
            onConfirm={confirmAcknowledge}
          />

          <Suspense fallback={null}>
            <LazySubscriptionModal
              open={subscriptionOpen}
              onOpenChange={setSubscriptionOpen}
              analysisId={currentAnalysisId || ''}
            />
          </Suspense>
        </main>
      </div>
    </div>
  );
};



type AddAlertCardDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  alertRuleId: string;
  onAlertRuleIdChange: (id: string) => void;
  dialogRules: GlobalAlertRule[];
  alertTimeRange: string;
  onAlertTimeRangeChange: (value: string) => void;
  alertCustomDateRange: DateRange | undefined;
  onAlertCustomDateRangeChange: (range: DateRange | undefined) => void;
  onConfirm: () => void;
};

function AddAlertCardDialog({
  open,
  onOpenChange,
  alertRuleId,
  onAlertRuleIdChange,
  dialogRules,
  alertTimeRange,
  onAlertTimeRangeChange,
  alertCustomDateRange,
  onAlertCustomDateRangeChange,
  onConfirm
}: AddAlertCardDialogProps) {
  const { t } = useTranslation(['common', 'biAnalysis']);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('biAnalysis:alertDialog.title')}</DialogTitle>
          <DialogDescription>
            {t('biAnalysis:alertDialog.description')}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>{t('biAnalysis:alertDialog.rule')}</Label>
            <Select value={alertRuleId} onValueChange={onAlertRuleIdChange}>
              <SelectTrigger>
                <SelectValue placeholder={t('biAnalysis:alertDialog.selectRule')} />
              </SelectTrigger>
              <SelectContent>
                {dialogRules.map(r => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name} ({r.priority})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t('biAnalysis:alertDialog.timeRange')}</Label>
            <Select value={alertTimeRange} onValueChange={onAlertTimeRangeChange}>
              <SelectTrigger>
                <SelectValue placeholder={t('biAnalysis:alertDialog.selectTimeRange')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Past 7 days">{t('biAnalysis:timeRange.past7Days')}</SelectItem>
                <SelectItem value="Past 30 days">{t('biAnalysis:timeRange.past30Days')}</SelectItem>
                <SelectItem value="Past 90 days">{t('biAnalysis:timeRange.past90Days')}</SelectItem>
                <SelectItem value="Past year">{t('biAnalysis:timeRange.pastYear')}</SelectItem>
                <SelectItem value="Custom">{t('biAnalysis:timeRange.custom')}</SelectItem>
              </SelectContent>
            </Select>

            {alertTimeRange === 'Custom' && (
              <div className="pt-1 animate-in fade-in slide-in-from-top-1">
                <DatePickerWithRange
                  date={alertCustomDateRange}
                  onSelect={onAlertCustomDateRangeChange}
                  className="w-full"
                />
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('common:cancel')}</Button>
          <Button onClick={onConfirm} disabled={!alertRuleId}>{t('biAnalysis:alertDialog.addAlert')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type SaveAnalysisDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentAnalysisId: string | null;
  saveName: string;
  onSaveNameChange: (value: string) => void;
  saveDesc: string;
  onSaveDescChange: (value: string) => void;
  onSave: () => void;
  onSaveAsNew: () => void;
};

function SaveAnalysisDialog({
  open,
  onOpenChange,
  currentAnalysisId,
  saveName,
  onSaveNameChange,
  saveDesc,
  onSaveDescChange,
  onSave,
  onSaveAsNew
}: SaveAnalysisDialogProps) {
  const { t } = useTranslation(['common', 'biAnalysis']);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{currentAnalysisId ? t('biAnalysis:saveDialog.updateTitle') : t('biAnalysis:saveDialog.createTitle')}</DialogTitle>
          <DialogDescription>
            {currentAnalysisId ? t('biAnalysis:saveDialog.updateDescription') : t('biAnalysis:saveDialog.createDescription')}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-sm">{t('biAnalysis:saveDialog.name')}</label>
            <Input value={saveName} onChange={(e) => onSaveNameChange(e.target.value)} placeholder={t('biAnalysis:saveDialog.namePlaceholder')} />
          </div>
          <div>
            <label className="text-sm">{t('biAnalysis:saveDialog.description')}</label>
            <Input value={saveDesc} onChange={(e) => onSaveDescChange(e.target.value)} placeholder={t('biAnalysis:saveDialog.descriptionPlaceholder')} />
          </div>
        </div>
        <DialogFooter>
          {currentAnalysisId && (
            <Button variant="outline" onClick={onSaveAsNew}>
              {t('biAnalysis:saveDialog.saveAsNew')}
            </Button>
          )}
          <Button onClick={onSave}>{currentAnalysisId ? t('biAnalysis:saveDialog.update') : t('biAnalysis:saveDialog.save')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type ShareAnalysisDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentAnalysisId: string | null;
  onCopyLink: () => void;
  token?: string;
};

function ShareAnalysisDialog({
  open,
  onOpenChange,
  currentAnalysisId,
  onCopyLink,
  token,
}: ShareAnalysisDialogProps) {
  const { t } = useTranslation('biAnalysis');
  const shareLink = useMemo(() => {
    if (!currentAnalysisId) return '';
    let url = `${window.location.origin}/share/analysis/${currentAnalysisId}`;
    if (token) {
      url += `?token=${token}`;
    }
    return url;
  }, [currentAnalysisId, token]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('shareDialog.title')}</DialogTitle>
          <DialogDescription>
            {token ? t('shareDialog.descriptionWithToken') : t('shareDialog.descriptionWithoutToken')}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex items-center space-x-2">
            <Input value={shareLink} readOnly />
            <Button size="icon" onClick={onCopyLink} disabled={!shareLink}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => window.open(shareLink, '_blank')} disabled={!shareLink}>{t('shareDialog.openLink')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default BIAnalysisPage;
