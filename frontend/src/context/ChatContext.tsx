// src/context/ChatContext.tsx
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { generateAndDownloadAffidavit, type AffidavitPayload } from '../services/documentService';

export interface ChatMessage {
  sender: 'user' | 'bot';
  text: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
}

interface StoredUser {
  id: string;
  email?: string;
  full_name?: string;
}

interface ChatContextType {
  sessions: ChatSession[];
  activeSessionId: string | null;
  isTyping: boolean;
  isLoadingSessions: boolean;
  createNewSession: () => Promise<void>;
  switchSession: (id: string) => Promise<void>;
  sendMessage: (text: string) => Promise<void>;
  uploadDocument: (file: File) => Promise<void>;
  updateSessionTitle: (id: string, newTitle: string) => void;
  deleteSession: (id: string, e?: React.MouseEvent) => void;
  generateAffidavit: (payload: AffidavitPayload) => Promise<{ filename: string }>;
  syncSessionsFromBackend: () => Promise<void>;
  logout: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

function getCurrentUser(): StoredUser | null {
  try {
    const raw = localStorage.getItem('legal_ai_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function ChatProvider({ children }: { children: ReactNode }) {
  const initialUser = getCurrentUser();
  const [currentUserId, setCurrentUserId] = useState<string | null>(initialUser?.id || null);

  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    if (!initialUser?.id) return [];
    try {
      const saved = localStorage.getItem(`legal_ai_sessions_${initialUser.id}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [activeSessionId, setActiveSessionId] = useState<string | null>(() => {
    if (!initialUser?.id) return null;
    try {
      const saved = localStorage.getItem(`legal_ai_sessions_${initialUser.id}`);
      const parsed: ChatSession[] = saved ? JSON.parse(saved) : [];
      return parsed.length > 0 ? parsed[0].id : null;
    } catch {
      return null;
    }
  });

  const [isTyping, setIsTyping] = useState(false);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);

  // Sync sessions to localStorage strictly scoped by currentUser.id
  useEffect(() => {
    if (currentUserId) {
      localStorage.setItem(`legal_ai_sessions_${currentUserId}`, JSON.stringify(sessions));
    }
  }, [sessions, currentUserId]);

  // Synchronize with backend sessions
  const syncSessionsFromBackend = async () => {
    const token = localStorage.getItem('legal_ai_token');
    const user = getCurrentUser();
    if (!token || !user?.id) return;

    setIsLoadingSessions(true);
    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
      const res = await fetch(`${API_BASE}/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const backendSessions: Array<{ id: string; title: string }> = await res.json();
        
        let targetId = activeSessionId;
        if (!targetId || !backendSessions.some(b => b.id === targetId)) {
          targetId = backendSessions.length > 0 ? backendSessions[0].id : null;
        }

        setSessions(prev => {
          const prevMap = new Map(prev.map(s => [s.id, s]));
          return backendSessions.map(bs => {
            const existing = prevMap.get(bs.id);
            return {
              id: bs.id,
              title: bs.title || (existing ? existing.title : 'New Consultation'),
              messages: existing ? existing.messages : [],
            };
          });
        });

        if (targetId) {
          setActiveSessionId(targetId);
          try {
            const msgsRes = await fetch(`${API_BASE}/${targetId}/messages`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (msgsRes.ok) {
              const msgs = await msgsRes.json();
              if (Array.isArray(msgs)) {
                const formatted: ChatMessage[] = msgs.map((m: any) => ({
                  sender: m.sender === 'user' ? 'user' : 'bot',
                  text: m.text,
                }));
                setSessions(prev =>
                  prev.map(s => (s.id === targetId ? { ...s, messages: formatted } : s))
                );
              }
            }
          } catch (e) {
            console.error('Failed to load active session messages:', e);
          }
        }
      }
    } catch (err) {
      console.error('Error syncing sessions from backend:', err);
    } finally {
      setIsLoadingSessions(false);
    }
  };

  // Detect user switch or logout and immediately reset/switch session state
  useEffect(() => {
    const checkUserChange = () => {
      const user = getCurrentUser();
      const newId = user?.id || null;

      if (newId !== currentUserId) {
        setCurrentUserId(newId);
        if (!newId) {
          // Immediately wipe in-memory session state on logout
          setSessions([]);
          setActiveSessionId(null);
        } else {
          // Load strictly scoped sessions for the newly authenticated user
          try {
            const saved = localStorage.getItem(`legal_ai_sessions_${newId}`);
            const userSessions: ChatSession[] = saved ? JSON.parse(saved) : [];
            setSessions(userSessions);
            setActiveSessionId(userSessions.length > 0 ? userSessions[0].id : null);
          } catch (e) {
            console.error('Error switching user session history:', e);
            setSessions([]);
            setActiveSessionId(null);
          }
        }
      }
    };

    checkUserChange();
    window.addEventListener('storage', checkUserChange);
    window.addEventListener('focus', checkUserChange);
    window.addEventListener('legal_ai_auth_change', checkUserChange);
    return () => {
      window.removeEventListener('storage', checkUserChange);
      window.removeEventListener('focus', checkUserChange);
      window.removeEventListener('legal_ai_auth_change', checkUserChange);
    };
  }, [currentUserId]);

  // Sync with backend whenever user changes or on component mount
  useEffect(() => {
    if (currentUserId) {
      syncSessionsFromBackend();
    }
  }, [currentUserId]);

  const logout = () => {
    setSessions([]);
    setActiveSessionId(null);
    setCurrentUserId(null);
  };

  const createNewSession = async () => {
    try {
      const user = getCurrentUser();
      if (!user?.id) return;

      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
      const token = localStorage.getItem('legal_ai_token');
      if (!token) {
        console.error('No authentication token found. Please log in.');
        return;
      }

      const response = await fetch(`${API_BASE}/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title: 'New Consultation' }),
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
      console.error('Error creating session:', error);
    }
  };

  const switchSession = async (id: string) => {
    setActiveSessionId(id);

    const targetSession = sessions.find(s => s.id === id);
    if (targetSession && targetSession.messages.length === 0) {
      const token = localStorage.getItem('legal_ai_token');
      if (token) {
        try {
          const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
          const res = await fetch(`${API_BASE}/${id}/messages`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const msgs = await res.json();
            if (Array.isArray(msgs) && msgs.length > 0) {
              const formatted: ChatMessage[] = msgs.map((m: any) => ({
                sender: m.sender === 'user' ? 'user' : 'bot',
                text: m.text,
              }));
              setSessions(prev =>
                prev.map(s => (s.id === id ? { ...s, messages: formatted } : s))
              );
            }
          }
        } catch (e) {
          console.error('Failed to load session messages:', e);
        }
      }
    }
  };

  const updateSessionTitle = async (id: string, newTitle: string) => {
    if (!newTitle.trim()) return;
    setSessions(prevSessions =>
      prevSessions.map(session =>
        session.id === id ? { ...session, title: newTitle } : session
      )
    );

    const token = localStorage.getItem('legal_ai_token');
    if (token) {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
      try {
        await fetch(`${API_BASE}/${id}/title`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ title: newTitle }),
        });
      } catch (e) {
        console.error('Failed to update title on backend', e);
      }
    }
  };

  const deleteSession = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    const token = localStorage.getItem('legal_ai_token');
    if (token) {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
      try {
        await fetch(`${API_BASE}/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (err) {
        console.error('Failed to delete session on backend:', err);
      }
    }

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
        console.error('No authentication token found.');
        return;
      }

      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

      // 1. Auto-create session if none active
      if (!currentSessionId) {
        const user = getCurrentUser();
        if (!user?.id) return;

        const autoTitle = file.name.length > 25 ? file.name.substring(0, 25) + '...' : file.name;
        const createRes = await fetch(`${API_BASE}/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ title: autoTitle }),
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

      // 2. Prepare FormData matching endpoint specification
      const formData = new FormData();
      formData.append('file', file);
      formData.append('session_id', targetSessionId!);

      // 3. Post to /api/upload
      const response = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Failed to upload document.');
      }

      // 4. Update UI chat log confirming the upload
      setSessions(prevSessions =>
        prevSessions.map(session => {
          if (session.id === targetSessionId) {
            return {
              ...session,
              messages: [
                ...session.messages,
                { sender: 'user', text: `📎 Uploaded document: ${file.name}` },
                {
                  sender: 'bot',
                  text: `Successfully uploaded **${file.name}** and cached context. How can I help you analyze this document?`,
                },
              ],
            };
          }
          return session;
        })
      );
    } catch (error: any) {
      console.error('Document Upload Error:', error);
      alert(error.message || 'Error uploading document');
    }
  };

  const sendMessage = async (text: string) => {
    let currentSessionId = activeSessionId;

    try {
      const user = getCurrentUser();
      if (!user?.id) return;

      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
      const token = localStorage.getItem('legal_ai_token');
      if (!token) {
        console.error('No authentication token found. Please log in.');
        return;
      }

      const authHeaders = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      };

      // 1. Auto-create session if none active
      if (!currentSessionId) {
        const autoTitle = text.length > 40 ? text.substring(0, 40) + '...' : text;
        const createRes = await fetch(`${API_BASE}/`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({ title: autoTitle }),
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
        const autoTitle = text.length > 40 ? text.substring(0, 40) + '...' : text;
        setSessions(prevSessions =>
          prevSessions.map(session => {
            if (session.id === currentSessionId && session.title === 'New Consultation') {
              return { ...session, title: autoTitle };
            }
            return session;
          })
        );

        // Persist auto-title to backend
        fetch(`${API_BASE}/${currentSessionId}/title`, {
          method: 'PATCH',
          headers: authHeaders,
          body: JSON.stringify({ title: autoTitle }),
        }).catch(err => console.error('Failed to update title on backend:', err));
      }

      const targetSessionId = currentSessionId;

      // 2. Add user message to UI immediately
      setSessions(prevSessions =>
        prevSessions.map(session => {
          if (session.id === targetSessionId) {
            return {
              ...session,
              messages: [...session.messages, { sender: 'user', text }],
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
          query: text,
        }),
      });

      if (!response.ok) throw new Error('Failed to connect to streaming endpoint.');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = '';

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
                        updatedMessages[updatedMessages.length - 1] = {
                          sender: 'bot',
                          text: accumulatedText,
                        };
                        return { ...session, messages: updatedMessages };
                      }
                      return session;
                    })
                  );
                }
              } catch {
                // Ignore partial chunks
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Streaming Connection Error:', error);
    } finally {
      setIsTyping(false);
    }
  };

  const generateAffidavit = async (payload: AffidavitPayload) => {
    const result = await generateAndDownloadAffidavit(payload);

    if (activeSessionId) {
      const typeTitles: Record<string, string> = {
        surname_change: 'Surname Change Affidavit',
        name_change: 'Name Change Affidavit',
        address_change: 'Address Change Affidavit',
        dob_correction: 'Date of Birth Correction Affidavit',
        relation_update: 'Parent/Spouse Name Correction Affidavit',
        one_and_same: 'One and the Same Person Affidavit',
      };
      const title = typeTitles[payload.document_type || 'name_change'] || 'Legal Affidavit';
      const subject = payload.new_value || payload.new_name || payload.full_name || 'your records';

      setSessions(prevSessions =>
        prevSessions.map(session => {
          if (session.id === activeSessionId) {
            return {
              ...session,
              messages: [
                ...session.messages,
                {
                  sender: 'bot' as const,
                  text: `📄 **${title} Generated**\n\nA standardized legal affidavit for **${subject}** has been generated and downloaded as \`${result.filename}\`.\n\n*Note: Print this document on non-judicial stamp paper of prescribed value in your state and get it attested before a Notary Public or Oath Commissioner.*`,
                },
              ],
            };
          }
          return session;
        })
      );
    }

    return result;
  };

  return (
    <ChatContext.Provider
      value={{
        sessions,
        activeSessionId,
        isTyping,
        isLoadingSessions,
        createNewSession,
        switchSession,
        sendMessage,
        uploadDocument,
        updateSessionTitle,
        deleteSession,
        generateAffidavit,
        syncSessionsFromBackend,
        logout,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChatContext() {
  const context = useContext(ChatContext);
  if (!context) throw new Error('useChatContext must be used within a ChatProvider');
  return context;
}
