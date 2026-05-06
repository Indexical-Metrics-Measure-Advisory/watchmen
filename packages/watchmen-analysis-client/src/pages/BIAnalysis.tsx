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
  const { user } = useAuth();
  const { token } = useAuth();
  const navigate = useNavigate();

  // ── Hook: Card data loader ──
  const {
    cardDataMap,
    alertStatusMap,
    isBoardRefreshing,
    setIsBoardRefreshing,
    loadCardDataFor,
    refreshCardsWithContext,
    refreshData,
    clearCardDataMap,
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
    initialLoadDone,
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
    toast({ title: 'Refreshing', description: 'Refreshing all cards...' });
    await refreshCardsWithContext(cardsRef.current, {
      globalTimeRange,
      globalCustomDateRange,
      globalFilterValues,
    });
    setIsBoardRefreshing(false);
  }, [refreshCardsWithContext, globalTimeRange, globalCustomDateRange, globalFilterValues, cardsRef, toast, setIsBoardRefreshing]);

  // ── Stable card IDs key for effects — order-independent so drag reorder doesn't trigger ──
  const cardIdsKey = useMemo(() => cards.map(c => c.id).sort().join(','), [cards]);

  // ── Load card data when cards change (only for missing ones) ──
  // Using a ref to track dispatched card IDs avoids re-dispatching loads
  // for cards that are already in-flight or have data.
  // NOTE: Depends on cardIdsKey (order-independent), NOT the full cards reference,
  // so drag reorder (which changes array order but not IDs) does NOT trigger this.
  const loadedCardIdsRef = React.useRef<Set<string>>(new Set());
  useEffect(() => {
    if (cards.length === 0) return;
    let hasNewCards = false;
    cards.forEach(c => {
      if (cardDataMap[c.id] || loadedCardIdsRef.current.has(c.id)) return;
      loadedCardIdsRef.current.add(c.id);
      hasNewCards = true;
      void loadCardDataFor(c, {
        globalTimeRange,
        globalCustomDateRange,
        globalFilterValues,
      });
    });
    // Only clean up removed card IDs when the list actually changed
    if (hasNewCards) {
      const currentIds = new Set(cards.map(c => c.id));
      loadedCardIdsRef.current.forEach(id => {
        if (!currentIds.has(id)) loadedCardIdsRef.current.delete(id);
      });
    }
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
                <h1 className="text-2xl font-bold tracking-tight">Metrics Analysis</h1>
                <p className="text-sm text-muted-foreground">Build multi-dimensional metrics, smart chart recommendations, and a card dashboard</p>
              </div>
            </div>
            <div className="flex items-center flex-wrap gap-2">
              <Button variant="outline" onClick={() => navigate('/metrics/tree', { state: { cards } })} className="gap-2">
                <Network className="h-4 w-4" />
                Metric Tree
              </Button>
              <Button variant="outline" onClick={() => setMetricBuilderOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Metric
              </Button>
              <Button variant="ghost" onClick={resetBoard} className="gap-2">
                <RotateCcw className="h-4 w-4" />
                Reset
              </Button>
              <Button variant="outline" onClick={() => setShareOpen(true)} className="gap-2" disabled={!currentAnalysisId}>
                <Share2 className="h-4 w-4" />
                Share
              </Button>
              <Button variant="default" onClick={() => setSaveOpen(true)} className="gap-2">
                <Save className="h-4 w-4" />
                Save Analysis
              </Button>
            </div>
          </div>

          <Tabs value={activeSection} onValueChange={(v) => setActiveSection(v as 'dashboard' | 'saved')} className="w-full">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <TabsList className="w-fit">
                <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                <TabsTrigger value="saved">Saved</TabsTrigger>
              </TabsList>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">{cards.length} cards</Badge>
                <Badge variant="outline" className="text-xs">{commonFilterDimensions.length} global dims</Badge>
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
                <h2 className="text-xl font-semibold tracking-tight">Saved Analyses</h2>
                <Button variant="outline" onClick={() => setSaveOpen(true)} className="gap-2">
                  <Save className="h-4 w-4" />
                  Save Current
                </Button>
              </div>

              {templates.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-muted-foreground border-2 border-dashed rounded-lg bg-muted/30">
                  <p>No saved analyses yet</p>
                  <p className="text-sm">Save your current board to see it here</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {templates.map(t => (
                    <Card key={t.id} className="group hover:shadow-md transition-all duration-200">
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start gap-2">
                          <CardTitle className="text-base font-medium truncate" title={t.name}>{t.name}</CardTitle>
                          {t.isTemplate && <Badge variant="secondary" className="text-[10px] h-5 px-1.5">Template</Badge>}
                        </div>
                        <CardDescription className="text-xs line-clamp-2 min-h-[2.5em]">
                          {t.description || 'No description provided'}
                        </CardDescription>
                      </CardHeader>

                      <CardFooter className="pt-0 flex justify-between gap-2">
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => loadTemplate(t.id)}>
                          Load
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={t.isTemplate ? "text-primary bg-primary/10 hover:bg-primary/20" : "text-muted-foreground hover:text-primary"}
                          title={t.isTemplate ? "Unset as Template" : "Set as Template"}
                          onClick={() => toggleTemplate(t)}
                        >
                          <LayoutTemplate className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => deleteTemplate(t.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Alert Card</DialogTitle>
          <DialogDescription>
            Select an alert rule to add to the dashboard.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Alert Rule</Label>
            <Select value={alertRuleId} onValueChange={onAlertRuleIdChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select rule..." />
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
            <Label>Time Range</Label>
            <Select value={alertTimeRange} onValueChange={onAlertTimeRangeChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Past 7 days">Past 7 days</SelectItem>
                <SelectItem value="Past 30 days">Past 30 days</SelectItem>
                <SelectItem value="Past 90 days">Past 90 days</SelectItem>
                <SelectItem value="Past year">Past year</SelectItem>
                <SelectItem value="Custom">Custom Range</SelectItem>
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onConfirm} disabled={!alertRuleId}>Add Alert</Button>
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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{currentAnalysisId ? 'Update Analysis' : 'Save New Analysis'}</DialogTitle>
          <DialogDescription>
            {currentAnalysisId ? 'Update the existing analysis or save as a new copy' : 'Save the current board as a reusable template'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-sm">Name</label>
            <Input value={saveName} onChange={(e) => onSaveNameChange(e.target.value)} placeholder="Enter analysis name" />
          </div>
          <div>
            <label className="text-sm">Description</label>
            <Input value={saveDesc} onChange={(e) => onSaveDescChange(e.target.value)} placeholder="Optional: brief description of purpose" />
          </div>
        </div>
        <DialogFooter>
          {currentAnalysisId && (
            <Button variant="outline" onClick={onSaveAsNew}>
              Save as New
            </Button>
          )}
          <Button onClick={onSave}>{currentAnalysisId ? 'Update' : 'Save'}</Button>
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
          <DialogTitle>Share Analysis</DialogTitle>
          <DialogDescription>
            Share this analysis with external users. {token ? 'The link includes your current authentication token.' : 'Please log in to generate a secure link.'}
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
          <Button onClick={() => window.open(shareLink, '_blank')} disabled={!shareLink}>Open Link</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default BIAnalysisPage;
