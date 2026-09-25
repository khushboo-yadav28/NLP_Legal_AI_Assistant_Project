import time
from typing import Generator, List, Optional
from google import genai
from google.genai import errors
from google.genai import types
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_random_exponential

from app.core.config import (
    GEMINI_API_KEY,
    LLM_MODEL,
    LLM_TEMPERATURE,
    LLM_MAX_OUTPUT_TOKENS,
    LLM_FALLBACK_MODEL,
    LLM_LIGHT_FALLBACK_MODEL,
)


class GeminiClient:
    """
    Handles communication with Gemini API.
    """

    _client = None

    def __init__(self):
        if GeminiClient._client is None:
            print("Loading Gemini Client...")
            GeminiClient._client = genai.Client(api_key=GEMINI_API_KEY)

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
5. Domain Guardrail: Answer ONLY questions related to law, contracts, statutes, and legal procedures. Politely decline non-legal requests without citing any sources or adding a "Sources:" section.
6. Template Generation Guardrail: When asked to draft a legal agreement, bond, lease, application, or notice, generate a comprehensive, professional and ready-to-use template compliant with Indian legal standards (incorporating proper clauses,formal headings,blank placeholders, execution blocks, and governing Indian jurisdiction). 
   - **Crucial:** Skip the "Sources:" section entirely when generating templates.
   - **Crucial:** Override standard length limits for templates to ensure the draft is complete and usable.
Length & Format Constraints:
- Keep responses concise, targeted, and scannable (around 150-250 words maximum).
- Structure: Combine a short introductory paragraph with 3-4 key bullet points.
- Sources Formatting: End your response with a concise "Sources:" list ONLY if you used relevant legal context or statutes to answer a legal question. Do NOT include a "Sources:" section if you are declining a non-legal request.
"""

    @retry(
        wait=wait_random_exponential(min=1, max=5),
        stop=stop_after_attempt(3),
        retry=retry_if_exception_type((errors.ServerError, errors.APIError)),
        reraise=True,
    )
    def generate(self, prompt: str, model: str = LLM_MODEL) -> str:
        """Blocking single-response generation with exponential backoff retry."""
        model_name = model.replace("models/", "")

        try:
            response = self.client.models.generate_content(
                model=model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=LLM_TEMPERATURE,
                    max_output_tokens=LLM_MAX_OUTPUT_TOKENS,
                    system_instruction=self.system_instruction,
                ),
            )
            return response.text.strip() if response.text else ""

        except Exception as e:
            print(f"[Gemini Error]: {e}")
            raise

    def upload_file(self, file_path: str, display_name: str) -> str:
        """Uploads a file to Gemini File API and returns the file object resource name."""
        uploaded_file = self.client.files.upload(
            file=file_path,
            config=types.UploadFileConfig(display_name=display_name),
        )
        return uploaded_file.name

    def generate_stream_with_file(
        self, 
        prompt: str, 
        file_uris: Optional[List[str]] = None, 
        model: str = "gemini-3.5-flash-lite"
    ) -> Generator[str, None, None]:
        """
        Streams response using either text prompt alone or text prompt + uploaded file reference.
        Includes model fallback and handles file reference errors gracefully.
        """
        # Assemble model candidate chain
        # models_to_try = [m for m in [model, LLM_FALLBACK_MODEL, LLM_LIGHT_FALLBACK_MODEL] if m]
        # models_to_try = list(dict.fromkeys(models_to_try))  # Preserve order, remove dupes

        # for current_model in models_to_try:
        #     model_name = current_model.replace("models/", "")
            
        #     # Re-build contents for each model attempt
        #     contents = []
        #     if file_uri:
        #         try:
        #             gemini_file = self.client.files.get(name=file_uri)
        #             contents.append(gemini_file)
        #         except Exception as e:
        #             print(f"[Gemini File Warning] Could not fetch file '{file_uri}': {e}")
        #     contents.append(prompt)

        #     max_retries = 2
        #     for attempt in range(1, max_retries + 1):
        #         try:
        #             print(f"[LLM Stream] Attempting generation with model: {model_name} (Attempt {attempt})")
                    
        #             response_stream = self.client.models.generate_content_stream(
        #                 model=model_name,
        #                 contents=contents,
        #                 config=types.GenerateContentConfig(
        #                     temperature=LLM_TEMPERATURE,
        #                     max_output_tokens=LLM_MAX_OUTPUT_TOKENS,
        #                     system_instruction=self.system_instruction,
        #                 ),
        #             )

        #             has_yielded = False
        #             for chunk in response_stream:
        #                 if chunk.text:
        #                     has_yielded = True
        #                     yield chunk.text

        #             # Successfully finished stream
        #             return

        #         except Exception as e:
        #             print(f"[LLM Warning] Generation error on '{model_name}' (Attempt {attempt}): {e}")
                    
        #             # If we already yielded text to the client, we cannot fallback safely without duplicating output
        #             if 'has_yielded' in locals() and has_yielded:
        #                 print("[LLM Error] Exception occurred mid-stream after yielding text. Aborting retry.")
        #                 raise e

        #             # Fallback retry without file if file URI is corrupt/invalid (400 Invalid Argument)
        #             if "400" in str(e) and file_uri and len(contents) > 1:
        #                 print(f"[LLM Retrying] Dropping file reference and retrying with prompt only...")
        #                 contents = [prompt]
        #                 continue

        #             if attempt < max_retries:
        #                 time.sleep(1.5)
        #                 continue
                    
        #             # If last model in fallback list failed, re-raise exception
        #             if current_model == models_to_try[-1]:
        #                 raise e
                    
        #             print(f"[LLM Fallback] Moving to next model in fallback chain...")
        # ==========================================================================================================================
        # Forced single model for testing
        model_name = "gemini-3.5-flash-lite"

        # Prepare contents
        contents = []
        if file_uris:
            for uri in file_uris:
                try:
                    gemini_file = self.client.files.get(name=uri)
                    contents.append(gemini_file)
                except Exception as e:
                    print(f"[Gemini File Warning] Could not fetch file '{uri}': {e}")

        contents.append(prompt)

        try:
            attached_count = len(contents) - 1
            print(f"[LLM Stream] Sending request to forced model: {model_name} with {attached_count} file(s) attached.")
            
            response_stream = self.client.models.generate_content_stream(
                model=model_name,
                contents=contents,
                config=types.GenerateContentConfig(
                    temperature=LLM_TEMPERATURE,
                    max_output_tokens=LLM_MAX_OUTPUT_TOKENS,
                    system_instruction=self.system_instruction,
                ),
            )

            for chunk in response_stream:
                if chunk.text:
                    yield chunk.text

        except Exception as e:
            # Handle corrupt/expired file URI fallback automatically
            if "400" in str(e) and file_uris and len(contents) > 1:
                print(f"[LLM Warning] 400 Invalid Argument on file. Retrying prompt-only...")
                response_stream = self.client.models.generate_content_stream(
                    model=model_name,
                    contents=[prompt],
                    config=types.GenerateContentConfig(
                        temperature=LLM_TEMPERATURE,
                        max_output_tokens=LLM_MAX_OUTPUT_TOKENS,
                        system_instruction=self.system_instruction,
                    ),
                )
                for chunk in response_stream:
                    if chunk.text:
                        yield chunk.text
            else:
                print(f"[LLM Stream Error] {e}")
                raise e

