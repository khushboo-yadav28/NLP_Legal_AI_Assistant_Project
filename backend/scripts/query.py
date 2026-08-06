from app.db.database import SessionLocal
from app.rag.embeddings.embedding_model import EmbeddingModel
from app.rag.retrieval.retriever import Retriever
from app.rag.generation.prompt_builder import PromptBuilder
from app.rag.generation.llm import GeminiClient

def main():

    db = SessionLocal()

    try:
        embedding_model = EmbeddingModel()

        retriever = Retriever(
            db=db,
            embedding_model=embedding_model
        )

        llm = GeminiClient()

        query = input("Ask: ")

        results = retriever.retrieve(query)

        prompt = PromptBuilder.build(
                query=query,
                results=results
            )

        answer = llm.generate(prompt)
        
        print("\n" + "="*80)
        print(answer)
        print("="*80)

        # for rank, (chunk, distance, rerank_score) in enumerate(results, start=1):
        
        # for rank, (chunk, distance, score) in enumerate(results, start=1):

        #     print("=" * 70)
        #     print(f"Rank                : {rank}")
        #     print(f"Chunk Index :       : {chunk.chunk_index}")
        #     print(f"Vector Distance     : {distance:.4f}")
        #     print(f"Vector Similarity   : {1 - distance:.4f}")

        #     # print(f"Reranker Score      : {rerank_score:.4f}")
        #     print(f"Reranker Score      : {score:.4f}")
        #     print(f"Document            : {chunk.filename}")
        #     print(f"Category            : {chunk.category}\n")
        #     print(chunk.text)
        #     print()

    finally:
        db.close()


if __name__ == "__main__":
    main()


"""

What is the notice period for resignation?

What happens during the probation period?

Who owns intellectual property created by an employee?

Can either party terminate the agreement?

Explain the confidentiality clause.

What is the Consumer Protection Act?

What are the obligations of the employee?

What are risky contract clauses?

What is the purpose of the Right to Information Act?

"""