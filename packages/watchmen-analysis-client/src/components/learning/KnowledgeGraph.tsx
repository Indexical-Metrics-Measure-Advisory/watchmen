
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { KnowledgeEntry } from '@/services/knowledgeService';
import { HypothesisType } from '@/model/Hypothesis';
import { BookOpen, Database, FileText, MessageSquare, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface KnowledgeGraphProps {
  knowledgeEntries: KnowledgeEntry[];
  relatedHypothesis?: HypothesisType;
  onSelectEntry?: (entry: KnowledgeEntry) => void;
  className?: string;
}

const KnowledgeGraph: React.FC<KnowledgeGraphProps> = ({
  knowledgeEntries,
  relatedHypothesis,
  onSelectEntry,
  className
}) => {
  const [selectedEntry, setSelectedEntry] = useState<KnowledgeEntry | null>(null);

  // Select first entry by default when entries change
  useEffect(() => {
    if (knowledgeEntries.length > 0 && !selectedEntry) {
      setSelectedEntry(knowledgeEntries[0]);
      if (onSelectEntry) onSelectEntry(knowledgeEntries[0]);
    }
  }, [knowledgeEntries, selectedEntry, onSelectEntry]);

  // Handle entry selection
  const handleEntryClick = (entry: KnowledgeEntry) => {
    setSelectedEntry(entry);
    if (onSelectEntry) onSelectEntry(entry);
  };

  // Get source icon
  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'user_feedback':
        return <MessageSquare className="h-4 w-4" />;
      case 'test_result':
        return <Database className="h-4 w-4" />;
      case 'external_data':
        return <FileText className="h-4 w-4" />;
      default:
        return <BookOpen className="h-4 w-4" />;
    }
  };

  return (
    <Card className={`shadow-sm ${className}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Knowledge Graph</CardTitle>
      </CardHeader>
      <CardContent>
        {knowledgeEntries.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            No knowledge entries available
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            <div className="flex flex-col space-y-4">
              {knowledgeEntries.map((entry) => (
                <div
                  key={entry.id}
                  className={`
                    border rounded-md p-3 cursor-pointer transition-colors
                    ${selectedEntry?.id === entry.id ? 'bg-muted border-primary' : 'hover:bg-muted/50'}
                  `}
                  onClick={() => handleEntryClick(entry)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className="mt-0.5">
                        {getSourceIcon(entry.source)}
                      </div>
                      <div>
                        <h3 className="font-medium text-sm">{entry.topic}</h3>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                          {entry.content.substring(0, 100)}
                          {entry.content.length > 100 ? '...' : ''}
                        </p>
                      </div>
                    </div>
                    <Badge variant={entry.confidence >= 80 ? "default" : "outline"}>
                      {entry.confidence}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default KnowledgeGraph;
