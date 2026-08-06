from pydantic import BaseModel,Field
from uuid import uuid4
from typing import Optional

class Document(BaseModel):
    """
    Represents one PDF document in the knowledge base.
    """
    document_id:str = Field(default_factory=lambda:str(uuid4()))
    filename:str
    filepath: Optional[str] = None
    category:str
    page_count : int
    raw_text: str
    cleaned_text: str
    file_hash : str