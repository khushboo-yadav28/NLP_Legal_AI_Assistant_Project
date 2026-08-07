from dotenv import load_dotenv
import os

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

EMBEDDING_MODEL = os.getenv(
    "EMBEDDING_MODEL",
    "BAAI/bge-small-en-v1.5"
)

CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", 1000))
CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", 200))

VECTOR_DB = os.getenv("VECTOR_DB", "postgres")

COLLECTION_NAME = os.getenv("COLLECTION_NAME", "legal_ai")

VECTOR_SEARCH_K  = int(os.getenv("VECTOR_TOP_K", 20))
RERANK_TOP_K = int(os.getenv("RERANK_TOP_K",10))
FINAL_TOP_K = int(os.getenv("FINAL_TOP_K", 4))

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

LLM_MODEL = os.getenv("LLM_MODEL","gemini-3.5-flash-lite")

LLM_TEMPERATURE = os.getenv("LLM_TEMPERATURE","0.3")

LLM_MAX_OUTPUT_TOKENS = os.getenv("LLM_MAX_OUTPUT_TOKENS","300")