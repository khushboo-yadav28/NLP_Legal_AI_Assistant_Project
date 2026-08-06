from sqlalchemy import Column,Integer,String,Text,ForeignKey,DateTime,Computed
from sqlalchemy.dialects.postgresql import TSVECTOR
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import Vector
from app.db.database import Base

class ChunkTable(Base):
    __tablename__ = "chunks"

    chunk_id = Column(String,primary_key=True)
    document_id = Column(String,ForeignKey("documents.document_id"),nullable=False)

    filename = Column(String,nullable=False)

    category = Column(String,nullable=False)

    chunk_index = Column(Integer,nullable=False)
    start_char = Column(Integer,nullable=False)
    end_char = Column(Integer,nullable=False)

    page_number = Column(Integer,nullable=True)

    text = Column(Text,nullable=False)

    embedding = Column(Vector(384))

    created_at = Column(DateTime(timezone=True),server_default=func.now())
    # Generated column for Full-Text Search
    search_vector = Column(
        TSVECTOR,
        Computed("to_tsvector('english', text)", persisted=True)
    )

    document = relationship("DocumentTable",back_populates="chunks")