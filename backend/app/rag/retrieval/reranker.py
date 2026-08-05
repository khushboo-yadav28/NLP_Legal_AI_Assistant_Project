from sentence_transformers import CrossEncoder

from app.db.chunk_model import ChunkTable
from app.core.config import FINAL_TOP_K


class Reranker:
    _model = None

    def __init__(self):
        if Reranker._model is None:
            print("Loading reranker...")
            Reranker._model = CrossEncoder(
                "cross-encoder/ms-marco-MiniLM-L-6-v2"
            )
        self.model = Reranker._model

    # It receives the retrieved chunks, not embeddings.
    def rerank(
        self,
        query: str,
        results: list[tuple[ChunkTable, float]],
        top_k: int = FINAL_TOP_K
    ) -> list[tuple[ChunkTable, float]]:

        pairs = [(query, chunk.text) for chunk, _ in results]

        scores = self.model.predict(pairs)

        reranked = []

        for (chunk, distance), score in zip(results, scores):
            reranked.append((chunk,distance ,float(score)))

        reranked.sort(
            key=lambda x: x[2],
            reverse=True
        )

        return reranked[:top_k]