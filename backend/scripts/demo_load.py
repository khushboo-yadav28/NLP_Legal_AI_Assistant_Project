from app.rag.loaders.pdf_loader import PDFLoader
from pathlib import Path

from app.rag.chunking.chunker import TextChunker

BASE_DIR = Path(__file__).resolve().parent.parent
KNOWLEDGE_BASE = BASE_DIR / "knowledge_base"/ "acts"


def main():

    loader = PDFLoader(KNOWLEDGE_BASE)
    
    documents = loader.load_documents()

    print(f"\nFound {len(documents)} document(s).\n")
    # Chunk document
    document = documents[0]
    chunker = TextChunker()

    chunks = chunker.split_document(document)
    for chunk in chunks:
        # print(chunk.chunk_index)
        print("="*50)
        print(chunk.text)
    
    print(f"Chunks created : {len(chunks)}")
    print("\nDone.")


if __name__ == "__main__":
    main()