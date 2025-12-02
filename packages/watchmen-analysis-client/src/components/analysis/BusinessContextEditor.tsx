import React, { useState } from 'react';
import { useAnalysis } from '@/contexts/AnalysisContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Loader2, RefreshCw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import rehypeHighlight from 'rehype-highlight';

interface BusinessContextEditorProps {
  onRefreshInsights?: () => void;
}

const BusinessContextEditor: React.FC<BusinessContextEditorProps> = ({ onRefreshInsights }) => {
  const { businessContext, updateBusinessContext } = useAnalysis();
  const [isEditing, setIsEditing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [editContent, setEditContent] = useState(
    `# Business Context

## Industry
${businessContext.industry}

## Target Market
${businessContext.targetMarket}

## Market Size
$${businessContext.marketSize.toLocaleString()}

## Main Competitors
${businessContext.competitors.join('\n')}`
  );

  const handleSave = () => {
    // 解析Markdown内容更新业务上下文
    const lines = editContent.split('\n');
    const newContext = {
      industry: '',
      targetMarket: '',
      marketSize: 0,
      competitors: [] as string[]
    };

    let currentSection = '';
    lines.forEach(line => {
      if (line.startsWith('## Industry')) {
        currentSection = 'industry';
      } else if (line.startsWith('## Target Market')) {
        currentSection = 'targetMarket';
      } else if (line.startsWith('## Market Size')) {
        currentSection = 'marketSize';
      } else if (line.startsWith('## Main Competitors')) {
        currentSection = 'competitors';
      } else if (line.trim() && !line.startsWith('#')) {
        switch (currentSection) {
          case 'industry':
            newContext.industry = line.trim();
            break;
          case 'targetMarket':
            newContext.targetMarket = line.trim();
            break;
          case 'marketSize':
            newContext.marketSize = parseInt(line.replace(/[^0-9]/g, '')) || 0;
            break;
          case 'competitors':
            if (line.trim()) newContext.competitors.push(line.trim());
            break;
        }
      }
    });

    updateBusinessContext(newContext);
    setIsEditing(false);
    handleRefresh();
  };

  const handleRefresh = async () => {
    if (onRefreshInsights) {
      setIsRefreshing(true);
      try {
        await onRefreshInsights();
      } finally {
        setIsRefreshing(false);
      }
    }
  };

  return (
    <Card className="glass-panel p-4 rounded-lg mb-4">
      {isEditing ? (
        <div className="space-y-4">
          <Textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="min-h-[200px] font-mono text-sm"
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <Button variant="ghost" onClick={() => setIsEditing(true)}>
              Edit Business Context
            </Button>
          </div>
          <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:mt-4 prose-headings:mb-2 prose-p:my-2 prose-ul:my-2 prose-li:my-1">
            <ReactMarkdown
              rehypePlugins={[rehypeRaw, rehypeSanitize, rehypeHighlight]}
              components={{
                h1: ({node, ...props}) => <h1 className="text-xl font-bold" {...props} />,
                h2: ({node, ...props}) => <h2 className="text-lg font-semibold" {...props} />,
                p: ({node, ...props}) => <p className="text-base" {...props} />,
                ul: ({node, ...props}) => <ul className="list-disc list-inside" {...props} />,
                li: ({node, ...props}) => <li className="text-base" {...props} />
              }}
            >
              {editContent}
            </ReactMarkdown>
          </div>
        </div>
      )}
    </Card>
  );
};

export default BusinessContextEditor;