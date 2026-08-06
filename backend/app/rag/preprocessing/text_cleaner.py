import re

class TextCleaner:
    """
    Cleans extracted pdf text while preserving legal meaning.
    """

    @staticmethod
    def clean(text: str)-> str:
        if not text:
            return ""

        # Normalize line endings, Replace any \r\n or \r with \n
        text = re.sub(r'\r\n?','\n', text)

        # Replace tabs with spaces
        text = text.replace("\t"," ")

        # Remove form-feed characters
        text = text.replace("\f"," ")

        # Remove long underscore separators
        text = re.sub(r"_+","",text)

        # Remove repeated hyphen separators
        text = re.sub(r"[-–—]{5,}", "", text)

        # Remove decorative =====
        text = re.sub(r"={5,}", "", text)

        # Remove lines containing only dots
        text = re.sub(r"(?m)^\s*\.+\s*$", "", text)

        # Remove isolated dot-only fragments
        # text = re.sub(r"\n\s*\.\s*\n", "\n", text) 

        # Replace repeated commas
        text = re.sub(r",{2,}", ",", text)

        # Remove extra spaces
        text = re.sub(r"[ ]{2,}"," ",text)

        # Remove extra blank lines
        text = re.sub(r"\n\s*\n+","\n\n",text)

        # Remove page numbers (line contains only digits)
        text = re.sub(r"(?m)^\s*\d+\s*$","",text)

        # Remove common editorial references
        text = re.sub(
            r"Rep\.\s*by\s*s\.\s*\d+.*?(?:ibid\.?)",
            "",
            text,
            flags=re.IGNORECASE,
        )

        # Remove standalone footnote/reference lines
        text = re.sub(
            r"(?im)^\s*(?:See|Cf\.?|ibid|infra|supra)\b.*$",
            "",
            text,
        )

        # Remove editorial repeal entries
        text = re.sub(r"(?im)^\s*\d+\.\s*\[Repealed\.\]\s*$","",text)

        return text.strip()