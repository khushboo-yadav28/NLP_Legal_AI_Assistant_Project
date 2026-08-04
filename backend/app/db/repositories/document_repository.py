from sqlalchemy.orm import Session
from app.models.document import Document
from app.db.document_model import DocumentTable


class DocumentRepository:
    """
    Handles all database operations related to documents.
    """

    def __init__(self, db: Session):
        self.db = db

    def get_by_hash(self, file_hash: str) -> DocumentTable | None:
        """
        Return a document with the given hash.
        """

        return (
            self.db.query(DocumentTable)
            .filter(DocumentTable.file_hash == file_hash)
            .first()
        )

    def exists(self, file_hash: str) -> bool:
        """
        Check whether a document with this file hash already exists.
        """

        return self.get_by_hash(file_hash) is not None

    def save(self, document: Document) -> DocumentTable:
        """
        Save a new document.
        """

        db_document = DocumentTable(
            document_id=document.document_id,
            filename=document.filename,
            filepath=document.filepath,
            category=document.category,
            page_count=document.page_count,
            file_hash=document.file_hash,
        )

        self.db.add(db_document)
        # self.db.commit()
        # self.db.refresh(db_document)

        return db_document

    def delete(self, document_id: str):
        """
        Delete a document.
        """

        (
            self.db.query(DocumentTable)
            .filter(DocumentTable.document_id == document_id)
            .delete()
        )

        self.db.commit()