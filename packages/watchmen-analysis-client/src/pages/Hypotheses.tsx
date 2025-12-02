import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useSidebar } from '@/contexts/SidebarContext';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import HypothesisForm from '@/components/hypothesis/HypothesisForm';
import HypothesisHeader from '@/components/hypothesis/HypothesisHeader';
import HypothesisFilters from '@/components/hypothesis/HypothesisFilters';
import HypothesisGrid from '@/components/hypothesis/HypothesisGrid';
import { useHypothesisManagement } from '@/hooks/useHypothesisManagement';

const Hypotheses: React.FC = () => {
  const { collapsed } = useSidebar();
  const [formMode, setFormMode] = useState<'edit' | 'link'>('link');
  // AI Assistant has been removed
  const [isGeneratingAnalysis, setIsGeneratingAnalysis] = useState(false);
  const location = useLocation();
  
  const {
    hypotheses,
    formOpen,
    setFormOpen,
    editingHypothesis,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    problemFilter,
    setProblemFilter,
    sortOrder,
    setSortOrder,
    selectedProblem,
    handleCreateHypothesis,
    handleEditHypothesis,
    handleViewHypothesisMetrics,
    handleSubmitHypothesis
  } = useHypothesisManagement();

  // AI Assistant URL trigger removed

  // Custom edit handler to set mode to 'edit' and merge data into the form
  const handleEdit = (id: string) => {
    setFormMode('edit');
    const hypothesisToEdit = hypotheses.find(hypothesis => hypothesis.id === id);
    if (hypothesisToEdit) {
      setFormOpen(true); // Ensure the form is opened
      handleEditHypothesis(hypothesisToEdit.id);
      // Pass the selected hypothesis data to the form
      setFormOpen(true);
    }
  };

  // Custom create handler to set mode to 'edit'
  const handleCreate = (problemId?: string) => {
    setFormMode('edit');
    handleCreateHypothesis(problemId);
  };

  // toggleAiAssistant removed

  // Add new handler for analysis generation
  const handleGenerateAnalysis = async () => {
    // Placeholder: analysis generation without AI assistant
    setIsGeneratingAnalysis(true);
    try {
      // No-op or integrate with existing analysis flow if needed
    } catch (error) {
      console.error('Failed to generate analysis:', error);
    } finally {
      setIsGeneratingAnalysis(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      
      <div className={`${collapsed ? 'pl-20' : 'pl-56'} min-h-screen transition-all duration-300`}>
        <Header />
        
        <main className="container py-6">
          <HypothesisHeader 
            selectedProblem={selectedProblem} 
            handleCreateHypothesis={handleCreate}
            problemFilter={problemFilter}
            mode={formMode}
            setMode={setFormMode}
            onGenerateAnalysis={handleGenerateAnalysis}
            isGeneratingAnalysis={isGeneratingAnalysis}
          />
          
          <div className="grid grid-cols-1 gap-6 mb-6 md:grid-cols-3">
            <div className="md:col-span-3">
              <HypothesisFilters
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                problemFilter={problemFilter}
                setProblemFilter={setProblemFilter}
                sortOrder={sortOrder}
                setSortOrder={setSortOrder}
                selectedProblem={!!selectedProblem}
              />
              
              <HypothesisGrid 
                hypotheses={hypotheses}
                onEdit={handleEdit}
                onViewMetrics={handleViewHypothesisMetrics}
                problemFilter={problemFilter}
                handleCreateHypothesis={handleCreate}
                selectedProblem={selectedProblem}
                allHypotheses={hypotheses}
              />
            </div>
          </div>
        </main>
      </div>
      
      <HypothesisForm
        open={formOpen}
        onOpenChange={setFormOpen}
        initialData={editingHypothesis}
        onSubmit={handleSubmitHypothesis}
        allHypotheses={hypotheses}
        mode={formMode}
      />
    </div>
  );
};

export default Hypotheses;
