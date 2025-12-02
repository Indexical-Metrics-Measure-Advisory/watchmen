import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import {
  BrainCircuit, MessageSquare,
  Sparkles,
  ArrowLeft,
  Loader2, FileQuestion
} from 'lucide-react';
import { HypothesisType } from '@/model/Hypothesis';
import { BusinessProblem } from "@/model/business";
import { OptimizationSuggestion } from '@/services/optimizationService';
import { hypothesisService } from '@/services/hypothesisService';
import { businessService } from '@/services/businessService';
import { knowledgeService, KnowledgeEntry } from '@/services/knowledgeService';
import FeedbackCollector from '@/components/learning/FeedbackCollector';
import OptimizationSuggestions from '@/components/learning/OptimizationSuggestions';

const Learning: React.FC = () => {
  const [activeTab, setActiveTab] = useState('feedback');
  const [hypothesis, setHypothesis] = useState<HypothesisType | null>(null);
  const [businessProblem, setBusinessProblem] = useState<BusinessProblem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<KnowledgeEntry[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const hypothesisId = searchParams.get('hypothesis');
    const businessProblemId = searchParams.get('businessProblemId');
    const tab = searchParams.get('tab');
    
    if (tab && ['knowledge', 'feedback', 'optimization'].includes(tab)) {
      setActiveTab(tab);
    }
    
    if (businessProblemId) {
      loadBusinessProblem(businessProblemId);
    } else if (hypothesisId) {
      loadHypothesis(hypothesisId);
    } else {
      setIsLoading(false);
    }
  }, [location.search]);
  
  const loadHypothesis = async (id: string) => {
    setIsLoading(true);
    try {
      const data = await hypothesisService.getHypothesisById(id);
      if (data) {
        setHypothesis(data);
        setBusinessProblem(null);
      } else {
        toast({
          title: "Hypothesis Not Found",
          description: "Unable to find the specified hypothesis",
          variant: "destructive"
        });
        
        navigate('/hypotheses');
      }
    } catch (error) {
      console.error('Failed to load hypothesis:', error);
      toast({
        title: "Loading Failed",
        description: "Unable to load hypothesis data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const loadBusinessProblem = async (id: string) => {
    setIsLoading(true);
    try {
      const data = await businessService.getBusinessProblemById(id);
      if (data) {
        setBusinessProblem(data);
        setHypothesis(null);
      } else {
        toast({
          title: "Business Problem Not Found",
          description: "Unable to find the specified business problem",
          variant: "destructive"
        });
        
        navigate('/problems');
      }
    } catch (error) {
      console.error('Failed to load business problem:', error);
      toast({
        title: "Loading Failed",
        description: "Unable to load business problem data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleApplySuggestion = (suggestion: OptimizationSuggestion) => {
    if (hypothesis) {
      navigate(`/hypotheses?edit=${hypothesis.id}&suggestion=${encodeURIComponent(JSON.stringify({
        title: suggestion.title,
        description: suggestion.description,
        type: suggestion.suggestionType
      }))}`);
    } else if (businessProblem) {
      navigate(`/problems?edit=${businessProblem.id}&suggestion=${encodeURIComponent(JSON.stringify({
        title: suggestion.title,
        description: suggestion.description,
        type: suggestion.suggestionType
      }))}`);
    }
  };
  
  const handleBack = () => {
    if (hypothesis) {
      navigate(`/analysis?hypothesis=${hypothesis.id}`);
    } else if (businessProblem) {
      navigate('/problems');
    } else {
      navigate('/hypotheses');
    }
  };
  
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    
    const searchParams = new URLSearchParams(location.search);
    searchParams.set('tab', value);
    
    navigate({
      pathname: location.pathname,
      search: searchParams.toString()
    });
  };
  
  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    try {
      const results = await knowledgeService.searchByTopic(searchTerm);
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
      toast({
        title: "Search Failed",
        description: "Unable to search the knowledge base",
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  };
  
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };
  
  const getCurrentItemTitle = () => {
    if (hypothesis) return hypothesis.title;
    if (businessProblem) return businessProblem.title;
    return '';
  };
  
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      
      <div className="pl-56 min-h-screen">
        <Header />
        
        <main className="container py-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleBack}
                className="mr-2"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              
              <div>
                <h1 className="text-2xl font-semibold flex items-center">
                  <BrainCircuit className="h-6 w-6 mr-2 text-primary" />
                  Learning and Optimization System
                </h1>
                {(hypothesis || businessProblem) && (
                  <div className="flex items-center text-muted-foreground mt-1">
                    {businessProblem && (
                      <><FileQuestion className="h-4 w-4 mr-1" /> Business Problem: </>
                    )}
                    {hypothesis && (
                      <><Sparkles className="h-4 w-4 mr-1" /> Hypothesis: </>
                    )}
                    <span className="ml-1">{getCurrentItemTitle()}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {isLoading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
              <p>Loading data...</p>
            </div>
          ) : !hypothesis && !businessProblem ? (
            <div className="glass-card p-10 text-center">
              <BrainCircuit className="h-16 w-16 mx-auto text-primary mb-4" />
              <h2 className="text-xl font-semibold mb-2">Please Select a Business Problem</h2>
              <p className="text-muted-foreground mb-6">
                Select a business problem from the list to view and manage learning and optimization data
              </p>
              <Button onClick={() => navigate('/problems')}>
                Browse Business Problems
              </Button>
            </div>
          ) : (
            <div>
              <Tabs 
                value={activeTab} 
                onValueChange={handleTabChange}
                className="glass-card p-6 mb-6"
              >
                <TabsList className="grid grid-cols-2 mb-6">
                  {/* <TabsTrigger value="knowledge" className="flex items-center">
                    <Book className="h-4 w-4 mr-2" />
                    Knowledge Base
                  </TabsTrigger> */}
                  <TabsTrigger value="feedback" className="flex items-center">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    User Feedback
                  </TabsTrigger>
                  <TabsTrigger value="optimization" className="flex items-center">
                    <Sparkles className="h-4 w-4 mr-2" />
                    Optimization Suggestions
                  </TabsTrigger>
                </TabsList>
                
                {/* {activeTab === 'knowledge' && (
                  <div className="mb-6">
                    <div className="flex gap-4 mb-4">
                      <div className="relative flex-grow">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search knowledge base..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          onKeyDown={handleSearchKeyDown}
                          className="pl-9"
                        />
                      </div>
                      <Button 
                        onClick={handleSearch}
                        disabled={isSearching}
                      >
                        {isSearching ? 'Searching...' : 'Search'}
                      </Button>
                    </div>
                    
                    {searchTerm && searchResults.length > 0 && (
                      <div className="mb-6 p-4 bg-muted/30 rounded-lg">
                        <h3 className="text-sm font-medium mb-3 flex items-center">
                          <Search className="h-4 w-4 mr-2" />
                          Search Results for "{searchTerm}" ({searchResults.length})
                        </h3>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Topic</TableHead>
                              <TableHead>Source</TableHead>
                              <TableHead>Confidence</TableHead>
                              <TableHead>Updated</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {searchResults.map(result => (
                              <TableRow key={result.id}>
                                <TableCell className="font-medium">{result.topic}</TableCell>
                                <TableCell>
                                  {result.source === 'user_feedback' && <Badge variant="outline" className="bg-green-100 text-green-800">User Feedback</Badge>}
                                  {result.source === 'test_result' && <Badge variant="outline" className="bg-blue-100 text-blue-800">Test Result</Badge>}
                                  {result.source === 'external_data' && <Badge variant="outline" className="bg-orange-100 text-orange-800">External Data</Badge>}
                                  {result.source === 'research' && <Badge variant="outline" className="bg-purple-100 text-purple-800">Research</Badge>}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Progress value={result.confidence} className="h-2 w-16" />
                                    <span>{result.confidence}%</span>
                                  </div>
                                </TableCell>
                                <TableCell>{new Date(result.lastUpdated).toLocaleDateString()}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                    
                    {searchTerm && searchResults.length === 0 && !isSearching && (
                      <div className="mb-6 p-4 bg-muted/30 rounded-lg text-center">
                        <p className="text-muted-foreground">No results found for "{searchTerm}"</p>
                      </div>
                    )}
                  </div>
                )} */}
                
                {/* <TabsContent value="knowledge" className="mt-0">
                  <KnowledgeBase 
                    relatedHypothesis={hypothesis}
                    relatedBusinessProblem={businessProblem}
                  />
                </TabsContent> */}
                
                <TabsContent value="feedback" className="mt-0">
                  <div className="grid grid-cols-1 gap-6">
                    <div className="col-span-1">
                      <FeedbackCollector 
                        hypothesis={hypothesis}
                        businessProblem={businessProblem}
                        onFeedbackSubmitted={() => toast({
                          title: "Feedback Submitted",
                          description: "Your feedback has been recorded and will be used to optimize the system."
                        })}
                      />
                    </div>
                    {/* <div className="col-span-2">
                      <KnowledgeBase 
                        relatedHypothesis={hypothesis}
                        relatedBusinessProblem={businessProblem}
                      />
                    </div> */}
                  </div>
                </TabsContent>
                
                <TabsContent value="optimization" className="mt-0">
                  <div className="grid grid-cols-1 gap-6">
                    <div className="flex gap-4 mb-4">
                      <div className="relative flex-grow">
                        <Input
                          placeholder="Add context for optimization suggestions..."
                          className="pl-4"
                          id="optimization-context"
                        />
                      </div>
                      <Button 
                        onClick={() => {
                          const contextInput = document.getElementById('optimization-context') as HTMLInputElement;
                          const context = contextInput?.value || '';
                          // Trigger refresh with context
                          toast({
                            title: "Refreshing Suggestions",
                            description: "Generating new optimization suggestions based on provided context."
                          });
                        }}
                      >
                        <Sparkles className="h-4 w-4 mr-2" />
                        Refresh Suggestions
                      </Button>
                    </div>
                    <OptimizationSuggestions 
                      hypothesis={hypothesis}
                      businessProblem={businessProblem}
                      onApplySuggestion={handleApplySuggestion}
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </main>
      </div>
    </div>
    
  );
};

export default Learning;
