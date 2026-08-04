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

TOP_K = int(os.getenv("TOP_K", 5))