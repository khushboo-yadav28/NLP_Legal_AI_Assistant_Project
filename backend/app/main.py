from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.rag.embeddings.embedding_model import EmbeddingModel
from app.rag.generation.llm import GeminiClient
from app.rag.retrieval.reranker import Reranker
from app.api.routes.chat import router as chat_router
from app.api.routes.auth import router as auth_router
from app.api.routes.documents import router as documents_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Load heavy models into memory ONCE
    print("Initializing heavy models (Embedding Model & Gemini Client)...")
    app.state.embedding_model = EmbeddingModel()
    app.state.llm_client = GeminiClient()
    app.state.reranker = Reranker()
    print("Models loaded successfully.")
    
    yield  # Server runs and handles requests here
    
    # Shutdown: Clean up resources if necessary
    print("Shutting down application...")

app = FastAPI(title="Legal AI India API", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# -------------------------------

app.include_router(chat_router, prefix="/api")
app.include_router(auth_router, prefix="/api")
app.include_router(documents_router, prefix="/api")
#app.include_router(chat_router, prefix="/api")