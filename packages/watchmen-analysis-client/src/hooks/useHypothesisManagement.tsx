
import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { hypothesisService } from '@/services/hypothesisService';
import { HypothesisType } from '@/model/Hypothesis';
import { businessService } from '@/services/businessService';

export const useHypothesisManagement = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const queryParams = new URLSearchParams(location.search);
  const problemIdParam = queryParams.get('problemId');
  const shouldAddHypothesis = queryParams.get('addHypothesis') === 'true';
  
  const [hypotheses, setHypotheses] = useState<HypothesisType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingHypothesis, setEditingHypothesis] = useState<Partial<HypothesisType> | undefined>();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [problemFilter, setProblemFilter] = useState<string>(problemIdParam || 'all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'confidence'>('newest');
  const [mode, setMode] = useState<'edit' | 'link'>('link');
  const [aiGeneratorOpen, setAIGeneratorOpen] = useState(false);
  
  // Get business problem details if filter is active
  

  const [selectedProblem, setSelectedProblem] = useState<any | undefined>();
  
  const fetchHypothesesData = async (businessProblemId: string | null) => {
    try {
      const [hypothesesData, problemData] = await Promise.all([
        businessProblemId
          ? hypothesisService.getHypothesesByProblemId(businessProblemId)
          : hypothesisService.getHypotheses(),
        businessProblemId
          ? businessService.getBusinessProblemById(businessProblemId)
          : Promise.resolve(undefined)
      ]);
  
      return { hypothesesData, problemData };
    } catch (error) {
      throw new Error('Failed to fetch data');
    }
  };
  
  useEffect(() => {
    const fetchHypotheses = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams(location.search);
        const businessProblemId = params.get('problemId');
  
        const { hypothesesData, problemData } = await fetchHypothesesData(businessProblemId);
        
        setHypotheses(hypothesesData);
        setSelectedProblem(problemData);
      } catch (err) {
        setError('Failed to fetch hypotheses');
        toast({
          title: "Error",
          description: "Failed to fetch hypotheses",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
  
    fetchHypotheses();
  
    // Open the form if addHypothesis is true and problemId is provided
    if (shouldAddHypothesis && problemIdParam) {
      handleCreateHypothesis(problemIdParam);
    }
    
    // Set problem filter from URL
    if (problemIdParam) {
      setProblemFilter(problemIdParam);
    }
  }, [problemIdParam, shouldAddHypothesis, problemFilter]);

  const handleCreateHypothesis = (problemId?: string) => {
    setEditingHypothesis({
      businessProblemId: problemId,
      relatedHypothesesIds: [] ,
      status: "drafted",
      confidence: 0,
      metrics: [],
      title: '',
      description: '',
      analysisMethod: 'Trend Analysis'
    });
    setFormOpen(true);
  };

  const handleEditHypothesis = (id: string) => {
    const hypothesis = hypotheses.find(h => h.id === id);
    // console.log('handleEditHypothesis', hypothesis);
    if (hypothesis) {
      setEditingHypothesis(hypothesis);
      setFormOpen(true);
    }
  };

  const handleViewHypothesisMetrics = (id: string) => {
    navigate(`/analysis?hypothesis=${id}`);
  };

  const handleSubmitHypothesis = async (data: Partial<HypothesisType>) => {
    try {
      if (editingHypothesis?.id) {
        // Update existing hypothesis
        const updatedHypothesis = await hypothesisService.updateHypothesis(editingHypothesis.id, data);
        setHypotheses(prev => prev.map(h => h.id === updatedHypothesis.id ? updatedHypothesis : h));
        
        toast({
          title: "Hypothesis Updated",
          description: "Your hypothesis has been successfully updated."
        });
        // remove editingHypothesis
        setEditingHypothesis({});

      } else {
        // Create new hypothesis
        const newHypothesis = await hypothesisService.createHypothesis({
          ...data,
          businessProblemId: data.businessProblemId === 'none' ? undefined : data.businessProblemId
        });
        
        setHypotheses(prev => [newHypothesis, ...prev]);
        
        toast({
          title: "Hypothesis Created",
          description: "Your new hypothesis has been successfully created."
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to save hypothesis",
        variant: "destructive"
      });
      return;
    }
    
    setFormOpen(false);
    
    // Clear URL params after creating hypothesis from business problem page
    if (shouldAddHypothesis && problemIdParam) {
      navigate('/hypotheses');
    }
  };

  const handleGenerateWithAI = () => {
    setAIGeneratorOpen(true);
  };

  const handleSubmitGeneratedHypothesis = async (data: { title: string; description: string; businessProblemId?: string }) => {
    try {
      const newHypothesis = await hypothesisService.createHypothesis({
        title: data.title,
        description: data.description,
        status: "drafted",
        confidence: 0,
        metrics: [],
        businessProblemId: data.businessProblemId,
        relatedHypothesesIds: [],
        analysisMethod: 'Trend Analysis'
      });
      
      setHypotheses(prev => [newHypothesis, ...prev]);
      
      toast({
        title: "AI Generated Hypothesis Created",
        description: "Your AI generated hypothesis has been successfully created."
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to create AI generated hypothesis",
        variant: "destructive"
      });
    }
  };

  const filteredHypotheses = hypotheses
    .filter(hypothesis => 
      hypothesis.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      hypothesis.description.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .filter(hypothesis => statusFilter === 'all' || hypothesis.status === statusFilter)
    .filter(hypothesis => problemFilter === 'all' || hypothesis.businessProblemId === problemFilter)
    .sort((a, b) => {
      if (sortOrder === 'newest') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      } else if (sortOrder === 'oldest') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else {
        return b.confidence - a.confidence;
      }
    });

  return {
    hypotheses: filteredHypotheses,
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
    mode,
    setMode,
    aiGeneratorOpen,
    setAIGeneratorOpen,
    handleCreateHypothesis,
    handleEditHypothesis,
    handleViewHypothesisMetrics,
    handleSubmitHypothesis,
    handleGenerateWithAI,
    handleSubmitGeneratedHypothesis
  };
};
