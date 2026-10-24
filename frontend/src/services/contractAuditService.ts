// src/services/contractAuditService.ts

export interface FlaggedClause {
  id: string;
  clause_title: string;
  severity: 'high' | 'medium' | 'low' | string;
  problem_statement: string;
  legal_implication: string;
  renegotiation_recommendation: string;
  original_clause_snippet?: string;
}

export interface MissingProtection {
  clause_name: string;
  importance: 'High' | 'Medium' | 'Low' | string;
  why_needed: string;
}

export interface KeyMetrics {
  high_risk_count: number;
  medium_risk_count: number;
  low_risk_count: number;
  missing_protections_count: number;
}

export interface ContractAuditReport {
  contract_type: string;
  overall_risk_score: number;
  risk_level: 'Low' | 'Moderate' | 'High' | 'Critical' | string;
  executive_summary: string;
  key_metrics: KeyMetrics;
  flagged_clauses: FlaggedClause[];
  missing_protections: MissingProtection[];
  governing_law_assessment: string;
}

/**
 * Sends a request to analyze a contract either from an active session document
 * or from raw contract text.
 */
export async function requestContractAudit(params: {
  sessionId?: string | null;
  contractText?: string | null;
}): Promise<ContractAuditReport> {
  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
  const token = localStorage.getItem('legal_ai_token');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}/documents/analyze-contract`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      session_id: params.sessionId || null,
      contract_text: params.contractText || null,
    }),
  });

  if (!response.ok) {
    let errorDetail = 'Failed to analyze contract legal risks.';
    try {
      const err = await response.json();
      if (err?.detail) errorDetail = err.detail;
    } catch {
      // ignore
    }
    throw new Error(errorDetail);
  }

  return await response.json();
}

