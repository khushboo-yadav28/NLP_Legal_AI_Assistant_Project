from pydantic import BaseModel,Field
from typing import Optional
from datetime import datetime

class Chunk(BaseModel):
    """
    Represents one chunk of a document.
    """

    chunk_id: str
    document_id: str
    filename: str
    category: str

    chunk_index: int          # 0,1,2,3...
    start_char: int
    end_char: int

    page_number: Optional[int] = None
    text: str # Actual chunk (overlap + chunk) this is embedded
    embedding: Optional[list[float]] = None # filled after embedding model runs

    created_at: datetime = Field(default_factory=datetime.utcnow)