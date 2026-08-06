from app.db.database import engine
from app.db.database import Base
from app.db.document_model import DocumentTable
from app.db.chunk_model import ChunkTable




def main():
    Base.metadata.create_all(bind=engine)

    print("Database tables created successfully.")

if __name__ == "__main__":
    main()