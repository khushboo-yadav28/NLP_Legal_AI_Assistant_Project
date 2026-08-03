from app.rag.loaders.pdf_loader import PDFLoader
# from app.rag.preprocessing.text_cleaner import TextCleaner
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

KNOWLEDGE_BASE = BASE_DIR / "knowledge_base"

# print(KNOWLEDGE_BASE)
# print(KNOWLEDGE_BASE.exists())


def main():
    loader = PDFLoader(KNOWLEDGE_BASE)

    documents = loader.load_documents()

    print("="*60)

    print(f"Loaded {len(documents)} documents")

    print("="*60)

    for document in documents:
        print(f"\nFilename : {document['filename']}")
        print(f"Category : {document['category']}")
        print(f"Pages    : {document['pages']}")

        # Raw text preview
        # preview = document["text"][:300].replace("\n", " ")
        # print(f"Preview  : {preview}...")

        # Clean text preview
        preview = document["cleaned_text"][:600]
        print(f"Preview  : {preview}...")


        print("-" * 60)

if __name__ == "__main__":
    main()