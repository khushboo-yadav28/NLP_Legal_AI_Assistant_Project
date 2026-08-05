"""
This class should do only one thing -> talk to pgvector.
"""

from sqlalchemy.orm import Session
from pgvector.sqlalchemy import Vector
from app.db.chunk_model import ChunkTable
from app.core.config import VECTOR_TOP_K

class VectorStore:
    """
    Handles vector similarity search against pgvector.
    """

    def __init__(self, db: Session):
        self.db = db

    def similarity_search(
        self,
        query_embedding: list[float],
        category: str | None = None,
        top_k: int = VECTOR_TOP_K
    ) -> list[tuple[ChunkTable,float]]:
        """
        Returns the top-k most similar chunks along with their cosine distance.
        """
        # query = self.db.query(ChunkTable)

        # # Optional category filter
        # if category:
        #     query = query.filter(
        #         ChunkTable.category == category
        #     )

        # results = (
        #     query
        #     .order_by(
        #         ChunkTable.embedding.cosine_distance(query_embedding)
        #     )
        #     .limit(top_k)
        #     .all()
        # )

        distance = ChunkTable.embedding.cosine_distance(query_embedding)

        query = self.db.query(
            ChunkTable,
            distance.label("score")
        )

        if category:
            query = query.filter(
                ChunkTable.category == category
            )

        results = (
            query
            .order_by(distance)
            .limit(top_k)
            .all()
        )

        return results