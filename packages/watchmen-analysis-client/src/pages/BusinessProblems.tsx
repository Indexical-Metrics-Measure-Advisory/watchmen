import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSidebar } from '@/contexts/SidebarContext';
import { Plus, Search, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import BusinessProblemCard from '@/components/business/BusinessProblemCard';
import BusinessProblemForm from '@/components/business/BusinessProblemForm';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { useToast } from '@/components/ui/use-toast';
import { BusinessChallenge, BusinessProblem } from "@/model/business";
import AIHypothesisGenerator from '@/components/hypothesis/AIHypothesisGenerator';
import { businessService } from '@/services/businessService';
import { hypothesisService } from '@/services/hypothesisService';

const BusinessProblems: React.FC = () => {
  const { collapsed } = useSidebar();
  const [problems, setProblems] = useState<BusinessProblem[]>([]);
  const [challenges, setChallenges] = useState<BusinessChallenge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [problemFormOpen, setProblemFormOpen] = useState(false);
  const [editingProblem, setEditingProblem] = useState<Partial<BusinessProblem> | undefined>();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [challengeFilter, setChallengeFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [aiGeneratorOpen, setAIGeneratorOpen] = useState(false);
  const [selectedProblemForAI, setSelectedProblemForAI] = useState<BusinessProblem | null>(null);
  
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const params = new URLSearchParams(location.search);
        const challengeId = params.get('challengeId');
        
        const [problemsData, challengesData] = await Promise.all([
          challengeId ? businessService.getProblemsForChallenge(challengeId) : businessService.getProblems(),
          businessService.getChallenges()
        ]);

        setProblems(problemsData || []);
        setChallenges(challengesData || []);
        
        if (challengeId) {
          setChallengeFilter(challengeId);
        }
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
  }, [location.search, toast]);

  const handleCreateProblem = () => {
    setEditingProblem(undefined);
    setProblemFormOpen(true);
  };

  const handleEditProblem = (id: string) => {
    const problem = problems.find(p => p.id === id);
    if (problem) {
      setEditingProblem(problem);
      setProblemFormOpen(true);
    }
  };

  const handleViewHypotheses = (problemId: string) => {
    navigate(`/hypotheses?problemId=${problemId}`);
  };

  const handleGenerateHypothesis = (problemId: string) => {
    const problem = problems.find(p => p.id === problemId);
    if (problem) {
      setSelectedProblemForAI(problem);
      setAIGeneratorOpen(true);
    }
  };

  const handleSubmitProblem = async (data: Partial<BusinessProblem>) => {
    try {
      if (editingProblem?.id) {
        const updatedProblem = await businessService.updateProblem(editingProblem.id, data);
        setProblems(prev =>
          prev.map(p => (p.id === editingProblem.id ? updatedProblem : p))
        );
        toast({
          title: "Business Problem Updated",
          description: "Your business problem has been successfully updated."
        });
      } else {
        const newProblem = await businessService.createProblem(data);
        setProblems(prev => [newProblem, ...prev]);
        toast({
          title: "Business Problem Created",
          description: "Your new business problem has been successfully created."
        });
      }
      
      setProblemFormOpen(false);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to save business problem. Please try again later.",
        variant: "destructive"
      });
    }
  };

  const handleSubmitGeneratedHypothesis = async (data: { title: string; description: string; businessProblemId?: string }) => {
    try {
      const newHypothesis = await hypothesisService.createHypothesis({
        title: data.title,
        description: data.description,
        businessProblemId: data.businessProblemId,
        status: 'drafted',
        confidence: 50,
        metrics: [],
        createdAt: new Date().toISOString()
      });
      
      setSelectedProblemForAI(null);
      setAIGeneratorOpen(false);
      
      toast({
        title: "AI Hypothesis Generated",
        description: "Your AI-generated hypothesis has been created successfully."
      });
      
      navigate(`/hypotheses?problemId=${data.businessProblemId}`);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to create hypothesis. Please try again later.",
        variant: "destructive"
      });
    }
  };

  const getFilteredProblems = () => {
    let filtered = problems;
    
    filtered = filtered.filter(problem => 
      problem.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      problem.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(problem => problem.status === statusFilter);
    }
  

    return filtered.sort((a, b) => {
      if (sortOrder === 'newest') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      } else {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
    });

  
  };

  const filteredProblems = getFilteredProblems();
  
  const currentChallenge = challengeFilter !== 'all' 
    ? challenges.find(c => c.id === challengeFilter)
    : undefined;

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      
      <div className={`${collapsed ? 'pl-20' : 'pl-56'} min-h-screen transition-all duration-300`}>
        <Header />
        
        <main className="container py-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-semibold">
                {currentChallenge 
                  ? `Problems for "${currentChallenge.title}"` 
                  : "Business Problems"}
              </h1>
              {currentChallenge && (
                <p className="text-muted-foreground mt-1">{currentChallenge.description}</p>
              )}
            </div>
            <div className="flex gap-2">
              {currentChallenge && (
                <Button variant="outline" onClick={() => navigate('/challenges')}>
                  Back to Challenges
                </Button>
              )}
              <Button onClick={() => {
                setEditingProblem(undefined);
                setProblemFormOpen(true);
              }} className="hover-float">
                <Plus className="mr-2 h-4 w-4" />
                Create New Business Problem
              </Button>
            </div>
          </div>
          
          <div className="glass-card p-4 mb-6">
            <div className="flex gap-4 flex-wrap">
              <div className="relative flex-grow">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search business problems..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              <div className="flex gap-2">
                <Select
                  value={statusFilter}
                  onValueChange={setStatusFilter}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select
                  value={challengeFilter}
                  onValueChange={setChallengeFilter}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Filter by business challenge" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Business Challenges</SelectItem>
                    {challenges.map(challenge => (
                      <SelectItem key={challenge.id} value={challenge.id}>
                        {challenge.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select
                  value={sortOrder}
                  onValueChange={(value: 'newest' | 'oldest') => setSortOrder(value)}
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="oldest">Oldest First</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                ) : filteredProblems.map(problem => (
              <BusinessProblemCard
                key={problem.id}
                businessProblem={problem}
                onEdit={handleEditProblem}
                onAddHypothesis={() => navigate(`/hypotheses?addHypothesis=true&problemId=${problem.id}`)}
                onViewHypotheses={handleViewHypotheses}
                onGenerateHypothesis={handleGenerateHypothesis}
                hypothesesCount={problem.hypothesisIds.length}
              />
            ))}
            
            {filteredProblems.length === 0 && (
              <div className="col-span-3 text-center py-12">
                <p className="text-muted-foreground">No matching business problems found. Try adjusting filters or create a new one.</p>
                <Button onClick={handleCreateProblem} variant="outline" className="mt-4">
                  <Plus className="mr-2 h-4 w-4" />
                  Create New Business Problem
                </Button>
              </div>
            )}
          </div>
        </main>
      </div>
      
      <BusinessProblemForm
        open={problemFormOpen}
        onOpenChange={setProblemFormOpen}
        initialData={editingProblem}
        onSubmit={handleSubmitProblem}
        businessChallengeId={challengeFilter !== 'all' ? challengeFilter : undefined}
      />

      <AIHypothesisGenerator
        open={aiGeneratorOpen}
        onOpenChange={setAIGeneratorOpen}
        businessProblem={selectedProblemForAI || undefined}
        onGenerate={handleSubmitGeneratedHypothesis}
      />
    </div>
  );
};

export default BusinessProblems;
