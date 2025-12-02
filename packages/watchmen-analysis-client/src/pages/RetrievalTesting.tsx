import React, { useState, useRef } from 'react';
import { useSidebar } from '@/contexts/SidebarContext';
import { useNavigate } from 'react-router-dom';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Search, FileText, ArrowLeft, Loader2 } from 'lucide-react';

const RetrievalTesting: React.FC = () => {
  const { collapsed } = useSidebar();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State for test configuration
  const [similarityThreshold, setSimilarityThreshold] = useState<number>(0.7);
  const [vectorSimilarityWeight, setVectorSimilarityWeight] = useState<number>(0.5);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [testText, setTestText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<{
    hybridSimilarity: number;
    termSimilarity: number;
    vectorSimilarity: number;
    matches: Array<{ text: string; similarity: number }>;
  } | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setSelectedFiles(Array.from(event.target.files));
    }
  };

  const handleTest = async () => {
    

    if (!testText.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter test text.',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
    try {
      // TODO: Implement actual retrieval testing logic here
      // This is a mock response for demonstration
      await new Promise(resolve => setTimeout(resolve, 1500));
      setTestResults({
        hybridSimilarity: 0.85,
        termSimilarity: 0.75,
        vectorSimilarity: 0.95,
        matches: [
          { text: 'Sample matching text 1', similarity: 0.85 },
          { text: 'Sample matching text 2', similarity: 0.75 }
        ]
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to perform retrieval test. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      
      <div className={`${collapsed ? 'pl-20' : 'pl-56'} min-h-screen transition-all duration-300`}>
        <Header />
        
        <main className="container py-6">
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="outline"
              onClick={() => navigate('/challenges')}
              className="hover-float"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Challenges
            </Button>
            <h1 className="text-2xl font-semibold">Retrieval Testing</h1>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-6">
              <Card className="glass-card">
                <CardContent className="p-6">
                  <h2 className="text-lg font-medium mb-4">Test Configuration</h2>
                  
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Similarity Threshold</label>
                      <div className="flex items-center gap-4">
                        <Slider
                          value={[similarityThreshold]}
                          onValueChange={([value]) => setSimilarityThreshold(value)}
                          max={1}
                          step={0.01}
                          className="flex-grow"
                        />
                        <span className="text-sm">{similarityThreshold.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Vector Similarity Weight</label>
                      <div className="flex items-center gap-4">
                        <Slider
                          value={[vectorSimilarityWeight]}
                          onValueChange={([value]) => setVectorSimilarityWeight(value)}
                          max={1}
                          step={0.01}
                          className="flex-grow"
                        />
                        <span className="text-sm">{vectorSimilarityWeight.toFixed(2)}</span>
                      </div>
                    </div>

                    

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Test Text</label>
                      <Textarea
                        placeholder="Enter text to test retrieval..."
                        value={testText}
                        onChange={(e) => setTestText(e.target.value)}
                        className="min-h-[100px]"
                      />
                    </div>

                    <Button
                      onClick={handleTest}
                      className="w-full"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Testing...
                        </>
                      ) : (
                        'Run Test'
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="glass-card">
                <CardContent className="p-6">
                  <h2 className="text-lg font-medium mb-4">Test Results</h2>
                  
                  {testResults ? (
                    <div className="space-y-6">
                      <div className="grid grid-cols-3 gap-4">
                        <div className="p-4 rounded-lg bg-background/50">
                          <div className="text-sm font-medium text-muted-foreground mb-1">
                            Hybrid Similarity
                          </div>
                          <div className="text-2xl font-semibold">
                            {(testResults.hybridSimilarity * 100).toFixed(1)}%
                          </div>
                        </div>
                        <div className="p-4 rounded-lg bg-background/50">
                          <div className="text-sm font-medium text-muted-foreground mb-1">
                            Term Similarity
                          </div>
                          <div className="text-2xl font-semibold">
                            {(testResults.termSimilarity * 100).toFixed(1)}%
                          </div>
                        </div>
                        <div className="p-4 rounded-lg bg-background/50">
                          <div className="text-sm font-medium text-muted-foreground mb-1">
                            Vector Similarity
                          </div>
                          <div className="text-2xl font-semibold">
                            {(testResults.vectorSimilarity * 100).toFixed(1)}%
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h3 className="text-sm font-medium">Top Matches</h3>
                        {testResults.matches.map((match, index) => (
                          <div
                            key={index}
                            className="p-4 rounded-lg bg-background/50 space-y-2"
                          >
                            <div className="flex justify-between items-center">
                              <div className="text-sm font-medium">
                                Match {index + 1}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {(match.similarity * 100).toFixed(1)}% similar
                              </div>
                            </div>
                            <div className="text-sm">{match.text}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      Run a test to see results
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default RetrievalTesting;