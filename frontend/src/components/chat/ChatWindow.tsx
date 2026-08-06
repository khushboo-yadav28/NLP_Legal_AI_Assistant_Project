import { useState, useRef, useEffect } from 'react';
import { Send, Bot, Info, Mic, MicOff, FileText, Shield, Scale as ScaleIcon, Copy, Check, Square } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useChatContext } from '../../context/ChatContext';

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export default function ChatWindow() {
  const { sessions, activeSessionId, isTyping, sendMessage } = useChatContext();
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Typewriter Placeholder State
  const placeholders = [
    "Ask about Consumer rights...",
    "Ask about Contract law...",
    "Ask about the Right to Information Act..."
  ];
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [currentPlaceholder, setCurrentPlaceholder] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Copy State
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const activeSession = sessions.find(s => s.id === activeSessionId);
  const messages = activeSession?.messages || [];

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000); // Reset after 2 seconds
  };
  
  // Dynamic Typewriter Effect Logic
  useEffect(() => {
    if (isListening) return; // Pause animation while microphone is active

    const fullText = placeholders[placeholderIndex];
    let timer: ReturnType<typeof setTimeout>;

    if (!isDeleting && currentPlaceholder === fullText) {
      timer = setTimeout(() => setIsDeleting(true), 2500); // Pause before deleting
    } else if (isDeleting && currentPlaceholder === '') {
      setIsDeleting(false);
      setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
    } else {
      const nextCharDelay = isDeleting ? 40 : 80;
      timer = setTimeout(() => {
        setCurrentPlaceholder(fullText.substring(0, currentPlaceholder.length + (isDeleting ? -1 : 1)));
      }, nextCharDelay);
    }
    return () => clearTimeout(timer);
  }, [currentPlaceholder, isDeleting, placeholderIndex, isListening]);

  // Speech Recognition Setup
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          currentTranscript += event.results[i][0].transcript;
        }
        setInput(currentTranscript);
      };

      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);
      recognitionRef.current = recognition;
    }
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = (textOverride?: string) => {
    const textToSend = textOverride || input;
    if (!textToSend.trim()) return;
    sendMessage(textToSend);
    setInput('');
  };

  const toggleListen = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      setInput('');
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  // Suggestion Cards Data
  const suggestionCards = [
    { icon: <Shield className="w-6 h-6" />, title: "Consumer Rights", query: "What are my rights if an online seller refuses to refund a defective product?" },
    { icon: <FileText className="w-6 h-6" />, title: "Contract Law", query: "Explain the basic elements required for a contract to be legally binding." },
    { icon: <ScaleIcon className="w-6 h-6" />, title: "RTI Act", query: "How do I file a Right to Information (RTI) request?" }
  ];

  return (
    <div className="flex-1 flex flex-col h-full relative bg-brand-light">
      {/* Sleek Disclaimer */}
      <div className="bg-brand-blue text-brand-gold px-4 py-2 text-xs md:text-sm flex items-center justify-center gap-2 font-medium z-10 shadow-md">
        <Info className="w-4 h-4" />
        This system provides legal information for educational purposes and is not official legal advice.
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 pb-32">
        
        {/* The New, Creative Welcome State */}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full max-w-3xl mx-auto text-center animate-message mt-10">
            <div className="w-20 h-20 bg-brand-blue text-brand-gold rounded-2xl flex items-center justify-center shadow-lg mb-6 ">
              <ScaleIcon className="w-10 h-10" />
            </div>
            <h2 className="text-3xl font-serif font-bold text-brand-blue mb-3">What legal question can I clarify for you today?</h2>
            <p className="text-gray-500 mb-10 max-w-xl">Ask any legal question in simple terms. Select a common scenario below to get started, or type your own query.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
              {suggestionCards.map((card, idx) => (
                <div 
                  key={idx} 
                  onClick={() => handleSend(card.query)}
                  className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-brand-gold cursor-pointer transition flex flex-col items-center text-center group"
                >
                  <div className="text-brand-blue mb-3 group-hover:text-brand-gold transition-colors">
                    {card.icon}
                  </div>
                  <h3 className="font-semibold text-gray-800 mb-1">{card.title}</h3>
                  <p className="text-xs text-gray-400 line-clamp-2">{card.query}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Animated Message Bubbles */}
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-message`}>
            {msg.sender === 'bot' && (
              <div className="w-8 h-8 rounded-full bg-brand-blue flex-shrink-0 flex items-center justify-center text-brand-gold mt-1 mr-3 shadow-sm">
                <Bot className="w-5 h-5" />
              </div>
            )}
            <div className={`p-5 rounded-2xl shadow-sm max-w-[85%] md:max-w-[75%] leading-relaxed ${
              msg.sender === 'user' 
                ? 'bg-white border border-gray-100 text-gray-800 rounded-tr-sm' 
                : 'bg-brand-blue text-white rounded-tl-sm prose prose-invert max-w-none'
            }`}>
              {msg.sender === 'user' ? (
                msg.text
              ) : (
                <>
                  <ReactMarkdown>{msg.text}</ReactMarkdown>
                  <div className="mt-4 pt-3 border-t border-white/10 flex justify-end">
                    <button 
                      onClick={() => handleCopy(msg.text, idx)}
                      className={`flex items-center gap-1 text-xs font-medium transition ${
                        copiedIndex === idx ? 'text-green-400' : 'text-gray-300 hover:text-brand-gold'
                      }`}
                    >
                      {copiedIndex === idx ? (
                        <><Check className="w-3 h-3" /> Copied!</>
                      ) : (
                        <><Copy className="w-3 h-3" /> Copy text</>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
        
        {isTyping && (
          <div className="flex justify-start animate-message">
            <div className="w-8 h-8 rounded-full bg-brand-blue flex-shrink-0 flex items-center justify-center text-brand-gold mt-1 mr-3 shadow-sm">
                <Bot className="w-5 h-5" />
            </div>
            <div className="bg-white border border-gray-100 p-4 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-2 h-[56px]">
              <div className="w-2 h-2 bg-brand-gold rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-brand-gold rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 bg-brand-gold rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Glassmorphism Input Area */}
      <div className="absolute bottom-0 w-full bg-white/80 backdrop-blur-md border-t border-gray-200 p-4">
        <div className="max-w-4xl mx-auto relative flex items-center gap-2">
          
          <button 
            onClick={toggleListen}
            className={`p-4 rounded-xl transition shadow-sm ${
              isListening 
                ? 'bg-red-500 text-white animate-pulse' 
                : 'bg-white border border-gray-200 text-gray-500 hover:text-brand-blue hover:border-brand-blue'
            }`}
          >
            {isListening ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </button>

          <div className="relative flex-1 shadow-sm rounded-xl">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              className="w-full bg-white border border-gray-200 rounded-xl py-4 pl-5 pr-16 focus:outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 transition text-gray-800"
              placeholder={isListening ? "Listening..." : `${currentPlaceholder}|`}
            />
            <button 
  onClick={isTyping ? undefined : () => handleSend()} // (We will add true stop logic when connecting to the backend)
  disabled={!isTyping && !input.trim()}
  className={`absolute right-2 top-2 bottom-2 p-3 rounded-lg transition flex items-center justify-center ${
    isTyping 
      ? 'bg-red-100 text-red-600 hover:bg-red-200' 
      : 'bg-brand-blue text-brand-gold hover:bg-[#152a5c] disabled:opacity-50'
  }`}
>
  {isTyping ? <Square className="w-5 h-5 fill-current" /> : <Send className="w-5 h-5" />}
</button>
          </div>
        </div>
      </div>
    </div>
  );
}