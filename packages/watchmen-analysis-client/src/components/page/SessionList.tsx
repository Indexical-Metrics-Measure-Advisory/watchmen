import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChatSession } from '@/services/chatService';
import { formatDistanceToNow } from 'date-fns';

interface SessionListProps {
  sessions: ChatSession[];
  loading: boolean;
  currentSession: ChatSession | null;
  onLoadSession: (session: ChatSession) => void;
  onDeleteSession: (sessionId: string) => void;
}

export const SessionList: React.FC<SessionListProps> = ({ sessions, loading, currentSession, onLoadSession, onDeleteSession }) => {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Chat History</span>
          {currentSession && (
            <span className="text-sm text-muted-foreground">
              Current: {currentSession.title}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Loading sessions...</span>
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No chat history available
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {sessions.map((session) => (
              <div 
                key={session.id}
                className={`p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors ${
                  currentSession?.id === session.id ? 'bg-primary/10 border-primary' : ''
                }`}
                onClick={() => onLoadSession(session)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{session.title}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">
                        {session.updatedAt && !isNaN(new Date(session.updatedAt).getTime()) ? formatDistanceToNow(new Date(session.updatedAt), { addSuffix: true }) : 'Unknown time'}
                      </span>
                      {session.analysisType && (
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          session.analysisType === 'challenge' ? 'bg-red-100 text-red-700' :
                          session.analysisType === 'business' ? 'bg-green-100 text-green-700' :
                          session.analysisType === 'hypothesis' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {session.analysisType === 'challenge' ? 'Challenge' :
                         session.analysisType === 'business' ? 'Business' :
                         session.analysisType === 'hypothesis' ? 'Hypothesis' : 'Chat'}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {session.messages.length} messages
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSession(session.id);
                    }}
                    className="text-destructive hover:text-destructive"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};