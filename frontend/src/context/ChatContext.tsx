// src/context/ChatContext.tsx
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export interface ChatMessage {
  sender: 'user' | 'bot';
  text: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
}

interface ChatContextType {
  sessions: ChatSession[];
  activeSessionId: string | null;
  isTyping: boolean;
  createNewSession: () => void;
  switchSession: (id: string) => void;
  sendMessage: (text: string) => void;
  updateSessionTitle: (id: string, newTitle: string) => void;
  deleteSession: (id: string, e: React.MouseEvent) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const getStorageKey = () => {
    try {
      const storedUser = localStorage.getItem('legal_ai_user');
      const user = storedUser ? JSON.parse(storedUser) : null;
      return user?.id ? `legal_ai_sessions_${user.id}` : 'legal_ai_sessions_guest';
    } catch (e) {
      return 'legal_ai_sessions_guest';
    }
  };

  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const saved = localStorage.getItem(getStorageKey());
    return saved ? JSON.parse(saved) : [];
  });
  
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    localStorage.setItem(getStorageKey(), JSON.stringify(sessions));
  }, [sessions]);

  const getCurrentUserId = () => {
    try {
      const storedUser = localStorage.getItem('legal_ai_user');
      const user = storedUser ? JSON.parse(storedUser) : null;
      return user?.id || null;
    } catch (e) {
      return null;
    }
  };

  const createNewSession = async () => {
    try {
      const userId = getCurrentUserId();
      if (!userId) return;

      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
      
      const response = await fetch(`${API_BASE}/?user_id=${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Consultation' })
      });

      if (!response.ok) throw new Error('Failed to create session on backend');
      
      const newSessionData = await response.json();
      const newSession: ChatSession = {
        id: newSessionData.id,
        title: newSessionData.title,
        messages: [],
      };
      setSessions(prev => [newSession, ...prev]);
      setActiveSessionId(newSession.id);
    } catch (error) {
      console.error("Error creating session:", error);
    }
  };

  const switchSession = (id: string) => {
    setActiveSessionId(id);
  };

  const updateSessionTitle = (id: string, newTitle: string) => {
    if (!newTitle.trim()) return;
    setSessions(prevSessions => 
      prevSessions.map(session => 
        session.id === id ? { ...session, title: newTitle } : session
      )
    );
  };

  // Delete specific chat session function
  const deleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent switching sessions when clicking delete
    
    setSessions(prevSessions => {
      const updated = prevSessions.filter(s => s.id !== id);
      
      // If we deleted the currently active session, switch to the next available one or null
      if (activeSessionId === id) {
        setActiveSessionId(updated.length > 0 ? updated[0].id : null);
      }
      return updated;
    });
  };

  const sendMessage = async (text: string) => {
    let currentSessionId = activeSessionId;

    try {
      const userId = getCurrentUserId();
      if (!userId) return;

      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

      // 1. Auto-create session if none active, naming it based on the first query (Gemini style)
      if (!currentSessionId) {
        const autoTitle = text.length > 25 ? text.substring(0, 25) + '...' : text;
        const createRes = await fetch(`${API_BASE}/?user_id=${userId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: autoTitle })
        });
        
        if (!createRes.ok) throw new Error('Failed to create chat session on backend.');
        
        const newSessionData = await createRes.json();
        currentSessionId = newSessionData.id;

        const newSession: ChatSession = {
          id: currentSessionId!,
          title: autoTitle, // Automatically set title based on query
          messages: [],
        };
        setSessions(prev => [newSession, ...prev]);
        setActiveSessionId(currentSessionId);
      } else {
        // If it's a "New Consultation" and this is the first message, update the title automatically
        setSessions(prevSessions =>
          prevSessions.map(session => {
            if (session.id === currentSessionId && session.title === 'New Consultation') {
              const autoTitle = text.length > 25 ? text.substring(0, 25) + '...' : text;
              return { ...session, title: autoTitle };
            }
            return session;
          })
        );
      }

      const targetSessionId = currentSessionId;

      // 2. Add user message to UI immediately
      setSessions(prevSessions => 
        prevSessions.map(session => {
          if (session.id === targetSessionId) {
            return {
              ...session,
              messages: [...session.messages, { sender: 'user', text }]
            };
          }
          return session;
        })
      );

      setIsTyping(true);

      // Add temporary empty bot message for stream population
      setSessions(prevSessions => 
        prevSessions.map(session => 
          session.id === targetSessionId 
            ? { ...session, messages: [...session.messages, { sender: 'bot', text: '' }] }
            : session
        )
      );

      // 3. Request streaming response from backend
      const response = await fetch(`${API_BASE}/message/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: targetSessionId,
          query: text
        })
      });

      if (!response.ok) throw new Error('Failed to connect to streaming endpoint.');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = "";

      if (reader) {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.replace('data: ', '').trim();
              if (dataStr === '[DONE]') break;

              try {
                const parsed = JSON.parse(dataStr);
                if (parsed.text) {
                  accumulatedText += parsed.text;
                  setSessions(prevSessions => 
                    prevSessions.map(session => {
                      if (session.id === targetSessionId) {
                        const updatedMessages = [...session.messages];
                        updatedMessages[updatedMessages.length - 1] = { sender: 'bot', text: accumulatedText };
                        return { ...session, messages: updatedMessages };
                      }
                      return session;
                    })
                  );
                }
              } catch (e) {
                // Ignore partial chunks
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Streaming Connection Error:", error);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <ChatContext.Provider value={{ 
      sessions, activeSessionId, isTyping, createNewSession, switchSession, sendMessage, updateSessionTitle, deleteSession 
    }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChatContext() {
  const context = useContext(ChatContext);
  if (!context) throw new Error('useChatContext must be used within a ChatProvider');
  return context;
}