import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Scale,
  Sparkles,
  FileText,
  Shield,
  Download,
  ArrowRight,
  CheckCircle2,
  Cpu,
  Database,
  Search,
  FileCheck,
  Lock,
  MessageSquare,
  Mic,
  AlertTriangle,
  Zap,
  BookOpen,
  Menu,
  X,
  ChevronRight,
  Layers
} from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activePreviewTab, setActivePreviewTab] = useState<'affidavit' | 'statutory' | 'audit'>('affidavit');
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userFullName, setUserFullName] = useState<string | null>(null);

  // Check auth state on mount
  useEffect(() => {
    try {
      const token = localStorage.getItem('legal_ai_token');
      const storedUser = localStorage.getItem('legal_ai_user');
      if (token && storedUser) {
        setIsLoggedIn(true);
        const parsed = JSON.parse(storedUser);
        setUserFullName(parsed.full_name || parsed.email || 'Counsel');
      }
    } catch {
      setIsLoggedIn(false);
    }
  }, []);

  // Scroll listener for sticky navbar blur effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // CTA navigation handler
  const handlePrimaryAction = () => {
    if (isLoggedIn) {
      navigate('/chat');
    } else {
      navigate('/login');
    }
  };

  const simulateDownload = () => {
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 3000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-amber-500 selection:text-slate-950">
      
      {/* ──────────────────────────────────────────────────────────────────────────
          1. NAVIGATION BAR
      ────────────────────────────────────────────────────────────────────────── */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? 'bg-[#0B1B3D]/90 backdrop-blur-md border-b border-amber-500/20 py-3 shadow-xl'
            : 'bg-transparent py-5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform">
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif font-bold text-xl tracking-tight text-white group-hover:text-amber-400 transition-colors">
                  Legal AI
                </span>
                <span className="text-[10px] uppercase font-bold tracking-widest bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full">
                  v2.5
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Assistant & Document Automation</p>
            </div>
          </Link>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#features" className="hover:text-amber-400 transition-colors">
              Features
            </a>
            <a href="#preview" className="hover:text-amber-400 transition-colors">
              Interactive Workflow
            </a>
            <a href="#templates" className="hover:text-amber-400 transition-colors">
              Affidavits
            </a>
            <a href="#architecture" className="hover:text-amber-400 transition-colors">
              Architecture & Stack
            </a>
          </div>

          {/* Auth Actions */}
          <div className="hidden md:flex items-center gap-4">
            {isLoggedIn ? (
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400">
                  Welcome, <span className="text-amber-400 font-semibold">{userFullName}</span>
                </span>
                <button
                  onClick={() => navigate('/chat')}
                  className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-semibold px-4 py-2 rounded-lg text-sm shadow-md hover:from-amber-400 hover:to-amber-500 transition-all cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4" />
                  Open Workspace
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  to="/login"
                  className="text-sm font-medium text-slate-300 hover:text-white px-3 py-2 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-semibold px-4 py-2 rounded-lg text-sm shadow-md hover:from-amber-400 hover:to-amber-500 transition-all"
                >
                  Get Started Free
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-300 hover:text-white focus:outline-none"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#0B1B3D] border-b border-amber-500/20 px-4 pt-3 pb-6 space-y-3 mt-2 shadow-2xl">
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-slate-300 hover:text-amber-400 font-medium"
            >
              Features
            </a>
            <a
              href="#preview"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-slate-300 hover:text-amber-400 font-medium"
            >
              Interactive Workflow
            </a>
            <a
              href="#templates"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-slate-300 hover:text-amber-400 font-medium"
            >
              Affidavit Templates
            </a>
            <a
              href="#architecture"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-slate-300 hover:text-amber-400 font-medium"
            >
              Tech Stack
            </a>
            <div className="pt-4 border-t border-slate-800 flex flex-col gap-2">
              {isLoggedIn ? (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate('/chat');
                  }}
                  className="w-full text-center bg-amber-500 text-slate-950 font-semibold py-2.5 rounded-lg"
                >
                  Open Workspace
                </button>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full text-center py-2 text-slate-300 hover:text-white font-medium border border-slate-700 rounded-lg"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full text-center bg-amber-500 text-slate-950 font-semibold py-2.5 rounded-lg shadow-md"
                  >
                    Get Started Free
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* ──────────────────────────────────────────────────────────────────────────
          2. HERO SECTION
      ────────────────────────────────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden">
        {/* Subtle Background Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 left-1/4 w-[400px] h-[300px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          
          {/* Statutory Announcement Pill */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs sm:text-sm font-medium mb-8 backdrop-blur-sm shadow-sm">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Bharatiya Nyaya Sanhita (BNS) & Indian Jurisprudence Knowledge Base</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-serif font-extrabold text-white tracking-tight leading-[1.15] max-w-5xl mx-auto">
            AI-Powered Legal Intelligence &{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500">
              Document Automation
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mt-6 text-lg sm:text-xl text-slate-300 max-w-3xl mx-auto font-normal leading-relaxed">
            High-precision statutory retrieval, automated court-grade affidavit generation in Word (<code className="text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded font-mono text-sm">.docx</code>), and deep contract risk auditing — architected for citizens, advocates, and legal professionals.
          </p>

          {/* Primary CTAs */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={handlePrimaryAction}
              className="w-full sm:w-auto flex items-center justify-center gap-3 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950 font-bold px-8 py-4 rounded-xl text-base shadow-xl shadow-amber-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            >
              <Scale className="w-5 h-5" />
              {isLoggedIn ? 'Launch Legal Assistant' : 'Get Started Free'}
              <ArrowRight className="w-5 h-5" />
            </button>

            <a
              href="#preview"
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700/80 px-6 py-4 rounded-xl text-base font-semibold backdrop-blur-sm transition-all"
            >
              <Search className="w-4 h-4 text-amber-400" />
              Explore Interactive Preview
            </a>
          </div>

          {/* Trust Metric Badges */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto border-t border-slate-800/80 pt-10 text-left">
            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800">
              <div className="text-2xl font-bold font-serif text-amber-400">5+ Types</div>
              <div className="text-xs text-slate-400 mt-1">Court-ready Word (.docx) Affidavits</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800">
              <div className="text-2xl font-bold font-serif text-amber-400">BNS 2023</div>
              <div className="text-xs text-slate-400 mt-1">Cross-referenced with IPC/CrPC</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800">
              <div className="text-2xl font-bold font-serif text-amber-400">&lt; 1.5s</div>
              <div className="text-xs text-slate-400 mt-1">Dense RAG & Vector Retrieval</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800">
              <div className="text-2xl font-bold font-serif text-amber-400">OAuth2</div>
              <div className="text-xs text-slate-400 mt-1">Secure JWT Session Confidentiality</div>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────────────────────
          3. INTERACTIVE PREVIEW & WORKFLOW SECTION
      ────────────────────────────────────────────────────────────────────────── */}
      <section id="preview" className="py-20 bg-slate-900/50 border-y border-slate-800/80 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs font-semibold mb-3">
              <Zap className="w-3.5 h-3.5 text-blue-400" />
              Live Interactive Experience
            </div>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-white">
              See How It Works in Practice
            </h2>
            <p className="mt-3 text-slate-400 text-base">
              Experience the actual workflow: from natural-language citizen questions to authoritative statutory citations and one-click Word document generation.
            </p>
          </div>

          {/* Interactive Tab Controls */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex p-1.5 rounded-xl bg-slate-950 border border-slate-800 max-w-full overflow-x-auto">
              <button
                onClick={() => setActivePreviewTab('affidavit')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                  activePreviewTab === 'affidavit'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileCheck className="w-4 h-4" />
                Affidavit Generator (.docx)
              </button>
              <button
                onClick={() => setActivePreviewTab('statutory')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                  activePreviewTab === 'statutory'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                Statutory RAG (BNS vs IPC)
              </button>
              <button
                onClick={() => setActivePreviewTab('audit')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                  activePreviewTab === 'audit'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <AlertTriangle className="w-4 h-4" />
                Contract Risk Audit
              </button>
            </div>
          </div>

          {/* Mock Window Shell */}
          <div className="max-w-4xl mx-auto rounded-2xl bg-[#0B1B3D] border border-amber-500/30 shadow-2xl overflow-hidden">
            
            {/* Window Topbar */}
            <div className="bg-slate-950/80 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-green-500/80" />
                <span className="ml-2 text-xs font-mono text-slate-400">Legal AI Assistant Consultation Window</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/20 font-medium">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                Gemini 2.5 Active
              </div>
            </div>

            {/* Chat Content Body */}
            <div className="p-6 space-y-6 text-sm">
              
              {/* TAB 1: AFFIDAVIT GENERATOR */}
              {activePreviewTab === 'affidavit' && (
                <>
                  {/* User Message */}
                  <div className="flex items-start justify-end gap-3">
                    <div className="bg-amber-500/15 border border-amber-500/30 rounded-2xl rounded-tr-none px-4 py-3 max-w-lg text-slate-100">
                      <p className="font-medium">
                        I need to prepare an affidavit for changing my surname spelling from "Verma" to "Vermaa" in official records and educational certificates. Can you draft it?
                      </p>
                      <span className="text-[10px] text-amber-400/80 block text-right mt-1.5 font-mono">10:42 AM</span>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-amber-500 text-slate-950 font-bold flex items-center justify-center text-xs flex-shrink-0">
                      U
                    </div>
                  </div>

                  {/* Assistant Message with Word Download Card */}
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#0B1B3D] border border-amber-400 text-amber-400 font-bold flex items-center justify-center text-xs flex-shrink-0">
                      <Scale className="w-4 h-4" />
                    </div>
                    <div className="bg-slate-900/90 border border-slate-700/80 rounded-2xl rounded-tl-none p-5 max-w-2xl text-slate-200 space-y-3">
                      <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs uppercase tracking-wide">
                        <FileCheck className="w-4 h-4" />
                        Court-Grade Affidavit Drafted
                      </div>
                      <p className="text-slate-300 leading-relaxed">
                        I have prepared a formal <strong>Name Change Affidavit</strong> pursuant to the Indian Oath Act, 1969 and standard Gazette notification guidelines. You can execute this on a non-judicial stamp paper of appropriate value and have it attested before a First Class Judicial Magistrate or Notary Public.
                      </p>

                      {/* Document Download Card Component */}
                      <div className="mt-4 p-4 rounded-xl bg-slate-950 border-2 border-dashed border-amber-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 flex-shrink-0">
                            <FileText className="w-6 h-6" />
                          </div>
                          <div>
                            <div className="font-semibold text-white flex items-center gap-2">
                              <span>Name_Change_Affidavit_Verma.docx</span>
                              <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-1.5 py-0.5 rounded font-mono">
                                DOCX
                              </span>
                            </div>
                            <p className="text-xs text-slate-400">
                              Formatted for Non-Judicial Stamp Paper • 24.8 KB
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={simulateDownload}
                          className="flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold px-4 py-2 rounded-lg text-xs transition-all shadow-md cursor-pointer whitespace-nowrap"
                        >
                          {downloadSuccess ? (
                            <>
                              <CheckCircle2 className="w-4 h-4 text-slate-950" />
                              Downloaded!
                            </>
                          ) : (
                            <>
                              <Download className="w-4 h-4" />
                              Download .docx
                            </>
                          )}
                        </button>
                      </div>

                      {downloadSuccess && (
                        <div className="text-[11px] text-emerald-400 flex items-center gap-1.5 mt-2 bg-emerald-950/40 border border-emerald-500/30 px-3 py-1.5 rounded-lg">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Generated dynamically with python-docx and ready for notarization.</span>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* TAB 2: STATUTORY LEGAL RAG */}
              {activePreviewTab === 'statutory' && (
                <>
                  <div className="flex items-start justify-end gap-3">
                    <div className="bg-amber-500/15 border border-amber-500/30 rounded-2xl rounded-tr-none px-4 py-3 max-w-lg text-slate-100">
                      <p className="font-medium">
                        What is the provision for petty theft under the new Bharatiya Nyaya Sanhita (BNS) compared to Section 379 of IPC?
                      </p>
                      <span className="text-[10px] text-amber-400/80 block text-right mt-1.5 font-mono">11:15 AM</span>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-amber-500 text-slate-950 font-bold flex items-center justify-center text-xs flex-shrink-0">
                      U
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#0B1B3D] border border-amber-400 text-amber-400 font-bold flex items-center justify-center text-xs flex-shrink-0">
                      <Scale className="w-4 h-4" />
                    </div>
                    <div className="bg-slate-900/90 border border-slate-700/80 rounded-2xl rounded-tl-none p-5 max-w-2xl text-slate-200 space-y-3">
                      <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs uppercase tracking-wide">
                        <BookOpen className="w-4 h-4" />
                        BNS Section 303 vs IPC Section 379 Analysis
                      </div>
                      <p className="text-slate-300 leading-relaxed">
                        Under the <strong>Bharatiya Nyaya Sanhita, 2023 (BNS)</strong>, theft is codified under <strong>Section 303</strong>:
                      </p>
                      <ul className="space-y-2 text-xs text-slate-300 pl-3 border-l-2 border-amber-500/40">
                        <li>
                          <strong>BNS Section 303(1):</strong> General theft carries imprisonment up to 3 years, or fine, or both (equivalent to erstwhile IPC Section 379).
                        </li>
                        <li>
                          <strong>BNS Section 303(2) Proviso (Petty Theft Innovation):</strong> Where the value of stolen property is less than <strong>₹5,000</strong> and the offender is a first-time convict with restitution/return of goods, the court may sentence the offender to <strong>Community Service</strong> instead of incarceration.
                        </li>
                      </ul>
                      <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/20 text-xs text-amber-200">
                        ⚖️ <em>Statutory Reference:</em> Bharatiya Nyaya Sanhita (Act No. 45 of 2023), Chapter XVII, Offenses Against Property.
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* TAB 3: CONTRACT AUDIT */}
              {activePreviewTab === 'audit' && (
                <>
                  <div className="flex items-start justify-end gap-3">
                    <div className="bg-amber-500/15 border border-amber-500/30 rounded-2xl rounded-tr-none px-4 py-3 max-w-lg text-slate-100">
                      <p className="font-medium">
                        Audit this master services contract for high-risk clauses and ambiguous termination liability.
                      </p>
                      <span className="text-[10px] text-amber-400/80 block text-right mt-1.5 font-mono">02:10 PM</span>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-amber-500 text-slate-950 font-bold flex items-center justify-center text-xs flex-shrink-0">
                      U
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#0B1B3D] border border-amber-400 text-amber-400 font-bold flex items-center justify-center text-xs flex-shrink-0">
                      <Scale className="w-4 h-4" />
                    </div>
                    <div className="bg-slate-900/90 border border-slate-700/80 rounded-2xl rounded-tl-none p-5 max-w-2xl text-slate-200 space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <span className="text-amber-400 font-semibold text-xs uppercase flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 text-amber-400" />
                          Contract Red-Flag Audit Report
                        </span>
                        <span className="text-xs bg-red-500/20 text-red-300 border border-red-500/30 px-2 py-0.5 rounded-full font-bold">
                          Risk Score: 78/100 (High)
                        </span>
                      </div>
                      
                      <div className="space-y-2 text-xs">
                        <div className="p-2.5 rounded bg-red-950/30 border border-red-500/30">
                          <strong className="text-red-400">Clause 12.3 (Uncapped Indemnification):</strong> Imposes unlimited liability for indirect and consequential damages without mutual reciprocity.
                        </div>
                        <div className="p-2.5 rounded bg-yellow-950/30 border border-yellow-500/30">
                          <strong className="text-yellow-400">Clause 8.1 (Unilateral Termination):</strong> Client may terminate for convenience with 24 hours notice with no reimbursement of work-in-progress.
                        </div>
                      </div>

                      <p className="text-xs text-slate-400">
                        💡 <strong>Recommendation:</strong> Insert reciprocal liability cap equal to fees paid in preceding 6 months and mandate a 30-day cure period.
                      </p>
                    </div>
                  </div>
                </>
              )}

            </div>

            {/* Mock Bottom Input Bar */}
            <div className="bg-slate-950 p-4 border-t border-slate-800 flex items-center gap-3">
              <div className="p-2 text-slate-400 hover:text-amber-400 transition-colors">
                <Mic className="w-5 h-5" />
              </div>
              <div className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-400">
                Ask about legal provisions, draft an affidavit, or upload a contract...
              </div>
              <button
                onClick={handlePrimaryAction}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 p-2.5 rounded-xl font-bold transition-all cursor-pointer"
                title="Try in workspace"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

          </div>

          {/* 4-Step Process Flow Ribbon */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-4 gap-6 max-w-5xl mx-auto">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center text-sm flex-shrink-0 border border-amber-500/40">
                1
              </div>
              <div>
                <h4 className="font-semibold text-sm text-white">Citizen Inquiry</h4>
                <p className="text-xs text-slate-400 mt-1">Prompt in plain language, voice dictation, or upload case files.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center text-sm flex-shrink-0 border border-amber-500/40">
                2
              </div>
              <div>
                <h4 className="font-semibold text-sm text-white">Hybrid Vector RAG</h4>
                <p className="text-xs text-slate-400 mt-1">Dense embeddings & BGE reranker retrieve precise statutory sections.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center text-sm flex-shrink-0 border border-amber-500/40">
                3
              </div>
              <div>
                <h4 className="font-semibold text-sm text-white">Template Synthesis</h4>
                <p className="text-xs text-slate-400 mt-1">FastAPI & Python-docx assemble court-compliant XML clauses.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center text-sm flex-shrink-0 border border-amber-500/40">
                4
              </div>
              <div>
                <h4 className="font-semibold text-sm text-white">Instant Download</h4>
                <p className="text-xs text-slate-400 mt-1">Directly download .docx ready for printing on stamp paper.</p>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────────────────────
          4. CORE FEATURES GRID
      ────────────────────────────────────────────────────────────────────────── */}
      <section id="features" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold mb-3">
            <Cpu className="w-3.5 h-3.5" />
            Core Capabilities
          </div>
          <h2 className="text-3xl sm:text-5xl font-serif font-bold text-white tracking-tight">
            Engineered for Modern Legal Needs
          </h2>
          <p className="mt-4 text-slate-400 text-base sm:text-lg">
            Combining state-of-the-art LLMs with authoritative Indian legal knowledge bases and programmatic document synthesis.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          
          {/* Feature 1 */}
          <div className="p-8 rounded-2xl bg-slate-900/40 border border-slate-800 hover:border-amber-500/40 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Scale className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-serif font-bold text-white mb-2 group-hover:text-amber-400 transition-colors">
              Conversational Legal AI & RAG
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Provides context-grounded legal analysis spanning the Bharatiya Nyaya Sanhita (BNS), BNSS, Bharatiya Sakshya Adhiniyam (BSA), Consumer Protection Act, and key SC judgments.
            </p>
            <div className="mt-4 flex items-center gap-1.5 text-xs text-amber-400/90 font-medium">
              <span>Zero-hallucination statutory citations</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Feature 2 */}
          <div className="p-8 rounded-2xl bg-slate-900/40 border border-slate-800 hover:border-amber-500/40 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-serif font-bold text-white mb-2 group-hover:text-amber-400 transition-colors">
              Automated Affidavit Generation
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Dynamically constructs court-grade affidavits in editable Microsoft Word (<code className="text-amber-400 text-xs">.docx</code>) format, complete with deponee verification clauses and stamp margins.
            </p>
            <div className="mt-4 flex items-center gap-1.5 text-xs text-amber-400/90 font-medium">
              <span>Supports 5 essential affidavit types</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Feature 3 */}
          <div className="p-8 rounded-2xl bg-slate-900/40 border border-slate-800 hover:border-amber-500/40 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-serif font-bold text-white mb-2 group-hover:text-amber-400 transition-colors">
              Contract Risk & Red-Flag Audit
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Automated clause auditor that highlights risky liabilities, unilateral termination provisions, unreasonable indemnification, and missing dispute escalation frameworks.
            </p>
            <div className="mt-4 flex items-center gap-1.5 text-xs text-amber-400/90 font-medium">
              <span>0-100 objective risk scoring</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Feature 4 */}
          <div className="p-8 rounded-2xl bg-slate-900/40 border border-slate-800 hover:border-amber-500/40 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-serif font-bold text-white mb-2 group-hover:text-amber-400 transition-colors">
              Smart Document Ingestion
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Upload PDF petitions, FIR copies, or commercial contracts. The multi-modal parser extracts text, analyzes clauses, and answers questions with direct document citations.
            </p>
            <div className="mt-4 flex items-center gap-1.5 text-xs text-amber-400/90 font-medium">
              <span>Gemini File API & context caching</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Feature 5 */}
          <div className="p-8 rounded-2xl bg-slate-900/40 border border-slate-800 hover:border-amber-500/40 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Mic className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-serif font-bold text-white mb-2 group-hover:text-amber-400 transition-colors">
              Voice Dictation & Consultation
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Seamless hands-free voice consultation powered by browser Web Speech API. Ideal for advocates on the move or citizens narrating complex legal grievances.
            </p>
            <div className="mt-4 flex items-center gap-1.5 text-xs text-amber-400/90 font-medium">
              <span>Real-time speech-to-text dictation</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Feature 6 */}
          <div className="p-8 rounded-2xl bg-slate-900/40 border border-slate-800 hover:border-amber-500/40 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-serif font-bold text-white mb-2 group-hover:text-amber-400 transition-colors">
              Enterprise Security & Auth
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Protected by OAuth2 JWT bearer tokens, bcrypt password hashing, and isolated user sessions. Your legal consultation queries remain private and confidential.
            </p>
            <div className="mt-4 flex items-center gap-1.5 text-xs text-amber-400/90 font-medium">
              <span>End-to-end encrypted session isolation</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>

        </div>

      </section>

      {/* ──────────────────────────────────────────────────────────────────────────
          5. SUPPORTED AFFIDAVIT TEMPLATES SHOWCASE
      ────────────────────────────────────────────────────────────────────────── */}
      <section id="templates" className="py-20 bg-slate-900/40 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold mb-3">
              <FileCheck className="w-3.5 h-3.5" />
              Automated Document Library
            </div>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-white">
              5 Court-Grade Word Document Templates
            </h2>
            <p className="mt-3 text-slate-400 text-base">
              Each template is dynamically constructed using <code className="text-amber-400 text-xs font-mono">python-docx</code> with standard Indian notary margins and verification clauses.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            
            {/* Template 1 */}
            <div className="p-6 rounded-xl bg-[#0B1B3D]/80 border border-amber-500/30 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-mono uppercase bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded">
                    name_change
                  </span>
                  <FileText className="w-5 h-5 text-amber-400" />
                </div>
                <h4 className="font-serif font-bold text-lg text-white mb-2">
                  Name Change & Spelling Correction
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  For passport updates, gazette notifications, Aadhaar corrections, and academic record name changes.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-amber-400">
                <span>Verification clause included</span>
                <span className="font-mono text-[11px]">.docx</span>
              </div>
            </div>

            {/* Template 2 */}
            <div className="p-6 rounded-xl bg-[#0B1B3D]/80 border border-amber-500/30 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-mono uppercase bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded">
                    address_change
                  </span>
                  <FileText className="w-5 h-5 text-amber-400" />
                </div>
                <h4 className="font-serif font-bold text-lg text-white mb-2">
                  Residential Address Update
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Used as sworn proof of residence relocation for banking KYC, driver's licenses, and government utility transfers.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-amber-400">
                <span>Old vs New Address mapping</span>
                <span className="font-mono text-[11px]">.docx</span>
              </div>
            </div>

            {/* Template 3 */}
            <div className="p-6 rounded-xl bg-[#0B1B3D]/80 border border-amber-500/30 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-mono uppercase bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded">
                    dob_correction
                  </span>
                  <FileText className="w-5 h-5 text-amber-400" />
                </div>
                <h4 className="font-serif font-bold text-lg text-white mb-2">
                  Date of Birth (DoB) Correction
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Affidavit reconciling discrepancies between matriculation marksheets, PAN cards, and birth registration records.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-amber-400">
                <span>Correct DoB affirmation</span>
                <span className="font-mono text-[11px]">.docx</span>
              </div>
            </div>

            {/* Template 4 */}
            <div className="p-6 rounded-xl bg-[#0B1B3D]/80 border border-amber-500/30 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-mono uppercase bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded">
                    relation_update
                  </span>
                  <FileText className="w-5 h-5 text-amber-400" />
                </div>
                <h4 className="font-serif font-bold text-lg text-white mb-2">
                  Parent / Spouse Name Correction
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Clarifies spelling variations in Father's, Mother's, or Spouse's name across conflicting official documents.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-amber-400">
                <span>Lineage & relationship proof</span>
                <span className="font-mono text-[11px]">.docx</span>
              </div>
            </div>

            {/* Template 5 */}
            <div className="p-6 rounded-xl bg-[#0B1B3D]/80 border border-amber-500/30 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-mono uppercase bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded">
                    one_and_same
                  </span>
                  <FileText className="w-5 h-5 text-amber-400" />
                </div>
                <h4 className="font-serif font-bold text-lg text-white mb-2">
                  One and the Same Person
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Sworn declaration that multiple name variations or missing initials across different certificates refer to one individual.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-amber-400">
                <span>Identity reconciliation</span>
                <span className="font-mono text-[11px]">.docx</span>
              </div>
            </div>

            {/* Quick Action Card */}
            <div className="p-6 rounded-xl bg-gradient-to-br from-amber-500/20 via-slate-900 to-slate-900 border border-amber-500/50 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-lg bg-amber-500 text-slate-950 font-bold flex items-center justify-center mb-3">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h4 className="font-serif font-bold text-lg text-white mb-2">
                  Need a Custom Document?
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Open the Assistant and specify your deponee details, or adjust parameters live in the integrated Affidavit Modal.
                </p>
              </div>
              <button
                onClick={handlePrimaryAction}
                className="mt-6 w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Draft Affidavit Now</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

          </div>

        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────────────────────
          6. TECH STACK & SYSTEM ARCHITECTURE
      ────────────────────────────────────────────────────────────────────────── */}
      <section id="architecture" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold mb-3">
            <Database className="w-3.5 h-3.5" />
            Engineering & System Architecture
          </div>
          <h2 className="text-3xl sm:text-5xl font-serif font-bold text-white tracking-tight">
            Production-Ready Full-Stack Stack
          </h2>
          <p className="mt-4 text-slate-400 text-base sm:text-lg">
            High performance, strictly decoupled client-server architecture with semantic vector caching and streaming responses.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Layer 1: Frontend */}
          <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800">
            <div className="text-xs font-mono text-amber-400 uppercase tracking-wider mb-2">Presentation Layer</div>
            <h3 className="font-serif font-bold text-xl text-white mb-4">React 19 + TypeScript</h3>
            <ul className="space-y-2 text-xs text-slate-300">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span>Tailwind CSS v4 with custom legal brand palette</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span>Vite bundling & React Router v7</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span>Real-time SSE (Server-Sent Events) chat stream</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span>Web Speech API for audio dictation</span>
              </li>
            </ul>
          </div>

          {/* Layer 2: Backend */}
          <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800">
            <div className="text-xs font-mono text-amber-400 uppercase tracking-wider mb-2">Application Layer</div>
            <h3 className="font-serif font-bold text-xl text-white mb-4">FastAPI & Python 3.11</h3>
            <ul className="space-y-2 text-xs text-slate-300">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span>Asynchronous non-blocking endpoints</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span>Pydantic v2 schemas for request validation</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span>OAuth2 Password bearer token authentication</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span>StreamingResponse for dynamic file downloads</span>
              </li>
            </ul>
          </div>

          {/* Layer 3: AI & RAG */}
          <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800">
            <div className="text-xs font-mono text-amber-400 uppercase tracking-wider mb-2">Cognitive Layer</div>
            <h3 className="font-serif font-bold text-xl text-white mb-4">Google Gemini 2.5</h3>
            <ul className="space-y-2 text-xs text-slate-300">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span>Gemini 2.5 Flash / Pro model orchestration</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span>BGE Cross-Encoder reranker for high precision</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span>Context Caching for lengthy statutes & precedents</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span>Gemini File API for PDF contract ingestion</span>
              </li>
            </ul>
          </div>

          {/* Layer 4: Database */}
          <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800">
            <div className="text-xs font-mono text-amber-400 uppercase tracking-wider mb-2">Storage & Vectors</div>
            <h3 className="font-serif font-bold text-xl text-white mb-4">PostgreSQL & pgvector</h3>
            <ul className="space-y-2 text-xs text-slate-300">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span>Dense 768-dim embeddings indexing</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span>SQLAlchemy ORM with relation mapping</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span>Cosine similarity index for fast legal retrieval</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span>Full chat history & session isolation</span>
              </li>
            </ul>
          </div>

          {/* Layer 5: Document Engine */}
          <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800">
            <div className="text-xs font-mono text-amber-400 uppercase tracking-wider mb-2">Document Automation</div>
            <h3 className="font-serif font-bold text-xl text-white mb-4">Python-Docx OpenXML</h3>
            <ul className="space-y-2 text-xs text-slate-300">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span>Native .docx Word generation without LibreOffice</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span>Indian notary margins & stamp space preservation</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span>Standardized Oath Act & Gazette language blocks</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span>In-memory BytesIO streaming for instant downloads</span>
              </li>
            </ul>
          </div>

          {/* Layer 6: Security */}
          <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800">
            <div className="text-xs font-mono text-amber-400 uppercase tracking-wider mb-2">Security & Privacy</div>
            <h3 className="font-serif font-bold text-xl text-white mb-4">Zero Trust & Encryption</h3>
            <ul className="space-y-2 text-xs text-slate-300">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span>Bcrypt cryptographic password hashing</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span>JWT Bearer token expiry & route guards</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span>CORS strict origin control</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span>Statutory disclaimer enforcement</span>
              </li>
            </ul>
          </div>

        </div>

      </section>

      {/* ──────────────────────────────────────────────────────────────────────────
          7. BOTTOM CTA CALLOUT
      ────────────────────────────────────────────────────────────────────────── */}
      <section className="py-20 relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-gradient-to-r from-[#0B1B3D] via-[#122858] to-[#0B1B3D] border border-amber-500/40 p-10 sm:p-14 text-center shadow-2xl relative">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto mb-6">
              <Scale className="w-8 h-8" />
            </div>

            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-white max-w-2xl mx-auto">
              Ready to Accelerate Your Legal Workflows?
            </h2>

            <p className="mt-4 text-slate-300 text-base max-w-xl mx-auto">
              Join legal professionals and citizens using Legal AI Assistant for authoritative statutory insights and instant document drafting.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={handlePrimaryAction}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold px-8 py-4 rounded-xl text-base shadow-xl shadow-amber-500/20 cursor-pointer transition-all"
              >
                <span>Launch Assistant Now</span>
                <ArrowRight className="w-5 h-5" />
              </button>

              {!isLoggedIn && (
                <Link
                  to="/login"
                  className="w-full sm:w-auto px-6 py-4 rounded-xl text-slate-300 hover:text-white border border-slate-700 font-semibold text-base transition-colors"
                >
                  Already have an account? Sign In
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────────────────────
          8. STATUTORY DISCLAIMER & FOOTER
      ────────────────────────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-12 text-slate-400 text-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Legal Notice Callout */}
          <div className="mb-12 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs text-slate-400 leading-relaxed flex items-start gap-3">
            <Shield className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="text-amber-400">Statutory Disclaimer:</strong> Legal AI Assistant is an artificial intelligence research and document automation tool designed to assist with statutory information and drafting convenience. It does not provide formal legal advice, nor does it create an advocate-client relationship. Please have all drafted affidavits, petitions, and legal documents verified by an authorized advocate, notary public, or legal practitioner before submission to court or official authorities.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            
            {/* Col 1 */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
                  <Scale className="w-5 h-5" />
                </div>
                <span className="font-serif font-bold text-lg text-white">Legal AI Assistant</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Intelligent legal consultation and automated document generation powered by Google Gemini and Indian jurisprudence knowledge.
              </p>
            </div>

            {/* Col 2 */}
            <div>
              <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">Capabilities</h4>
              <ul className="space-y-2 text-xs">
                <li><a href="#features" className="hover:text-amber-400 transition-colors">Conversational Legal RAG</a></li>
                <li><a href="#templates" className="hover:text-amber-400 transition-colors">Affidavit Word (.docx) Generator</a></li>
                <li><a href="#features" className="hover:text-amber-400 transition-colors">Contract Risk Auditing</a></li>
                <li><a href="#features" className="hover:text-amber-400 transition-colors">Voice-Enabled Dictation</a></li>
              </ul>
            </div>

            {/* Col 3 */}
            <div>
              <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">Supported Acts</h4>
              <ul className="space-y-2 text-xs">
                <li className="text-slate-400">Bharatiya Nyaya Sanhita, 2023</li>
                <li className="text-slate-400">Bharatiya Nagarik Suraksha Sanhita, 2023</li>
                <li className="text-slate-400">Bharatiya Sakshya Adhiniyam, 2023</li>
                <li className="text-slate-400">Consumer Protection Act, 2019</li>
              </ul>
            </div>

            {/* Col 4 */}
            <div>
              <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">Access & Quick Links</h4>
              <ul className="space-y-2 text-xs">
                <li><Link to="/login" className="hover:text-amber-400 transition-colors">Sign In to Workspace</Link></li>
                <li><Link to="/register" className="hover:text-amber-400 transition-colors">Create Free Account</Link></li>
                <li><a href="#architecture" className="hover:text-amber-400 transition-colors">System Architecture</a></li>
                <li><a href="#preview" className="hover:text-amber-400 transition-colors">Interactive Preview</a></li>
              </ul>
            </div>

          </div>

          <div className="pt-8 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
            <p>© {new Date().getFullYear()} Legal AI Assistant. Built for NLP & Legal Automation.</p>
            <div className="flex items-center gap-6">
              <span>FastAPI • React 19 • PostgreSQL • Gemini 2.5</span>
            </div>
          </div>

        </div>
      </footer>

    </div>
  );
}
