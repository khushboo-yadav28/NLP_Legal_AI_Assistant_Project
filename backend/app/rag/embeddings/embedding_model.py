"""
This file's only job is
text -> sentence-transformers -> vector (384 dimensions)
"""

from sentence_transformers import SentenceTransformer

from app.models.chunk import Chunk
from ...core.config import EMBEDDING_MODEL


class EmbeddingModel:
    """
    Wrapper around SentenceTransformer.
    Responsible for converting text into embeddings.
    """

    def __init__(self):
        self.model = SentenceTransformer(EMBEDDING_MODEL)

    def embed_text(self,text:str)-> list[float]:
        embedding = self.model.encode(
            text,
            normalize_embeddings=True
        )
        return embedding.tolist()

    def embed_texts(self,texts:list[str]) -> list[list[float]]:
        """
        Generate embeddings for multiple texts.
        """
        embeddings = self.model.encode(
            texts,
            normalize_embeddings=True
        )
        return embeddings.tolist()

    def embed_chunk(self, chunk: Chunk) -> Chunk:
        chunk.embedding = self.model.encode(
            chunk.text,
            normalize_embeddings=True
        ).tolist()
        
        return chunk
