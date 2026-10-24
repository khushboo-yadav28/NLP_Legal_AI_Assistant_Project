import json
import re
from typing import Any, Dict, List, Optional
from google import genai
from google.genai import types
from app.core.config import GEMINI_API_KEY


class ContractRiskAnalyzer:
    """
    Analyzes legal contracts and agreements under Indian Law,
    identifying red-flag clauses, one-sided liabilities, and missing protections.
    """

    CANDIDATE_MODELS = [
        "gemini-3.8-flash",
        "gemini-3.5-flash-lite",
        "gemini-3.5-flash",
        "gemini-flash-latest",
    ]

    def __init__(self):
        self.client = genai.Client(api_key=GEMINI_API_KEY)

    @property
    def audit_prompt(self) -> str:
        return """You are a Principal Legal Counsel and Senior Contract Auditor in India.
Your task is to conduct a rigorous, clause-by-clause legal risk audit of the provided contract or agreement under Indian Law (Indian Contract Act 1872, Transfer of Property Act 1882, Specific Relief Act 1963, Consumer Protection Act 2019, Arbitration and Conciliation Act 1996, and relevant Indian jurisprudence).

Audit Objectives:
1. Identify heavily one-sided, unfair, non-mutual, or legally unconscionable clauses.
2. Flag unlimited liability, forfeiture of deposit, indemnity traps, unilateral termination, and restrictive covenants.
3. Identify standard statutory protections and boilerplate clauses that are MISSING (e.g., Force Majeure, Mutual Limitation of Liability, Dispute Resolution/Arbitration, Severability, Governing Law).
4. Provide a quantitative overall risk score from 0 (completely safe and fair) to 100 (critical legal exposure / unconscionable).

You MUST return ONLY a valid JSON object matching this exact schema:
{
  "contract_type": "string (e.g. Commercial Lease Agreement, Software Service Agreement, Employment Contract, Non-Disclosure Agreement, Vendor Contract)",
  "overall_risk_score": 75,
  "risk_level": "Low" | "Moderate" | "High" | "Critical",
  "executive_summary": "string (A sharp 2-3 sentence overview assessing contract mutuality, fairness, and commercial exposure)",
  "key_metrics": {
    "high_risk_count": 2,
    "medium_risk_count": 1,
    "low_risk_count": 0,
    "missing_protections_count": 2
  },
  "flagged_clauses": [
    {
      "id": "risk-1",
      "clause_title": "string (e.g. Unilateral Termination without Cure Period)",
      "severity": "high" | "medium" | "low",
      "problem_statement": "string (Detailed explanation of why this clause creates unilateral exposure or is biased)",
      "legal_implication": "string (Applicable Indian statutory provision, e.g. Section 10/23/27 Indian Contract Act, or doctrine of mutuality)",
      "renegotiation_recommendation": "string (Specific practical amendment or replacement wording to propose during negotiation)",
      "original_clause_snippet": "string (Exact or paraphrased clause text from the document)"
    }
  ],
  "missing_protections": [
    {
      "clause_name": "string (e.g. Mutual Limitation of Liability)",
      "importance": "High" | "Medium" | "Low",
      "why_needed": "string (Why including this clause is essential for legal safety)"
    }
  ],
  "governing_law_assessment": "string (Evaluation of jurisdiction, dispute resolution mechanism, stamp duty / registration notice)"
}
"""

    def analyze(
        self,
        contract_text: Optional[str] = None,
        file_uris: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """
        Executes structured contract audit using Gemini with automatic model fallback.
        Accepts either raw text or uploaded Gemini file URIs.
        """
        if not contract_text and not file_uris:
            raise ValueError("Either contract_text or file_uris must be provided for risk analysis.")

        # Build contents
        contents = []
        if file_uris:
            for uri in file_uris:
                try:
                    gemini_file = self.client.files.get(name=uri)
                    contents.append(gemini_file)
                except Exception as e:
                    print(f"[RiskAnalyzer Warning] Failed to attach file {uri}: {e}")

        prompt_text = self.audit_prompt
        if contract_text:
            prompt_text += f"\n\n--- CONTRACT TEXT TO AUDIT ---\n{contract_text}"

        contents.append(prompt_text)

        last_error = None
        for model_name in self.CANDIDATE_MODELS:
            try:
                print(f"[RiskAnalyzer] Attempting analysis with model: {model_name}...")
                response = self.client.models.generate_content(
                    model=model_name,
                    contents=contents,
                    config=types.GenerateContentConfig(
                        temperature=0.1,
                        response_mime_type="application/json",
                    ),
                )

                if not response.text:
                    continue

                raw_text = response.text.strip()
                # Clean potential markdown fences
                if raw_text.startswith("```"):
                    raw_text = re.sub(r"^```(?:json)?\s*", "", raw_text)
                    raw_text = re.sub(r"\s*```$", "", raw_text)

                data = json.loads(raw_text)
                print(f"[RiskAnalyzer] Successfully generated audit report using {model_name}")
                return self._sanitize_report(data)

            except Exception as e:
                print(f"[RiskAnalyzer Warning] Model {model_name} failed: {e}")
                last_error = e
                continue

        # If all LLM calls failed, return a structured fallback
        raise RuntimeError(f"All model candidates failed for contract risk analysis: {last_error}")

    def _sanitize_report(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Ensures all required fields and types exist in the report."""
        score = data.get("overall_risk_score", 50)
        try:
            score = int(score)
            score = max(0, min(100, score))
        except (ValueError, TypeError):
            score = 50

        level = data.get("risk_level")
        if not level:
            if score <= 35:
                level = "Low"
            elif score <= 70:
                level = "Moderate"
            else:
                level = "High"

        flagged = data.get("flagged_clauses", [])
        if not isinstance(flagged, list):
            flagged = []

        missing = data.get("missing_protections", [])
        if not isinstance(missing, list):
            missing = []

        # Count metrics if missing
        high_cnt = sum(1 for c in flagged if str(c.get("severity", "")).lower() == "high")
        med_cnt = sum(1 for c in flagged if str(c.get("severity", "")).lower() == "medium")
        low_cnt = sum(1 for c in flagged if str(c.get("severity", "")).lower() == "low")

        key_metrics = data.get("key_metrics", {})
        if not key_metrics:
            key_metrics = {
                "high_risk_count": high_cnt,
                "medium_risk_count": med_cnt,
                "low_risk_count": low_cnt,
                "missing_protections_count": len(missing),
            }

        return {
            "contract_type": data.get("contract_type", "General Agreement / Contract"),
            "overall_risk_score": score,
            "risk_level": level,
            "executive_summary": data.get("executive_summary", "Contract risk assessment complete."),
            "key_metrics": key_metrics,
            "flagged_clauses": flagged,
            "missing_protections": missing,
            "governing_law_assessment": data.get(
                "governing_law_assessment",
                "Ensure jurisdiction and dispute resolution clauses comply with the Arbitration and Conciliation Act 1996.",
            ),
        }

