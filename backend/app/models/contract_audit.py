from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class FlaggedClause(BaseModel):
    id: str = Field(..., description="Unique risk identifier")
    clause_title: str = Field(..., description="Title of the flagged clause")
    severity: str = Field(..., description="Severity level: high, medium, or low")
    problem_statement: str = Field(..., description="Why the clause is unfair or creates unilateral risk")
    legal_implication: str = Field(..., description="Statutory reference or Indian legal doctrine")
    renegotiation_recommendation: str = Field(..., description="Actionable counter-proposal or amendment")
    original_clause_snippet: Optional[str] = Field(default="", description="Original clause excerpt from contract")


class MissingProtection(BaseModel):
    clause_name: str = Field(..., description="Name of the missing standard clause")
    importance: str = Field(..., description="Importance level: High, Medium, or Low")
    why_needed: str = Field(..., description="Explanation of why this protection is essential")


class KeyMetrics(BaseModel):
    high_risk_count: int = 0
    medium_risk_count: int = 0
    low_risk_count: int = 0
    missing_protections_count: int = 0


class ContractAuditReport(BaseModel):
    contract_type: str
    overall_risk_score: int
    risk_level: str
    executive_summary: str
    key_metrics: KeyMetrics
    flagged_clauses: List[FlaggedClause]
    missing_protections: List[MissingProtection]
    governing_law_assessment: str


class ContractAuditRequest(BaseModel):
    session_id: Optional[str] = Field(default=None, description="Optional active chat session ID containing uploaded files")
    contract_text: Optional[str] = Field(default=None, description="Optional raw text of the contract to analyze")

