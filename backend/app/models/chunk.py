from pydantic import BaseModel
from typing import Optional

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
    text: str # Actual chunk
    embedding: Optional[list[float]] = None 