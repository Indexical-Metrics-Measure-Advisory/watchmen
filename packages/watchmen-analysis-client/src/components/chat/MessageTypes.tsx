import React from 'react';
import { Message } from '@/model/chat';
import { MessageContent } from './MessageContent';
import { ChartMessageComponent } from './ChartMessageComponent';
import { TableMessageComponent } from './TableMessageComponent';

interface BaseMessageProps {
  message: Message;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onShowAnalysis?: () => void;
}

export const ThinkingMessageComponent: React.FC<BaseMessageProps> = ({ message }) => {
  return (
    <div className="w-full max-w-md">
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-2">
        <div className="flex items-center justify-center gap-2">
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
          <span className="text-sm font-medium text-yellow-800">Thinking...</span>
        </div>
      </div>
    </div>
  );
};

export const SystemMessageComponent: React.FC<BaseMessageProps> = ({ message }) => {
  const metadata = message.metadata || {};
  
  return (
    <div className="w-full max-w-md">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-2">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
          <span className="text-sm font-medium text-blue-800">System Message</span>
          {(metadata as any).priority && (
            <span className={`text-xs px-2 py-1 rounded ${
              (metadata as any).priority === 'critical' ? 'bg-red-100 text-red-700' :
              (metadata as any).priority === 'high' ? 'bg-orange-100 text-orange-700' :
              (metadata as any).priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
              'bg-gray-100 text-gray-700'
            }`}>
              {(metadata as any).priority}
            </span>
          )}
        </div>
        <div className="text-sm text-blue-700">
          {message.content}
        </div>
        {(metadata as any).timestamp && (
          <div className="text-xs text-blue-500 mt-1">
            {new Date((metadata as any).timestamp).toLocaleTimeString()}
          </div>
        )}
      </div>
    </div>
  );
};

export const DeveloperMessageComponent: React.FC<BaseMessageProps> = ({ message }) => {
  const metadata = message.metadata || {};
  
  return (
    <div className="w-full max-w-md">
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-2">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
          <span className="text-sm font-medium text-purple-800">Developer Info</span>
        </div>
        <div className="text-sm text-purple-700 space-y-2">
          <div>{message.content}</div>
          {(metadata as any).debugInfo && (
            <div className="bg-purple-100 p-2 rounded text-xs">
              <div className="font-medium mb-1">Debug Info:</div>
              <pre className="whitespace-pre-wrap">{(metadata as any).debugInfo}</pre>
            </div>
          )}
          {(metadata as any).stackTrace && (metadata as any).stackTrace.length > 0 && (
            <div className="bg-purple-100 p-2 rounded text-xs">
              <div className="font-medium mb-1">Stack Trace:</div>
              <pre className="whitespace-pre-wrap">{(metadata as any).stackTrace.join('\n')}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const ToolMessageComponent: React.FC<BaseMessageProps> = ({ message }) => {
  const metadata = message.metadata || {};
  
  return (
    <div className="w-full max-w-md">
      <div className={`border rounded-lg p-3 mb-2 ${
        (metadata as any).success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
      }`}>
        <div className="flex items-center gap-2 mb-2">
          <div className={`w-2 h-2 rounded-full ${
            (metadata as any).success ? 'bg-green-400' : 'bg-red-400'
          }`}></div>
          <span className={`text-sm font-medium ${
            (metadata as any).success ? 'text-green-800' : 'text-red-800'
          }`}>
            Tool: {(metadata as any).toolName || 'Unknown'}
          </span>
          <span className={`text-xs px-2 py-1 rounded ${
            (metadata as any).success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {(metadata as any).success ? 'Success' : 'Failed'}
          </span>
        </div>
        <div className={`text-sm ${
          (metadata as any).success ? 'text-green-700' : 'text-red-700'
        }`}>
          {message.content}
        </div>
        {(metadata as any).toolResult && (
          <div className={`mt-2 p-2 rounded text-xs ${
            (metadata as any).success ? 'bg-green-100' : 'bg-red-100'
          }`}>
            <div className="font-medium mb-1">Result:</div>
            <pre className="whitespace-pre-wrap">{JSON.stringify((metadata as any).toolResult, null, 2)}</pre>
          </div>
        )}
        {(metadata as any).errorMessage && (
          <div className="mt-2 p-2 bg-red-100 rounded text-xs">
            <div className="font-medium mb-1 text-red-700">Error:</div>
            <div className="text-red-600">{(metadata as any).errorMessage}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export const ChartMessageComponentWrapper: React.FC<BaseMessageProps> = ({
  message,
  isExpanded,
  onToggleExpand
}) => {
  if (message.type === 'chart') {
    return (
      <ChartMessageComponent
        message={message}
        isExpanded={isExpanded}
        onToggleExpand={onToggleExpand}
      />
    );
  }
  return null;
};

export const TableMessageComponentWrapper: React.FC<BaseMessageProps> = ({
  message,
  isExpanded,
  onToggleExpand
}) => {
  if (message.type === 'table') {
    return (
      <TableMessageComponent
        message={message}
        isExpanded={isExpanded}
        onToggleExpand={onToggleExpand}
      />
    );
  }
  return null;
};

export const RegularMessageComponent: React.FC<BaseMessageProps> = ({ 
  message, 
  isExpanded, 
  onToggleExpand, 
  onShowAnalysis 
}) => {
  const metadata = message.metadata || {};
  const isLongContent = message.content.length > 300;
  
  // 特殊处理chart和table类型
  if (message.type === 'chart') {
    return (
      <ChartMessageComponent
        message={message}
        isExpanded={isExpanded}
        onToggleExpand={onToggleExpand}
      />
    );
  }
  
  if (message.type === 'table') {
    return (
      <TableMessageComponent
        message={message}
        isExpanded={isExpanded}
        onToggleExpand={onToggleExpand}
      />
    );
  }
  
  return (
    <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl shadow-lg border transition-all duration-300 hover:shadow-xl transform hover:scale-[1.02] ${
      message.type === 'user' 
        ? 'bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 text-white border-blue-200 shadow-blue-100' 
        : 'bg-gradient-to-r from-white to-slate-50 text-slate-800 border-slate-200 hover:border-slate-300 shadow-slate-100'
    }`}>
      {message.type === 'assistant' ? (
        <div>
          <MessageContent
            content={message.content}
            isExpanded={isExpanded}
            onToggleExpand={onToggleExpand}
            isLongContent={isLongContent}
          />
          {message.content.includes('[Click to view detailed analysis]') && onShowAnalysis && (
            <button
              onClick={(e) => {
                e.preventDefault();
                onShowAnalysis();
              }}
              className="mt-3 px-4 py-2 text-sm bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-600 hover:from-blue-100 hover:to-indigo-100 hover:text-blue-700 rounded-lg border border-blue-200 hover:border-blue-300 transition-all duration-200 font-medium shadow-sm hover:shadow-md"
            >
              🔍 查看详细分析
            </button>
          )}
          {(metadata as any).confidence && (
            <div className="text-xs mt-3 text-slate-600 flex items-center">
              <span className="inline-block w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
              置信度: {((metadata as any).confidence * 100).toFixed(1)}%
            </div>
          )}
          {(message as any).timestamp && (
            <div className="text-xs mt-2 text-slate-500 flex items-center">
              <span className="inline-block w-2 h-2 bg-slate-400 rounded-full mr-2"></span>
              {new Date((message as any).timestamp).toLocaleTimeString()}
            </div>
          )}
        </div>
      ) : (
        <div>
          <MessageContent
            content={message.content}
            isExpanded={isExpanded}
            onToggleExpand={onToggleExpand}
            isLongContent={isLongContent}
          />
          {(message.metadata as any)?.timestamp && (
            <div className="text-xs mt-2 text-white/80 flex items-center">
              <span className="inline-block w-2 h-2 bg-white/50 rounded-full mr-2"></span>
              {new Date((message.metadata as any).timestamp).toLocaleTimeString()}
            </div>
          )}
        </div>
      )}
    </div>
  );
};