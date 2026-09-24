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
    def format_history(recent_messages: List[ChatMessageTable],current_query: Optional[str] = None,max_turns:int = 4) -> str:
        """Formats past chat messages into a clean narrative for conversation history."""
        if not recent_messages:
            return ""

        messages_to_format = recent_messages

        # Prevent duplicate rendering if current query is already saved as the latest message in history
        if current_query and messages_to_format:
            last_msg = messages_to_format[-1]
            if last_msg.sender.lower() == "user" and last_msg.text.strip() == current_query.strip():
                messages_to_format = messages_to_format[:-1]

        if not messages_to_format:
            return ""
        
        # Truncate to the most recent 'max_turns' messages
        truncated_history = recent_messages[-max_turns:]

        formatted_turns = []
        for msg in truncated_history:
            role = "User" if msg.sender.lower() == "user" else "Assistant"
            formatted_turns.append(f"{role}: {msg.text.strip()}")

        return "\n".join(formatted_turns)

#     @classmethod
#     def build(
#         cls,
#         query: str,
#         results: list,  # list of tuples or objects containing ChunkTable
#         history: Optional[List[ChatMessageTable]] = None
#     ) -> str:
#         """
#         Builds the final prompt passed to Gemini.
#         """
#         context_blocks = []

#         # 1. Format Retrieved Chunks
#         for index, item in enumerate(results, start=1):
#             chunk = item[0] if isinstance(item, (tuple, list)) else item
            
#             category_info = f" (Category: {chunk.category})" if hasattr(chunk, 'category') and chunk.category else ""
#             context_blocks.append(
#                 f"[DOCUMENT {index}]: {chunk.filename}{category_info}\n{chunk.text.strip()}"
#             )
        
#         context = "\n\n---\n\n".join(context_blocks) if context_blocks else "No relevant legal context found."

#         # 2. Format History (if provided)
#         history_str = cls.format_history(history or [])
#         history_section = f"\nRecent Conversation History:\n{history_str}\n" if history_str else ""

#         # 3. Assemble Prompt
#         prompt = f"""Retrieved Legal Context:
# {context}
# {history_section}
# User Question:
# {query}

# Answer:"""
#         return prompt

    @classmethod
    def build_hybrid(
        cls,
        query: str,
        rag_results: list,
        history: Optional[List[ChatMessageTable]] = None,
        has_attached_doc: bool = False
    ) -> str:
        """
        Option A (has_attached_doc=True, no rag_results): Document is already in Gemini Cache.
        Option B (has_attached_doc=True + rag_results): RAG Statutory laws appended alongside Cache.
        """
        context_blocks = []

        # 1. Format Statutory/RAG Chunks (if present)
        for index, item in enumerate(rag_results, start=1):
            chunk = item[0] if isinstance(item, (tuple, list)) else item
            category_info = f" (Category: {chunk.category})" if hasattr(chunk, 'category') and chunk.category else ""
            context_blocks.append(
                f"[STATUTORY ACT/LAW {index}]: {chunk.filename}{category_info}\n{chunk.text.strip()}"
            )

        statutory_context = "\n\n---\n\n".join(context_blocks) if context_blocks else ""

        # 2. Build Prompt
        prompt_parts = []
        
        if has_attached_doc:
            prompt_parts.append("Note: The user's uploaded contract/document is provided in the cached context.")
        
        if statutory_context:
            prompt_parts.append(f"Retrieved Statutory Legal Context:\n{statutory_context}")

        history_str = cls.format_history(history or [], current_query=query)
        if history_str:
            prompt_parts.append(f"Recent Conversation History:\n{history_str}")

        prompt_parts.append(f"User Question:\n{query}\n\nAnswer:")

        return "\n\n".join(prompt_parts)