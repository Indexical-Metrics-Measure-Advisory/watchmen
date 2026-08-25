import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSidebar } from '@/contexts/SidebarContext';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import HypothesisForm from '@/components/hypothesis/HypothesisForm';
import AIHypothesisGenerator from '@/components/hypothesis/AIHypothesisGenerator';
import WorkbenchStats from '@/components/hypothesis/workbench/WorkbenchStats';
import DueValidationPanel from '@/components/hypothesis/workbench/DueValidationPanel';
import HypothesisKanban from '@/components/hypothesis/workbench/HypothesisKanban';
import { useHypothesisManagement } from '@/hooks/useHypothesisManagement';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Plus, Search, Sparkles, X } from 'lucide-react';

const Hypotheses: React.FC = () => {
  const { collapsed } = useSidebar();
  const { t } = useTranslation('hypothesis');
  const navigate = useNavigate();
  const [formMode, setFormMode] = useState<'edit' | 'link'>('link');

  const {
    hypotheses,
    allHypotheses,
    formOpen,
    setFormOpen,
    editingHypothesis,
    searchTerm,
    setSearchTerm,
    challengeFilter,
    setChallengeFilter,
    metricFilter,
    clearMetricFilter,
    selectedChallenge,
    challengeTitles,
    aiGeneratorOpen,
    setAIGeneratorOpen,
    handleCreateHypothesis,
    handleEditHypothesis,
    handleSubmitHypothesis,
    handleGenerateWithAI,
    handleSubmitGeneratedHypothesis,
    updateStatus,
    runValidation,
    handleDeleteHypothesis,
    refresh
  } = useHypothesisManagement();

  const handleEdit = (id: string) => {
    setFormMode('edit');
    handleEditHypothesis(id);
  };

  const handleCreate = (challengeId?: string) => {
    setFormMode('edit');
    handleCreateHypothesis(challengeId);
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />

      <div className={`${collapsed ? 'pl-20' : 'pl-56'} min-h-screen transition-all duration-300`}>
        <Header />

        <main className="container py-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <div className="flex items-center gap-2">
                {selectedChallenge && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mr-2"
                    onClick={() => navigate('/challenges')}
                  >
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    {t('backToChallenges')}
                  </Button>
                )}
                <h1 className="text-2xl font-semibold">
                  {selectedChallenge
                    ? t('challengeTitle', { title: selectedChallenge.title })
                    : t('title')}
                </h1>
              </div>
              {selectedChallenge && (
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedChallenge.description}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              {selectedChallenge && (
                <Button
                  onClick={handleGenerateWithAI}
                  variant="outline"
                  className="hover-float"
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  {t('generateWithAI')}
                </Button>
              )}
              <Button
                onClick={() => handleCreate(challengeFilter !== 'all' ? challengeFilter : undefined)}
                className="hover-float"
              >
                <Plus className="mr-2 h-4 w-4" />
                {t('newHypothesis')}
              </Button>
            </div>
          </div>

          <WorkbenchStats hypotheses={allHypotheses} />

          <DueValidationPanel hypotheses={allHypotheses} onRefresh={refresh} />

          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder={t('searchPlaceholder')}
                className="pl-9"
              />
            </div>

            <Select value={challengeFilter} onValueChange={setChallengeFilter}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder={t('allChallenges')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allChallenges')}</SelectItem>
                {Object.entries(challengeTitles).map(([id, title]) => (
                  <SelectItem key={id} value={id}>{title}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {metricFilter && (
              <Badge variant="secondary" className="flex items-center gap-1 py-1.5">
                {t('metricFilter', { metric: metricFilter })}
                <button
                  onClick={clearMetricFilter}
                  title={t('clearMetricFilter')}
                  className="ml-1 rounded-full hover:bg-muted-foreground/20 p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
          </div>

          {hypotheses.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">{t('empty.noResults')}</p>
              <Button
                onClick={() => handleCreate(challengeFilter !== 'all' ? challengeFilter : undefined)}
                variant="outline"
                className="mt-4"
              >
                <Plus className="mr-2 h-4 w-4" />
                {t('newHypothesis')}
              </Button>
            </div>
          ) : (
            <HypothesisKanban
              hypotheses={hypotheses}
              onMoveHypothesis={updateStatus}
              onEdit={handleEdit}
              onValidate={runValidation}
              onDelete={handleDeleteHypothesis}
            />
          )}
        </main>
      </div>

      <HypothesisForm
        open={formOpen}
        onOpenChange={setFormOpen}
        initialData={editingHypothesis}
        onSubmit={handleSubmitHypothesis}
        allHypotheses={allHypotheses}
        mode={formMode}
      />

      <AIHypothesisGenerator
        open={aiGeneratorOpen}
        onOpenChange={setAIGeneratorOpen}
        businessChallenge={selectedChallenge}
        onGenerate={handleSubmitGeneratedHypothesis}
      />
    </div>
  );
};

export default Hypotheses;
