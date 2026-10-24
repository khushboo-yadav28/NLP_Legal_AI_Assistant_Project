import { useState, useRef, useEffect } from 'react';
import {
  Send,
  Bot,
  Info,
  Mic,
  MicOff,
  Scale as ScaleIcon,
  Copy,
  Check,
  Paperclip,
  FileDown,
  Download,
  Loader2,
  CheckCircle2,
  Edit2,
  ShieldAlert,
  Home,
  UserCheck,
  Calendar,
  Users,
  FileText,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useChatContext } from '../../context/ChatContext';
import AffidavitModal from './AffidavitModal';
import ContractAuditDrawer from './ContractAuditDrawer';
import {
  generateAndDownloadAffidavit,
  extractAffidavitDetails,
  isAffidavitMessage,
  isDocumentGenerationQuery,
  getAffidavitDocType,
  type AffidavitPayload,
  type SupportedDocumentType,
} from '../../services/documentService';
import {
  requestContractAudit,
  type ContractAuditReport,
} from '../../services/contractAuditService';

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export default function ChatWindow() {
  const { sessions, activeSessionId, isTyping, sendMessage, uploadDocument } = useChatContext();
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isAffidavitModalOpen, setIsAffidavitModalOpen] = useState(false);
  const [customModalData, setCustomModalData] = useState<AffidavitPayload | null>(null);
  const [downloadingIdx, setDownloadingIdx] = useState<number | null>(null);
  const [downloadedIndices, setDownloadedIndices] = useState<Set<number>>(new Set());

  // Contract Audit State
  const [isAuditDrawerOpen, setIsAuditDrawerOpen] = useState(false);
  const [auditReport, setAuditReport] = useState<ContractAuditReport | null>(null);
  const [isAuditLoading, setIsAuditLoading] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Typewriter Placeholder State
  const placeholders = [
    "Ask about Consumer rights...",
    "Change surname from John Mehta to John Joshi...",
    "Draft a Name Change Affidavit...",
    "Draft an Address Change Affidavit...",
    "Audit contract for red-flags...",
  ];
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [currentPlaceholder, setCurrentPlaceholder] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Copy State
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const activeSession = sessions.find(s => s.id === activeSessionId);
  const messages = activeSession?.messages || [];

  // Reset audit report when session switches
  useEffect(() => {
    setAuditReport(null);
  }, [activeSessionId]);

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Direct download right below the assistant response message
  const handleDirectDownload = async (messageText: string, idx: number) => {
    try {
      setDownloadingIdx(idx);

      let storedUserFullName = '';
      try {
        const stored = localStorage.getItem('legal_ai_user');
        if (stored) {
          const u = JSON.parse(stored);
          storedUserFullName = u?.full_name || '';
        }
      } catch {
        // ignore
      }

      // Merge assistant text with preceding user prompt so all entities are captured
      const prevUserMsg = messages.slice(0, idx).reverse().find(m => m.sender === 'user');
      const payload = extractAffidavitDetails(messageText, storedUserFullName, prevUserMsg?.text);

      await generateAndDownloadAffidavit(payload);

      setDownloadedIndices(prev => new Set(prev).add(idx));
      setTimeout(() => {
        setDownloadedIndices(prev => {
          const next = new Set(prev);
          next.delete(idx);
          return next;
        });
      }, 4000);
    } catch (err: any) {
      console.error('Direct Download Error:', err);
      alert(err?.message || 'Failed to download affidavit document.');
    } finally {
      setDownloadingIdx(null);
    }
  };

  // Open modal with pre-filled details from a message or fresh
  const handleOpenCustomizeModal = (messageText?: string, defaultType?: SupportedDocumentType) => {
    let textToParse = messageText;
    let queryContext: string | undefined = undefined;

    // If no explicit messageText provided, check current input query or last user query
    if (!textToParse) {
      if (input && input.trim()) {
        textToParse = input;
      } else if (messages.length > 0) {
        const lastUserMsg = [...messages].reverse().find(m => m.sender === 'user' && m.text.trim().length > 0);
        if (lastUserMsg) {
          textToParse = lastUserMsg.text;
        }
      }
    } else {
      const lastUserMsg = [...messages].reverse().find(m => m.sender === 'user');
      queryContext = lastUserMsg?.text;
    }

    let storedUserFullName = '';
    try {
      const stored = localStorage.getItem('legal_ai_user');
      if (stored) {
        const u = JSON.parse(stored);
        storedUserFullName = u?.full_name || '';
      }
    } catch {
      // ignore
    }

    if (textToParse) {
      const extracted = extractAffidavitDetails(textToParse, storedUserFullName, queryContext);
      if (defaultType) {
        extracted.document_type = defaultType;
      }
      setCustomModalData(extracted);
    } else {
      setCustomModalData(defaultType ? { document_type: defaultType } : null);
    }
    setIsAffidavitModalOpen(true);
  };

  // Trigger Contract Risk Audit
  const handleTriggerAudit = async () => {
    try {
      setIsAuditLoading(true);
      setIsAuditDrawerOpen(true);

      const report = await requestContractAudit({
        sessionId: activeSessionId || undefined,
      });

      setAuditReport(report);
    } catch (err: any) {
      console.error('Audit Error:', err);
      alert(err?.message || 'Failed to execute contract risk audit.');
      setIsAuditDrawerOpen(false);
    } finally {
      setIsAuditLoading(false);
    }
  };

  const handleAskRenegotiate = (clauseTitle: string) => {
    setIsAuditDrawerOpen(false);
    const renegotiatePrompt = `Please draft an amendment and renegotiation proposal for the contract clause: "${clauseTitle}" to balance liabilities fairly under Indian law.`;
    handleSend(renegotiatePrompt);
  };

  // Typewriter Effect Logic
  useEffect(() => {
    if (isListening) return;

    const fullText = placeholders[placeholderIndex];
    let timer: ReturnType<typeof setTimeout>;

    if (!isDeleting && currentPlaceholder === fullText) {
      timer = setTimeout(() => setIsDeleting(true), 2500);
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

    // Send the user query to the backend RAG/chat streaming flow
    sendMessage(textToSend);
    setInput('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadDocument(file);
      e.target.value = '';
    }
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
    {
      icon: <ShieldAlert className="w-6 h-6 text-rose-500" />,
      title: "Contract Risk Audit",
      query: "Scan contracts for one-sided penalties, liabilities & missing protections.",
      isAction: true,
      onAction: () => handleTriggerAudit(),
    },
    {
      icon: <UserCheck className="w-6 h-6 text-brand-gold" />,
      title: "Surname Change",
      query: "I want to change surname from John Mehta to John Joshi, provide the affidavit",
      isAction: false,
    },
    {
      icon: <FileText className="w-6 h-6 text-indigo-500" />,
      title: "Name Change",
      query: "Hi, my name is Isha and I want to change the name's spelling from 'Isha' to 'Esha' in my Aadhaar card. What process do I need to follow, and please provide the Word document file for the affidavit.",
      isAction: false,
    },
    {
      icon: <Home className="w-6 h-6 text-blue-500" />,
      title: "Address Affidavit",
      query: "Generate Address Change / Proof of Residence Affidavit (.docx)",
      isAction: true,
      onAction: () => handleOpenCustomizeModal(undefined, 'address_change'),
    },
  ];

  return (
    <div className="flex-1 flex flex-col h-full relative bg-brand-light">
      {/* Top Header & Disclaimer Banner with Audit Action */}
      <div className="bg-brand-blue text-brand-gold px-4 py-2.5 text-xs md:text-sm flex items-center justify-between font-medium z-10 shadow-md">
        <div className="flex items-center gap-2 overflow-hidden">
          <Info className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">This system provides legal information for educational purposes and is not official legal advice.</span>
        </div>

        <button
          onClick={() => handleTriggerAudit()}
          className="ml-3 flex-shrink-0 flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white px-3 py-1 rounded-lg text-xs font-semibold transition shadow-xs cursor-pointer"
          title="Run Contract Risk Assessment on attached document"
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Contract Audit</span>
        </button>
      </div>

      {/* Main Chat Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 pb-32">
        
        {/* Welcome State */}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full max-w-4xl mx-auto text-center animate-message mt-8">
            <div className="w-20 h-20 bg-brand-blue text-brand-gold rounded-2xl flex items-center justify-center shadow-lg mb-6">
              <ScaleIcon className="w-10 h-10" />
            </div>
            <h2 className="text-3xl font-serif font-bold text-brand-blue mb-3">What legal question can I clarify for you today?</h2>
            <p className="text-gray-500 mb-8 max-w-xl">Ask any legal question in simple terms. Audit contract risks, draft an affidavit, upload a document, or type your own query.</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
              {suggestionCards.map((card, idx) => (
                <div 
                  key={idx} 
                  onClick={() => card.isAction && card.onAction ? card.onAction() : handleSend(card.query)}
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

        {/* Message Bubbles */}
        {messages.map((msg, idx) => {
          const isDocUpload = msg.text.includes('Uploaded document:') || msg.text.includes('Successfully uploaded');
          
          // Contextually inspect preceding user query for affidavit intent
          const prevUserMsg = messages.slice(0, idx).reverse().find(m => m.sender === 'user');
          const userAskedForDoc = prevUserMsg ? isDocumentGenerationQuery(prevUserMsg.text) : false;
          const isAffidavit = isAffidavitMessage(msg.text) || (msg.sender === 'bot' && userAskedForDoc);
          
          const docType: SupportedDocumentType = isAffidavit 
            ? getAffidavitDocType(prevUserMsg ? `${prevUserMsg.text}\n${msg.text}` : msg.text) 
            : 'name_change';

          const docTypeDetails: Record<SupportedDocumentType, { title: string; desc: string; icon: React.ReactNode }> = {
            surname_change: {
              title: 'Surname Change Affidavit (.docx)',
              desc: 'Official affidavit for surname change, family name update & Gazette notification',
              icon: <UserCheck className="w-5 h-5" />,
            },
            dob_correction: {
              title: 'Date of Birth (DOB) Correction Affidavit (.docx)',
              desc: 'Formal declaration for correcting date of birth across school records, PAN & Passport',
              icon: <Calendar className="w-5 h-5" />,
            },
            address_change: {
              title: 'Address Change Affidavit (.docx)',
              desc: 'Proof of residence & address change for Aadhaar, Bank & Passport',
              icon: <Home className="w-5 h-5" />,
            },
            name_change: {
              title: 'Name Change / Spelling Correction Affidavit (.docx)',
              desc: 'Standardized legal Word document formatted for Gazette notification & stamp paper',
              icon: <FileText className="w-5 h-5" />,
            },
            relation_update: {
              title: 'Parent / Spouse Name Correction Affidavit (.docx)',
              desc: 'Correction of parent or spouse name in official government records',
              icon: <Users className="w-5 h-5" />,
            },
            one_and_same: {
              title: 'One and the Same Person Affidavit (.docx)',
              desc: 'Affidavit clarifying multiple name variations across certificates & IDs',
              icon: <UserCheck className="w-5 h-5" />,
            },
          };

          const activeDoc = docTypeDetails[docType] || docTypeDetails.name_change;

          return (
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

                    {/* Inline Trigger for Contract Risk Audit on Document Upload Confirmation */}
                    {isDocUpload && (
                      <div className="mt-3.5 pt-3 border-t border-white/15">
                        <button
                          onClick={() => handleTriggerAudit()}
                          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 bg-rose-600/90 hover:bg-rose-600 text-white font-semibold text-xs rounded-xl shadow-xs transition cursor-pointer"
                        >
                          <ShieldAlert className="w-4 h-4 text-white" />
                          <span>Run Automated Contract Risk Audit (Red-Flag Scan)</span>
                        </button>
                      </div>
                    )}

                    {/* Direct Document Download Action Row for Affidavit / Document responses */}
                    {isAffidavit && (
                      <div className="mt-4 pt-3.5 border-t border-white/15">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/10 px-4 py-3 rounded-xl border border-white/10 backdrop-blur-sm">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-brand-gold/25 text-brand-gold flex items-center justify-center flex-shrink-0 shadow-inner">
                              {activeDoc.icon}
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-brand-gold tracking-wide">
                                {activeDoc.title}
                              </p>
                              <p className="text-[11px] text-gray-300">
                                {activeDoc.desc}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-auto">
                            {/* Direct Download Button */}
                            <button
                              onClick={() => handleDirectDownload(msg.text, idx)}
                              disabled={downloadingIdx === idx}
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-brand-gold text-brand-blue rounded-lg font-bold text-xs hover:bg-[#d6b063] active:scale-95 transition shadow-sm disabled:opacity-60 cursor-pointer"
                              title="Download Word document (.docx) to device"
                            >
                              {downloadingIdx === idx ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  <span>Generating .docx...</span>
                                </>
                              ) : downloadedIndices.has(idx) ? (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5 text-green-800" />
                                  <span>Downloaded (.docx)</span>
                                </>
                              ) : (
                                <>
                                  <Download className="w-3.5 h-3.5" />
                                  <span>Download .docx</span>
                                </>
                              )}
                            </button>

                            {/* Quick Edit Details Button */}
                            <button
                              onClick={() => handleOpenCustomizeModal(msg.text)}
                              className="p-2 text-gray-300 hover:text-brand-gold hover:bg-white/10 rounded-lg transition text-xs cursor-pointer"
                              title="Customize details before downloading"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Message Bottom Action Bar */}
                    <div className="mt-3 pt-2 border-t border-white/10 flex justify-end">
                      <button 
                        onClick={() => handleCopy(msg.text, idx)}
                        className={`flex items-center gap-1 text-xs font-medium transition cursor-pointer ${
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
          );
        })}
        
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

      {/* Input Area with Attachment, Affidavit, and Audit Buttons */}
      <div className="absolute bottom-0 w-full bg-white/80 backdrop-blur-md border-t border-gray-200 p-4">
        <div className="max-w-4xl mx-auto relative flex items-center gap-2">
          
          {/* Hidden File Input */}
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            className="hidden" 
            accept=".pdf,.txt,.doc,.docx"
          />

          {/* Attachment Button */}
          <button 
            onClick={() => fileInputRef.current?.click()}
            title="Upload Legal Document"
            className="p-4 rounded-xl transition shadow-sm bg-white border border-gray-200 text-gray-500 hover:text-brand-blue hover:border-brand-blue cursor-pointer"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          {/* Contract Risk Audit Button */}
          <button 
            onClick={() => handleTriggerAudit()}
            title="Audit Contract for Red-Flags & Legal Risks"
            className="p-4 rounded-xl transition shadow-sm bg-white border border-gray-200 text-rose-500 hover:text-rose-700 hover:border-rose-300 hover:bg-rose-50/50 flex items-center justify-center group cursor-pointer"
          >
            <ShieldAlert className="w-5 h-5 group-hover:scale-110 transition-transform" />
          </button>

          {/* Affidavit Generator Button */}
          <button 
            onClick={() => handleOpenCustomizeModal()}
            title="Generate Legal Affidavit (.docx)"
            className="p-4 rounded-xl transition shadow-sm bg-white border border-gray-200 text-brand-gold hover:text-brand-blue hover:border-brand-blue hover:bg-brand-gold/10 flex items-center justify-center group cursor-pointer"
          >
            <FileDown className="w-5 h-5 group-hover:scale-110 transition-transform" />
          </button>

          {/* Voice Input Button */}
          <button 
            onClick={toggleListen}
            className={`p-4 rounded-xl transition shadow-sm cursor-pointer ${
              isListening 
                ? 'bg-red-500 text-white animate-pulse' 
                : 'bg-white border border-gray-200 text-gray-500 hover:text-brand-blue hover:border-brand-blue'
            }`}
          >
            {isListening ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </button>

          {/* Text Input Bar */}
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
              onClick={() => handleSend()}
              disabled={!input.trim()}
              className="absolute right-2 top-2 bottom-2 p-3 rounded-lg transition flex items-center justify-center bg-brand-blue text-brand-gold hover:bg-[#152a5c] disabled:opacity-50 cursor-pointer"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Affidavit Generation Modal */}
      <AffidavitModal 
        isOpen={isAffidavitModalOpen} 
        onClose={() => {
          setIsAffidavitModalOpen(false);
          setCustomModalData(null);
        }} 
        initialData={customModalData}
      />

      {/* Contract Risk Audit Drawer */}
      <ContractAuditDrawer
        isOpen={isAuditDrawerOpen}
        onClose={() => setIsAuditDrawerOpen(false)}
        report={auditReport}
        isLoading={isAuditLoading}
        onRefresh={() => handleTriggerAudit()}
        onAskRenegotiate={handleAskRenegotiate}
      />
    </div>
  );
}
