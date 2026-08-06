"""
This file's only job is
text -> sentence-transformers -> vector (384 dimensions)
"""

from sentence_transformers import SentenceTransformer

from app.models.chunk import Chunk
from app.core.config import EMBEDDING_MODEL


class EmbeddingModel:
    """
    Wrapper around SentenceTransformer.
    Responsible for converting text into embeddings.
    """
    _model = None

    def __init__(self):
        if EmbeddingModel._model is None:
            print("Loading embedding model...")
            EmbeddingModel._model = SentenceTransformer(EMBEDDING_MODEL)


    @property
    def model(self):
        return EmbeddingModel._model

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

    def embed_chunks(self, chunks: list[Chunk]) -> list[Chunk]:
        """
        Generate embeddings for multiple chunks.
        """

        texts = [chunk.text for chunk in chunks]

        embeddings = self.model.encode(
            texts,
            normalize_embeddings=True,
        )

        for chunk, embedding in zip(chunks, embeddings):
            chunk.embedding = embedding.tolist()

        return chunks
