from typing import List
from app.models.document import Document
from app.models.chunk import Chunk
from app.core.config import CHUNK_SIZE, CHUNK_OVERLAP

class TextChunker:
    """
    Splits cleaned text into overlapping chunks.

    Uses fixed-size character chunking.
    """

    def __init__(
            self,
            chunk_size:int = CHUNK_SIZE,
            chunk_overlap:int = CHUNK_OVERLAP
    ):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

    def split_document(self,document:Document)-> List[Chunk]:
        """
        Split one document into chunks.
        Input => document : dict Output from PDFLoader.
        Returns => List of chunk dictionaries.
        """

        text = document.cleaned_text
        chunks = []

        start = 0
        chunk_index = 0

        while start < len(text):
            # end = start + self.chunk_size
            end = min(start + self.chunk_size, len(text))
            chunk_text = text[start:end]

            chunks.append(
                Chunk(
                chunk_id = f"{document.document_id}_chunk_{chunk_index}",
                document_id= document.document_id,
                filename = document.filename,
                category = document.category,
                chunk_index= chunk_index,
                start_char=start,
                end_char= end,
                page_number = None,
                text = chunk_text
                )
            )

            chunk_index += 1
            start += self.chunk_size - self.chunk_overlap

        return chunks