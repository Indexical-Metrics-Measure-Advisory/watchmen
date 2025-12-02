import React from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface MessageContentProps {
  content: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
  isLongContent: boolean;
}

const markdownComponents = {
  code: ({ node, className, children, ...props }: any) => {
    const match = /language-(\w+)/.exec(className || '');
    const isInline = !match;
    return isInline ? (
      <code className="bg-gray-100 px-1 rounded text-sm" {...props}>
        {children}
      </code>
    ) : (
      <pre className="bg-gray-100 rounded p-2 overflow-x-auto text-sm">
        <code className={className} {...props}>
          {children}
        </code>
      </pre>
    );
  },
  p: ({ children }: any) => <p className="mb-2 last:mb-0">{children}</p>,
  ul: ({ children }: any) => <ul className="list-disc list-inside mb-2">{children}</ul>,
  ol: ({ children }: any) => <ol className="list-decimal list-inside mb-2">{children}</ol>,
  h1: ({ children }: any) => <h1 className="text-lg font-bold mb-2">{children}</h1>,
  h2: ({ children }: any) => <h2 className="text-base font-bold mb-2">{children}</h2>,
  h3: ({ children }: any) => <h3 className="text-sm font-bold mb-1">{children}</h3>,
};

export const MessageContent: React.FC<MessageContentProps> = ({
  content,
  isExpanded,
  onToggleExpand,
  isLongContent,
}) => {
  const displayContent = isLongContent && !isExpanded 
    ? content.substring(0, 300) + '...' 
    : content;

  return (
    <div className="markdown-content prose prose-sm max-w-none text-inherit">
      <ReactMarkdown
        rehypePlugins={[rehypeHighlight, rehypeRaw, rehypeSanitize]}
        components={markdownComponents}
      >
        {displayContent}
      </ReactMarkdown>
      {isLongContent && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleExpand}
          className="mt-2 h-6 px-2 text-xs hover:bg-gray-200"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="h-3 w-3 mr-1" />
              Collapse
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3 mr-1" />
              Expand
            </>
          )}
        </Button>
      )}
    </div>
  );
};