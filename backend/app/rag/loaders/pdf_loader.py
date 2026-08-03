from pathlib import Path
import fitz
from app.rag.preprocessing.text_cleaner import TextCleaner

class PDFLoader:
    """
    Loads PDFs from the knowledge base and extracts text.
    """

    def __init__(self,knowledge_base_path):
        self.knowledge_base_path = Path(knowledge_base_path)

    def load_documents(self):
        documents = []

        pdf_files = self.knowledge_base_path.rglob("*.pdf")

        for pdf_path in pdf_files:
            category = pdf_path.parent.name

            document = self.load_pdf(pdf_path)

            document["category"] = category

            documents.append(document)

        return documents

    def load_pdf(self,pdf_path : Path):
        pdf = fitz.open(pdf_path)
        text = ""

        for page in pdf:
            text += page.get_text()

        cleaned_text = TextCleaner.clean(text)

        return {
            "filename" : pdf_path.name,
            "filepath" : str(pdf_path),
            "pages" : len(pdf),
            "text" : text,
            "cleaned_text" : cleaned_text
        }