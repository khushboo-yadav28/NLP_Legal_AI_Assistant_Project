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

        self.separators = [
            "\n\n",
            "\n",
            ". ",
            " ",
            ""
        ]


    def split_document(self,document:Document)-> List[Chunk]:
        """
        Split one document into overlapping semantic chunks.
        """

        text = document.cleaned_text

        # Step 1: recursively split
        splits = self._recursive_split(
            text,
            self.separators
        )

        # Step 2: merge into ~chunk_size chunks
        merged_chunks = self._merge_splits(splits)

        # Step 3: apply overlap
        merged_chunks = self._apply_overlap(merged_chunks)

        chunks = []

        search_start = 0

        for chunk_index, chunk_text in enumerate(merged_chunks):

            # Find approximate location in original document
            start_char = text.find(chunk_text.strip(), search_start)

            if start_char == -1:
                start_char = search_start

            end_char = start_char + len(chunk_text)

            chunks.append(
                Chunk(
                    chunk_id=f"{document.document_id}_chunk_{chunk_index}",
                    document_id=document.document_id,

                    filename=document.filename,
                    category=document.category,

                    chunk_index=chunk_index,

                    start_char=start_char,
                    end_char=end_char,

                    page_number=None,

                    text=chunk_text,
                )
            )

            search_start = end_char

        return chunks


    def _recursive_split(
            self,
            text:str,
            separators:list[str]    
        )-> list[str]:
        """
        Recursively split text into pieces no larger than chunk_size.
        """
         # Base case
        if len(text) <= self.chunk_size:
            return [text]

        # No separators left -> force split
        if not separators:
            return [
                text[i:i + self.chunk_size]
                for i in range(0,len(text),self.chunk_size)
            ]

        separator = separators[0]

        # Character split (last separator)
        if separator == "":
            return [
                text[i:i + self.chunk_size]
                for i in range(0, len(text), self.chunk_size)
            ]

        pieces = text.split(separator)

        results = []

        for i, piece in enumerate(pieces):

            piece = piece.strip()

            if not piece:
                continue

            # Restore separator except for the last piece
            if i < len(pieces) - 1:
                piece += separator

            if len(piece) <= self.chunk_size:
                results.append(piece)

            else:
                results.extend(
                    self._recursive_split(
                        piece,
                        separators[1:]
                    )
                )

        return results

    def _merge_splits(
        self,
        splits: list[str]
    ) -> list[str]:
        """
        Merge small semantic splits into chunks close to chunk_size.
        """

        merged_chunks = []

        current_chunk = []
        current_length = 0

        for split in splits:

            split_length = len(split)

            # If adding this split exceeds chunk size,
            # save current chunk and start a new one.
            if (
                current_chunk
                and current_length + split_length > self.chunk_size
            ):
                merged_chunks.append("".join(current_chunk).strip())

                current_chunk = []
                current_length = 0

            current_chunk.append(split)
            current_length += split_length

        # Add the last chunk
        if current_chunk:
            merged_chunks.append("".join(current_chunk).strip())

        return merged_chunks

    def _apply_overlap(
            self,
            chunks: list[str]
        ) -> list[str]:
        """
        Adds character overlap between consecutive chunks.
        """

        if not chunks:
            return []

        overlapped = [chunks[0]]

        for i in range(1, len(chunks)):

            previous = chunks[i - 1]
            current = chunks[i]

            overlap = previous[-self.chunk_overlap:]
            space = overlap.find(" ")

            if space != -1:
                overlap = overlap[space + 1:]
                overlapped.append(overlap + current)

        return overlapped