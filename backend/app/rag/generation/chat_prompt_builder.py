from typing import List, Tuple, Any, Optional
from app.db.chunk_model import ChunkTable
from app.db.user_chat_models import ChatMessageTable


class PromptBuilder:
    """
    Builds structured prompts for Gemini by assembling:
    1. Retrieved vector/keyword search context (RAG Grounding)
    2. Multi-turn conversation history (if present)
    3. User Query
    """

    @staticmethod
    def format_history(recent_messages: List[ChatMessageTable],max_turns:int = 4) -> str:
        """Formats past chat messages into a clean narrative for conversation history."""
        if not recent_messages:
            return ""

        # Truncate to the most recent 'max_turns' messages
        truncated_history = recent_messages[-max_turns:]

        formatted_turns = []
        for msg in truncated_history:
            role = "User" if msg.sender.lower() == "user" else "Assistant"
            formatted_turns.append(f"{role}: {msg.text.strip()}")

        return "\n".join(formatted_turns)

    @classmethod
    def build(
        cls,
        query: str,
        results: list,  # list of tuples or objects containing ChunkTable
        history: Optional[List[ChatMessageTable]] = None
    ) -> str:
        """
        Builds the final prompt passed to Gemini.
        """
        context_blocks = []

        # 1. Format Retrieved Chunks
        for index, item in enumerate(results, start=1):
            chunk = item[0] if isinstance(item, (tuple, list)) else item
            
            category_info = f" (Category: {chunk.category})" if hasattr(chunk, 'category') and chunk.category else ""
            context_blocks.append(
                f"[DOCUMENT {index}]: {chunk.filename}{category_info}\n{chunk.text.strip()}"
            )
        
        context = "\n\n---\n\n".join(context_blocks) if context_blocks else "No relevant legal context found."

        # 2. Format History (if provided)
        history_str = cls.format_history(history or [])
        history_section = f"\nRecent Conversation History:\n{history_str}\n" if history_str else ""

        # 3. Assemble Prompt
        prompt = f"""Retrieved Legal Context:
{context}
{history_section}
User Question:
{query}

Answer:"""
        return prompt