from collections import defaultdict
from app.core.config import FINAL_TOP_K
from app.db.chunk_model import ChunkTable

class DiversityFilter:

    def diversify(
        self,
        ranked_results: list[tuple[ChunkTable, float]],
        top_k: int = FINAL_TOP_K,
    ) -> list[tuple[ChunkTable, float]]:
        """
        Avoid returning neighbouring chunks from the same document.
        ranked_results:list of RetrievalResult already sorted by reranker.
        """

        selected = []
        skipped = []

        selected_chunks = defaultdict(list)

        for chunk,distance,score in ranked_results:

            doc = chunk.document_id
            idx = chunk.chunk_index

            conflict = False

            for existing in selected_chunks[doc]:
                if abs(existing.start_char - chunk.start_char) < 800:
                    conflict = True
                    break

            if conflict:
                skipped.append((chunk,distance,score))
                continue

            selected.append((chunk,distance,score))
            selected_chunks[doc].append(chunk)

            if len(selected) >= top_k:
                return selected

        # Backfill if diversity removed too many
        for result in skipped:

            selected.append(result)

            if len(selected) == top_k:
                break

        return selected