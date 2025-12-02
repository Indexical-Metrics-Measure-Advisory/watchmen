import React from 'react';
import { chatService, ChatSession } from '@/services/chatService';

interface UseSessionManagementReturn {
  sessions: ChatSession[];
  loading: boolean;
  showList: boolean;
  setShowList: (show: boolean) => void;
  fetchSessions: () => Promise<void>;
  loadSession: (session: ChatSession) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
}

export const useSessionManagement = (
  loadChatSession: (session: ChatSession) => Promise<void>
): UseSessionManagementReturn => {
  const [sessions, setSessions] = React.useState<ChatSession[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [showList, setShowList] = React.useState(false);

  const fetchSessions = React.useCallback(async () => {
    setLoading(true);
    try {
      const sessionList = await chatService.getSessions();
      setSessions(sessionList);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSession = React.useCallback(async (session: ChatSession) => {
    try {
      await loadChatSession(session);
      setShowList(false);
    } catch (error) {
      console.error('Error loading session:', error);
    }
  }, [loadChatSession]);

  const deleteSession = React.useCallback(async (sessionId: string) => {
    try {
      await chatService.deleteSession(sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
    } catch (error) {
      console.error('Error deleting session:', error);
    }
  }, []);

  React.useEffect(() => {
    if (showList) {
      fetchSessions();
    }
  }, [showList, fetchSessions]);

  return {
    sessions,
    loading,
    showList,
    setShowList,
    fetchSessions,
    loadSession,
    deleteSession,
  };
};