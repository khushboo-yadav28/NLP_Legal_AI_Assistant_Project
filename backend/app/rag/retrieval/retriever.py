"""
Converts a user query into relevant document chunks using Hybrid Search (Vector + BM25),
followed by Cross-Encoder Reranking and Diversity Filtering.
"""

from sqlalchemy.orm import Session
from app.rag.embeddings.embedding_model import EmbeddingModel
from app.rag.retrieval.vector_store import VectorStore
from app.db.chunk_model import ChunkTable
from app.core.config import VECTOR_SEARCH_K, RERANK_TOP_K, FINAL_TOP_K
from app.rag.retrieval.reranker import Reranker
from app.rag.retrieval.diversity import DiversityFilter
from app.rag.retrieval.query_expander import QueryExpander


class Retriever:
    """
    Handles end-to-end retrieval using Hybrid Search (RRF), Reranking, and Diversity Filtering.
    """

    def __init__(
        self,
        db: Session,
        embedding_model: EmbeddingModel,
        reranker: Reranker
    ):
        self.embedding_model = embedding_model
        self.vector_store = VectorStore(db)
        self.reranker = reranker
        self.query_expander = QueryExpander()
        self.diversifier = DiversityFilter()

    def retrieve(
        self,
        query: str,
        category: str | None = None,
        top_k: int = VECTOR_SEARCH_K
    ) -> list[tuple[ChunkTable, float, float]]:
        """
        Retrieves relevant chunks for a user query.
        Returns top_k tuples from the diversity filter.
        """
        # 1. Expand Query for broader term coverage
        expanded_query = self.query_expander.expand(query)
        query_embedding = self.embedding_model.embed_text(expanded_query)

        print(f"\nOriginal Query : {query}")
        print(f"Expanded Query : {expanded_query}\n")

        # 2. Hybrid Search (Vector Cosine Distance + BM25 FTS merged via RRF)
        hybrid_results = self.vector_store.hybrid_search(
            query=expanded_query,
            query_embedding=query_embedding,
            category=category,
            top_k=top_k
        )

        # print(f"HYBRID RETRIEVAL RESULTS ({len(hybrid_results)} CHUNKS) : \n")
        # for chunk, score in hybrid_results:
        #     print(f"Chunk_index : {chunk.chunk_index}")
        #     print(f"Chunk Category : {chunk.category}")
        #     print(f"Filename : {chunk.filename}")
        #     print(f"RRF Score : {score}")
        #     print("=" * 50)

        # print("=" * 50)
        # print("=" * 50)

        # 3. Rerank top candidate chunks using Cross-Encoder
        # We pass the original user query here so the Cross-Encoder ranks exact intent
        reranked = self.reranker.rerank(
            query=query,
            results=hybrid_results,
            top_k=RERANK_TOP_K
        )

        # 4. Apply Diversity Filter on reranked candidates
        results = self.diversifier.diversify(
            reranked,
            top_k=FINAL_TOP_K
        )

        print("TOP 5 FINAL DATA \n")
        for item in results:
            # Safely unpack depending on how your diversifier formats output
            chunk = item[0]
            score = item[2] if len(item) > 2 else item[1]
            print(f"Chunk_index : {chunk.chunk_index}")
            print(f"Chunk Category : {chunk.category}")
            print(f"Filename : {chunk.filename}")
            print(f"Reranker Score : {score}")
            print(f"Chunk text : \n{chunk.text}")
            print("=" * 50)

        return results