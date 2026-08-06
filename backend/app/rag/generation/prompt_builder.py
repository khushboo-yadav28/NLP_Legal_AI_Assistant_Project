"""
Convert the retrieved chunks into a prompt for the LLM.
Its only responsibility is Question + Retrieved Context -> Prompt
"""

from app.db.chunk_model import ChunkTable


class PromptBuilder:
    """
    Builds the prompt given to the LLM.
    """
    @staticmethod
    def build(
            query:str,
            results: list #[tuple[ChunkTable, float]]
    )-> str:
        # contexts = []

        # for chunk, _, _ in results:
        #     contexts.append(
        #     f"[Source : {chunk.filename}]\n{chunk.text}"
        #     )   

        context_blocks = []

        for index, item in enumerate(results, start=1):
            # Extract ChunkTable object regardless of tuple return length
            chunk = item[0] if isinstance(item, (tuple, list)) else item
            context_blocks.append(
                f"[DOCUMENT {index}]: {chunk.filename} (Category: {chunk.category})\n{chunk.text.strip()}"
            )
        context = "\n\n---\n\n".join(context_blocks)

        prompt = f"""            
Retrieved Legal Context:
{context}

User Question:
{query}


Answer:"""
        return prompt