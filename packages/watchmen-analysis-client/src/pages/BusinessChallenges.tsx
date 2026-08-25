
import React, { useState, useEffect } from 'react';
import { useSidebar } from '@/contexts/SidebarContext';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Loader2, Bot, Sparkles, BarChart2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import BusinessChallengeCard from '@/components/business/BusinessChallengeCard';
import BusinessChallengeForm from '@/components/business/BusinessChallengeForm';
import AIHypothesisGenerator from '@/components/hypothesis/AIHypothesisGenerator';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { useToast } from '@/components/ui/use-toast';
import { BusinessChallenge } from "@/model/business";
import { HypothesisType } from '@/model/Hypothesis';
import { businessService } from '@/services/businessService';
import { hypothesisService } from '@/services/hypothesisService';

const BusinessChallenges: React.FC = () => {
  const { collapsed } = useSidebar();
  const [challenges, setChallenges] = useState<BusinessChallenge[]>([]);
  const [hypotheses, setHypotheses] = useState<HypothesisType[]>([]);
  const [challengeFormOpen, setChallengeFormOpen] = useState(false);
  const [editingChallenge, setEditingChallenge] = useState<Partial<BusinessChallenge> | undefined>();
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aiGeneratorOpen, setAiGeneratorOpen] = useState(false);
  const [selectedChallengeForAI, setSelectedChallengeForAI] = useState<BusinessChallenge | null>(null);
  
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const [challengesData, hypothesesData] = await Promise.all([
          businessService.getChallenges(),
          hypothesisService.getHypotheses()
        ]);
        setChallenges(challengesData);
        setHypotheses(hypothesesData);
      } catch (err) {
        setError('Failed to load data. Please try again later.');
        toast({
          title: 'Error',
          description: 'Failed to load data. Please try again later.',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [toast]);

  const handleCreateChallenge = () => {
    setEditingChallenge(undefined);
    setChallengeFormOpen(true);
  };

  const handleEditChallenge = (id: string) => {
    const challenge = challenges.find(c => c.id === id);
    if (challenge) {
      setEditingChallenge(challenge);
      setChallengeFormOpen(true);
    }
  };

  const handleGenerateHypotheses = (challengeId: string) => {
    const challenge = challenges.find(c => c.id === challengeId);
    if (challenge) {
      setSelectedChallengeForAI(challenge);
      setAiGeneratorOpen(true);
    }
  };
  
  const handleViewAnalysis = (challengeId: string) => {
    navigate(`/challenge-analysis?challengeId=${challengeId}`);
  };

  const handleSubmitGeneratedHypothesis = async (data: { title: string; description: string; businessChallengeId?: string; analysisMethod?: string }) => {
    try {
      await hypothesisService.createHypothesis({
        title: data.title,
        description: data.description,
        businessChallengeId: data.businessChallengeId,
        analysisMethod: data.analysisMethod,
        status: 'drafted',
        confidence: 0,
        metrics: [],
        createdAt: new Date().toISOString()
      });
      
      setSelectedChallengeForAI(null);
      setAiGeneratorOpen(false);
      
      toast({
        title: "AI Hypothesis Generated",
        description: "Your AI-generated hypothesis has been created successfully."
      });
      
      navigate(`/hypotheses?challengeId=${data.businessChallengeId}`);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to create hypothesis. Please try again later.",
        variant: "destructive"
      });
    }
  };

  const handleSubmitChallenge = async (data: Partial<BusinessChallenge>) => {
    try {
      if (editingChallenge?.id) {
        // Update existing challenge
        const updatedChallenge = await businessService.updateChallenge(editingChallenge.id, data);
        setChallenges(prev =>
          prev.map(c => (c.id === editingChallenge.id ? updatedChallenge : c))
        );
        toast({
          title: "Business Challenge Updated",
          description: "Your business challenge has been successfully updated."
        });
      } else {
        // Create new challenge
        const newChallenge = await businessService.createChallenge(data);
        setChallenges(prev => [newChallenge, ...prev]);
        toast({
          title: "Business Challenge Created",
          description: "Your new business challenge has been successfully created."
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to save challenge. Please try again later.",
        variant: "destructive"
      });
      return;
    }
    
    setChallengeFormOpen(false);
  };

  const filteredChallenges = challenges
    .filter(challenge => 
      challenge.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      challenge.description.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      
      <div className={`${collapsed ? 'pl-20' : 'pl-56'} min-h-screen transition-all duration-300`}>
        <Header />
        
        <main className="container py-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-semibold">Business Challenges</h1>
            <div className="flex gap-2">
              <Button onClick={() => navigate('/ai-agent-management')} variant="outline" className="hover-float">
                <Bot className="mr-2 h-4 w-4" />
                AI Agent Management
              </Button>
              <Button onClick={handleCreateChallenge} className="hover-float">
                <Plus className="mr-2 h-4 w-4" />
                Create New Challenge
              </Button>
            </div>
          </div>
          
          <div className="glass-card p-4 mb-6">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search business challenges..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-6">
            {isLoading ? (
              <div className="col-span-3 flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : error ? (
              <div className="col-span-3 text-center py-12 text-destructive">
                <p>{error}</p>
                <Button onClick={() => window.location.reload()} variant="outline" className="mt-4">
                  Try Again
                </Button>
              </div>
            ) : filteredChallenges.map(challenge => (
              <BusinessChallengeCard
                key={challenge.id}
                businessChallenge={challenge}
                onEdit={handleEditChallenge}
                onAddHypothesis={() => navigate(`/hypotheses?challengeId=${challenge.id}`)}
                onViewHypotheses={() => navigate(`/hypotheses?challengeId=${challenge.id}`)}
                onGenerateHypotheses={handleGenerateHypotheses}
                onViewAnalysis={handleViewAnalysis}
                hypothesesCount={hypotheses.filter(h => h.businessChallengeId === challenge.id).length}
              />
            ))}
            
            {filteredChallenges.length === 0 && (
              <div className="col-span-3 text-center py-12">
                <p className="text-muted-foreground">No matching business challenges found. Try adjusting filters or create a new one.</p>
                <Button onClick={handleCreateChallenge} variant="outline" className="mt-4">
                  <Plus className="mr-2 h-4 w-4" />
                  Create New Challenge
                </Button>
              </div>
            )}
          </div>
        </main>
      </div>
      
      <BusinessChallengeForm
        open={challengeFormOpen}
        onOpenChange={setChallengeFormOpen}
        initialData={editingChallenge}
        onSubmit={handleSubmitChallenge}
      />

      <AIHypothesisGenerator
        open={aiGeneratorOpen}
        onOpenChange={setAiGeneratorOpen}
        businessChallenge={selectedChallengeForAI || undefined}
        onGenerate={handleSubmitGeneratedHypothesis}
      />
    </div>
  );
};

export default BusinessChallenges;
