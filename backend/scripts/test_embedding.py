from app.rag.embeddings.embedding_model import EmbeddingModel

def main():
    model = EmbeddingModel()

    text = """
    Employee shall provide thirty days written notice before resignation.
    Either party may terminate with 30 days notice.
    """

    embedding = model.embed_text(text)
    print("Dimensions:", len(embedding))
    print(f"\nFirst 10 values : \n{embedding[:10]}")

if __name__ == "__main__":
    main()