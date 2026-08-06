// src/App.tsx
import { useState, useEffect, useRef } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import ChatWindow from './components/chat/ChatWindow';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import { Scale, Plus, User as UserIcon, MessageSquare, Edit2, Check, Menu, X, LogOut } from 'lucide-react';
import { useChatContext } from './context/ChatContext';

function ChatLayout() {
  const { sessions, activeSessionId, createNewSession, switchSession, updateSessionTitle } = useChatContext();
  const navigate = useNavigate();
  
  // Mobile menu and profile state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  // Local state for editing titles
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  
  // User Data from Local Storage
  const userName = localStorage.getItem('legal_ai_user_name') || 'Guest User';
  const userInitial = userName.charAt(0).toUpperCase();

  // Create initial session if empty
  useEffect(() => {
    if (sessions.length === 0) createNewSession();
  }, [sessions.length, createNewSession]);

  // Focus input automatically when edit mode starts
  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editingId]);

  // Handlers for Title Editing
  const handleEditStart = (e: React.MouseEvent, id: string, currentTitle: string) => {
    e.stopPropagation(); 
    setEditingId(id);
    setEditTitle(currentTitle);
  };

  const handleEditSave = () => {
    if (editingId && editTitle.trim()) {
      updateSessionTitle(editingId, editTitle);
    }
    setEditingId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleEditSave();
    if (e.key === 'Escape') setEditingId(null);
  };

  // Logout Handler
  const handleLogout = () => {
    localStorage.removeItem('legal_ai_user_name');
    navigate('/login');
  };

  return (
    <div className="h-screen w-screen flex flex-col md:flex-row overflow-hidden bg-brand-light font-sans text-gray-800 relative">
      
      {/* Mobile Top Header (Hidden on Desktop) */}
      <div className="md:hidden bg-brand-blue text-white p-4 flex items-center justify-between shadow-md z-20">
        <div className="flex items-center gap-2">
          <Scale className="w-6 h-6 text-brand-gold" />
          <h1 className="font-serif font-bold text-lg">Legal AI</h1>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-brand-gold p-1">
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar - Overlay on mobile, static on desktop */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-30 w-80 bg-white border-r border-gray-200 flex flex-col transform transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Desktop Header (Hidden on Mobile) */}
        <div className="hidden md:flex p-6 border-b border-gray-100 items-center gap-3">
          <div className="bg-brand-blue text-brand-gold p-2 rounded-lg">
            <Scale className="w-6 h-6" />
          </div>
          <h1 className="font-serif font-bold text-xl text-brand-blue">Legal AI</h1>
        </div>
        
        <div className="p-4">
          <button 
            onClick={() => {
              createNewSession();
              setIsMobileMenuOpen(false); // Close mobile menu after clicking
            }} 
            className="w-full flex items-center justify-center gap-2 bg-brand-blue text-white py-3 rounded-lg hover:bg-opacity-90 transition font-medium"
          >
            <Plus className="w-4 h-4" />
            New Consultation
          </button>
        </div>

        {/* Chat History List */}
        <div className="flex-1 overflow-y-auto p-4">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Recent Consultations</h2>
          <div className="space-y-2">
            {sessions.map(session => (
              <div
                key={session.id}
                onClick={() => {
                  switchSession(session.id);
                  setIsMobileMenuOpen(false); // Close sidebar on mobile when switching
                }}
                className={`w-full text-left p-3 rounded-lg flex items-center justify-between transition cursor-pointer group ${
                  activeSessionId === session.id 
                    ? 'bg-brand-light border-l-4 border-brand-gold' 
                    : 'hover:bg-brand-light border-l-4 border-transparent text-gray-600'
                }`}
              >
                <div className="flex items-center gap-3 overflow-hidden flex-1">
                  <MessageSquare className="w-4 h-4 flex-shrink-0" />
                  
                  {/* Toggle between Input and Text Span */}
                  {editingId === session.id ? (
                    <input
                      ref={inputRef}
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onBlur={handleEditSave}
                      onKeyDown={handleKeyDown}
                      onClick={(e) => e.stopPropagation()}
                      className="text-sm font-medium bg-white border border-brand-gold rounded px-2 py-1 outline-none w-full"
                    />
                  ) : (
                    <span className="text-sm font-medium truncate">{session.title}</span>
                  )}
                </div>

                {/* Edit Button (Visible on active session or hover) */}
                {activeSessionId === session.id && editingId !== session.id && (
                  <button 
                    onClick={(e) => handleEditStart(e, session.id, session.title)}
                    className="p-1 text-gray-400 hover:text-brand-blue transition"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                )}
                {editingId === session.id && (
                  <Check className="w-4 h-4 text-green-600" />
                )}
              </div>
            ))}
          </div>
        </div>
        
        {/* Interactive User Profile with Logout */}
        <div className="relative mt-auto border-t border-gray-200">
          {/* Pop-up Logout Menu */}
          {isProfileMenuOpen && (
            <div className="absolute bottom-full left-0 w-full p-2 bg-white border-t border-gray-200 shadow-lg animate-message">
              <button 
                onClick={handleLogout}
                className="w-full flex items-center gap-3 p-3 text-red-600 hover:bg-red-50 rounded-lg transition font-medium"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          )}

          <div 
            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
            className="p-4 flex items-center gap-3 hover:bg-brand-light cursor-pointer transition"
          >
            <div className="w-10 h-10 bg-brand-user rounded-full flex items-center justify-center text-brand-blue font-bold text-lg shadow-inner">
              {userInitial}
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-sm font-semibold text-brand-blue truncate" title={userName}>
                {userName}
              </p>
              <p className="text-xs text-gray-400">Free Tier</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Overlay Background (Closes menu when clicking outside) */}
      {isMobileMenuOpen && (
        <div 
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-20 md:hidden"
        />
      )}

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col relative h-full w-full">
        <ChatWindow />
      </main>
    </div>
  );
}

// Main App component configuring Routes
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/chat" element={<ChatLayout />} />
    </Routes>
  );
}