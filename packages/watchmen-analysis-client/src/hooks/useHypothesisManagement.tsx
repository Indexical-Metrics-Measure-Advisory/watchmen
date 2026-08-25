
import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/components/ui/use-toast';
import { hypothesisService } from '@/services/hypothesisService';
import { analysis_service } from '@/services/analysisService';
import { HypothesisType } from '@/model/Hypothesis';
import { businessService } from '@/services/businessService';

export const useHypothesisManagement = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation('hypothesis');

  const queryParams = new URLSearchParams(location.search);
  const challengeIdParam = queryParams.get('challengeId');
  const shouldAddHypothesis = queryParams.get('addHypothesis') === 'true';
  const editParam = queryParams.get('edit');
  const metricParam = queryParams.get('metric');

  const [hypotheses, setHypotheses] = useState<HypothesisType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingHypothesis, setEditingHypothesis] = useState<Partial<HypothesisType> | undefined>();
  const [searchTerm, setSearchTerm] = useState('');
  const [challengeFilter, setChallengeFilter] = useState<string>(challengeIdParam || 'all');
  const [metricFilter, setMetricFilter] = useState<string | null>(metricParam);
  const [aiGeneratorOpen, setAIGeneratorOpen] = useState(false);
  const [challengeTitles, setChallengeTitles] = useState<Record<string, string>>({});
  const [selectedChallenge, setSelectedChallenge] = useState<any | undefined>();

  // Fetch all business challenges once and build an id -> title map
  useEffect(() => {
    const fetchChallengeTitles = async () => {
      try {
        const challenges = await businessService.getChallenges();
        setChallengeTitles(
          challenges.reduce((acc, challenge) => {
            acc[challenge.id] = challenge.title;
            return acc;
          }, {} as Record<string, string>)
        );
      } catch (error) {
        console.error('Error fetching business challenges:', error);
      }
    };

    fetchChallengeTitles();
  }, []);

  const fetchHypothesesData = useCallback(async (businessChallengeId: string | null) => {
    const [hypothesesData, challengeData] = await Promise.all([
      businessChallengeId
        ? hypothesisService.getHypothesesByChallengeId(businessChallengeId)
        : hypothesisService.getHypotheses(),
      businessChallengeId
        ? businessService.getBusinessChallengeById(businessChallengeId)
        : Promise.resolve(undefined)
    ]);

    return { hypothesesData, challengeData };
  }, []);

  const loadHypotheses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams(location.search);
      const businessChallengeId = params.get('challengeId');

      const { hypothesesData, challengeData } = await fetchHypothesesData(businessChallengeId);

      setHypotheses(hypothesesData);
      setSelectedChallenge(challengeData);
      return hypothesesData;
    } catch (err) {
      setError('Failed to fetch hypotheses');
      toast({
        title: t('toast.fetchFailed'),
        variant: 'destructive'
      });
      return [] as HypothesisType[];
    } finally {
      setLoading(false);
    }
  }, [location.search, fetchHypothesesData, toast, t]);

  const refresh = useCallback(() => {
    void loadHypotheses();
  }, [loadHypotheses]);

  useEffect(() => {
    // Sync the metric filter from the URL (set by BI badge clicks)
    setMetricFilter(metricParam);

    // Set challenge filter from URL
    if (challengeIdParam) {
      setChallengeFilter(challengeIdParam);
    }

    void loadHypotheses().then(loaded => {
      // Open the form if addHypothesis is true and challengeId is provided
      if (shouldAddHypothesis && challengeIdParam) {
        handleCreateHypothesis(challengeIdParam);
      }

      // Open the edit form when linked with ?edit=<id> (e.g. from the Learning page)
      if (editParam) {
        const hypothesisToEdit = loaded.find(h => h.id === editParam);
        if (hypothesisToEdit) {
          setEditingHypothesis(hypothesisToEdit);
          setFormOpen(true);
        }
      }
    });
  }, [location.search]);

  const handleCreateHypothesis = (challengeId?: string) => {
    setEditingHypothesis({
      businessChallengeId: challengeId,
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
    if (hypothesis) {
      setEditingHypothesis(hypothesis);
      setFormOpen(true);
    }
  };

  const clearMetricFilter = () => {
    const params = new URLSearchParams(location.search);
    params.delete('metric');
    const search = params.toString();
    navigate({ pathname: '/hypotheses', search: search ? `?${search}` : '' }, { replace: true });
  };

  const handleSubmitHypothesis = async (data: Partial<HypothesisType>) => {
    try {
      if (editingHypothesis?.id) {
        // Update existing hypothesis
        const updatedHypothesis = await hypothesisService.updateHypothesis(editingHypothesis.id, data);
        setHypotheses(prev => prev.map(h => h.id === updatedHypothesis.id ? updatedHypothesis : h));

        toast({
          title: t('toast.updated'),
          description: t('toast.updatedDescription')
        });
        // remove editingHypothesis
        setEditingHypothesis({});

      } else {
        // Create new hypothesis
        const newHypothesis = await hypothesisService.createHypothesis({
          ...data,
          businessChallengeId: data.businessChallengeId === 'none' ? undefined : data.businessChallengeId
        });

        setHypotheses(prev => [newHypothesis, ...prev]);

        toast({
          title: t('toast.created'),
          description: t('toast.createdDescription')
        });
      }
    } catch (err) {
      toast({
        title: t('toast.saveFailed'),
        variant: 'destructive'
      });
      return;
    }

    setFormOpen(false);

    // Clear URL params after creating hypothesis from business challenge page
    if (shouldAddHypothesis && challengeIdParam) {
      navigate('/hypotheses');
    }
  };

  const handleGenerateWithAI = () => {
    setAIGeneratorOpen(true);
  };

  const handleSubmitGeneratedHypothesis = async (data: { title: string; description: string; businessChallengeId?: string; analysisMethod?: string }) => {
    try {
      const newHypothesis = await hypothesisService.createHypothesis({
        title: data.title,
        description: data.description,
        status: "drafted",
        confidence: 0,
        metrics: [],
        businessChallengeId: data.businessChallengeId,
        relatedHypothesesIds: [],
        analysisMethod: data.analysisMethod || 'Trend Analysis'
      });

      setHypotheses(prev => [newHypothesis, ...prev]);

      toast({
        title: t('toast.created'),
        description: t('toast.createdDescription')
      });
    } catch (err) {
      toast({
        title: t('toast.saveFailed'),
        variant: 'destructive'
      });
    }
  };

  // Move a hypothesis to another kanban column; the backend rejects direct
  // validated/rejected transitions when no validation record exists
  const updateStatus = async (id: string, status: HypothesisType['status']): Promise<boolean> => {
    try {
      const updatedHypothesis = await hypothesisService.updateHypothesis(id, { status });
      setHypotheses(prev => prev.map(h => h.id === id ? updatedHypothesis : h));
      toast({
        title: t('toast.statusUpdated', { status: t(`columns.${status}`) })
      });
      return true;
    } catch (err) {
      toast({
        title: t('toast.statusUpdateFailed'),
        description: err instanceof Error ? err.message : undefined,
        variant: 'destructive'
      });
      return false;
    }
  };

  // Run the real validation analysis, then refresh so the card lands in the right column
  const runValidation = async (id: string): Promise<void> => {
    try {
      const result = await analysis_service.start_analysis(id);
      toast({
        title: result.hypothesisValidationFlag === true
          ? t('toast.validated')
          : result.hypothesisValidationFlag === false
            ? t('toast.rejected')
            : t('toast.analysisCompleted'),
        description: result.message,
      });
    } catch (err) {
      toast({
        title: t('toast.analysisFailed'),
        variant: 'destructive'
      });
    } finally {
      await loadHypotheses();
    }
  };

  const handleDeleteHypothesis = async (id: string): Promise<void> => {
    try {
      await hypothesisService.deleteHypothesis(id);
      setHypotheses(prev => prev.filter(h => h.id !== id));
      toast({
        title: t('toast.deleted')
      });
    } catch (err) {
      toast({
        title: t('toast.deleteFailed'),
        variant: 'destructive'
      });
    }
  };

  const filteredHypotheses = hypotheses
    .filter(hypothesis =>
      hypothesis.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      hypothesis.description.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .filter(hypothesis => challengeFilter === 'all' || hypothesis.businessChallengeId === challengeFilter)
    .filter(hypothesis => !metricFilter || hypothesis.metrics.includes(metricFilter));

  return {
    hypotheses: filteredHypotheses,
    allHypotheses: hypotheses,
    loading,
    error,
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
  };
};
