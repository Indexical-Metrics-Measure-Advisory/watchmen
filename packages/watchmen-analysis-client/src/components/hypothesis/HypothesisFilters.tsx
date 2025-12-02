import React, { useState, useEffect } from 'react';
import { Filter, Search, ArrowUpDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { businessService } from '@/services/businessService';
import type { BusinessProblem } from "@/model/business";

interface HypothesisFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  problemFilter: string;
  setProblemFilter: (problemId: string) => void;
  sortOrder: 'newest' | 'oldest' | 'confidence';
  setSortOrder: (order: 'newest' | 'oldest' | 'confidence') => void;
  selectedProblem: boolean;
}

const HypothesisFilters: React.FC<HypothesisFiltersProps> = ({
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  problemFilter,
  setProblemFilter,
  sortOrder,
  setSortOrder,
  selectedProblem,
}) => {
  const [problems, setProblems] = useState<BusinessProblem[]>([]);

  useEffect(() => {
    const loadProblems = async () => {
      try {
        const problemsData = await businessService.getProblems();
        setProblems(problemsData || []);
      } catch (error) {
        console.error('Failed to load business problems:', error);
        setProblems([]);
      }
    };

    loadProblems();
  }, []);

  return (
    <div className="glass-card p-4 mb-6">
      <div className="flex gap-4">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search hypotheses..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Filter Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="drafted">Draft</SelectItem>
              <SelectItem value="testing">Testing</SelectItem>
              <SelectItem value="validated">Validated</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {!selectedProblem && (
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={problemFilter} onValueChange={setProblemFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Filter Business Problems" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Business Problems</SelectItem>
                {problems.map(problem => (
                  <SelectItem key={problem.id} value={problem.id}>
                    {problem.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        
        <div className="flex items-center gap-2">
          <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
          <Select value={sortOrder} onValueChange={(value: any) => setSortOrder(value)}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Sort By" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="oldest">Oldest</SelectItem>
              <SelectItem value="confidence">Confidence</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};

export default HypothesisFilters;
