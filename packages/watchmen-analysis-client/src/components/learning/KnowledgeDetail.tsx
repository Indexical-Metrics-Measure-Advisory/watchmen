
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { KnowledgeEntry } from '@/services/knowledgeService';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageSquare, Database, FileText, Book, ArrowLeft } from 'lucide-react';

interface KnowledgeDetailProps {
  entry: KnowledgeEntry | null;
  onBack?: () => void;
  className?: string;
}

const KnowledgeDetail: React.FC<KnowledgeDetailProps> = ({
  entry,
  onBack,
  className
}) => {
  // Get source icon
  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'user_feedback':
        return <MessageSquare className="h-5 w-5 text-green-500" />;
      case 'test_result':
        return <Database className="h-5 w-5 text-blue-500" />;
      case 'external_data':
        return <FileText className="h-5 w-5 text-orange-500" />;
      default:
        return <Book className="h-5 w-5 text-primary" />;
    }
  };

  // Get source label text
  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'user_feedback':
        return 'User Feedback';
      case 'test_result':
        return 'Test Result';
      case 'external_data':
        return 'External Data';
      default:
        return 'Unknown Source';
    }
  };

  // Get confidence badge variant
  const getConfidenceBadgeVariant = (confidence: number) => {
    if (confidence >= 80) return 'default';
    if (confidence >= 60) return 'secondary';
    if (confidence >= 40) return 'outline';
    return 'destructive';
  };

  if (!entry) {
    return (
      <Card className={`shadow-sm ${className}`}>
        <CardContent className="flex items-center justify-center h-full py-12">
          <p className="text-muted-foreground">Select a knowledge entry to view details</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`shadow-sm ${className}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getSourceIcon(entry.source)}
            <CardTitle className="text-lg">{entry.topic}</CardTitle>
          </div>
          <Badge variant={getConfidenceBadgeVariant(entry.confidence)}>
            Confidence: {entry.confidence}%
          </Badge>
        </div>
        <CardDescription>
          {getSourceLabel(entry.source)} • Updated on {new Date(entry.lastUpdated).toLocaleDateString()}
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Progress value={entry.confidence} className="h-2 mb-4" />
        
        <div className="space-y-4">
          <div className="p-4 bg-muted/50 rounded-md">
            <h3 className="font-medium mb-2">Knowledge Content</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-line">
              {entry.content}
            </p>
          </div>
          
          {entry.relatedHypothesisIds && entry.relatedHypothesisIds.length > 0 && (
            <div>
              <h3 className="font-medium mb-2">Related Hypotheses</h3>
              <div className="flex flex-wrap gap-2">
                {entry.relatedHypothesisIds.map((id) => (
                  <Badge key={id} variant="outline">
                    ID: {id}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
      
      {onBack && (
        <CardFooter>
          <Button variant="ghost" onClick={onBack} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to knowledge list
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};

export default KnowledgeDetail;
