from pathlib import Path

from app.db.database import SessionLocal

from app.db.repositories.document_repository import DocumentRepository
from app.db.repositories.chunk_repository import ChunkRepository

from app.rag.loaders.pdf_loader import PDFLoader
from app.rag.chunking.chunker import TextChunker
from app.rag.embeddings.embedding_model import EmbeddingModel


BASE_DIR = Path(__file__).resolve().parent.parent
KNOWLEDGE_BASE = BASE_DIR / "knowledge_base"


def main():

    db = SessionLocal()

    document_repo = DocumentRepository(db)
    chunk_repo = ChunkRepository(db)

    loader = PDFLoader(KNOWLEDGE_BASE)
    chunker = TextChunker()
    # embedding_model = EmbeddingModel()

    documents = loader.load_documents()

    print(f"\nFound {len(documents)} document(s).\n")

    new_documents = []

    for document in documents:
        if document_repo.exists(document.file_hash):
            print("Already ingested. Skipping")
        else:
            new_documents.append(document)

    if not new_documents:
        print("No new documents found.")
        return

    embedding_model = EmbeddingModel()

    for document in new_documents:

        print("=" * 70)
        print(document.filename)

        # Skip unchanged files
        # if document_repo.exists(document.file_hash):
        #     print("Already ingested. Skipping.")
        #     continue

        # print("New document.")

        # Chunk document
        chunks = chunker.split_document(document)

        print(f"Chunks created : {len(chunks)}")

        # Generate embeddings
        chunks = embedding_model.embed_chunks(chunks)

        print("Embeddings generated.")

        try :
            # Save document
            document_repo.save(document)

            # Save chunks
            chunk_repo.save_chunks(chunks)

            db.commit()

        except:
            db.rollback()
            raise

        print("Saved to PostgreSQL.")

    db.close()

    print("\nDone.")


if __name__ == "__main__":
    main()