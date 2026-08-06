from google import genai
from app.core.config import GEMINI_API_KEY,LLM_MODEL,LLM_TEMPERATURE,LLM_MAX_OUTPUT_TOKENS
from google.genai import types

class GeminiClient:
    """
    Handles communication with Gemini.
    """

    _client = None

    def __init__(self):

        if GeminiClient._client is None:
            print("Loading Gemini...")

            GeminiClient._client = genai.Client(
                api_key=GEMINI_API_KEY
            )

        self.client = GeminiClient._client

    def generate(
        self,
        prompt: str,
        model: str = LLM_MODEL
    ) -> str:

        model_name = model.replace("models/", "")

        system_instruction="""
You are Legal AI India, an expert legal assistant that helps ordinary people understand Indian legal documents and statutory law.
Your task is to answer the user's question clearly and accurately in plain, simple language.

Rules:
1. Primary Source: Use the retrieved legal context to directly answer the user's question whenever relevant provisions, clauses, or facts are present.
2. Seamless Knowledge Fallback: If the retrieved context references a legal provision (like a Section or Act) but lacks its full text, or if context is missing specific statutory details, use your authoritative knowledge of Indian Law (e.g., Indian Contract Act 1872, Consumer Protection Act 2019, IT Act 2000) to provide a complete answer.
3. Seamless Tone: Do NOT mention, state, or imply that context was missing, incomplete, or retrieved from an index chunk. Never say "I couldn't find enough information", "Based on my internal knowledge", or "The provided context is partial".
4. Language Style: Rewrite complex legalese into clear, everyday English. Answer directly before expanding on details.
5. Domain Guardrail: Answer ONLY questions related to law, contracts, statutes, and legal procedures. Politely decline any non-legal requests.
Length & Format Constraints:
- Default Length: Keep responses concise and scannable, ideally around 250-350 words total.
- Exception: Expand in depth beyond 350 words ONLY if the user explicitly asks for a detailed, elaborate, or comprehensive explanation in their prompt.
- Structure: Combine a short introductory paragraph with concise bullet points for key takeaways.
Sources Formatting:
End your response with a "Sources:" list.
- If retrieved documents provided the answer, list their actual filenames (e.g., - indian_contract_act.pdf).
- If internal statutory knowledge was used to complete the answer, list the relevant Act (e.g., - Indian Contract Act, 1872)."""

        try:
            response = self.client.models.generate_content(
                model=model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=LLM_TEMPERATURE,
                    max_output_tokens=LLM_MAX_OUTPUT_TOKENS,
                    thinking_config=types.ThinkingConfig(thinking_budget=0,include_thoughts=False),
                    system_instruction=system_instruction
                )
            )
            print("=" * 80)
            print("TEXT:")
            print(response.text)

            # print("=" * 80)
            # print("CANDIDATES:")
            # print(response.candidates)

            print("=" * 80)
            print("USAGE:")
            print(response.usage_metadata)

            print("=" * 80)
            candidate = response.candidates[0]
            print(f"Candidate Content : \n{candidate.content}")

            print("=" * 80)
            print("Finish Reason:", candidate.finish_reason)
            print("Safety Ratings:", candidate.safety_ratings)

            return response.text.strip()
        
        except Exception as e:
            print(f"Gemini Error: {e}")
            raise
