"""
Handles vector similarity search and full-text keyword search against Postgres/pgvector.
"""

import re
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.db.chunk_model import ChunkTable
from app.db.document_model import DocumentTable
from app.core.config import VECTOR_SEARCH_K


class VectorStore:
    """
    Handles hybrid search (Vector + BM25 Full-Text Search) against pgvector and Postgres tsvector.
    """

    def __init__(self, db: Session):
        self.db = db

    def search_vector(
        self,
        query_embedding: list[float],
        category: str | None = None,
        top_k: int = VECTOR_SEARCH_K,
    ) -> list[tuple[ChunkTable, float]]:
        """
        Pure Vector Similarity Search using cosine distance.
        Returns a list of (ChunkTable, distance) tuples.
        """
        distance = ChunkTable.embedding.cosine_distance(query_embedding)

        query = self.db.query(ChunkTable, distance.label("score"))

        if category:
            query = query.filter(ChunkTable.category == category)

        results = query.order_by(distance).limit(top_k).all()
        return results

    def search_bm25(
        self,
        query: str,
        category: str | None = None,
        top_k: int = VECTOR_SEARCH_K,
    ) -> list[tuple[ChunkTable, float]]:
        """
        Postgres Full-Text Search (BM25 equivalent).
        Returns a list of (ChunkTable, text_rank) tuples.
        """
        # Clean query for websearch_to_tsquery compatibility
        cleaned_query = re.sub(r"[^\w\s]", " ", query).strip()
        if not cleaned_query:
            return []

        ts_vector = func.to_tsvector("english", ChunkTable.text)
        ts_query = func.websearch_to_tsquery("english", cleaned_query)
        rank = func.ts_rank_cd(ts_vector, ts_query)

        db_query = self.db.query(ChunkTable, rank.label("score")).filter(
            ts_vector.op("@@")(ts_query)
        )

        if category:
            db_query = db_query.filter(ChunkTable.category == category)

        results = db_query.order_by(rank.desc()).limit(top_k).all()
        return results

    def hybrid_search(
        self,
        query: str,
        query_embedding: list[float],
        category: str | None = None,
        top_k: int = VECTOR_SEARCH_K,
        rrf_k: int = 60,
    ) -> list[tuple[ChunkTable, float]]:
        """
        Combines Vector Search & BM25 Keyword Search using Reciprocal Rank Fusion (RRF).
        Returns top_k tuples of (ChunkTable, fused_rrf_score).
        """
        # 1. Retrieve top results from both vector and keyword search
        vector_results = self.search_vector(
            query_embedding=query_embedding, category=category, top_k=top_k
        )
        bm25_results = self.search_bm25(
            query=query, category=category, top_k=top_k
        )

        # 2. Map and fuse rankings using RRF
        rrf_scores: dict[str, float] = {}
        chunk_map: dict[str, ChunkTable] = {}

        # Rank vector results (0-indexed rank)
        for rank, (chunk, _dist) in enumerate(vector_results):
            chunk_map[chunk.chunk_id] = chunk
            rrf_scores[chunk.chunk_id] = rrf_scores.get(
                chunk.chunk_id, 0.0
            ) + (1.0 / (rrf_k + rank + 1))

        # Rank BM25 results (0-indexed rank)
        for rank, (chunk, _rank_score) in enumerate(bm25_results):
            chunk_map[chunk.chunk_id] = chunk
            rrf_scores[chunk.chunk_id] = rrf_scores.get(
                chunk.chunk_id, 0.0
            ) + (1.0 / (rrf_k + rank + 1))

        # 3. Sort by fused RRF score descending
        sorted_ids = sorted(
            rrf_scores.keys(), key=lambda cid: rrf_scores[cid], reverse=True
        )

        # 4. Return top_k merged candidates with their RRF scores
        hybrid_results = [
            (chunk_map[cid], rrf_scores[cid]) for cid in sorted_ids[:top_k]
        ]
        return hybrid_results