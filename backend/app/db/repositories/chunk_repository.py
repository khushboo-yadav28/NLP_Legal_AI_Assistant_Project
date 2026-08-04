from sqlalchemy.orm import Session
from app.models.chunk import Chunk
from app.db.chunk_model import ChunkTable


class ChunkRepository:
    """
    Handles all database operations related to chunks.
    """

    def __init__(self, db: Session):
        self.db = db

    def save_chunks(
        self,
        chunks: list[Chunk]
    ):
        """
        Save multiple chunks.
        """

        db_chunks = []

        for chunk in chunks:

            db_chunks.append(

                ChunkTable(
                    chunk_id=chunk.chunk_id,
                    document_id=chunk.document_id,
                    filename=chunk.filename,
                    category=chunk.category,
                    chunk_index=chunk.chunk_index,
                    start_char=chunk.start_char,
                    end_char=chunk.end_char,
                    page_number=chunk.page_number,
                    text=chunk.text,
                    embedding=chunk.embedding,
                )

            )

        self.db.add_all(db_chunks)

        # self.db.commit()