// src/context/ChatContext.tsx
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

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
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const saved = localStorage.getItem('legal_ai_sessions');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    localStorage.setItem('legal_ai_sessions', JSON.stringify(sessions));
  }, [sessions]);

  const createNewSession = async () => {
    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
      // Pass user_id query parameter as required by backend route definition
      const response = await fetch(`${API_BASE}/?user_id=jonh`, {
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

  const sendMessage = async (text: string) => {
    let currentSessionId = activeSessionId;

    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

      // 1. Auto-create session in database if none is active
      if (!currentSessionId) {
        const createRes = await fetch(`${API_BASE}/?user_id=jonh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: text.substring(0, 30) + '...' })
        });
        
        if (!createRes.ok) throw new Error('Failed to create chat session on backend.');
        
        const newSessionData = await createRes.json();
        currentSessionId = newSessionData.id;

        const newSession: ChatSession = {
          id: currentSessionId,
          title: newSessionData.title,
          messages: [],
        };
        setSessions(prev => [newSession, ...prev]);
        setActiveSessionId(currentSessionId);
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

      if (!response.ok) {
        throw new Error('Failed to connect to the Legal AI streaming endpoint.');
      }

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
      const errorResponse = "⚠️ **Connection Error:** Failed to stream response from backend.";
      setSessions(prevSessions => 
        prevSessions.map(session => {
          if (session.id === activeSessionId) {
            const updatedMessages = [...session.messages];
            updatedMessages[updatedMessages.length - 1] = { sender: 'bot', text: errorResponse };
            return { ...session, messages: updatedMessages };
          }
          return session;
        })
      );
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <ChatContext.Provider value={{ 
      sessions, activeSessionId, isTyping, createNewSession, switchSession, sendMessage, updateSessionTitle 
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