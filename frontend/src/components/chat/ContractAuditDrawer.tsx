// src/components/chat/ContractAuditDrawer.tsx
import { useState } from 'react';
import {
  X,
  ShieldAlert,
  AlertTriangle,
  CheckCircle,
  FileText,
  MessageSquare,
  Copy,
  Check,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react';
import type { ContractAuditReport, FlaggedClause } from '../../services/contractAuditService';

interface ContractAuditDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  report: ContractAuditReport | null;
  isLoading: boolean;
  onRefresh?: () => void;
  onAskRenegotiate?: (clauseTitle: string, recommendation: string) => void;
}

export default function ContractAuditDrawer({
  isOpen,
  onClose,
  report,
  isLoading,
  onRefresh,
  onAskRenegotiate,
}: ContractAuditDrawerProps) {
  const [activeFilter, setActiveFilter] = useState<'all' | 'high' | 'medium' | 'low' | 'missing'>('all');
  const [expandedClauseIds, setExpandedClauseIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleExpand = (id: string) => {
    setExpandedClauseIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCopySnippet = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getScoreTheme = (score: number) => {
    if (score <= 35) {
      return {
        text: 'text-emerald-500',
        bg: 'bg-emerald-50',
        border: 'border-emerald-200',
        bar: 'bg-emerald-500',
        badge: 'bg-emerald-100 text-emerald-800',
        label: 'Low Legal Risk',
      };
    }
    if (score <= 70) {
      return {
        text: 'text-amber-500',
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        bar: 'bg-amber-500',
        badge: 'bg-amber-100 text-amber-800',
        label: 'Moderate Legal Exposure',
      };
    }
    return {
      text: 'text-rose-600',
      bg: 'bg-rose-50',
      border: 'border-rose-200',
      bar: 'bg-rose-600',
      badge: 'bg-rose-100 text-rose-800',
      label: 'High Legal Exposure / Red-Flags',
    };
  };

  const scoreTheme = report ? getScoreTheme(report.overall_risk_score) : null;

  // Filter clauses
  const filteredClauses = report
    ? report.flagged_clauses.filter(clause => {
        if (activeFilter === 'all') return true;
        return clause.severity.toLowerCase() === activeFilter;
      })
    : [];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/50 backdrop-blur-sm animate-message flex justify-end">
      {/* Drawer Overlay Backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Main Slide-in Panel */}
      <div className="relative w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col z-10 border-l border-gray-200">
        {/* Header */}
        <div className="bg-brand-blue text-white p-5 flex items-center justify-between border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-brand-gold/20 text-brand-gold rounded-xl flex items-center justify-center">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-serif font-bold text-white">Contract Risk Audit</h2>
                <span className="text-[10px] uppercase tracking-wider font-semibold bg-brand-gold text-brand-blue px-2 py-0.5 rounded-full">
                  AI Guardrail
                </span>
              </div>
              <p className="text-xs text-gray-300">
                {report?.contract_type || 'Scanning document for red-flags & one-sided terms'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={isLoading}
                title="Re-analyze contract"
                className="p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-4 border-gray-100" />
              <div className="absolute inset-0 rounded-full border-4 border-brand-gold border-t-transparent animate-spin" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 text-base">Auditing Contract Under Indian Law...</h3>
              <p className="text-xs text-gray-400 max-w-sm mt-1">
                Evaluating mutuality, indemnity clauses, termination terms, and statutory protections.
              </p>
            </div>
          </div>
        )}

        {/* Content Body */}
        {!isLoading && report && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Top Score Card */}
            <div className={`p-5 rounded-2xl border ${scoreTheme?.border} ${scoreTheme?.bg} space-y-4`}>
              <div className="flex items-center justify-between">
                <div>
                  <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${scoreTheme?.badge}`}>
                    {scoreTheme?.label}
                  </span>
                  <h3 className="text-2xl font-serif font-bold text-gray-900 mt-2">
                    {report.overall_risk_score} <span className="text-xs font-sans text-gray-500 font-normal">/ 100 Risk Score</span>
                  </h3>
                </div>

                <div className="text-right">
                  <div className="text-xs text-gray-500">Contract Type</div>
                  <div className="font-semibold text-sm text-gray-800">{report.contract_type}</div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-700 ease-out ${scoreTheme?.bar}`}
                  style={{ width: `${report.overall_risk_score}%` }}
                />
              </div>

              {/* Executive Summary */}
              <p className="text-xs text-gray-700 leading-relaxed bg-white/80 p-3.5 rounded-xl border border-gray-200/60 shadow-xs">
                <strong>Executive Summary:</strong> {report.executive_summary}
              </p>
            </div>

            {/* Metrics Chips / Filter Tabs */}
            <div className="flex flex-wrap gap-2 pt-1 border-b border-gray-100 pb-3">
              <button
                onClick={() => setActiveFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeFilter === 'all'
                    ? 'bg-brand-blue text-white shadow-xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                All Flagged ({report.flagged_clauses.length})
              </button>

              <button
                onClick={() => setActiveFilter('high')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                  activeFilter === 'high'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                High Risk ({report.key_metrics.high_risk_count})
              </button>

              <button
                onClick={() => setActiveFilter('medium')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeFilter === 'medium'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                }`}
              >
                Medium Risk ({report.key_metrics.medium_risk_count})
              </button>

              <button
                onClick={() => setActiveFilter('missing')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeFilter === 'missing'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                }`}
              >
                Missing Protections ({report.missing_protections.length})
              </button>
            </div>

            {/* Missing Protections Tab View */}
            {activeFilter === 'missing' ? (
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Standard Legal Clauses Missing from Contract
                </h4>
                {report.missing_protections.length === 0 ? (
                  <p className="text-xs text-gray-400">All standard statutory protections appear to be present.</p>
                ) : (
                  report.missing_protections.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl border border-purple-200 bg-purple-50/50 space-y-2 shadow-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm text-purple-900 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-purple-600" />
                          {item.clause_name}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-purple-200 text-purple-800">
                          {item.importance} Priority
                        </span>
                      </div>
                      <p className="text-xs text-gray-700 leading-relaxed">{item.why_needed}</p>
                      {onAskRenegotiate && (
                        <button
                          onClick={() => {
                            onAskRenegotiate(
                              `Missing Clause: ${item.clause_name}`,
                              `Draft a standard, mutually protective ${item.clause_name} clause compliant with Indian contract law.`
                            );
                            onClose();
                          }}
                          className="mt-2 text-xs font-semibold text-purple-700 hover:text-purple-900 inline-flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-brand-gold" />
                          Draft this missing clause in chat →
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            ) : (
              /* Flagged Clauses List */
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Identified Red-Flag Clauses ({filteredClauses.length})
                  </h4>
                  <span className="text-[11px] text-gray-400">Click a card to expand/collapse</span>
                </div>

                {filteredClauses.length === 0 ? (
                  <div className="p-8 text-center text-gray-400 text-xs">
                    No clauses found matching this severity filter.
                  </div>
                ) : (
                  filteredClauses.map((clause: FlaggedClause) => {
                    const isExpanded = expandedClauseIds.has(clause.id);
                    const severity = clause.severity.toLowerCase();

                    const badgeColor =
                      severity === 'high'
                        ? 'bg-rose-100 text-rose-800 border-rose-200'
                        : severity === 'medium'
                        ? 'bg-amber-100 text-amber-800 border-amber-200'
                        : 'bg-blue-100 text-blue-800 border-blue-200';

                    return (
                      <div
                        key={clause.id}
                        className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-xs hover:border-brand-gold transition"
                      >
                        {/* Clause Header Bar */}
                        <div
                          onClick={() => toggleExpand(clause.id)}
                          className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition"
                        >
                          <div className="flex items-center gap-2.5 overflow-hidden pr-2">
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${badgeColor} flex-shrink-0`}
                            >
                              {clause.severity}
                            </span>
                            <span className="font-semibold text-sm text-gray-900 truncate">
                              {clause.clause_title}
                            </span>
                          </div>

                          <div className="text-gray-400">
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </div>
                        </div>

                        {/* Collapsible Details */}
                        {isExpanded && (
                          <div className="px-4 pb-4 pt-1 space-y-3.5 border-t border-gray-100 text-xs">
                            {/* Problem */}
                            <div>
                              <div className="font-semibold text-gray-800 mb-1 flex items-center gap-1.5">
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                                Why this is risky:
                              </div>
                              <p className="text-gray-600 leading-relaxed">{clause.problem_statement}</p>
                            </div>

                            {/* Legal Implication */}
                            {clause.legal_implication && (
                              <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                                <span className="font-semibold text-gray-700">Indian Law Context: </span>
                                <span className="text-gray-600">{clause.legal_implication}</span>
                              </div>
                            )}

                            {/* Original Clause Snippet */}
                            {clause.original_clause_snippet && (
                              <div className="relative bg-amber-50/40 p-3 rounded-lg border border-amber-100 text-gray-700 italic">
                                <div className="text-[10px] uppercase font-bold text-amber-800 not-italic mb-1 flex items-center justify-between">
                                  <span>Contract Excerpt:</span>
                                  <button
                                    onClick={() => handleCopySnippet(clause.original_clause_snippet!, clause.id)}
                                    className="text-gray-500 hover:text-brand-blue flex items-center gap-1 cursor-pointer"
                                    title="Copy snippet"
                                  >
                                    {copiedId === clause.id ? (
                                      <Check className="w-3 h-3 text-green-600" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                  </button>
                                </div>
                                "{clause.original_clause_snippet}"
                              </div>
                            )}

                            {/* Recommended Counter-Proposal */}
                            <div className="bg-emerald-50/60 border border-emerald-200 p-3 rounded-lg space-y-1.5">
                              <div className="font-semibold text-emerald-900 flex items-center gap-1.5">
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                                Recommended Counter-Proposal / Amendment:
                              </div>
                              <p className="text-emerald-800 font-mono text-[11px] leading-relaxed">
                                {clause.renegotiation_recommendation}
                              </p>
                            </div>

                            {/* Action to Renegotiate via Chat */}
                            {onAskRenegotiate && (
                              <div className="pt-2 flex justify-end">
                                <button
                                  onClick={() => {
                                    onAskRenegotiate(
                                      clause.clause_title,
                                      clause.renegotiation_recommendation
                                    );
                                    onClose();
                                  }}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-blue text-brand-gold rounded-lg font-semibold text-xs hover:bg-[#152a5c] transition cursor-pointer shadow-xs"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                  <span>Draft Counter-Clause in Chat</span>
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Governing Law / Registration Footer Note */}
            {report.governing_law_assessment && (
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-600 space-y-1">
                <span className="font-semibold text-gray-800 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-brand-gold" />
                  Jurisdiction & Enforceability Assessment:
                </span>
                <p>{report.governing_law_assessment}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
