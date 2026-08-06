from sqlalchemy import Column,Integer,String,Text,DateTime
from sqlalchemy.sql import func
from app.db.database import Base
from sqlalchemy.orm import relationship


class DocumentTable(Base):
    __tablename__ = "documents"

    document_id = Column(String,primary_key=True)
    filename = Column(String,nullable=False)

    filepath = Column(Text, nullable=False)
    category = Column(String,nullable=False)
    page_count = Column(Integer,nullable=False)

    file_hash = Column(String,unique=True,nullable=False)

    created_at = Column(DateTime(timezone=True),server_default=func.now())

    updated_at = Column(DateTime(timezone=True),server_default=func.now(),onupdate=func.now())

    chunks = relationship("ChunkTable",back_populates="document",cascade="all,delete-orphan")