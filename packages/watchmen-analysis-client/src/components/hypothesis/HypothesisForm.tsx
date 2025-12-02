import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Check, X, Wand2 } from 'lucide-react';
import { businessService } from '@/services/businessService';
import { HypothesisType } from '@/model/Hypothesis';
import { suggestMetricsForHypothesis } from '@/utils/metricsMapping';
import { debounce } from '@/utils/debounce';
import { EmulativeAnalysisMethod } from '@/model/analysis';

interface HypothesisFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: Partial<HypothesisType>;
  onSubmit: (data: Partial<HypothesisType>) => void;
  allHypotheses: HypothesisType[]; // Added all hypotheses for relation selection
  mode?: 'edit' | 'link'; // New prop to distinguish between edit mode and link mode
}

const HypothesisForm: React.FC<HypothesisFormProps> = ({
  open,
  onOpenChange,
  initialData,
  onSubmit,
  allHypotheses,
  mode = 'link' // Default to link mode for backward compatibility
}) => {

  const [formData, setFormData] = useState<Partial<HypothesisType>>(initialData || {
    title: '',
    description: '',
    status: 'drafted',
    confidence: 0,
    metrics: [],
    businessProblemId: '',
    relatedHypothesesIds: [],
    analysisMethod: EmulativeAnalysisMethod.TREND_ANALYSIS
  });
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [availableMetrics, setAvailableMetrics] = useState<string[]>([]);
  const [businessProblems, setBusinessProblems] = useState<Array<{ id: string; title: string }>>([]);

  // Fetch business problems when component mounts
  useEffect(() => {
    const fetchBusinessProblems = async () => {
      try {
        const problems = await businessService.getProblems();
        setBusinessProblems(problems.map(p => ({ id: p.id, title: p.title })));
      } catch (error) {
        console.error('Error fetching business problems:', error);
      }
    };

    fetchBusinessProblems();
  }, []);
  
  // Suggest metrics when title or description changes
  useEffect(() => {
    const fetchMetrics = async () => {
      if (mode === 'edit' && (formData.title || formData.description)) {
        // Only update if metrics are empty or not set
        if (!formData.metrics || formData.metrics.length === 0) {
          const suggestedMetrics = await suggestMetricsForHypothesis({
            title: formData.title || '',
            description: formData.description || ''
          });
          setAvailableMetrics(suggestedMetrics);
        }
      }
    };
    fetchMetrics();
  }, [formData.title, formData.description, mode]);

  useEffect(() => {
    setFormData(initialData || {
      title: '',
      description: '',
      status: 'drafted',
      confidence: 0,
      metrics: [],
      businessProblemId: '',
      relatedHypothesesIds: [],
      analysisMethod: EmulativeAnalysisMethod.TREND_ANALYSIS
    });
  }, [initialData]);

  // const debouncedSave = useCallback(
  //   debounce((data: Partial<HypothesisType>) => {
  //     if (initialData?.id) {
  //       onSubmit(data);
  //     }
  //   }, 5000), // 5 seconds delay for auto-save
  //   [initialData?.id, onSubmit]
  // );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const newFormData = {
      ...formData,
      [name]: value
    };
    setFormData(newFormData);
    
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleNumberChange = (name: string, value: string) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
      setFormData(prev => ({
        ...prev,
        [name]: numValue
      }));
    }
  };

  const handleToggleRelatedHypothesis = (id: string) => {
    setFormData(prev => {
      const currentRelated = prev.relatedHypothesesIds || [];
      const isAlreadyRelated = currentRelated.includes(id);
      return {
        ...prev,
        relatedHypothesesIds: isAlreadyRelated ? currentRelated.filter(hId => hId !== id) : [...currentRelated, id]
      };
    });
  };
  
  const handleToggleMetric = (metric: string) => {
    setFormData(prev => {
      const currentMetrics = prev.metrics || [];
      const isAlreadySelected = currentMetrics.includes(metric);
      return {
        ...prev,
        metrics: isAlreadySelected ? currentMetrics.filter(m => m !== metric) : [...currentMetrics, metric]
      };
    });
  };
  
  const handleUseSuggestedMetrics = () => {
    if (availableMetrics.length > 0) {
      setFormData(prev => ({
        ...prev,
        metrics: availableMetrics
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    // debouncedSave(formData);
  };

  // Filter out current hypothesis and already related hypotheses
  const availableHypotheses = allHypotheses.filter(hypothesis => 
    hypothesis.id !== initialData?.id && 
    (searchTerm === '' || hypothesis.title.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-panel sm:max-w-[500px] max-h-[85vh] overflow-y-auto fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 transition-all duration-200 ease-in-out p-6">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{mode === 'edit' ? 'Edit Hypothesis' : 'Link Hypothesis'}</DialogTitle>
            <DialogDescription>
              {mode === 'edit' ? 'Edit hypothesis details and relationships' : 'Link this business problem with existing hypotheses'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-5">
            {mode === 'edit' && (
              <>
                <div className="grid gap-2.5">
                  <Label htmlFor="title" className="text-sm font-medium">Title</Label>
                  <Input 
                    id="title" 
                    name="title" 
                    value={formData.title} 
                    onChange={handleInputChange} 
                    placeholder="Enter hypothesis title" 
                    className="transition-colors focus:border-primary" 
                  />
                </div>

                <div className="grid gap-2.5">
                  <Label htmlFor="description" className="text-sm font-medium">Description</Label>
                  <Textarea 
                    id="description" 
                    name="description" 
                    value={formData.description} 
                    onChange={handleInputChange} 
                    placeholder="Describe your hypothesis" 
                    rows={3} 
                    className="resize-none transition-colors focus:border-primary" 
                  />
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <div className="grid gap-2.5">
                    <Label htmlFor="status" className="text-sm font-medium">Status</Label>
                    <Select value={formData.status} onValueChange={value => handleSelectChange('status', value)}>
                      <SelectTrigger id="status" className="transition-colors focus:border-primary">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="drafted">Draft</SelectItem>
                        <SelectItem value="testing">Testing</SelectItem>
                        <SelectItem value="validated">Validated</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2.5">
                    <Label htmlFor="confidence" className="text-sm font-medium">Confidence (%)</Label>
                    <Input 
                      id="confidence" 
                      type="number" 
                      min="0" 
                      max="100" 
                      value={formData.confidence} 
                      onChange={e => handleNumberChange('confidence', e.target.value)} 
                      className="transition-colors focus:border-primary" 
                    />
                  </div>
                </div>
                
                <div className="grid gap-2.5">
                  <Label htmlFor="analysisMethod" className="text-sm font-medium">Analysis Method</Label>
                  <Select value={formData.analysisMethod} onValueChange={value => handleSelectChange('analysisMethod', value)}>
                    <SelectTrigger id="analysisMethod" className="transition-colors focus:border-primary">
                      <SelectValue placeholder="Select analysis method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={EmulativeAnalysisMethod.TREND_ANALYSIS}>{EmulativeAnalysisMethod.TREND_ANALYSIS}</SelectItem>
                      <SelectItem value={EmulativeAnalysisMethod.DISTRIBUTION_ANALYSIS}>{EmulativeAnalysisMethod.DISTRIBUTION_ANALYSIS}</SelectItem>
                      <SelectItem value={EmulativeAnalysisMethod.COMPARISON_ANALYSIS}>{EmulativeAnalysisMethod.COMPARISON_ANALYSIS}</SelectItem>
                      <SelectItem value={EmulativeAnalysisMethod.CORRELATION_ANALYSIS}>{EmulativeAnalysisMethod.CORRELATION_ANALYSIS}</SelectItem>
                      <SelectItem value={EmulativeAnalysisMethod.COMPOSITION_ANALYSIS}>{EmulativeAnalysisMethod.COMPOSITION_ANALYSIS}</SelectItem>
                      <SelectItem value={EmulativeAnalysisMethod.FEATURES_IMPORTANCE}>{EmulativeAnalysisMethod.FEATURES_IMPORTANCE}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Metrics section */}
                <div className="grid gap-2.5">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="metrics" className="text-sm font-medium">Related Metrics</Label>
                    {availableMetrics.length > 0 && availableMetrics.some(m => !(formData.metrics || []).includes(m)) && (
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        onClick={handleUseSuggestedMetrics} 
                        className="h-8 text-xs flex items-center gap-1"
                      >
                        <Wand2 className="h-3 w-3" />
                        Use AI Suggested
                      </Button>
                    )}
                  </div>
                  
                  <div className="border rounded-md p-3 max-h-[200px] overflow-y-auto">
                    <div className="flex flex-wrap gap-2">
                      {availableMetrics.map(metric => {
                        const isSelected = (formData.metrics || []).includes(metric);
                        return (
                          <Badge 
                            key={metric} 
                            variant={isSelected ? "default" : "outline"} 
                            className={`px-2 py-1 cursor-pointer ${isSelected ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                            onClick={() => handleToggleMetric(metric)}
                          >
                            {metric}
                            {isSelected && (
                              <button 
                                type="button" 
                                className="ml-1 hover:text-primary-foreground/80"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleMetric(metric);
                                }}
                              >
                                <X className="h-3 w-3" />
                              </button>
                            )}
                          </Badge>
                        );
                      })}
                      
                      {availableMetrics.length === 0 && (
                        <div className="text-sm text-muted-foreground py-2">
                          Add hypothesis details to get metric suggestions
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
            
            {initialData?.id && mode === 'link' && (
              <div className="grid gap-2">
                <Label>Current Hypothesis</Label>
                <div className="p-3 bg-muted/30 rounded-md">
                  <div className="font-medium">{initialData.title}</div>
                  <div className="text-sm text-muted-foreground mt-1 line-clamp-2">{initialData.description}</div>
                </div>
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="businessProblemId">Related Business Problem</Label>
              <Select value={formData.businessProblemId} onValueChange={value => handleSelectChange('businessProblemId', value)}>
                <SelectTrigger id="businessProblemId">
                  <SelectValue placeholder="Select business problem" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No related business problem</SelectItem>
                  {businessProblems.map(problem => (
                    <SelectItem key={problem.id} value={problem.id}>
                      {problem.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Related Hypotheses Section */}
            <div className="grid gap-2">
              <Label htmlFor="relatedHypotheses">Related Hypotheses</Label>
              <Input 
                placeholder="Search hypotheses..." 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
                className="mb-2" 
              />
              
              <div className="border rounded-md divide-y max-h-[240px] overflow-y-auto shadow-sm hover:shadow transition-shadow duration-200">
                {availableHypotheses.length > 0 ? (
                  availableHypotheses.map(hypothesis => {
                    const isSelected = formData.relatedHypothesesIds?.includes(hypothesis.id);
                    return (
                      <div 
                        key={hypothesis.id} 
                        className={`flex items-center justify-between p-2 cursor-pointer hover:bg-muted/50 ${isSelected ? 'bg-muted/30' : ''}`} 
                        onClick={() => handleToggleRelatedHypothesis(hypothesis.id)}
                      >
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{hypothesis.title}</span>
                          <span className="text-xs text-muted-foreground line-clamp-1">{hypothesis.description}</span>
                        </div>
                        <div className="flex-shrink-0 ml-2">
                          {isSelected ? (
                            <Check className="h-4 w-4 text-primary" />
                          ) : (
                            <div className="h-4 w-4 rounded-sm border border-input" />
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-4 text-center text-muted-foreground text-sm">
                    {searchTerm ? 'No matching hypotheses found' : 'No available hypotheses'}
                  </div>
                )}
              </div>
              
              {formData.relatedHypothesesIds && formData.relatedHypothesesIds.length > 0 && (
                <div className="mt-2">
                  <div className="text-sm text-muted-foreground mb-2">Selected related hypotheses:</div>
                  <div className="flex flex-wrap gap-1">
                    {formData.relatedHypothesesIds.map(id => {
                      const hypo = allHypotheses.find(h => h.id === id);
                      return hypo ? (
                        <Badge key={id} variant="secondary" className="px-2 py-1">
                          {hypo.title}
                          <button 
                            type="button" 
                            className="ml-1 text-muted-foreground hover:text-foreground" 
                            onClick={() => handleToggleRelatedHypothesis(id)}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="mt-6 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {mode === 'edit' ? 'Save Changes' : 'Link Hypothesis'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default HypothesisForm;
