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
  createNewSession: () => Promise<void>;
  switchSession: (id: string) => void;
  sendMessage: (text: string) => Promise<void>;
  uploadDocument: (file: File) => Promise<void>;
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
      const token = localStorage.getItem('legal_ai_token');
      if (!token) {
        console.error("No authentication token found. Please log in.");
        return;
      }

      const response = await fetch(`${API_BASE}/?user_id=${userId}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
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

  const deleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    setSessions(prevSessions => {
      const updated = prevSessions.filter(s => s.id !== id);
      
      if (activeSessionId === id) {
        setActiveSessionId(updated.length > 0 ? updated[0].id : null);
      }
      return updated;
    });
  };

  const uploadDocument = async (file: File) => {
    let currentSessionId = activeSessionId;

    try {
      const token = localStorage.getItem('legal_ai_token');
      if (!token) {
        console.error("No authentication token found.");
        return;
      }

      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

      // 1. Auto-create session if none active
      if (!currentSessionId) {
        const userId = getCurrentUserId();
        if (!userId) return;

        const autoTitle = file.name.length > 25 ? file.name.substring(0, 25) + '...' : file.name;
        const createRes = await fetch(`${API_BASE}/?user_id=${userId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ title: autoTitle })
        });

        if (!createRes.ok) throw new Error('Failed to create session for upload.');
        const newSessionData = await createRes.json();
        currentSessionId = newSessionData.id;

        const newSession: ChatSession = {
          id: currentSessionId!,
          title: autoTitle,
          messages: [],
        };
        setSessions(prev => [newSession, ...prev]);
        setActiveSessionId(currentSessionId);
      }

      const targetSessionId = currentSessionId;

      // 2. Prepare FormData matching Swagger endpoint specification
      const formData = new FormData();
      formData.append('file', file);
      formData.append('session_id', targetSessionId!);

      // 3. Post to /api/upload (Browser handles boundary automatically)
      const response = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Failed to upload document.');
      }

      const uploadResult = await response.json();
      console.log("Upload Success:", uploadResult);

      // 4. Update UI chat log confirming the upload
      setSessions(prevSessions => 
        prevSessions.map(session => {
          if (session.id === targetSessionId) {
            return {
              ...session,
              messages: [
                ...session.messages, 
                { sender: 'user', text: `📎 Uploaded document: ${file.name}` },
                { sender: 'bot', text: `Successfully uploaded **${file.name}** and cached context. How can I help you analyze this document?` }
              ]
            };
          }
          return session;
        })
      );

    } catch (error: any) {
      console.error("Document Upload Error:", error);
      alert(error.message || 'Error uploading document');
    }
  };

  const sendMessage = async (text: string) => {
    let currentSessionId = activeSessionId;

    try {
      const userId = getCurrentUserId();
      if (!userId) return;

      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
      const token = localStorage.getItem('legal_ai_token');
      if (!token) {
        console.error("No authentication token found. Please log in.");
        return;
      }

      const authHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      };

      // 1. Auto-create session if none active
      if (!currentSessionId) {
        const autoTitle = text.length > 25 ? text.substring(0, 25) + '...' : text;
        const createRes = await fetch(`${API_BASE}/?user_id=${userId}`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({ title: autoTitle })
        });
        
        if (!createRes.ok) throw new Error('Failed to create chat session on backend.');
        
        const newSessionData = await createRes.json();
        currentSessionId = newSessionData.id;

        const newSession: ChatSession = {
          id: currentSessionId!,
          title: autoTitle,
          messages: [],
        };
        setSessions(prev => [newSession, ...prev]);
        setActiveSessionId(currentSessionId);
      } else {
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

      // 3. Request streaming response from backend with Bearer token
      const response = await fetch(`${API_BASE}/message/stream`, {
        method: 'POST',
        headers: authHeaders,
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
      sessions, activeSessionId, isTyping, createNewSession, switchSession, sendMessage, uploadDocument, updateSessionTitle, deleteSession 
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