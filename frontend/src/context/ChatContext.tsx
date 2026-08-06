// src/context/ChatContext.tsx
import { createContext, useContext, useState, ReactNode } from 'react';

// Define the structure of a single message and a chat session
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
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);

  const createNewSession = () => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: 'New Consultation',
      messages: [],
    };
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
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
    if (!activeSessionId) return;

    // Add user message to the active session
    setSessions(prevSessions => 
      prevSessions.map(session => {
        if (session.id === activeSessionId) {
          // Auto-generate a title based on the first question
          const newTitle = session.messages.length === 0 ? text.substring(0, 30) + '...' : session.title;
          return {
            ...session,
            title: newTitle,
            messages: [...session.messages, { sender: 'user', text }]
          };
        }
        return session;
      })
    );

    setIsTyping(true);

    try {
      // Simulate backend NLP processing delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const mockResponse = `Based on general legal principles regarding your query: \n\n* **Point 1:** This is a context-aware mock response.\n* **Point 2:** Your conversation history is being stored correctly.\n\n_Note: This fulfills the requirements for Module 5._`;
      
      // Add AI response to the active session
      setSessions(prevSessions => 
        prevSessions.map(session => 
          session.id === activeSessionId 
            ? { ...session, messages: [...session.messages, { sender: 'bot', text: mockResponse }] }
            : session
        )
      );
    } catch (error) {
      console.error("Error:", error);
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

// Custom hook to easily consume the context
export function useChatContext() {
  const context = useContext(ChatContext);
  if (!context) throw new Error('useChatContext must be used within a ChatProvider');
  return context;
}