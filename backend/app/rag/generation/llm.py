from typing import Generator
from google import genai
from google.genai import errors
from tenacity import retry,retry_if_exception_type,stop_after_attempt,wait_random_exponential
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

    @property
    def system_instruction(self) -> str:
        return """
You are Legal AI India, an expert legal assistant that helps ordinary people understand Indian legal documents and statutory law.
Your task is to answer the user's question clearly and accurately in plain, simple language.

Rules:
1. Primary Source: Use the retrieved legal context to directly answer the user's question whenever relevant provisions, clauses, or facts are present.
2. Seamless Knowledge Fallback: If the retrieved context references a legal provision (like a Section or Act) but lacks its full text, or if context is missing specific statutory details, use your authoritative knowledge of Indian Law to provide a complete answer.
3. Seamless Tone: Do NOT mention, state, or imply that context was missing, incomplete, or retrieved from an index chunk. Never say "I couldn't find enough information" or "The provided context is partial".
4. Language Style: Rewrite complex legalese into clear, concise, everyday English. Answer directly first.
5. Domain Guardrail: Answer ONLY questions related to law, contracts, statutes, and legal procedures. Politely decline non-legal requests.

Length & Format Constraints:
- Keep responses concise, targeted, and scannable (around 150-250 words maximum).
- Structure: Combine a short introductory paragraph with 3-4 key bullet points.
- Sources Formatting: End your response with a concise "Sources:" list.
"""
    
    @retry(
        wait=wait_random_exponential(min=1, max=5),
        stop=stop_after_attempt(3),
        retry=retry_if_exception_type((errors.ServerError, errors.APIError)),
        reraise=True
    )

    def generate(self,prompt: str,model: str = LLM_MODEL) -> str:
        """Blocking single-response generation."""
        model_name = model.replace("models/", "")

        try:
            response = self.client.models.generate_content(
                model=model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=LLM_TEMPERATURE,
                    max_output_tokens=LLM_MAX_OUTPUT_TOKENS,
                    thinking_config=types.ThinkingConfig(thinking_budget=0,include_thoughts=False),
                    system_instruction=self.system_instruction
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

            # print("=" * 80)
            # candidate = response.candidates[0]
            # print(f"Candidate Content : \n{candidate.content}")

            # print("=" * 80)
            # print("Finish Reason:", candidate.finish_reason)
            # print("Safety Ratings:", candidate.safety_ratings)

            return response.text.strip()
        
        except Exception as e:
            print(f"Gemini Error: {e}")
            raise

    def generate_stream(self, prompt: str, model: str = LLM_MODEL) -> Generator[str, None, None]:
        """Streaming response generator for SSE endpoints."""
        model_name = model.replace("models/", "")
        try:
            response_stream = self.client.models.generate_content_stream(
                model=model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=LLM_TEMPERATURE,
                    max_output_tokens=LLM_MAX_OUTPUT_TOKENS,
                    thinking_config=types.ThinkingConfig(thinking_budget=0, include_thoughts=False),
                    system_instruction=self.system_instruction
                )
            )
            for chunk in response_stream:
                if chunk.text:
                    yield chunk.text
        except Exception as e:
            print(f"Gemini Streaming Error: {e}")
            raise