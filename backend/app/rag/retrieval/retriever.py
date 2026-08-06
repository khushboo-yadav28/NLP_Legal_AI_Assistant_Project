"""
Question -> Embedding -> Vector Search -> Chunks
"""

from sqlalchemy.orm import Session
from app.rag.embeddings.embedding_model import EmbeddingModel
from app.rag.retrieval.vector_store import VectorStore
from app.db.chunk_model import ChunkTable
from app.db.document_model import DocumentTable
from app.core.config import VECTOR_TOP_K,FINAL_TOP_K
from app.rag.retrieval.reranker import Reranker


class Retriever:
    """
    Converts a user query into relevant document chunks.
    """

    def __init__(
        self,
        db: Session,
        embedding_model: EmbeddingModel
    ):
        self.embedding_model = embedding_model
        self.vector_store = VectorStore(db)
        self.reranker = Reranker()

    def retrieve(
        self,
        query: str,
        category: str | None = None,
        top_k: int = VECTOR_TOP_K
    ) -> list[ChunkTable]:

        query_embedding = self.embedding_model.embed_text(query)

        vector_results = self.vector_store.similarity_search(
            query_embedding=query_embedding,
            category=category,
            top_k=top_k
        )

        reranked = self.reranker.rerank(
            query=query,
            results=vector_results,
            top_k=FINAL_TOP_K
        )

        return reranked