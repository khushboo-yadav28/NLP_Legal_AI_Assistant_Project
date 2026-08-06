import re
from app.rag.retrieval.legal_dictionary import LEGAL_EXPANSIONS

class QueryExpander:
    def __init__(self):
        self.expansions = dict(
            sorted(
                LEGAL_EXPANSIONS.items(),
                key=lambda x: len(x[0]),
                reverse=True
            )
        )

    def expand(self, query: str) -> str:
        expanded = query.lower()

        # If the user is searching for a specific section or clause, bypass expansion
        if re.search(r'\b(section|sec|article|act|clause)\b\s*\d+', expanded):
            return query

        additions = []
        for key in self.expansions.keys():
            # Match whole words/phrases to prevent partial word mismatches
            if re.search(rf'\b{re.escape(key)}\b', expanded):
                additions.extend(self.expansions[key])

        if additions:
            unique = sorted(set(additions))
            expanded += " " + " ".join(unique)

        return expanded

# from app.rag.retrieval.legal_dictionary import LEGAL_EXPANSIONS


# class QueryExpander:
#     """
#     Expands user queries with legal terminology before embedding.
#     Example: minor -> minor age of majority competent to contract
#     """

#     def __init__(self):
#         # Sort so longer phrases match before shorter words
#         self.expansions = dict(
#             sorted(
#                 LEGAL_EXPANSIONS.items(),
#                 key=lambda x: len(x[0]),
#                 reverse=True
#             )
#         )

#     def expand(self, query: str) -> str:

#         expanded = query.lower()

#         additions = []

#         # Longest keys first
#         keys = sorted(
#             LEGAL_EXPANSIONS.keys(),
#             key=len,
#             reverse=True
#         )

#         for key in keys:

#             if key in expanded:
#                 additions.extend(LEGAL_EXPANSIONS[key])

#         if additions:

#             unique = sorted(set(additions))
#             expanded += " " + " ".join(unique)

#         return expanded

#         # for keyword, synonyms in self.expansions.items():

#         #     if keyword in expanded_query:

#         #         additions.extend(synonyms)

#         # additions = list(dict.fromkeys(additions))

#         # if additions:

#         #     expanded_query += " " + " ".join(additions)

#         # return expanded_query