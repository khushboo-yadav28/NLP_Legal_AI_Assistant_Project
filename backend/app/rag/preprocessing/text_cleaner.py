import re

class TextCleaner:
    """
    Cleans extracted PDF text while preserving legal meaning.
    """

    @staticmethod
    def clean(text: str) -> str:
        if not text:
            return ""

        # ==========================================================
        # 1. NORMALIZATION & PRE-CLEANUP
        # ==========================================================
        text = re.sub(r"\r\n?", "\n", text)
        text = text.replace("\t", " ")
        text = text.replace("\f", " ")

        # Remove horizontal rules / decorative separators
        text = re.sub(r"_+", "", text)
        text = re.sub(r"[-–—]{5,}", "", text)
        text = re.sub(r"={5,}", "", text)

        # Remove standalone page numbers and dot-only lines
        text = re.sub(r"(?m)^\s*\d+\s*$", "", text)
        text = re.sub(r"(?m)^\s*\.+\s*$", "", text)

        # ==========================================================
        # 2. STATUTORY FOOTNOTES & EDITORIAL ARTIFACTS
        # ==========================================================

        # A. Remove whole-line statutory amendment footnotes
        # Matches lines starting with numbers/letters like "3. Ss. 178...", "1. Subs. by...", "s. 55."
        text = re.sub(
            r"(?im)^\s*(?:\d+\.|\bSs?\.)\s*.*?\b(?:subs\.|ins\.|inserted|amended|act\s+\d+|rep\.|s\.\s*\d+).*$",
            "",
            text,
        )

        # B. Remove standalone section reference remnants (e.g., "s. 55." or "Ss. 178.")
        text = re.sub(r"(?im)^\s*Ss?\.\s*\d+[A-Z]?\b\.?\s*$", "", text)

        # C. Remove ANY line containing Repeals or Editorial Notes
        text = re.sub(r"(?im)^.*Rep\.?.*$", "", text)
        text = re.sub(r"(?im)^.*\b(?:ibid|supra|infra|cf\.?|see)\b.*$", "", text)

        # D. Remove omitted and repealed placeholder headings
        text = re.sub(r"(?im)^\s*(?:\d+[A-Z]?\.)?\s*\[(?:Omitted|Repealed)\.?\]\s*$", "", text)
        text = re.sub(r"(?im)^\s*\[[^\]]+\]\s*Rep\..*$","",text,)
        text = re.sub(r"(?im)^.*\bSchedule\b.*$", "", text)

        # E. Clean up orphan inline footnote brackets and trailing bracket notes (e.g., "...defect of title.]")
        text = re.sub(r"(?<=\w)\](?=\s*\d+[A-Z]?\.)", "", text)  # Removes ']' before new section numbers
        text = re.sub(r"\[(?=\d+)", "", text)                  # Removes orphan '[' before footnote digits

        # ==========================================================
        # 3. BLANK LINE & STRUCTURE REPAIR
        # ==========================================================
        # Collapse multiple empty/blank lines created by deletions
        text = re.sub(r"\n\s*\n+", "\n\n", text)

        # ==========================================================
        # 4. PARAGRAPH & SPACE NORMALIZATION
        # ==========================================================
        # Join line-wrapped text while respecting section numbers (e.g., "178A. Pledge...")
        text = re.sub(r"(?<![.:;?!])\n(?!\s*(?:\d+[A-Z]?\.|[A-Z\s]{4,}\b))", " ", text)

        # Normalize multiple spaces and excess newline sequences
        text = re.sub(r"[ ]{2,}", " ", text)
        text = re.sub(r"\n{3,}", "\n\n", text)

        return text.strip()